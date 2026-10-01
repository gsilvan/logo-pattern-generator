import { banderoleSize } from './banderoleGeometry';
import { symbolData } from './symbols';
import { mappedFont } from './fonts';
export const PPI = 300;
export const mmToPx = (mm: number, ppi = PPI) => Math.round((mm / 25.4) * ppi);
export const cmToMm = (cm: number) => cm * 10;
export const mmToCm = (mm: number) => mm / 10;
export const parseCm = (text: string): number | null => {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() && Number.isFinite(n) ? n : null;
};
export type Asset = { id: string; name: string; dataUrl: string; width: number; height: number };
export type Motif = {
  id: string;
  name: string;
  assetId: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  groupId?: string;
};
export type Packaging = {
  logoAssetId: string | null;
  logoWidthMm: number;
  logoXMm: number;
  logoYMm: number;
  logoRotation: number;
  company: string;
  street: string;
  zip: string;
  city: string;
};
export type PackagingKind = 'banderole' | 'envelope' | 'rigid' | 'carton';
export type PackagingFace = 'front' | 'back' | 'inside' | 'outside';
export type PackagingLayer = {
  id: string;
  name: string;
  type: 'text' | 'image';
  role?: 'background';
  replacedFont?: string;
  text?: string;
  dataUrl?: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotation: number;
  fontFamily: string;
  fontSizePt: number;
  color: string;
  bold: boolean;
  italic: boolean;
  visible: boolean;
  locked: boolean;
};
export type PackagingPage = {
  face: PackagingFace;
  widthMm: number;
  heightMm: number;
  layers: PackagingLayer[];
  background: string;
  bleedMm?: number;
  cutMarksVisible?: boolean;
  dieLinesVisible?: boolean;
  innerGuidesVisible?: boolean;
};
export type PackagingDocument = {
  kind: PackagingKind;
  templateId: string;
  pages: PackagingPage[];
  selectedPage: number;
};
export type Project = {
  version: 1 | 2;
  sheetWidthMm: number;
  sheetHeightMm: number;
  tileWidthMm: number;
  tileHeightMm: number;
  backgroundColor: string;
  backgroundAssetId: string | null;
  assets: Asset[];
  motifs: Motif[];
  packaging: Packaging;
  packagingDocuments?: Partial<Record<PackagingKind, PackagingDocument>>;
};
export const initialProject: Project = {
  version: 2,
  sheetWidthMm: 300,
  sheetHeightMm: 300,
  tileWidthMm: 60,
  tileHeightMm: 60,
  backgroundColor: '#fffdf8',
  backgroundAssetId: null,
  assets: [],
  motifs: [],
  packaging: {
    logoAssetId: null,
    logoWidthMm: 35,
    logoXMm: 50,
    logoYMm: 61,
    logoRotation: 0,
    company: '',
    street: '',
    zip: '',
    city: '',
  },
};
export function validateProject(input: unknown): Project {
  if (!input || typeof input !== 'object') throw new Error('Projektdatei ist ungültig.');
  const p = input as Project;
  if (![1, 2].includes(p.version) || !Array.isArray(p.assets) || !Array.isArray(p.motifs))
    throw new Error('Unbekanntes Projektformat.');
  if (![p.sheetWidthMm, p.sheetHeightMm].every((n) => Number.isFinite(n) && n >= 180 && n <= 350))
    throw new Error('Tuchgröße muss zwischen 18 und 35 cm liegen.');
  if (![p.tileWidthMm, p.tileHeightMm].every((n) => Number.isFinite(n) && n > 0 && n <= 350))
    throw new Error('Ungültige Kachelgröße.');
  if (!p.packaging || typeof p.backgroundColor !== 'string')
    throw new Error('Projektdatei ist unvollständig.');
  if (
    p.motifs.some(
      (m) =>
        !p.assets.some((a) => a.id === m.assetId) ||
        ![m.xMm, m.yMm, m.widthMm, m.heightMm, m.rotation, m.opacity].every(Number.isFinite) ||
        m.widthMm <= 0 ||
        m.heightMm <= 0,
    )
  )
    throw new Error('Projekt enthält ungültige Motive.');
  if (
    p.packagingDocuments &&
    Object.entries(p.packagingDocuments).some(
      ([kind, doc]) =>
        !['banderole', 'envelope', 'rigid', 'carton'].includes(kind) ||
        !doc ||
        !Array.isArray(doc.pages) ||
        !doc.pages.length ||
        !Number.isInteger(doc.selectedPage) ||
        doc.selectedPage < 0 ||
        doc.selectedPage >= doc.pages.length ||
        doc.pages.some(
          (page) =>
            (page.bleedMm !== undefined &&
              (!Number.isFinite(page.bleedMm) || page.bleedMm < 0 || page.bleedMm > 5)) ||
            [page.cutMarksVisible, page.dieLinesVisible, page.innerGuidesVisible].some(
              (value) => value !== undefined && typeof value !== 'boolean',
            ) ||
            !Number.isFinite(page.widthMm) ||
            !Number.isFinite(page.heightMm) ||
            !Array.isArray(page.layers) ||
            page.layers.some(
              (layer) =>
                ![layer.xMm, layer.yMm, layer.widthMm, layer.heightMm, layer.rotation].every(
                  Number.isFinite,
                ) ||
                layer.widthMm <= 0 ||
                layer.heightMm <= 0 ||
                (layer.role !== undefined &&
                  (layer.role !== 'background' || layer.type !== 'image')) ||
                (layer.type === 'text' &&
                  (!Number.isFinite(layer.fontSizePt) || layer.fontSizePt <= 0)) ||
                !['text', 'image'].includes(layer.type) ||
                (layer.type === 'image' && typeof layer.dataUrl !== 'string') ||
                (layer.type === 'text' && typeof layer.text !== 'string'),
            ),
        ),
    )
  )
    throw new Error('Projekt enthält ungültige Verpackungsebenen.');
  const upgraded = { ...p, version: 2 as const };
  if (p.version === 1 && !p.packagingDocuments) {
    const legacyLogo = p.assets.find((asset) => asset.id === p.packaging.logoAssetId);
    const doc = {
      kind: 'banderole' as const,
      templateId: 'banderole-legacy',
      selectedPage: 0,
      pages: [
        {
          face: 'front' as const,
          widthMm: banderoleSize.width,
          heightMm: banderoleSize.height,
          background: '#ffffff',
          layers: [
            ...(p.packaging.logoAssetId
              ? [
                  {
                    id: crypto.randomUUID(),
                    name: 'Logo',
                    type: 'image' as const,
                    dataUrl: p.assets.find((asset) => asset.id === p.packaging.logoAssetId)
                      ?.dataUrl,
                    xMm: 117.5 + p.packaging.logoXMm,
                    yMm: 10 + p.packaging.logoYMm,
                    widthMm: p.packaging.logoWidthMm,
                    heightMm: legacyLogo
                      ? (p.packaging.logoWidthMm * legacyLogo.height) / legacyLogo.width
                      : p.packaging.logoWidthMm,
                    rotation: p.packaging.logoRotation,
                    fontFamily: 'Arial',
                    fontSizePt: 12,
                    color: '#27303d',
                    bold: false,
                    italic: false,
                    visible: true,
                    locked: false,
                  },
                ]
              : []),
            ...[
              [p.packaging.company, 190],
              [p.packaging.street, 193],
              [[p.packaging.zip, p.packaging.city].filter(Boolean).join(' '), 196],
            ]
              .filter(([text]) => Boolean(text))
              .map(([text, x]) => ({
                id: crypto.randomUUID(),
                name: String(text).slice(0, 32),
                type: 'text' as const,
                text: String(text),
                xMm: Number(x),
                yMm: 30,
                widthMm: 50,
                heightMm: 6,
                rotation: 0,
                fontFamily: 'Arial',
                fontSizePt: 8,
                color: '#27303d',
                bold: false,
                italic: false,
                visible: true,
                locked: false,
              })),
          ],
        },
      ],
    };
    upgraded.packagingDocuments = { banderole: doc };
  }
  if (upgraded.packagingDocuments) {
    const documents = { ...upgraded.packagingDocuments };
    for (const kind of ['banderole', 'envelope', 'rigid'] as const) {
      const doc = documents[kind];
      if (doc && doc.pages.length > 1) {
        documents[kind] = {
          ...doc,
          selectedPage: 0,
          pages: [
            {
              ...doc.pages[0],
              layers: doc.pages.flatMap((page) => page.layers),
            },
          ],
        };
      }
    }
    if (documents.banderole)
      documents.banderole = {
        ...documents.banderole,
        pages: documents.banderole.pages.map((page) => ({
          ...page,
          layers: page.layers.map((layer) =>
            layer.type === 'text' && ['♡', '✿', '✓', '♻'].includes(layer.text ?? '')
              ? { ...layer, type: 'image' as const, dataUrl: symbolData(layer.text!) }
              : layer.type === 'text' && mappedFont(layer.fontFamily) !== layer.fontFamily
                ? {
                    ...layer,
                    replacedFont: layer.fontFamily,
                    fontFamily: mappedFont(layer.fontFamily),
                  }
                : layer,
          ),
        })),
      };
    upgraded.packagingDocuments = documents;
  }
  return upgraded;
}
