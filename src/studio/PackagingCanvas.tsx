import { bleedRect, markLines, markColor, markWidth, pageMarks } from './banderoleGeometry';
import { loadFont } from './fonts';
import { textOptions } from './packagingText';
import { useEffect, useRef, useState } from 'react';
import { ActiveSelection, Canvas, FabricImage, Rect, Textbox, type FabricObject } from 'fabric';
import { useStudio } from './store';
import type { PackagingDocument, PackagingLayer, Project } from './model';
import { zoomAt, type Position, type Viewport } from './viewport';
import { useWorkspaceView, ViewToolbar } from './WorkspaceView';
import { packagingGuide } from './packagingTemplates';

type TaggedObject = FabricObject & { packageLayerId?: string };
type SelectionProps = {
  document: PackagingDocument;
  selectedIds: string[];
  onSelection: (ids: string[]) => void;
};
type Props = SelectionProps & {
  view: Viewport;
  width: number;
  height: number;
  hand: boolean;
  onView: (view: Viewport) => void;
};

export function PackagingWorkspace(props: SelectionProps) {
  const page = props.document.pages[props.document.selectedPage];
  const controls = useWorkspaceView(
    `packaging-${props.document.kind}-${page.face}`,
    page.widthMm,
    page.heightMm,
  );
  return (
    <>
      <ViewToolbar controls={controls} fitLabel="Verpackung einpassen" />
      <div
        className="packCanvasHost"
        ref={controls.host}
        data-scale={controls.view.scale}
        data-offset-x={controls.view.x}
        data-offset-y={controls.view.y}
      >
        {controls.size.width > 1 && (
          <PackagingCanvas
            {...props}
            view={controls.view}
            onView={controls.onView}
            hand={controls.hand}
            {...controls.size}
          />
        )}
      </div>
    </>
  );
}

export function PackagingCanvas(props: Props) {
  const element = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  current.current = props;
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const syncing = useRef(false),
    transforming = useRef(false),
    revision = useRef(0);
  const [error, setError] = useState('');
  const camera = useRef<() => void>(() => {});

  useEffect(() => {
    if (!element.current || !host.current) return;
    const root = host.current;
    const instance = new Canvas(element.current, {
      enablePointerEvents: true,
      preserveObjectStacking: true,
      selection: true,
      selectionColor: '#245cc51a',
      selectionBorderColor: '#245cc5',
    });
    let space = false;
    camera.current = () => {
      const { width, height, view, hand } = current.current;
      if (instance.width !== width || instance.height !== height)
        instance.setDimensions({ width, height });
      instance.setViewportTransform([view.scale, 0, 0, view.scale, view.x, view.y]);
      instance.selection = !hand && !space;
      instance.defaultCursor = hand || space ? 'grab' : 'default';
      instance.requestRenderAll();
    };
    const selection = () => {
      if (syncing.current) return;
      current.current.onSelection(
        instance
          .getActiveObjects()
          .map((object) => (object as TaggedObject).packageLayerId!)
          .filter(Boolean),
      );
    };
    const writeObjects = (objects: FabricObject[], preview = false) => {
      const { document: doc } = current.current;
      const changes = new Map(
        objects.map((object) => {
          const center = object.getCenterPoint(),
            scale = object.getObjectScaling();
          const changes: Partial<PackagingLayer> = {
            xMm: center.x,
            yMm: center.y,
            widthMm: Math.max(0.1, object.width * scale.x),
            heightMm: Math.max(0.1, object.height * scale.y),
            rotation: object.getTotalAngle(),
          };
          if (object instanceof Textbox)
            Object.assign(changes, {
              text: object.text,
              fontSizePt: (object.fontSize * scale.y * 72) / 25.4,
            });
          return [(object as TaggedObject).packageLayerId, changes] as const;
        }),
      );
      const apply = (project: Project): Project => {
        const document = project.packagingDocuments?.[doc.kind];
        if (!document) return project;
        return {
          ...project,
          packagingDocuments: {
            ...project.packagingDocuments,
            [doc.kind]: {
              ...document,
              pages: document.pages.map((page, index) =>
                index !== doc.selectedPage
                  ? page
                  : {
                      ...page,
                      layers: page.layers.map((layer) =>
                        changes.has(layer.id) ? { ...layer, ...changes.get(layer.id) } : layer,
                      ),
                    },
              ),
            },
          },
        };
      };
      const state = useStudio.getState();
      if (preview) state.previewTransform(apply(state.draft ?? state.project));
      else state.update(apply);
    };
    instance.on('selection:created', selection);
    instance.on('selection:updated', selection);
    instance.on('selection:cleared', selection);
    instance.on('before:transform', () => {
      transforming.current = true;
    });
    let justFinishedText: FabricObject | null = null;
    instance.on('object:modified', ({ target }) => {
      transforming.current = false;
      // Fabric fires this again immediately after text:editing:exited.
      if (target === justFinishedText) {
        justFinishedText = null;
        return;
      }
      if (target) writeObjects(target instanceof ActiveSelection ? target.getObjects() : [target]);
    });
    instance.on('mouse:up', () => {
      transforming.current = false;
    });
    instance.on('text:editing:entered', () => useStudio.getState().beginTransform());
    instance.on('text:changed', ({ target }) => {
      if (target) writeObjects([target], true);
    });
    instance.on('text:editing:exited', ({ target }) => {
      justFinishedText = target ?? null;
      useStudio.getState().commitTransform();
      queueMicrotask(() => {
        justFinishedText = null;
      });
    });
    const finishText = () => {
      const object = instance.getActiveObject();
      if (object instanceof Textbox && object.isEditing) object.exitEditing();
    };
    const outside = (event: PointerEvent) => {
      if (!root.contains(event.target as Node)) finishText();
    };
    // Finish Fabric editing before a sidebar input takes ownership of the draft.
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('beforeunload', finishText);

    const location = (event: { clientX: number; clientY: number }) => {
      const bounds = root.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    const pointers = new Map<number, Position>();
    let pan: { point: Position; distance: number; view: Viewport } | null = null;
    const gesture = () => {
      const points = [...pointers.values()];
      return {
        point:
          points.length > 1
            ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
            : points[0],
        distance:
          points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0,
      };
    };
    const down = (event: PointerEvent) => {
      if (!(current.current.hand || space || event.button === 1 || event.pointerType === 'touch'))
        return;
      if (transforming.current) return;
      finishText();
      event.preventDefault();
      event.stopImmediatePropagation();
      pointers.set(event.pointerId, location(event));
      root.setPointerCapture(event.pointerId);
      pan = { ...gesture(), view: current.current.view };
    };
    const move = (event: PointerEvent) => {
      if (!pan || !pointers.has(event.pointerId)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pointers.set(event.pointerId, location(event));
      const next = gesture();
      const view =
        pan.distance && next.distance
          ? zoomAt(pan.view, pan.point, (pan.view.scale * next.distance) / pan.distance)
          : pan.view;
      current.current.onView({
        ...view,
        x: view.x + next.point.x - pan.point.x,
        y: view.y + next.point.y - pan.point.y,
      });
    };
    const up = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      event.stopImmediatePropagation();
      pointers.delete(event.pointerId);
      pan = pointers.size ? { ...gesture(), view: current.current.view } : null;
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (transforming.current) return;
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? current.current.height : 1);
      current.current.onView(
        zoomAt(
          current.current.view,
          location(event),
          current.current.view.scale * Math.exp(-delta * 0.0015),
        ),
      );
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement).closest('input,textarea,select,dialog,[contenteditable=true]')
      )
        return;
      if (event.code === 'Space') {
        event.preventDefault();
        space = true;
        camera.current();
      }
      if (event.key === 'Escape') {
        finishText();
        instance.discardActiveObject();
        instance.requestRenderAll();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        finishText();
        if (event.shiftKey) useStudio.getState().redo();
        else useStudio.getState().undo();
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const { document: doc, selectedIds } = current.current;
        if (!selectedIds.length) return;
        event.preventDefault();
        useStudio.getState().update((project) => {
          const stored = project.packagingDocuments?.[doc.kind];
          if (!stored) return project;
          return {
            ...project,
            packagingDocuments: {
              ...project.packagingDocuments,
              [doc.kind]: {
                ...stored,
                pages: stored.pages.map((page, index) =>
                  index === doc.selectedPage
                    ? {
                        ...page,
                        layers: page.layers.filter(
                          (layer) => layer.locked || !selectedIds.includes(layer.id),
                        ),
                      }
                    : page,
                ),
              },
            },
          };
        });
        current.current.onSelection([]);
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        space = false;
        camera.current();
      }
    };
    const blur = () => {
      space = false;
      pointers.clear();
      pan = null;
      finishText();
      camera.current();
    };
    root.addEventListener('pointerdown', down, true);
    root.addEventListener('pointermove', move, true);
    root.addEventListener('pointerup', up, true);
    root.addEventListener('pointercancel', up, true);
    root.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    camera.current();
    setCanvas(instance);
    return () => {
      finishText();
      revision.current++;
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('beforeunload', finishText);
      root.removeEventListener('pointerdown', down, true);
      root.removeEventListener('pointermove', move, true);
      root.removeEventListener('pointerup', up, true);
      root.removeEventListener('pointercancel', up, true);
      root.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      void instance.dispose();
    };
  }, []);

  useEffect(() => {
    camera.current();
  }, [props.view, props.width, props.height, props.hand]);

  // Guide loading is independent of text/selection updates.
  const page = props.document.pages[props.document.selectedPage];
  useEffect(() => {
    if (!canvas) return;
    let cancelled = false;
    const base = new Rect({
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      width: page.widthMm,
      height: page.heightMm,
      fill: props.document.kind === 'banderole' ? '#ffffff' : page.background,
      stroke: '#27303d',
      strokeWidth: 0.22,
      selectable: false,
      evented: false,
    });
    canvas.insertAt(0, base);
    if (props.document.kind === 'banderole') {
      const area = bleedRect(page.bleedMm ?? 3);
      const background = new Rect({
        originX: 'left',
        originY: 'top',
        left: area.x,
        top: area.y,
        width: area.width,
        height: area.height,
        fill: page.background,
        strokeWidth: 0,
        selectable: false,
        evented: false,
      });
      canvas.insertAt(1, background);
      return () => {
        canvas.remove(base, background);
      };
    }
    let guide: FabricImage | undefined;
    const path = packagingGuide(props.document);
    void FabricImage.fromURL(path)
      .then((image) => {
        if (cancelled) {
          image.dispose();
          return;
        }
        guide = image;
        // Each template supplies a guide at its own PDF dimensions; never stretch it.
        const scale = page.widthMm / image.width;
        image.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });
        canvas.insertAt(1, image);
        canvas.requestRenderAll();
      })
      .catch(() => {
        if (!cancelled) setError('Stanzvorlage konnte nicht geladen werden.');
      });
    return () => {
      cancelled = true;
      canvas.remove(base);
      if (guide) canvas.remove(guide);
    };
  }, [
    canvas,
    props.document.kind,
    props.document.templateId,
    page.face,
    page.widthMm,
    page.heightMm,
    page.background,
    page.bleedMm,
  ]);

  useEffect(() => {
    if (!canvas || transforming.current) return;
    const load = ++revision.current;
    void (async () => {
      // Complete image loading before touching the active selection.
      const loaded = new Map<string, FabricObject>();
      if (props.document.kind === 'banderole')
        await Promise.all(
          page.layers.filter((layer) => layer.visible && layer.type === 'text').map(loadFont),
        );
      for (const layer of page.layers) {
        if (
          layer.visible &&
          layer.type === 'image' &&
          !canvas
            .getObjects()
            .some((object) => (object as TaggedObject).packageLayerId === layer.id)
        ) {
          try {
            loaded.set(layer.id, await FabricImage.fromURL(layer.dataUrl!));
          } catch {
            setError(`Bild konnte nicht geladen werden: ${layer.name}`);
          }
        }
      }
      if (load !== revision.current) {
        loaded.forEach((object) => object.dispose());
        return;
      }
      syncing.current = true;
      if (canvas.getActiveObject() instanceof ActiveSelection) canvas.discardActiveObject();
      const ids = new Set(page.layers.filter((layer) => layer.visible).map((layer) => layer.id));
      for (const object of canvas.getObjects() as TaggedObject[]) {
        if (object.packageLayerId && !ids.has(object.packageLayerId)) canvas.remove(object);
      }
      for (const layer of [
        ...page.layers.filter((layer) => layer.role === 'background'),
        ...page.layers.filter((layer) => layer.role !== 'background'),
      ]) {
        if (!layer.visible) continue;
        let object = (canvas.getObjects() as TaggedObject[]).find(
          (object) => object.packageLayerId === layer.id,
        );
        if (!object) {
          object = (
            layer.type === 'text' ? new Textbox(layer.text ?? '') : loaded.get(layer.id)
          ) as TaggedObject | undefined;
          if (!object) continue;
          object.packageLayerId = layer.id;
          object.set({
            borderColor: '#245cc5',
            cornerColor: '#fff',
            cornerStrokeColor: '#245cc5',
            transparentCorners: false,
            cornerSize: 9,
            padding: 2,
            lockScalingFlip: true,
            strokeWidth: 0,
          });
          canvas.add(object);
        }
        if (!(object instanceof Textbox && object.isEditing)) {
          object.set({
            left: layer.xMm,
            top: layer.yMm,
            originX: 'center',
            originY: 'center',
            angle: layer.rotation,
            selectable: !layer.locked,
            evented: !layer.locked,
          });
          if (object instanceof Textbox)
            object.set({
              ...textOptions(layer, props.document.kind === 'banderole'),
            });
          else
            object.set({
              scaleX: layer.widthMm / object.width,
              scaleY: layer.heightMm / object.height,
            });
          if (props.document.kind === 'banderole') {
            const area = bleedRect(page.bleedMm ?? 3);
            object.set({
              clipPath: new Rect({
                originX: 'left',
                originY: 'top',
                left: area.x,
                top: area.y,
                width: area.width,
                height: area.height,
                absolutePositioned: true,
                strokeWidth: 0,
              }),
            });
          }
          object.setCoords();
        }
        canvas.bringObjectToFront(object);
      }
      // Fabric temporarily makes a text object unselectable while it is being edited.
      // Keep its active selection until editing ends.
      const active = canvas.getActiveObject();
      if (!(active instanceof Textbox && active.isEditing)) {
        const selected = (canvas.getObjects() as TaggedObject[]).filter(
          (object) =>
            object.selectable &&
            object.packageLayerId &&
            props.selectedIds.includes(object.packageLayerId),
        );
        if (selected.length > 1)
          canvas.setActiveObject(
            new ActiveSelection(selected, { canvas, originX: 'center', originY: 'center' }),
          );
        else if (selected.length === 1 && active !== selected[0])
          canvas.setActiveObject(selected[0]);
        else if (!selected.length) canvas.discardActiveObject();
      }
      syncing.current = false;
      canvas.requestRenderAll();
    })().catch((error) => {
      if (load === revision.current)
        setError(error instanceof Error ? error.message : 'Darstellung fehlgeschlagen.');
    });
    return () => {
      revision.current++;
    };
  }, [canvas, page, props.selectedIds]);
  return (
    <div className="interactionSurface" ref={host}>
      <canvas ref={element} aria-label="Verpackung bearbeiten" />
      {props.document.kind === 'banderole' && (
        <svg className="packMarks" width={props.width} height={props.height} aria-hidden="true">
          <g transform={`translate(${props.view.x} ${props.view.y}) scale(${props.view.scale})`}>
            {markLines(page.bleedMm ?? 3, pageMarks(page)).map((line, index) => (
              <line
                key={index}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={markColor(line.kind)}
                strokeWidth={markWidth(line.kind)}
              />
            ))}
          </g>
        </svg>
      )}
      {error && (
        <div className="emptyCanvas" role="status">
          {error}
        </div>
      )}
    </div>
  );
}

export function addPackagingText(document: PackagingDocument): PackagingLayer {
  const page = document.pages[document.selectedPage];
  return {
    id: crypto.randomUUID(),
    name: 'Neuer Text',
    type: 'text',
    text: 'Doppelklick zum Bearbeiten',
    xMm: page.widthMm / 2,
    yMm: page.heightMm / 2,
    widthMm: Math.min(page.widthMm * 0.65, 80),
    heightMm: 12,
    rotation: 0,
    fontFamily: document.kind === 'banderole' ? 'Liberation Sans' : 'Arial',
    fontSizePt: 12,
    color: '#27303d',
    bold: false,
    italic: false,
    visible: true,
    locked: false,
  };
}
