import DOMPurify from 'dompurify';
import { config } from 'fabric';
import type { PackagingDocument, PackagingLayer } from './model';
import { markColor, markWidth, marksSvg, pageMarks, type PrintOptions } from './banderoleGeometry';
import { dieMarkup, printGeometry, type MmRect } from './packagingGeometry';
import { loadFont, type LoadedFont } from './fonts';
import { textView } from './packagingText';
const ns = 'http://www.w3.org/2000/svg';
const ink = 'http://www.inkscape.org/namespaces/inkscape';
export const escapeXml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
const serialize = (node: Node) => new XMLSerializer().serializeToString(node);
const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml');

function vectorImage(layer: PackagingLayer, index: number) {
  const url = layer.dataUrl!;
  const encoded = url.slice(url.indexOf(',') + 1);
  const source = /;base64,/.test(url)
    ? new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)))
    : decodeURIComponent(encoded);
  const raw = parse(source);
  const unsupported = raw.querySelector(
    'parsererror, filter, mask, foreignObject, pattern, text, textPath, animate, animateTransform, set, style',
  );
  if (unsupported || /(?:filter|mask|mix-blend-mode)\s*[:=]/i.test(source))
    throw new Error(
      `Ebene „${layer.name}“: nicht unterstützter SVG-Effekt${unsupported ? ` (${unsupported.localName})` : ''}. Bitte als einfache Pfade speichern.`,
    );
  const cleaned = DOMPurify.sanitize(source, { USE_PROFILES: { svg: true, svgFilters: true } });
  const svg = parse(cleaned).documentElement;
  if (svg.localName !== 'svg') throw new Error(`Ebene „${layer.name}“: ungültiges SVG.`);
  for (const element of [svg, ...svg.querySelectorAll('*')])
    for (const attr of [...element.attributes]) {
      if (
        (attr.localName === 'href' && !attr.value.startsWith('#')) ||
        [...attr.value.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)].some(
          (match) => !match[1].startsWith('#'),
        )
      )
        throw new Error(`Ebene „${layer.name}“: externe SVG-Verweise werden nicht unterstützt.`);
    }
  // Imported definitions must not collide across repeated logos.
  const ids = new Map(
    [...svg.querySelectorAll('[id]')].map((el) => [el.id, `image-${index}-${el.id}`]),
  );
  for (const element of [svg, ...svg.querySelectorAll('*')])
    for (const attr of [...element.attributes]) {
      let value = attr.value;
      for (const [id, next] of ids) {
        if (attr.name === 'id' && value === id) value = next;
        else {
          value = value.replace(/url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g, (match, target) =>
            target === id ? `url(#${next})` : match,
          );
          if (value === `#${id}`) value = `#${next}`;
        }
      }
      element.setAttributeNS(attr.namespaceURI, attr.name, value);
    }
  if (!svg.hasAttribute('viewBox')) {
    // SVG lengths without a viewBox are CSS pixels, including absolute unit conversion.
    const length = (value: string | null) => {
      const match = value?.trim().match(/^([\d.eE+-]+)(px|mm|cm|in|pt|pc)?$/);
      const factors: Record<string, number> = {
        px: 1,
        mm: 96 / 25.4,
        cm: 96 / 2.54,
        in: 96,
        pt: 96 / 72,
        pc: 16,
      };
      return match ? Number(match[1]) * factors[match[2] ?? 'px'] : NaN;
    };
    const w = length(svg.getAttribute('width')),
      h = length(svg.getAttribute('height'));
    if (!(w > 0 && h > 0))
      throw new Error(`Ebene „${layer.name}“: SVG benötigt viewBox oder Maße.`);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  svg.setAttribute('x', String(-layer.widthMm / 2));
  svg.setAttribute('y', String(-layer.heightMm / 2));
  svg.setAttribute('width', String(layer.widthMm));
  svg.setAttribute('height', String(layer.heightMm));
  svg.setAttribute('preserveAspectRatio', 'none');
  return serialize(svg);
}

export async function packagingSvg(
  doc: PackagingDocument,
  options: PrintOptions = { ...pageMarks(doc.pages[doc.selectedPage]), textMode: 'text' },
  embedFonts = true,
  pageIndex = doc.selectedPage,
) {
  const page = doc.pages[pageIndex],
    geometry = printGeometry(doc, page),
    area = geometry.bleed,
    { media } = geometry;
  const fonts = new Map<string, LoadedFont>();
  const background: string[] = [],
    artwork: string[] = [];
  config.NUM_FRACTION_DIGITS = 8;
  for (const [index, layer] of page.layers.entries()) {
    if (!layer.visible) continue;
    let content = '';
    if (layer.type === 'text') {
      const loaded = await loadFont(layer);
      if (
        [...(layer.text ?? '')].some(
          (char) => !/\s/.test(char) && !loaded.font.charToGlyphIndex(char),
        )
      )
        throw new Error(
          `Ebene „${layer.name}“: Schrift enthält ein Zeichen nicht. Bitte ein Vektorsymbol verwenden.`,
        );
      fonts.set(loaded.family + loaded.style, loaded);
      const object = textView(layer);
      const parsed = parse(`<svg xmlns="${ns}">${object.toSVG()}</svg>`);
      if (options.textMode === 'paths') {
        for (const text of parsed.querySelectorAll('text')) {
          const group = parsed.createElementNS(ns, 'g');
          group.setAttribute('fill', layer.color);
          for (const span of text.querySelectorAll('tspan')) {
            const value = span.textContent ?? '';
            if ([...value].some((char) => !loaded.font.charToGlyphIndex(char)))
              throw new Error(`Ebene „${layer.name}“: Schrift enthält ein Zeichen nicht.`);
            const path = parsed.createElementNS(ns, 'path');
            path.setAttribute(
              'd',
              loaded.font
                .getPath(
                  value,
                  Number(span.getAttribute('x')),
                  Number(span.getAttribute('y')),
                  object.fontSize,
                )
                .toPathData(8),
            );
            group.append(path);
          }
          text.replaceWith(group);
        }
      }
      content = [...parsed.documentElement.childNodes].map(serialize).join('');
      object.dispose();
    } else if (layer.dataUrl) {
      const transform = `translate(${layer.xMm} ${layer.yMm}) rotate(${layer.rotation})`;
      let image: string;
      if (layer.dataUrl.startsWith('data:image/svg')) image = vectorImage(layer, index);
      else {
        if (!/^data:image\/(png|jpeg|webp);base64,/.test(layer.dataUrl))
          throw new Error(`Ebene „${layer.name}“: ungültiges Bildformat.`);
        image = `<image x="${-layer.widthMm / 2}" y="${-layer.heightMm / 2}" width="${layer.widthMm}" height="${layer.heightMm}" preserveAspectRatio="none" href="${escapeXml(layer.dataUrl)}"/>`;
      }
      content = `<g transform="${transform}">${image}</g>`;
    }
    const markup = `<g id="layer-${index}" inkscape:label="${escapeXml(layer.name)}"${layer.role === 'background' ? '' : ' inkscape:groupmode="layer"'}><title>${escapeXml(layer.name)}</title>${content}</g>`;
    (layer.role === 'background' ? background : artwork).push(markup);
  }
  const styles =
    embedFonts && options.textMode === 'text'
      ? [...fonts.values()]
          .map(
            (font) =>
              `@font-face{font-family:'${font.family}';font-weight:${font.style.includes('bold') ? 700 : 400};font-style:${font.style.includes('italic') ? 'italic' : 'normal'};src:url(data:font/ttf;base64,${font.base64}) format('truetype');}`,
          )
          .join('')
      : '';
  const rect = `x="${area.x}" y="${area.y}" width="${area.width}" height="${area.height}"`;
  const offsetX = -media.x,
    offsetY = -media.y;
  const marks = geometry.die
    ? `${options.cutMarks ? geometry.marks.map((line) => `<line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" stroke="${markColor(line.kind)}" stroke-width="${markWidth(line.kind)}"/>`).join('') : ''}${options.dieLines ? `<g inkscape:label="Stanzkontur">${dieMarkup(geometry.die, 'cut')}</g>` : ''}${options.innerGuides ? `<g inkscape:label="Falzlinien">${dieMarkup(geometry.die, 'fold')}</g>` : ''}`
    : marksSvg(page.bleedMm ?? 3, options);
  return {
    svg: `<svg xmlns="${ns}" xmlns:inkscape="${ink}" width="${media.width}mm" height="${media.height}mm" viewBox="0 0 ${media.width} ${media.height}"><defs><clipPath id="bleed"><rect ${rect}/></clipPath><style>${styles}</style></defs><g id="background" inkscape:groupmode="layer" inkscape:label="Hintergrund" transform="translate(${offsetX} ${offsetY})" clip-path="url(#bleed)"><rect ${rect} fill="${escapeXml(page.background)}"/>${background.join('')}</g><g id="artwork" inkscape:groupmode="layer" inkscape:label="Gestaltung" transform="translate(${offsetX} ${offsetY})" clip-path="url(#bleed)">${artwork.join('')}</g><g id="marks" inkscape:groupmode="layer" inkscape:label="Markierungen" transform="translate(${offsetX} ${offsetY})">${marks}</g></svg>`,
    fonts: [...fonts.values()],
  };
}

export const banderoleSvg = packagingSvg;

export async function packagingPdf(doc: PackagingDocument, options: PrintOptions) {
  const [{ jsPDF }] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);
  const pages = await Promise.all(
    doc.pages.map(async (page, index) => ({
      ...(await packagingSvg(doc, options, false, index)),
      geometry: printGeometry(doc, page),
    })),
  );
  const first = pages[0].geometry.media;
  const pdf = new jsPDF({
    unit: 'mm',
    format: [first.width, first.height],
    orientation: first.width > first.height ? 'landscape' : 'portrait',
    compress: true,
  });
  if (options.textMode === 'text')
    for (const font of new Map(
      pages.flatMap((page) => page.fonts.map((font) => [font.family + font.style, font] as const)),
    ).values()) {
      const name = font.family.replaceAll(' ', '') + font.style + '.ttf';
      pdf.addFileToVFS(name, font.base64);
      pdf.addFont(name, font.family, font.style);
    }
  for (const [index, page] of pages.entries()) {
    const { media, trim, bleed } = page.geometry;
    if (index)
      pdf.addPage(
        [media.width, media.height],
        media.width > media.height ? 'landscape' : 'portrait',
      );
    const box = (rect: MmRect) => ({
      bottomLeftX: ((rect.x - media.x) * 72) / 25.4,
      bottomLeftY: ((media.y + media.height - rect.y - rect.height) * 72) / 25.4,
      topRightX: ((rect.x - media.x + rect.width) * 72) / 25.4,
      topRightY: ((media.y + media.height - rect.y) * 72) / 25.4,
    });
    const context = pdf.getCurrentPageInfo().pageContext;
    context.trimBox = box(trim);
    context.bleedBox = box(bleed);
    await pdf.svg(parse(page.svg).documentElement, {
      x: 0,
      y: 0,
      width: media.width,
      height: media.height,
    });
  }
  return pdf;
}

export const banderolePdf = packagingPdf;
