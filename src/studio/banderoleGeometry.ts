import type { PackagingPage } from './model';

// Nominal millimetre sizes from public/packaging-guides/banderole.svg (source units: points).
export const banderoleSize = { width: 255, height: 67 };
export const trim = { x: 10, y: 10, width: 235, height: 47 };
export const foldPositions = [65, 77.5, 177.5, 190];
// The filled contours in the SVG's "aufkleber" group, in source point coordinates.
export const stickerPaths = {
  left: 'm 61.875,64.898438 c 18.066406,18.0625 18.066406,47.351562 0,65.417972 -18.066406,18.0625 -47.355469,18.0625 -65.417969,0 -18.066406,-18.06641 -18.066406,-47.355472 0,-65.417972 18.0625,-18.066407 47.351563,-18.066407 65.417969,0',
  right:
    'M 634.96484,31.601562 V 49.375 c -23.66797,2.03125 -42.2539,21.875 -42.2539,46.074219 0,24.199221 18.58593,44.042971 42.2539,46.074221 v 16.08593 h 56.25782 V 31.601562 Z',
} as const;
export const stickerClips = {
  left: { x: 27.839844, y: 37, width: 61.160156, height: 117.32422 },
  right: { x: 592, y: 31, width: 100, height: 127 },
} as const;
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
  for (const x of foldPositions) add('innerGuides', x, trim.y, x, bottom);
  return lines;
}
export const markColor = (kind: keyof MarkOptions) =>
  kind === 'cutMarks' ? '#000000' : kind === 'innerGuides' ? '#a05b77' : '#33b540';
export const markWidth = (kind: keyof MarkOptions) =>
  kind === 'cutMarks' ? 0.15 : (0.8 * 25.4) / 72;
export function marksSvg(bleed: number, options: MarkOptions) {
  return markLines(bleed, { ...options, innerGuides: false })
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
