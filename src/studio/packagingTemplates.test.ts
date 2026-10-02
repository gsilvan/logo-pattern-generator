import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  listPackagingTemplates,
  makePackagingDocument,
  packagingTypes,
  packagingGuide,
} from './packagingTemplates';

describe('packaging templates', () => {
  it('uses nominal page dimensions near the source PDFs', () => {
    expect(packagingTypes.map(({ kind, widthMm, heightMm }) => [kind, widthMm, heightMm])).toEqual([
      ['banderole', 255, 67],
      ['envelope', 192, 246],
      ['rigid', 266.7, 472.37],
      ['carton', 276, 364],
    ]);
  });

  it('provides a blank template and all supplied example slots', () => {
    expect(
      packagingTypes.reduce((sum, type) => sum + listPackagingTemplates(type.kind).length - 1, 0),
    ).toBe(13);
    expect(makePackagingDocument('carton', 1).pages.map((page) => page.face)).toEqual([
      'outside',
      'inside',
    ]);
    expect(makePackagingDocument('envelope', 2).pages[0].widthMm).toBe(246);
    expect(makePackagingDocument('envelope', 2).pages[0].heightMm).toBe(192);
    for (const sample of [1, 3]) {
      const page = makePackagingDocument('envelope', sample).pages[0];
      expect([page.widthMm, page.heightMm]).toEqual([246, 192]);
    }
    expect(makePackagingDocument('banderole', -1).pages[0].layers).toHaveLength(0);
    for (const kind of ['banderole', 'envelope', 'rigid'] as const) {
      expect(makePackagingDocument(kind, 0).pages).toHaveLength(1);
      expect(makePackagingDocument(kind, 0).pages[0].layers.length).toBeGreaterThan(3);
    }
  });
  it('keeps revised banderole examples inside areas clear of folds and stickers', () => {
    for (const sample of [0, 1, 2]) {
      const page = makePackagingDocument('banderole', sample).pages[0];
      for (const layer of page.layers) {
        const left = layer.xMm - layer.widthMm / 2;
        const right = layer.xMm + layer.widthMm / 2;
        const top = layer.yMm - layer.heightMm / 2;
        const bottom = layer.yMm + layer.heightMm / 2;
        expect(
          (left >= 29 && right <= 64) ||
            (left >= 79 && right <= 176) ||
            (left >= 191 && right <= 208),
          layer.name,
        ).toBe(true);
        expect(top, layer.name).toBeGreaterThanOrEqual(10);
        expect(bottom, layer.name).toBeLessThanOrEqual(57);
      }
    }
  });
  it('uses guides at their native PDF size for every example and page orientation', () => {
    for (const type of packagingTypes) {
      for (let sample = -1; sample < type.examples.length; sample++) {
        const document = makePackagingDocument(type.kind, sample);
        for (const page of document.pages) {
          const filename = packagingGuide(document, page).split('/').at(-1)!;
          const svg = readFileSync(
            new URL(`../../public/packaging-guides/${filename}`, import.meta.url),
            'utf8',
          );
          const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
          expect(viewBox, filename).not.toBeNull();
          expect(Math.abs((Number(viewBox[1]) * 25.4) / 72 - page.widthMm), filename).toBeLessThan(
            0.5,
          );
          expect(Math.abs((Number(viewBox[2]) * 25.4) / 72 - page.heightMm), filename).toBeLessThan(
            0.5,
          );
        }
      }
    }
  });
});
