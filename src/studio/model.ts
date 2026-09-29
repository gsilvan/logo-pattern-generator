export const PPI = 300;
export const mmToPx = (mm: number, ppi = PPI) => Math.round(mm / 25.4 * ppi);
export const cmToMm = (cm: number) => cm * 10;
export const mmToCm = (mm: number) => mm / 10;
export const parseCm = (text: string): number | null => {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() && Number.isFinite(n) ? n : null;
};
export const wrap = (n: number, period: number) => ((n % period) + period) % period;
export type Asset = { id: string; name: string; dataUrl: string; width: number; height: number };
export type Motif = {
  id: string; name: string; assetId: string; xMm: number; yMm: number;
  widthMm: number; heightMm: number; rotation: number; opacity: number;
  visible: boolean; locked: boolean; groupId?: string;
};
export type Packaging = { logoAssetId: string | null; logoWidthMm: number; logoXMm: number; logoYMm: number; logoRotation: number; company: string; street: string; zip: string; city: string };
export type Project = {
  version: 1; sheetWidthMm: number; sheetHeightMm: number; tileWidthMm: number; tileHeightMm: number;
  backgroundColor: string; backgroundAssetId: string | null; assets: Asset[]; motifs: Motif[]; packaging: Packaging;
};
export const initialProject: Project = {
  version: 1, sheetWidthMm: 250, sheetHeightMm: 250, tileWidthMm: 100, tileHeightMm: 100,
  backgroundColor: '#fffdf8', backgroundAssetId: null, assets: [], motifs: [],
  packaging: { logoAssetId: null, logoWidthMm: 35, logoXMm: 50, logoYMm: 61, logoRotation: 0, company: '', street: '', zip: '', city: '' },
};
export function validateProject(input: unknown): Project {
  if (!input || typeof input !== 'object') throw new Error('Projektdatei ist ungültig.');
  const p = input as Project;
  if (p.version !== 1 || !Array.isArray(p.assets) || !Array.isArray(p.motifs)) throw new Error('Unbekanntes Projektformat.');
  if (![p.sheetWidthMm, p.sheetHeightMm].every(n => Number.isFinite(n) && n >= 180 && n <= 350)) throw new Error('Tuchgröße muss zwischen 18 und 35 cm liegen.');
  if (![p.tileWidthMm, p.tileHeightMm].every(n => Number.isFinite(n) && n > 0 && n <= 350)) throw new Error('Ungültige Kachelgröße.');
  if (!p.packaging || typeof p.backgroundColor !== 'string') throw new Error('Projektdatei ist unvollständig.');
  if (p.motifs.some(m => !p.assets.some(a => a.id === m.assetId) || ![m.xMm,m.yMm,m.widthMm,m.heightMm,m.rotation,m.opacity].every(Number.isFinite) || m.widthMm <= 0 || m.heightMm <= 0)) throw new Error('Projekt enthält ungültige Motive.');
  return p;
}
export function placeGrid(asset: Asset, tileWidthMm: number, tileHeightMm: number, widthMm: number, xGapMm: number, yGapMm: number, staggerMm: number): Motif[] {
  const heightMm = widthMm * asset.height / asset.width;
  const pitchX = widthMm + xGapMm, pitchY = heightMm + yGapMm;
  if (pitchX <= 0 || pitchY <= 0 || pitchX < 2 || pitchY < 2) throw new Error('Abstände müssen größer als die Motive sein.');
  const result: Motif[] = [];
  for (let row = 0, y = 0; y < tileHeightMm && result.length < 300; row++, y += pitchY) {
    for (let x = wrap(row % 2 ? staggerMm : 0, pitchX); x < tileWidthMm && result.length < 300; x += pitchX) {
      result.push({ id: crypto.randomUUID(), name: asset.name, assetId: asset.id, xMm: x, yMm: y, widthMm, heightMm, rotation: 0, opacity: 1, visible: true, locked: false });
    }
  }
  return result;
}
