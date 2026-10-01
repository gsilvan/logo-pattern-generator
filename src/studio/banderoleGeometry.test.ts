import { describe, it, expect } from 'vitest';
import { markLines, bleedRect, backgroundPlacement, trim } from './banderoleGeometry';
import { initialProject, validateProject } from './model';
import { makePackagingDocument } from './packagingTemplates';

describe('Banderole print geometry', () => {
  it('centers a 235 × 47 mm trim on the original PDF page', () => {
    expect(trim).toEqual({ x: 10.001, y: 9.7915, width: 235, height: 47 });
    expect(bleedRect()).toEqual({
      x: expect.closeTo(7.001, 8),
      y: expect.closeTo(6.7915, 8),
      width: 241,
      height: 53,
    });
  });
  it('places all eight 3 mm crop marks at independently specified coordinates', () => {
    const result = markLines(3, { cutMarks: true, dieLines: false, innerGuides: false });
    const expected = [
      [3.001, 9.7915, 6.001, 9.7915],
      [10.001, 2.7915, 10.001, 5.7915],
      [3.001, 56.7915, 6.001, 56.7915],
      [10.001, 60.7915, 10.001, 63.7915],
      [249.001, 9.7915, 252.001, 9.7915],
      [245.001, 2.7915, 245.001, 5.7915],
      [249.001, 56.7915, 252.001, 56.7915],
      [245.001, 60.7915, 245.001, 63.7915],
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
        expect(x).toBeLessThan(255.002);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(66.583);
        expect(
          x <= area.x - 1 ||
            x >= area.x + area.width + 1 ||
            y <= area.y - 1 ||
            y >= area.y + area.height + 1,
        ).toBe(true);
      }
    }
  });
  it('separates contours and source PDF inner guides', () => {
    expect(markLines(3, { cutMarks: false, dieLines: true, innerGuides: false })).toHaveLength(4);
    const guides = markLines(3, { cutMarks: false, dieLines: false, innerGuides: true });
    expect(guides).toHaveLength(3);
    expect(guides[0].x1).toBeCloseTo(66.0011944444, 8);
  });
  it('covers the bleed area proportionally', () => {
    const image = backgroundPlacement(100, 100, 5);
    expect(image.widthMm).toBeCloseTo(245, 8);
    expect(image.heightMm).toBeCloseTo(245, 8);
    expect(image.xMm).toBe(127.501);
    expect(image.yMm).toBe(33.2915);
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
