import { describe, it, expect } from 'vitest';
import { BASE_SCALE, fitView, hitRepeat, screenToWorld, worldToScreen, zoomAt } from './viewport';
import { initialProject, type Motif } from './model';
const motif: Motif = { id: 'leaf', assetId: 'asset', name: 'Blatt', xMm: 0, yMm: 40, widthMm: 20, heightMm: 10, rotation: 0, opacity: 1, visible: true, locked: false };
describe('shared viewport geometry', () => {
  it('keeps the world point under the pointer fixed when zooming a panned view', () => {
    const view = { scale: 2, x: -137, y: 42 }, pointer = { x: 431, y: 218 };
    const world = screenToWorld(pointer, view), zoomed = zoomAt(view, pointer, 8);
    expect(worldToScreen(world, zoomed)).toEqual(pointer);
    expect(screenToWorld(pointer, zoomed)).toEqual(world);
  });
  it('fits rectangular sheets without stretching and clamps extreme zoom', () => {
    const view = fitView(1000, 700, 350, 180);
    expect(view.scale).toBeCloseTo(904 / 350);
    expect(view.x).toBeCloseTo(48);
    expect(view.y * 2 + 180 * view.scale).toBeCloseTo(700);
    expect(zoomAt(view, { x: 0, y: 0 }, 0).scale).toBe(BASE_SCALE * 0.1);
    expect(zoomAt(view, { x: 0, y: 0 }, 999).scale).toBe(BASE_SCALE * 8);
  });
  it('maps edge fragments and negative repetitions to the same motif', () => {
    const project = { ...initialProject, tileWidthMm: 100, tileHeightMm: 80, motifs: [motif] };
    expect(hitRepeat(project, { x: 99, y: 40 })).toEqual({ id: 'leaf', dx: 100, dy: 0 });
    expect(hitRepeat(project, { x: -101, y: -40 })).toEqual({ id: 'leaf', dx: -100, dy: -80 });
    expect(hitRepeat(project, { x: 20, y: 40 })).toBeNull();
  });
  it('respects rotated bounds, layer order, visibility and locks', () => {
    const rotated = { ...motif, rotation: 90 };
    const project = { ...initialProject, motifs: [rotated, { ...rotated, id: 'top', locked: true }] };
    expect(hitRepeat(project, { x: 0, y: 49 })?.id).toBe('leaf');
    expect(hitRepeat(project, { x: 9, y: 40 })).toBeNull();
    project.motifs[1].locked = false;
    expect(hitRepeat(project, { x: 0, y: 40 })?.id).toBe('top');
    project.motifs[1].visible = false;
    expect(hitRepeat(project, { x: 0, y: 40 })?.id).toBe('leaf');
  });
  it('handles motifs wider than a tile and avoids unbounded work for tiny imported tiles', () => {
    expect(hitRepeat({ ...initialProject, motifs: [{ ...motif, widthMm: 250 }] }, { x: 90, y: 40 })).toEqual({ id: 'leaf', dx: 100, dy: 0 });
    expect(hitRepeat({ ...initialProject, tileWidthMm: 0.0001, motifs: [motif] }, { x: 1, y: 40 })).toBeNull();
  });
});
