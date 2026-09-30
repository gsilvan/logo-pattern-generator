import { describe,it,expect } from 'vitest';
import { mmToPx, parseCm, wrap, placeGrid, initialProject, validateProject } from './model';
const asset={id:'a',name:'test',dataUrl:'data:image/png;base64,AA==',width:100,height:100};
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
  it('wraps negative coordinates the same way as positive coordinates',()=>{
    expect(wrap(-10,40)).toBe(30);
    expect(wrap(50,40)).toBe(10);
  });
  it('creates the two-row staggered repeat with one consistent pitch',()=>{
    const motifs=placeGrid(asset,40,80,30,10,10,20);
    expect(motifs.map(m=>[m.xMm,m.yMm])).toEqual([[0,0],[20,40]]);
  });
  it('rejects invalid print dimensions in imported projects',()=>{
    expect(()=>validateProject({...initialProject,sheetWidthMm:999})).toThrow();
  });
});
