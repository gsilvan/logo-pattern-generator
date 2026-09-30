import { useEffect, useRef, useState } from 'react';
import { Application, Texture, TilingSprite, CanvasSource, RendererType } from 'pixi.js';
import { useStudio } from './store';
import { renderTile } from './render';
import type { Viewport } from './viewport';

export function PatternSurface({
  view,
  width,
  height,
}: {
  view: Viewport;
  width: number;
  height: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    fallback = useRef<HTMLCanvasElement>(null);
  const state = useRef({ view, width, height });
  state.current = { view, width, height };
  const repaint = useRef<() => void>(() => {}),
    invalidate = useRef<() => void>(() => {});
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false,
      app: Application | null = null,
      sprite: TilingSprite | null = null;
    let texture: Texture | null = null,
      frame = 0,
      busy = false,
      revision = 0,
      drawn = -1;
    const tile = document.createElement('canvas');
    let tileWidthMm = 100,
      tileHeightMm = 100;
    const paint = () => {
      if (disposed || drawn < 0) return;
      const { view: v, width: w, height: h } = state.current;
      const tw = tileWidthMm * v.scale,
        th = tileHeightMm * v.scale;
      if (app && sprite) {
        if (app.screen.width !== w || app.screen.height !== h) app.renderer.resize(w, h);
        sprite.width = w;
        sprite.height = h;
        sprite.tileScale.set(tw / tile.width, th / tile.height);
        sprite.tilePosition.set(v.x, v.y);
        app.render();
      } else {
        const canvas = fallback.current,
          ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const pattern = ctx.createPattern(tile, 'repeat');
        if (!pattern) return;
        pattern.setTransform(new DOMMatrix([tw / tile.width, 0, 0, th / tile.height, v.x, v.y]));
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, w, h);
      }
    };
    const draw = async () => {
      frame = 0;
      if (disposed || busy || drawn === revision) return;
      busy = true;
      const version = revision,
        store = useStudio.getState(),
        project = store.draft ?? store.project;
      const ppi = Math.min(
        (1024 * 25.4) / Math.max(project.tileWidthMm, project.tileHeightMm),
        Math.max(48, state.current.view.scale * Math.min(devicePixelRatio || 1, 2) * 25.4),
      );
      try {
        await renderTile(project, ppi, false, undefined, tile);
        if (disposed) return;
        if (version === revision) {
          tileWidthMm = project.tileWidthMm;
          tileHeightMm = project.tileHeightMm;
          if (app) {
            if (!texture || texture.width !== tile.width || texture.height !== tile.height) {
              const old = texture;
              texture = new Texture({ source: new CanvasSource({ resource: tile }) });
              if (sprite) sprite.texture = texture;
              else {
                sprite = new TilingSprite({ texture, width: 1, height: 1 });
                app.stage.addChild(sprite);
              }
              old?.destroy(true);
            } else texture.source.update();
          }
          drawn = version;
          setError('');
          paint();
        }
      } catch (e) {
        if (!disposed) {
          drawn = version;
          setError(e instanceof Error ? e.message : 'Vorschau fehlgeschlagen.');
        }
      } finally {
        busy = false;
        if (!disposed && drawn !== revision && !frame)
          frame = requestAnimationFrame(() => {
            void draw();
          });
      }
    };
    const schedule = () => {
      revision++;
      if (!frame && !busy)
        frame = requestAnimationFrame(() => {
          void draw();
        });
    };
    repaint.current = paint;
    invalidate.current = schedule;
    const unsubscribe = useStudio.subscribe((next, previous) => {
      if (next.project !== previous.project || next.draft !== previous.draft) schedule();
    });
    const instance = new Application();
    void instance
      .init({
        width: state.current.width,
        height: state.current.height,
        antialias: true,
        autoStart: false,
        resolution: Math.min(devicePixelRatio || 1, 2),
        autoDensity: true,
      })
      .then(() => {
        if (disposed) {
          instance.destroy(true);
          return;
        }
        // Use our uncached 2D repeat when GPU rendering is unavailable.
        // Pixi's Canvas pattern cache does not refresh on source.update().
        if (instance.renderer.type === RendererType.CANVAS) {
          instance.destroy(true);
          schedule();
          return;
        }
        app = instance;
        host.current?.appendChild(app.canvas);
        schedule();
      })
      .catch(() => {
        if (!disposed) schedule();
      });
    schedule();
    return () => {
      disposed = true;
      unsubscribe();
      cancelAnimationFrame(frame);
      repaint.current = () => {};
      invalidate.current = () => {};
      if (app) {
        app.destroy(true, { children: true });
        texture?.destroy(true);
      }
    };
  }, []);
  useEffect(() => {
    repaint.current();
  }, [view, width, height]);
  // Resolve more detail only after zoom settles; panning never regenerates the texture.
  useEffect(() => {
    const timer = setTimeout(() => invalidate.current(), 120);
    return () => clearTimeout(timer);
  }, [view.scale]);
  return (
    <div className="patternSurface" ref={host}>
      <canvas ref={fallback} aria-hidden="true" />
      {error && (
        <span role="alert" className="canvasError">
          {error}
        </span>
      )}
    </div>
  );
}
