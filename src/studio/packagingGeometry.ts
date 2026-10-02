import envelope from './dielines/envelope.svg?raw';
import envelope2 from './dielines/envelope-2.svg?raw';
import envelope3 from './dielines/envelope-3.svg?raw';
import envelope4 from './dielines/envelope-4.svg?raw';
import rigid from './dielines/rigid.svg?raw';
import cartonOutside from './dielines/carton-outside.svg?raw';
import cartonInside from './dielines/carton-inside.svg?raw';
import {
  banderoleSize,
  bleedRect,
  markLines,
  packagingBleedMm,
  pageMarks,
  trim,
  type MarkLine,
} from './banderoleGeometry';
import type { PackagingDocument, PackagingPage } from './model';

export type MmRect = { x: number; y: number; width: number; height: number };
type DieSource = {
  svg: string;
  pageWidth: number;
  pageHeight: number;
  cut: MmRect;
  foldWidth?: number;
  foldHeight?: number;
};
const sources: Record<string, DieSource> = {
  envelope: {
    svg: envelope,
    pageWidth: 192,
    pageHeight: 246,
    cut: { x: 0.5581, y: 0.6077, width: 190.6199, height: 244.5467 },
    foldWidth: 161.777,
    foldHeight: 113.844,
  },
  'envelope-2': {
    svg: envelope2,
    pageWidth: 246,
    pageHeight: 192,
    cut: { x: 0.6077, y: 0.5581, width: 244.5467, height: 190.6199 },
    foldWidth: 113.844,
    foldHeight: 161.777,
  },
  'envelope-3': {
    svg: envelope3,
    pageWidth: 246.2388889,
    pageHeight: 192.2638889,
    cut: { x: 0.5595, y: 0.5595, width: 245.1198, height: 191.1451 },
    foldWidth: 114.112,
    foldHeight: 162.221,
  },
  'envelope-4': {
    svg: envelope4,
    pageWidth: 246,
    pageHeight: 192,
    cut: { x: 0.5485, y: 0.6173, width: 244.5454, height: 190.6199 },
    foldWidth: 113.843,
    foldHeight: 161.776,
  },
  rigid: {
    svg: rigid,
    pageWidth: 266.7,
    pageHeight: 472.3694444,
    cut: { x: 50.7614, y: 33.8474, width: 165.1773, height: 404.6749 },
  },
  'carton-outside': {
    svg: cartonOutside,
    pageWidth: 276.0080417,
    pageHeight: 363.855,
    cut: { x: 9.9926, y: 10.0295, width: 255.806, height: 343.5853 },
  },
  'carton-inside': {
    svg: cartonInside,
    pageWidth: 276.0080417,
    pageHeight: 363.855,
    cut: { x: 9.9922, y: 10.0295, width: 255.8071, height: 343.5853 },
  },
};

export function dieId(doc: PackagingDocument, page: PackagingPage): string {
  if (doc.kind === 'carton') return `carton-${page.face}`;
  if (doc.kind === 'envelope') {
    const sample = doc.templateId.match(/sample-([234])$/)?.[1];
    return sample ? `envelope-${sample}` : page.widthMm > page.heightMm ? 'envelope-2' : 'envelope';
  }
  return doc.kind;
}

function rectWithMargin(rect: MmRect, margin: number): MmRect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
}

function correctedCut(source: DieSource): { cut: MmRect; scaleX: number; scaleY: number } {
  const portrait = source.pageWidth < source.pageHeight;
  const scaleX = source.foldWidth ? (portrait ? 162 : 114) / source.foldWidth : 1;
  const scaleY = source.foldHeight ? (portrait ? 114 : 162) / source.foldHeight : 1;
  const centerX = source.pageWidth / 2,
    centerY = source.pageHeight / 2;
  return {
    cut: {
      x: centerX + (source.cut.x - centerX) * scaleX,
      y: centerY + (source.cut.y - centerY) * scaleY,
      width: source.cut.width * scaleX,
      height: source.cut.height * scaleY,
    },
    scaleX,
    scaleY,
  };
}

export function printGeometry(doc: PackagingDocument, page = doc.pages[doc.selectedPage]) {
  if (doc.kind === 'banderole')
    return {
      media: { x: 0, y: 0, ...banderoleSize },
      trim,
      bleed: bleedRect(packagingBleedMm),
      marks: markLines(packagingBleedMm, pageMarks(page)),
      die: null,
    };
  const source = sources[dieId(doc, page)];
  if (!source) throw new Error('Stanzgeometrie fehlt.');
  const { cut, scaleX, scaleY } = correctedCut(source),
    bleed = rectWithMargin(cut, packagingBleedMm),
    marks = trimMarks(cut, packagingBleedMm),
    margin = 5 + packagingBleedMm;
  const x = Math.min(0, cut.x - margin),
    y = Math.min(0, cut.y - margin),
    right = Math.max(page.widthMm, cut.x + cut.width + margin),
    bottom = Math.max(page.heightMm, cut.y + cut.height + margin);
  return {
    media: { x, y, width: right - x, height: bottom - y },
    trim: cut,
    bleed,
    marks,
    die: {
      ...source,
      scaleX,
      scaleY,
      centerX: source.pageWidth / 2,
      centerY: source.pageHeight / 2,
    },
  };
}

export function trimMarks(rect: MmRect, bleedMm: number): MarkLine[] {
  const lines: MarkLine[] = [];
  for (const x of [rect.x, rect.x + rect.width])
    for (const y of [rect.y, rect.y + rect.height]) {
      const directionX = x === rect.x ? -1 : 1,
        directionY = y === rect.y ? -1 : 1;
      const x1 = x + directionX * (bleedMm + 1),
        x2 = x + directionX * (bleedMm + 4),
        y1 = y + directionY * (bleedMm + 1),
        y2 = y + directionY * (bleedMm + 4);
      lines.push({ kind: 'cutMarks', x1, y1: y, x2, y2: y });
      lines.push({ kind: 'cutMarks', x1: x, y1, x2: x, y2 });
    }
  return lines;
}

export function dieMarkup(
  die: NonNullable<ReturnType<typeof printGeometry>['die']>,
  kind: 'cut' | 'fold',
) {
  const viewBox = die.svg.match(/viewBox="([^"]+)"/)?.[1];
  const group = die.svg.match(new RegExp(`<g id="${kind}">([\\s\\S]*?)<\\/g>`))?.[1];
  if (!viewBox || !group) throw new Error('Stanzvorlage ist unvollständig.');
  const [, , width, height] = viewBox.split(/\s+/).map(Number);
  return `<g transform="translate(${die.centerX} ${die.centerY}) scale(${die.scaleX} ${die.scaleY}) translate(${-die.centerX} ${-die.centerY})"><g transform="scale(${die.pageWidth / width} ${die.pageHeight / height})">${group}</g></g>`;
}
