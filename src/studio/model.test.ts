import { describe, it, expect } from 'vitest';
import { mmToPx, parseCm, initialProject, validateProject } from './model';
import { makePackagingDocument } from './packagingTemplates';
describe('physical geometry and repeat cycles', () => {
  it('starts projects with a 6 cm repeat tile and a 30 cm sheet', () => {
    expect([initialProject.tileWidthMm, initialProject.tileHeightMm]).toEqual([60, 60]);
    expect([initialProject.sheetWidthMm, initialProject.sheetHeightMm]).toEqual([300, 300]);
  });
  it('uses exact 300 PPI output dimensions at common wrap sizes', () => {
    expect(mmToPx(250)).toBe(2953);
    expect(mmToPx(350)).toBe(4134);
    expect(mmToPx(180)).toBe(2126);
  });
  it('accepts German decimals and rejects empty or invalid measurements', () => {
    expect(parseCm('25,5')).toBe(25.5);
    expect(parseCm('25.5')).toBe(25.5);
    expect(parseCm('')).toBeNull();
    expect(parseCm('abc')).toBeNull();
  });
  it('rejects invalid print dimensions in imported projects', () => {
    expect(() => validateProject({ ...initialProject, sheetWidthMm: 999 })).toThrow();
  });
  it('migrates version 1 packaging fields into editable banderole layers', () => {
    const legacy = {
      ...initialProject,
      version: 1,
      packaging: {
        ...initialProject.packaging,
        company: 'Musterfirma',
        street: 'Musterstraße 1',
        zip: '12345',
        city: 'Musterstadt',
      },
    };
    const migrated = validateProject(legacy);
    expect(migrated.version).toBe(2);
    expect(
      migrated.packagingDocuments?.banderole?.pages[0].layers.map((layer) => layer.text),
    ).toEqual(['Musterfirma', 'Musterstraße 1', '12345 Musterstadt']);
  });
  it('migrates old multi-page wrap designs into one printable page', () => {
    const banderole = makePackagingDocument('banderole', 0);
    const legacy = validateProject({
      ...initialProject,
      packagingDocuments: {
        banderole: {
          ...banderole,
          pages: [banderole.pages[0], { ...banderole.pages[0], layers: [] }],
        },
      },
    });
    expect(legacy.packagingDocuments?.banderole?.pages).toHaveLength(1);
    expect(legacy.packagingDocuments?.banderole?.pages[0].layers).toHaveLength(
      banderole.pages[0].layers.length,
    );
  });
});
