import { describe, expect, it } from 'vitest';
import { dieMarkup, printGeometry } from './packagingGeometry';
import { makePackagingDocument } from './packagingTemplates';

describe('packaging print geometry', () => {
  it('uses the measured source die bounds and exact three millimetre cut marks', () => {
    const rigid = printGeometry(makePackagingDocument('rigid'));
    for (const [coordinate, expected] of Object.entries({
      x: 50.7614,
      y: 33.8474,
      width: 165.1773,
      height: 404.6749,
    }))
      expect(rigid.trim[coordinate as keyof typeof rigid.trim]).toBeCloseTo(expected, 6);
    const topLeft = rigid.marks.slice(0, 2);
    for (const [line, values] of [
      [topLeft[0], [46.7614, 33.8474, 43.7614, 33.8474]],
      [topLeft[1], [50.7614, 29.8474, 50.7614, 26.8474]],
    ] as const)
      [line.x1, line.y1, line.x2, line.y2].forEach((value, index) =>
        expect(value).toBeCloseTo(values[index], 6),
      );
    for (const line of rigid.marks) {
      const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
      expect(length).toBeCloseTo(3, 8);
    }
  });
  it('keeps the folded C6 panel at its nominal 114 × 162 mm', () => {
    for (const sample of [-1, 0, 1, 2, 3]) {
      const doc = makePackagingDocument('envelope', sample);
      const die = printGeometry(doc).die!;
      const portrait = doc.pages[0].widthMm < doc.pages[0].heightMm;
      expect(die.foldWidth! * die.scaleX).toBeCloseTo(portrait ? 162 : 114, 6);
      expect(die.foldHeight! * die.scaleY).toBeCloseTo(portrait ? 114 : 162, 6);
    }
  });

  it('keeps every mark outside the bleed and inside the complete media page', () => {
    for (const kind of ['envelope', 'rigid', 'carton'] as const)
      for (const sample of [
        -1,
        ...Array.from({ length: kind === 'envelope' ? 4 : 3 }, (_, i) => i),
      ]) {
        const doc = makePackagingDocument(kind, sample);
        for (const page of doc.pages)
          for (const bleedMm of [0, 3, 5]) {
            const geometry = printGeometry(doc, { ...page, bleedMm });
            expect(geometry.marks).toHaveLength(8);
            for (const line of geometry.marks) {
              for (const [x, y] of [
                [line.x1, line.y1],
                [line.x2, line.y2],
              ]) {
                expect(x).toBeGreaterThan(geometry.media.x);
                expect(x).toBeLessThan(geometry.media.x + geometry.media.width);
                expect(y).toBeGreaterThan(geometry.media.y);
                expect(y).toBeLessThan(geometry.media.y + geometry.media.height);
              }
              const xMin = Math.min(line.x1, line.x2),
                xMax = Math.max(line.x1, line.x2),
                yMin = Math.min(line.y1, line.y2),
                yMax = Math.max(line.y1, line.y2);
              expect(
                xMax <= geometry.bleed.x - 1 + 1e-6 ||
                  xMin >= geometry.bleed.x + geometry.bleed.width + 1 - 1e-6 ||
                  yMax <= geometry.bleed.y - 1 + 1e-6 ||
                  yMin >= geometry.bleed.y + geometry.bleed.height + 1 - 1e-6,
              ).toBe(true);
            }
          }
      }
  });

  it('contains only die and fold vectors in the prepared SVGs', () => {
    for (const kind of ['envelope', 'rigid', 'carton'] as const) {
      const doc = makePackagingDocument(kind, 2);
      for (const page of doc.pages) {
        const die = printGeometry(doc, page).die!;
        const cut = dieMarkup(die, 'cut'),
          fold = dieMarkup(die, 'fold');
        expect(cut).toContain('<path');
        expect(fold).toContain('<path');
        expect(cut).not.toMatch(/<image|<text|<clipPath/);
        expect(fold).not.toMatch(/<image|<text|<clipPath/);
      }
    }
  });
});
