import type { PackagingPage } from './model';

export const banderoleSize = { width: 255.002, height: 66.583 };
export const trim = { x: 10.001, y: 9.7915, width: 235, height: 47 };
export type MarkOptions = { cutMarks: boolean; dieLines: boolean; innerGuides: boolean };
export type PrintOptions = MarkOptions & { textMode: 'text' | 'paths' };
export function pageMarks(page: PackagingPage): MarkOptions {
  return {
    cutMarks: page.cutMarksVisible ?? true,
    dieLines: page.dieLinesVisible ?? true,
    innerGuides: page.innerGuidesVisible ?? true,
  };
}
export function bleedRect(bleed = 3) {
  if (!Number.isFinite(bleed) || bleed < 0 || bleed > 5)
    throw new Error('Beschnitt muss zwischen 0 und 5 mm liegen.');
  return {
    x: trim.x - bleed,
    y: trim.y - bleed,
    width: trim.width + 2 * bleed,
    height: trim.height + 2 * bleed,
  };
}
export type MarkLine = { x1: number; y1: number; x2: number; y2: number; kind: keyof MarkOptions };
export function markLines(
  bleed = 3,
  options: MarkOptions = { cutMarks: true, dieLines: true, innerGuides: true },
): MarkLine[] {
  bleedRect(bleed);
  const lines: MarkLine[] = [];
  const add = (kind: keyof MarkOptions, x1: number, y1: number, x2: number, y2: number) => {
    if (options[kind]) lines.push({ kind, x1, y1, x2, y2 });
  };
  const right = trim.x + trim.width,
    bottom = trim.y + trim.height;
  for (const x of [trim.x, right])
    for (const y of [trim.y, bottom]) {
      const startX = x === trim.x ? x - bleed - 4 : x + bleed + 1;
      const startY = y === trim.y ? y - bleed - 4 : y + bleed + 1;
      add('cutMarks', startX, y, startX + 3, y);
      add('cutMarks', x, startY, x, startY + 3);
    }
  add('dieLines', trim.x, trim.y, right, trim.y);
  add('dieLines', right, trim.y, right, bottom);
  add('dieLines', right, bottom, trim.x, bottom);
  add('dieLines', trim.x, bottom, trim.x, trim.y);
  // Internal rules from the source PDF, in points. Kept distinct from the exact trim rectangle.
  for (const pt of [187.09, 366.61, 506.46])
    add('innerGuides', (pt * 25.4) / 72, trim.y, (pt * 25.4) / 72, bottom);
  return lines;
}
export const markColor = (kind: keyof MarkOptions) => (kind === 'cutMarks' ? '#000000' : '#33b540');
export const markWidth = (kind: keyof MarkOptions) =>
  kind === 'cutMarks' ? 0.15 : (0.8 * 25.4) / 72;
export function marksSvg(bleed: number, options: MarkOptions) {
  return markLines(bleed, options)
    .map(
      (l) =>
        `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${markColor(l.kind)}" stroke-width="${markWidth(l.kind)}"/>`,
    )
    .join('');
}
export function backgroundPlacement(width: number, height: number, bleed = 3) {
  const area = bleedRect(bleed),
    scale = Math.max(area.width / width, area.height / height);
  return {
    xMm: banderoleSize.width / 2,
    yMm: banderoleSize.height / 2,
    widthMm: width * scale,
    heightMm: height * scale,
  };
}
