import { banderolePdf, banderoleSvg } from './banderoleExport';
import { pageMarks, type PrintOptions } from './banderoleGeometry';
import { packagingGuide } from './packagingTemplates';
import type { Asset, PackagingDocument, PackagingKind, Project } from './model';
import { validateProject } from './model';
import { renderTile, renderSheet, renderPackaging } from './render';
import { canvasToPrintPng, downloadBlob } from '../pngExport';
export async function readAsset(file: File): Promise<Asset> {
  if (file.size > 30_000_000) throw new Error('Datei ist größer als 30 MB.');
  let dataUrl: string;
  if (file.type === 'application/pdf') {
    const [{ getDocument, GlobalWorkerOptions }, { default: pdfWorkerUrl }] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const choice =
      pdf.numPages > 1 ? window.prompt(`PDF hat ${pdf.numPages} Seiten. Welche Seite?`, '1') : '1';
    const number = Number(choice);
    if (!Number.isInteger(number) || number < 1 || number > pdf.numPages)
      throw new Error('Ungültige PDF-Seite.');
    const page = await pdf.getPage(number);
    const viewport = page.getViewport({ scale: 300 / 72 });
    if (viewport.width * viewport.height > 40_000_000)
      throw new Error('PDF-Seite ist zu groß zum Import.');
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PDF-Seite kann nicht gezeichnet werden.');
    await page.render({ canvasContext: context, canvas, viewport }).promise;
    dataUrl = canvas.toDataURL('image/png');
    await pdf.destroy();
  } else if (file.type === 'image/svg+xml') {
    let svg = await file.text();
    if (/(?:href|url\()\s*=?[\s"']*(?:https?:|data:|\/\/)/i.test(svg))
      throw new Error('SVG mit externen Verweisen wird nicht unterstützt.');
    const { default: DOMPurify } = await import('dompurify');
    svg = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
    dataUrl = await fileAsDataUrl(new Blob([svg], { type: 'image/svg+xml' }));
  } else if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    dataUrl = await fileAsDataUrl(file);
  else throw new Error('Bitte PNG, JPEG, WebP, SVG oder PDF wählen.');
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Bild kann nicht gelesen werden.'));
    i.src = dataUrl;
  });
  if (!img.naturalWidth || !img.naturalHeight) throw new Error('Bild hat keine gültige Größe.');
  return {
    id: crypto.randomUUID(),
    name: file.name,
    dataUrl,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}
function fileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
export async function exportPng(
  p: Project,
  kind: 'tile' | 'sheet' | 'front' | 'back' | 'band',
  ppi = 300,
  signal?: AbortSignal,
) {
  const canvas =
    kind === 'tile'
      ? await renderTile(p, ppi, true, signal)
      : kind === 'sheet'
        ? await renderSheet(p, ppi, signal)
        : await renderPackaging(p, kind, ppi);
  const blob = await canvasToPrintPng(canvas, ppi);
  signal?.throwIfAborted();
  downloadBlob(blob, `Musterersteller_${kind}_${ppi}ppi.png`);
}
export async function exportPdf(
  p: Project,
  kind: 'sheet' | 'front' | 'back' | 'band',
  ppi = 300,
  signal?: AbortSignal,
) {
  const canvas =
    kind === 'sheet' ? await renderSheet(p, ppi, signal) : await renderPackaging(p, kind, ppi);
  const w = kind === 'sheet' ? p.sheetWidthMm : kind === 'band' ? 230 : 100;
  const h = kind === 'sheet' ? p.sheetHeightMm : kind === 'band' ? 47 : p.sheetHeightMm / 2;
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    unit: 'mm',
    format: [w, h],
    orientation: w > h ? 'landscape' : 'portrait',
    compress: true,
  });
  const blob = await canvasToPrintPng(canvas, ppi);
  const url = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
  signal?.throwIfAborted();
  pdf.addImage(url, 'PNG', 0, 0, w, h, undefined, 'FAST');
  signal?.throwIfAborted();
  downloadBlob(pdf.output('blob'), `Musterersteller_${kind}_${ppi}ppi.pdf`);
}
export async function exportPackagingPdf(
  document: PackagingDocument,
  options: {
    cutMarks: boolean;
    dieLines: boolean;
    innerGuides?: boolean;
    textMode?: 'text' | 'paths';
  },
) {
  if (document.kind === 'banderole') {
    const pdf = await banderolePdf(document, {
      ...pageMarks(document.pages[document.selectedPage]),
      textMode: 'text',
      ...options,
    });
    pdf.save(`Verpackung_banderole_${document.templateId}.pdf`);
    return;
  }
  const { jsPDF } = await import('jspdf');
  const first = document.pages[0];
  const pdf = new jsPDF({
    unit: 'mm',
    format: [first.widthMm, first.heightMm],
    orientation: first.widthMm > first.heightMm ? 'landscape' : 'portrait',
    compress: true,
  });
  for (const [pageIndex, page] of document.pages.entries()) {
    if (pageIndex)
      pdf.addPage(
        [page.widthMm, page.heightMm],
        page.widthMm > page.heightMm ? 'landscape' : 'portrait',
      );
    pdf.setFillColor(page.background);
    pdf.rect(0, 0, page.widthMm, page.heightMm, 'F');
    if (options.dieLines) {
      const response = await fetch(packagingGuide(document, page));
      if (!response.ok) throw new Error('Stanzvorlage konnte nicht geladen werden.');
      const svg = await response.text();
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('Stanzvorlage konnte nicht dargestellt werden.'));
        element.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      });
      const guideCanvas = globalThis.document.createElement('canvas');
      guideCanvas.width = Math.ceil((page.widthMm * 300) / 25.4);
      guideCanvas.height = Math.ceil((page.heightMm * 300) / 25.4);
      const context = guideCanvas.getContext('2d');
      if (!context) throw new Error('Stanzvorlage kann nicht exportiert werden.');
      context.drawImage(image, 0, 0, guideCanvas.width, guideCanvas.height);
      URL.revokeObjectURL(image.src);
      pdf.addImage(
        guideCanvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        page.widthMm,
        page.heightMm,
        undefined,
        'FAST',
      );
    }
    for (const layer of page.layers) {
      if (!layer.visible) continue;
      if (layer.type === 'text') {
        const font =
          layer.fontFamily.includes('Mono') || layer.fontFamily.includes('Courier')
            ? 'courier'
            : layer.fontFamily.includes('Serif') ||
                layer.fontFamily.includes('Georgia') ||
                layer.fontFamily.includes('Times')
              ? 'times'
              : 'helvetica';
        pdf.setFont(
          font,
          layer.bold && layer.italic
            ? 'bolditalic'
            : layer.bold
              ? 'bold'
              : layer.italic
                ? 'italic'
                : 'normal',
        );
        pdf.setFontSize(layer.fontSizePt);
        pdf.setTextColor(layer.color);
        const lines = pdf.splitTextToSize(layer.text ?? '', layer.widthMm);
        const lineHeight = ((layer.fontSizePt * 25.4) / 72) * 1.2;
        const height = Math.max(lineHeight, lines.length * lineHeight);
        const angle = (layer.rotation * Math.PI) / 180;
        pdf.advancedAPI(() => {
          pdf.setCurrentTransformationMatrix(
            pdf.Matrix(
              Math.cos(angle),
              Math.sin(angle),
              -Math.sin(angle),
              Math.cos(angle),
              layer.xMm,
              layer.yMm,
            ),
          );
          pdf.text(lines, -layer.widthMm / 2, -height / 2 + lineHeight * 0.8, {
            baseline: 'alphabetic',
            lineHeightFactor: 1.2,
          });
        });
      } else if (layer.dataUrl) {
        let imageData = layer.dataUrl;
        if (imageData.startsWith('data:image/svg')) {
          const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = () =>
              reject(new Error(`SVG konnte nicht exportiert werden: ${layer.name}`));
            element.src = imageData;
          });
          const canvas = globalThis.document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('SVG kann nicht für den PDF-Export vorbereitet werden.');
          context.drawImage(image, 0, 0);
          imageData = canvas.toDataURL('image/png');
        }
        const format = imageData.startsWith('data:image/jpeg')
          ? 'JPEG'
          : imageData.startsWith('data:image/webp')
            ? 'WEBP'
            : 'PNG';
        const angle = (layer.rotation * Math.PI) / 180;
        pdf.advancedAPI(() => {
          pdf.setCurrentTransformationMatrix(
            pdf.Matrix(
              Math.cos(angle),
              Math.sin(angle),
              -Math.sin(angle),
              Math.cos(angle),
              layer.xMm,
              layer.yMm,
            ),
          );
          pdf.addImage(
            imageData,
            format,
            -layer.widthMm / 2,
            -layer.heightMm / 2,
            layer.widthMm,
            layer.heightMm,
            undefined,
            'FAST',
          );
        });
      }
    }
    if (options.cutMarks) {
      pdf.setDrawColor(35, 35, 35);
      pdf.setLineWidth(0.15);
      const edge = 5,
        arm = 2.5;
      for (const [x, y] of [
        [edge, edge],
        [page.widthMm - edge, edge],
        [edge, page.heightMm - edge],
        [page.widthMm - edge, page.heightMm - edge],
      ]) {
        pdf.line(x - arm, y, x + arm, y);
        pdf.line(x, y - arm, x, y + arm);
      }
    }
  }
  const name = document.templateId.replace(/[^a-z0-9-]+/gi, '_');
  pdf.save(`Verpackung_${document.kind}_${name}.pdf`);
}

export async function exportPackagingSvg(document: PackagingDocument, options: PrintOptions) {
  const { svg } = await banderoleSvg(document, options);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `Banderole_${document.templateId}.svg`);
}
export async function saveProject(p: Project) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file('project.json', JSON.stringify(p));
  downloadBlob(
    await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }),
    'Musterersteller_Projekt.zip',
  );
}
export async function openProject(file: File): Promise<Project> {
  if (file.size > 150_000_000) throw new Error('Projektdatei ist zu groß.');
  const text = file.name.toLowerCase().endsWith('.zip')
    ? await (
        await (await import('jszip')).default.loadAsync(file)
      )
        .file('project.json')
        ?.async('string')
    : await file.text();
  if (!text) throw new Error('Keine Projektdatei gefunden.');
  return validateProject(JSON.parse(text));
}
