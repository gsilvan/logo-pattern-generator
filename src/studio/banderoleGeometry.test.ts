import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  markLines,
  marksSvg,
  bleedRect,
  backgroundPlacement,
  banderoleSize,
  foldPositions,
  stickerPaths,
  trim,
} from './banderoleGeometry';
import { initialProject, validateProject } from './model';
import { makePackagingDocument } from './packagingTemplates';

describe('Banderole print geometry', () => {
  it('uses the SVG page and finished document dimensions', () => {
    expect(banderoleSize).toEqual({ width: 255, height: 67 });
    expect(trim).toEqual({ x: 10, y: 10, width: 235, height: 47 });
    expect(bleedRect()).toEqual({
      x: 7,
      y: 7,
      width: 241,
      height: 53,
    });
  });
  it('places all eight 3 mm crop marks at independently specified coordinates', () => {
    const result = markLines(3, { cutMarks: true, dieLines: false, innerGuides: false });
    const expected = [
      [3, 10, 6, 10],
      [10, 3, 10, 6],
      [3, 57, 6, 57],
      [10, 61, 10, 64],
      [249, 10, 252, 10],
      [245, 3, 245, 6],
      [249, 57, 252, 57],
      [245, 61, 245, 64],
    ];
    result.forEach((line, i) =>
      [line.x1, line.y1, line.x2, line.y2].forEach((n, j) =>
        expect(n).toBeCloseTo(expected[i][j], 8),
      ),
    );
    expect(result).toHaveLength(8);
  });
  it.each([0, 1, 3, 5])('keeps crop marks outside %s mm bleed and within media', (bleed) => {
    const area = bleedRect(bleed);
    for (const line of markLines(bleed, { cutMarks: true, dieLines: false, innerGuides: false })) {
      expect(Math.hypot(line.x2 - line.x1, line.y2 - line.y1)).toBeCloseTo(3, 9);
      for (const [x, y] of [
        [line.x1, line.y1],
        [line.x2, line.y2],
      ]) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(255);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(67);
        expect(
          x <= area.x - 1 ||
            x >= area.x + area.width + 1 ||
            y <= area.y - 1 ||
            y >= area.y + area.height + 1,
        ).toBe(true);
      }
    }
  });
  it('uses four SVG folds only in the editor guides', () => {
    expect(markLines(3, { cutMarks: false, dieLines: true, innerGuides: false })).toHaveLength(4);
    const guides = markLines(3, { cutMarks: false, dieLines: false, innerGuides: true });
    expect(guides).toHaveLength(4);
    expect(guides.map((guide) => guide.x1)).toEqual(foldPositions);
    expect(marksSvg(3, { cutMarks: false, dieLines: false, innerGuides: true })).toBe('');
  });
  it('matches the named contours in the revised SVG', () => {
    const svg = readFileSync(
      new URL('../../public/packaging-guides/banderole.svg', import.meta.url),
      'utf8',
    );
    const ptToMm = 25.4 / 72;
    expect(722.83203 * ptToMm).toBeCloseTo(banderoleSize.width, 2);
    expect(189.92188 * ptToMm).toBeCloseTo(banderoleSize.height, 2);
    expect(28.343749 * ptToMm).toBeCloseTo(trim.x, 2);
    expect(28.34766 * ptToMm).toBeCloseTo(trim.y, 2);
    expect((694.48438 - 28.343749) * ptToMm).toBeCloseTo(trim.width, 2);
    expect((161.57422 - 28.34766) * ptToMm).toBeCloseTo(trim.height, 2);
    for (const [name, x] of [
      ['falz1', 184.2544],
      ['falz2', 219.6875],
      ['falz3', 503.1521],
      ['falz4', 538.5851],
    ] as const) {
      expect(svg).toContain(`inkscape:label="${name}"`);
      expect((x - 0.0078125) * ptToMm).toBeCloseTo(foldPositions[Number(name.at(-1)) - 1], 1);
    }
    const clipPath = (id: string) =>
      svg.match(new RegExp(`<clipPath\\s+id="${id}">[\\s\\S]*?\\bd="([^"]+)"`))?.[1];
    expect(clipPath('clip-9')).toBe(stickerPaths.left);
    expect(clipPath('clip-1')).toContain(stickerPaths.right);
  });
  it('covers the bleed area proportionally', () => {
    const image = backgroundPlacement(100, 100, 5);
    expect(image.widthMm).toBeCloseTo(245, 8);
    expect(image.heightMm).toBeCloseTo(245, 8);
    expect(image.xMm).toBe(127.5);
    expect(image.yMm).toBe(33.5);
  });
  it('validates bleed and retains legacy object geometry while mapping fonts', () => {
    const doc = makePackagingDocument('banderole', 0);
    doc.pages[0].layers[0].fontFamily = 'Georgia';
    const original = doc.pages[0].layers[0];
    const project = { ...initialProject, packagingDocuments: { banderole: doc } };
    const loaded = validateProject(project).packagingDocuments!.banderole!.pages[0].layers[0];
    expect(loaded).toEqual({
      ...original,
      fontFamily: 'Liberation Serif',
      replacedFont: 'Georgia',
    });
    doc.pages[0].bleedMm = 6;
    expect(() => validateProject(project)).toThrow();
  });
});
