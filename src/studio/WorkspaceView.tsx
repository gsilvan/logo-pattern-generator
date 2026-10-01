import { useEffect, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { Dialog } from './Dialog';
import { BASE_SCALE, fitView, zoomAt, type Viewport } from './viewport';

const useViews = create<{
  views: Record<string, Viewport>;
  calibratedScale: number;
}>(() => ({ views: {}, calibratedScale: BASE_SCALE }));

export function resetWorkspaceViews() {
  useViews.setState({ views: {} });
}

export function useWorkspaceView(key: string, widthMm: number, heightMm: number) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [hand, setHand] = useState(false);
  const savedView = useViews((s) => s.views[key]);
  const view = savedView ?? { x: 0, y: 0, scale: BASE_SCALE };
  const onView = (next: Viewport | ((previous: Viewport) => Viewport)) => {
    useViews.setState((state) => ({
      views: {
        ...state.views,
        [key]: typeof next === 'function' ? next(state.views[key] ?? view) : next,
      },
    }));
  };
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width < 1 || height < 1) return;
      setSize({ width, height });
      if (!useViews.getState().views[key]) onView(fitView(width, height, widthMm, heightMm));
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [key]);
  const center = { x: size.width / 2, y: size.height / 2 };
  return {
    host,
    size,
    view,
    onView,
    hand,
    setHand,
    zoom: (factor: number) => onView((v) => zoomAt(v, center, v.scale * factor)),
    original: (scale: number) => onView((v) => zoomAt(v, center, scale)),
    fit: (w = widthMm, h = heightMm) => onView(fitView(size.width, size.height, w, h)),
  };
}

export function ViewToolbar({
  controls,
  fitLabel,
  children,
  dimensions,
}: {
  controls: ReturnType<typeof useWorkspaceView>;
  fitLabel: string;
  children?: ReactNode;
  dimensions?: ReactNode;
}) {
  const [calibration, setCalibration] = useState(false);
  const [measured, setMeasured] = useState('5');
  const scale = useViews((s) => s.calibratedScale);
  const value = Number(measured.replace(',', '.'));
  return (
    <>
      <div className="viewToolbar" aria-label="Ansicht">
        <div className="toolGroup">
          <button
            aria-label="Auswählen"
            aria-pressed={!controls.hand}
            title="Auswählen"
            onClick={() => controls.setHand(false)}
          >
            ↖
          </button>
          <button
            aria-label="Ansicht verschieben"
            aria-pressed={controls.hand}
            title="Verschieben · Leertaste halten"
            onClick={() => controls.setHand(!controls.hand)}
          >
            ✥
          </button>
        </div>
        <div className="toolGroup">
          <button aria-label="Verkleinern" onClick={() => controls.zoom(1 / 1.2)}>
            −
          </button>
          <output aria-label="Zoom">
            {Math.round((controls.view.scale / BASE_SCALE) * 100)} %
          </output>
          <button aria-label="Vergrößern" onClick={() => controls.zoom(1.2)}>
            +
          </button>
        </div>
        <button onClick={() => controls.fit()}>{fitLabel}</button>
        <details className="viewMenu">
          <summary>Ansicht</summary>
          <div className="menuPanel">
            {children}
            <button onClick={() => controls.original(scale)}>Ungefähre Originalgröße</button>
            <button onClick={() => setCalibration(true)}>Bildschirm kalibrieren</button>
          </div>
        </details>
        {dimensions && <span className="viewDimensions">{dimensions}</span>}
      </div>
      {calibration && (
        <Dialog title="Bildschirm kalibrieren" onClose={() => setCalibration(false)}>
          <p>Miss diese Strecke mit einem Lineal und trage die gemessene Länge ein.</p>
          <div className="calibrationLine" style={{ width: BASE_SCALE * 50 }}>
            5 cm Referenz
          </div>
          <label className="textField">
            Gemessene Länge (cm)
            <input
              inputMode="decimal"
              value={measured}
              onChange={(e) => setMeasured(e.target.value)}
            />
          </label>
          <p className="hint">
            Nach Browser-Zoom oder Bildschirmwechsel erneut kalibrieren. Die Exportmaße bleiben
            unverändert.
          </p>
          <div className="dialogActions">
            <button onClick={() => setCalibration(false)}>Abbrechen</button>
            <button
              className="primary"
              disabled={!(value >= 1 && value <= 20)}
              onClick={() => {
                const calibratedScale = (BASE_SCALE * 5) / value;
                useViews.setState({ calibratedScale });
                controls.original(calibratedScale);
                setCalibration(false);
              }}
            >
              Originalgröße anzeigen
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
