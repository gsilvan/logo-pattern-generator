import { describe,it,expect } from 'vitest';
import { mmToPx, parseCm, initialProject, validateProject } from './model';
describe('physical geometry and repeat cycles',()=>{
  it('starts projects with a 6 cm repeat tile and a 30 cm sheet',()=>{
    expect([initialProject.tileWidthMm,initialProject.tileHeightMm]).toEqual([60,60]);
    expect([initialProject.sheetWidthMm,initialProject.sheetHeightMm]).toEqual([300,300]);
  });
  it('uses exact 300 PPI output dimensions at common wrap sizes',()=>{
    expect(mmToPx(250)).toBe(2953);
    expect(mmToPx(350)).toBe(4134);
    expect(mmToPx(180)).toBe(2126);
  });
  it('accepts German decimals and rejects empty or invalid measurements',()=>{
    expect(parseCm('25,5')).toBe(25.5);
    expect(parseCm('25.5')).toBe(25.5);
    expect(parseCm('')).toBeNull();
    expect(parseCm('abc')).toBeNull();
  });
  it('rejects invalid print dimensions in imported projects',()=>{
    expect(()=>validateProject({...initialProject,sheetWidthMm:999})).toThrow();
  });
});
