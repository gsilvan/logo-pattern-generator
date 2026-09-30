import type { Project } from './model';

export type Position = { x: number; y: number };
export type Viewport = Position & { scale: number };
export const BASE_SCALE = 96 / 25.4;
export const screenToWorld = (point: Position, view: Viewport): Position => ({
  x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale,
});
export const worldToScreen = (point: Position, view: Viewport): Position => ({
  x: point.x * view.scale + view.x, y: point.y * view.scale + view.y,
});
export function zoomAt(view: Viewport, point: Position, scale: number): Viewport {
  const next = Math.max(BASE_SCALE * 0.1, Math.min(BASE_SCALE * 8, scale));
  const world = screenToWorld(point, view);
  return { scale: next, x: point.x - world.x * next, y: point.y - world.y * next };
}
export function fitView(width: number, height: number, widthMm: number, heightMm: number): Viewport {
  const scale = Math.max(BASE_SCALE * 0.1, Math.min(BASE_SCALE * 8, Math.min(Math.max(1, width - 96) / widthMm, Math.max(1, height - 96) / heightMm)));
  return { scale, x: (width - widthMm * scale) / 2, y: (height - heightMm * scale) / 2 };
}

// Search repeated, rotated bounds in drawing order. One logical motif can have many hits.
export function hitRepeat(project: Project, point: Position) {
  const tw = project.tileWidthMm, th = project.tileHeightMm;
  for (let index = project.motifs.length - 1; index >= 0; index--) {
    const motif = project.motifs[index];
    if (!motif.visible || motif.locked || motif.opacity === 0) continue;
    const angle = motif.rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
    const rx = (Math.abs(cos) * motif.widthMm + Math.abs(sin) * motif.heightMm) / 2;
    const ry = (Math.abs(sin) * motif.widthMm + Math.abs(cos) * motif.heightMm) / 2;
    const cx = Math.round((point.x - motif.xMm) / tw), cy = Math.round((point.y - motif.yMm) / th);
    // Test the nearest repetition first, including oversized motifs crossing several tiles.
    const nx = Math.ceil(rx / tw), ny = Math.ceil(ry / th);
    if ((nx * 2 + 1) * (ny * 2 + 1) > 1000) continue;
    const candidates: { dx: number; dy: number; distance: number }[] = [];
    for (let iy = -ny; iy <= ny; iy++) for (let ix = -nx; ix <= nx; ix++) {
      const dx = (cx + ix) * tw, dy = (cy + iy) * th;
      const x = point.x - motif.xMm - dx, y = point.y - motif.yMm - dy;
      if (Math.abs(x * cos + y * sin) <= motif.widthMm / 2 && Math.abs(-x * sin + y * cos) <= motif.heightMm / 2) {
        candidates.push({ dx, dy, distance: x * x + y * y });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    if (candidates[0]) return { id: motif.id, dx: candidates[0].dx, dy: candidates[0].dy };
  }
  return null;
}
