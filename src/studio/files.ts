import { packagingPdf, packagingSvg } from './banderoleExport';
import { pageMarks, type PrintOptions } from './banderoleGeometry';
import type { Asset, PackagingDocument, Project } from './model';
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
  },
) {
  const pdf = await packagingPdf(document, {
    ...pageMarks(document.pages[document.selectedPage]),
    ...options,
  });
  const name = document.templateId.replace(/[^a-z0-9-]+/gi, '_');
  pdf.save(`Verpackung_${document.kind}_${name}.pdf`);
}

export async function exportPackagingSvg(document: PackagingDocument, options: PrintOptions) {
  const { svg } = await packagingSvg(document, options);
  const suffix = document.kind === 'carton' ? `_${document.pages[document.selectedPage].face}` : '';
  downloadBlob(
    new Blob([svg], { type: 'image/svg+xml' }),
    `Verpackung_${document.kind}_${document.templateId}${suffix}.svg`,
  );
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
