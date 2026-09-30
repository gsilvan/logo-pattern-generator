import { useEffect, useRef } from 'react';
import { Canvas, Rect, ActiveSelection, Point, type FabricObject } from 'fabric';
import { useStudio } from './store';
import type { Motif } from './model';
import { hitRepeat, screenToWorld, zoomAt, type Position, type Viewport } from './viewport';

type Proxy = Rect & { studioId: string; offset: Position };
type Props = { view: Viewport; width: number; height: number; hand: boolean; onView: (view: Viewport) => void };

export function Editor(props: Props) {
  const element = useRef<HTMLCanvasElement>(null), host = useRef<HTMLDivElement>(null);
  const current = useRef(props), api = useRef<{ camera: () => void } | null>(null);
  current.current = props;
  useEffect(() => {
    if (!element.current || !host.current) return;
    const root = host.current;
    const canvas = new Canvas(element.current, {
      width: current.current.width, height: current.current.height, enablePointerEvents: true,
      preserveObjectStacking: true, selection: true, selectionColor: '#2563eb12', selectionBorderColor: '#2563eb',
    });
    const proxies = new Map<string, Proxy>();
    let syncing = false, space = false, transforming = false, cancelling = false;
    const camera = () => {
      const { view, width, height, hand } = current.current;
      if (canvas.width !== width || canvas.height !== height) canvas.setDimensions({ width, height });
      canvas.setViewportTransform([view.scale, 0, 0, view.scale, view.x, view.y]);
      canvas.selection = !hand && !space;
      canvas.defaultCursor = hand || space ? 'grab' : 'default';
      canvas.requestRenderAll();
    };
    const sync = () => {
      if (transforming) return;
      syncing = true;
      const { project, selectedIds } = useStudio.getState();
      canvas.discardActiveObject();
      const ids = new Set(project.motifs.filter(m => m.visible && !m.locked && m.opacity > 0).map(m => m.id));
      for (const [id, object] of proxies) if (!ids.has(id)) { canvas.remove(object); proxies.delete(id); }
      for (const motif of project.motifs) {
        if (!ids.has(motif.id)) continue;
        let object = proxies.get(motif.id);
        if (!object) {
          object = Object.assign(new Rect({
            fill: 'transparent', strokeWidth: 0, originX: 'center', originY: 'center',
            borderColor: '#2563eb', cornerColor: '#fff', cornerStrokeColor: '#2563eb',
            transparentCorners: false, cornerSize: 9, padding: 2, lockScalingFlip: true,
          }), { studioId: motif.id, offset: { x: 0, y: 0 } });
          object.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
          proxies.set(motif.id, object); canvas.add(object);
        }
        object.set({ left: motif.xMm + object.offset.x, top: motif.yMm + object.offset.y,
          width: motif.widthMm, height: motif.heightMm, scaleX: 1, scaleY: 1, angle: motif.rotation });
        object.setCoords(); canvas.moveObjectTo(object, project.motifs.indexOf(motif));
      }
      const selected = selectedIds.map(id => proxies.get(id)).filter((object): object is Proxy => !!object);
      if (selected.length > 1) canvas.setActiveObject(new ActiveSelection(selected, { canvas, borderColor: '#2563eb', cornerColor: '#fff', cornerStrokeColor: '#2563eb', transparentCorners: false, lockScalingFlip: true }));
      else if (selected.length === 1) canvas.setActiveObject(selected[0]);
      canvas.requestRenderAll(); syncing = false;
    };
    const selection = () => {
      if (syncing) return;
      const ids = canvas.getActiveObjects().map(object => (object as Proxy).studioId);
      const { project, selectMany } = useStudio.getState();
      const groups = new Set(project.motifs.filter(m => ids.includes(m.id) && m.groupId).map(m => m.groupId));
      selectMany(project.motifs.filter(m => m.visible && !m.locked && (ids.includes(m.id) || (m.groupId && groups.has(m.groupId)))).map(m => m.id));
    };
    const preview = (target?: FabricObject) => {
      if (!target || cancelling) return;
      const project = useStudio.getState().project;
      const objects = target instanceof ActiveSelection ? target.getObjects() : [target];
      const changes = new Map<string, Partial<Motif>>();
      for (const item of objects) {
        const object = item as Proxy, center = object.getCenterPoint(), scale = object.getObjectScaling();
        if (!object.studioId) continue;
        changes.set(object.studioId, { xMm: center.x - object.offset.x, yMm: center.y - object.offset.y,
          widthMm: Math.max(0.1, object.width * scale.x), heightMm: Math.max(0.1, object.height * scale.y), rotation: object.getTotalAngle() });
      }
      if (changes.size) useStudio.getState().previewTransform({ ...project, motifs: project.motifs.map(m => changes.has(m.id) ? { ...m, ...changes.get(m.id) } : m) });
    };
    const cancel = () => {
      cancelling = true; canvas.endCurrentTransform(); transforming = false;
      useStudio.getState().cancelTransform(); cancelling = false; sync();
    };
    canvas.on('before:transform', () => { transforming = true; useStudio.getState().beginTransform(); });
    for (const event of ['object:moving', 'object:scaling', 'object:rotating'] as const) canvas.on(event, e => preview(e.target));
    canvas.on('object:modified', e => {
      if (cancelling || syncing) return;
      preview(e.target); transforming = false;
      // Keep a group together while removing any common whole-tile displacement.
      const state = useStudio.getState(), draft = state.draft;
      const transformedIds = new Set((e.target instanceof ActiveSelection ? e.target.getObjects() : [e.target]).map(object => (object as Proxy).studioId));
      if (draft) {
        const first = draft.motifs.find(m => transformedIds.has(m.id));
        if (first) {
          const dx = Math.floor(first.xMm / draft.tileWidthMm) * draft.tileWidthMm;
          const dy = Math.floor(first.yMm / draft.tileHeightMm) * draft.tileHeightMm;
          if (dx || dy) {
            for (const id of transformedIds) { const proxy = proxies.get(id); if (proxy) { proxy.offset.x += dx; proxy.offset.y += dy; } }
            state.previewTransform({ ...draft, motifs: draft.motifs.map(m => transformedIds.has(m.id) ? { ...m, xMm: m.xMm - dx, yMm: m.yMm - dy } : m) });
          }
        }
      }
      useStudio.getState().commitTransform(); sync();
    });
    canvas.on('mouse:up', () => { if (transforming) { transforming = false; useStudio.getState().cancelTransform(); sync(); } });
    canvas.on('selection:created', selection); canvas.on('selection:updated', selection); canvas.on('selection:cleared', selection);
    const unsubscribe = useStudio.subscribe((next, previous) => {
      if (next.project !== previous.project || next.selectedIds !== previous.selectedIds) sync();
    });
    const location = (event: { clientX: number; clientY: number }) => { const rect = root.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
    const pointers = new Map<number, Position>();
    let pan: { point: Position; view: Viewport; distance: number } | null = null;
    const gesture = () => {
      const points = [...pointers.values()];
      return { point: points.length > 1 ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : points[0], distance: points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0 };
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || current.current.hand || space || event.button === 1) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (transforming) cancel();
        pointers.set(event.pointerId, location(event)); root.setPointerCapture(event.pointerId);
        pan = { ...gesture(), view: current.current.view }; return;
      }
      if (event.button !== 0) return;
      const point = location(event), active = canvas.getActiveObject();
      if (active?.findControl(new Point(point.x, point.y))) return;
      const state = useStudio.getState(), hit = hitRepeat(state.project, screenToWorld(point, current.current.view));
      if (!hit) return;
      const motif = state.project.motifs.find(m => m.id === hit.id)!;
      const ids = motif.groupId ? state.project.motifs.filter(m => m.groupId === motif.groupId && m.visible && !m.locked).map(m => m.id) : [hit.id];
      // Retain the current group frame when starting a drag inside the active selection.
      const object = proxies.get(hit.id);
      if (!event.shiftKey && state.selectedIds.includes(hit.id) && object?.offset.x === hit.dx && object.offset.y === hit.dy) return;
      syncing = true; canvas.discardActiveObject(); syncing = false;
      for (const id of ids) { const proxy = proxies.get(id); if (proxy) proxy.offset = { x: hit.dx, y: hit.dy }; }
      const next = event.shiftKey ? (ids.every(id => state.selectedIds.includes(id)) ? state.selectedIds.filter(id => !ids.includes(id)) : [...new Set([...state.selectedIds, ...ids])]) : ids;
      state.selectMany(next); sync();
      if (event.shiftKey) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const move = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId) || !pan) return;
      event.preventDefault(); event.stopImmediatePropagation(); pointers.set(event.pointerId, location(event));
      const next = gesture();
      const zoomed = pan.distance && next.distance ? zoomAt(pan.view, pan.point, pan.view.scale * next.distance / pan.distance) : pan.view;
      current.current.onView({ ...zoomed, x: zoomed.x + next.point.x - pan.point.x, y: zoomed.y + next.point.y - pan.point.y });
    };
    const up = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      event.stopImmediatePropagation(); pointers.delete(event.pointerId);
      pan = pointers.size ? { ...gesture(), view: current.current.view } : null;
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault(); if (transforming) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? current.current.height : 1);
      current.current.onView(zoomAt(current.current.view, location(event), current.current.view.scale * Math.exp(-delta * 0.0015)));
    };
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input,textarea,select,dialog,[contenteditable=true]')) return;
      if (event.code === 'Space') { event.preventDefault(); space = true; camera(); }
      if (event.key === 'Escape') { if (transforming) cancel(); else useStudio.getState().select(null); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault(); if (transforming) cancel();
        if (event.shiftKey) useStudio.getState().redo(); else useStudio.getState().undo();
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault(); if (transforming) cancel(); const state = useStudio.getState();
        const ids = new Set(state.project.motifs.filter(m => state.selectedIds.includes(m.id) && !m.locked).map(m => m.id));
        if (ids.size) { state.update(p => ({ ...p, motifs: p.motifs.filter(m => !ids.has(m.id)) })); state.select(null); }
      }
    };
    const keyup = (event: KeyboardEvent) => { if (event.code === 'Space') { space = false; camera(); } };
    const blur = () => { space = false; pointers.clear(); pan = null; if (transforming) cancel(); camera(); };
    root.addEventListener('pointerdown', down, true); root.addEventListener('pointermove', move, true);
    root.addEventListener('pointerup', up, true); root.addEventListener('pointercancel', up, true);
    root.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur);
    api.current = { camera }; camera(); sync();
    return () => {
      unsubscribe(); api.current = null; useStudio.getState().cancelTransform();
      root.removeEventListener('pointerdown', down, true); root.removeEventListener('pointermove', move, true);
      root.removeEventListener('pointerup', up, true); root.removeEventListener('pointercancel', up, true); root.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur);
      void canvas.dispose();
    };
  }, []);
  useEffect(() => { api.current?.camera(); }, [props.view, props.width, props.height, props.hand]);
  return <div className="interactionSurface" ref={host}><canvas ref={element} aria-label="Muster bearbeiten" /></div>;
}
