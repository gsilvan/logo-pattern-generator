import { useEffect, useRef, useState } from 'react';
import { Editor } from './Editor';
import { PatternSurface } from './PatternSurface';
import { Dialog } from './Dialog';
import { useStudio } from './store';
import { BASE_SCALE, fitView, zoomAt, type Viewport } from './viewport';

const cm = (mm: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(mm / 10);
export function Workspace() {
  const project = useStudio(s => s.project), host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, scale: BASE_SCALE });
  const [bounds, setBounds] = useState(true), [sheet, setSheet] = useState(true), [hand, setHand] = useState(false);
  const [calibration, setCalibration] = useState(false), [measured, setMeasured] = useState('5'), [calibratedScale, setCalibratedScale] = useState(BASE_SCALE);
  useEffect(() => {
    const element = host.current; if (!element) return;
    let initial = true;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width < 1 || height < 1) return;
      setSize({ width, height });
      if (initial) { const p = useStudio.getState().project; setView(fitView(width, height, p.sheetWidthMm, p.sheetHeightMm)); initial = false; }
    });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  const center = { x: size.width / 2, y: size.height / 2 };
  const zoom = (factor: number) => setView(v => zoomAt(v, center, v.scale * factor));
  const fit = (tile = false) => setView(fitView(size.width, size.height, tile ? project.tileWidthMm : project.sheetWidthMm, tile ? project.tileHeightMm : project.sheetHeightMm));
  const tw = project.tileWidthMm * view.scale, th = project.tileHeightMm * view.scale;
  const lines: string[] = [];
  if (bounds && tw >= 8 && th >= 8) {
    for (let x = ((view.x % tw) + tw) % tw; x <= size.width; x += tw) lines.push(`M${x} 0V${size.height}`);
    for (let y = ((view.y % th) + th) % th; y <= size.height; y += th) lines.push(`M0 ${y}H${size.width}`);
  }
  const label = `Tuch · ${cm(project.sheetWidthMm)} × ${cm(project.sheetHeightMm)} cm`;
  return <div className="patternWorkspace">
    <div className="viewToolbar" aria-label="Ansicht">
      <div className="toolGroup"><button aria-label="Auswählen" aria-pressed={!hand} title="Auswählen" onClick={() => setHand(false)}>↖</button><button aria-label="Ansicht verschieben" aria-pressed={hand} title="Verschieben · Leertaste halten" onClick={() => setHand(!hand)}>✥</button></div>
      <div className="toolGroup"><button aria-label="Verkleinern" onClick={() => zoom(1 / 1.2)}>−</button><output aria-label="Zoom">{Math.round(view.scale / BASE_SCALE * 100)} %</output><button aria-label="Vergrößern" onClick={() => zoom(1.2)}>+</button></div>
      <button onClick={() => fit()}>Tuch einpassen</button>
      <details className="viewMenu"><summary>Ansicht</summary><div className="menuPanel">
        <button onClick={() => fit(true)}>Kachel einpassen</button>
        <label><input type="checkbox" checked={bounds} onChange={e => setBounds(e.target.checked)} />Kachelgrenzen</label>
        <label><input type="checkbox" checked={sheet} onChange={e => setSheet(e.target.checked)} />Tuchrahmen</label>
        <button onClick={() => setView(v => zoomAt(v, center, calibratedScale))}>Ungefähre Originalgröße</button>
        <button onClick={() => setCalibration(true)}>Bildschirm kalibrieren</button>
      </div></details>
      <span className="viewDimensions">Kachel {cm(project.tileWidthMm)} × {cm(project.tileHeightMm)} cm</span>
    </div>
    <div className="canvasViewport" ref={host} data-scale={view.scale} data-offset-x={view.x} data-offset-y={view.y}>
      {size.width > 1 && <><PatternSurface view={view} {...size} /><Editor view={view} {...size} hand={hand} onView={setView} /></>}
      <svg className="guides" width={size.width} height={size.height} aria-label={sheet ? label : 'Kachelgrenzen'}>
        <path d={lines.join('')} className="tileGuideHalo" /><path d={lines.join('')} className="tileGuide" />
        {sheet && <g data-testid="sheet-guide"><rect className="sheetGuideHalo" x={view.x} y={view.y} width={project.sheetWidthMm * view.scale} height={project.sheetHeightMm * view.scale} /><rect className="sheetGuide" x={view.x} y={view.y} width={project.sheetWidthMm * view.scale} height={project.sheetHeightMm * view.scale} />
          <rect fill="#253447" x={view.x - 1} y={view.y - 23} width={190} height={23} rx={2} /><text x={view.x + 7} y={view.y - 8} fill="white" fontSize={11}>{label}</text></g>}
      </svg>
      {!project.motifs.length && !project.backgroundAssetId && <div className="emptyCanvas">Motiv über „Motiv hochladen“ hinzufügen.</div>}
    </div>
    {calibration && <Dialog title="Bildschirm kalibrieren" onClose={() => setCalibration(false)}>
      <p>Miss diese Strecke mit einem Lineal und trage die gemessene Länge ein.</p>
      <div className="calibrationLine" style={{ width: BASE_SCALE * 50 }}>5 cm Referenz</div>
      <label className="textField">Gemessene Länge (cm)<input inputMode="decimal" value={measured} onChange={e => setMeasured(e.target.value)} /></label>
      <p className="hint">Nach Browser-Zoom oder Bildschirmwechsel erneut kalibrieren. Die Exportmaße bleiben unverändert.</p>
      <div className="dialogActions"><button onClick={() => setCalibration(false)}>Abbrechen</button><button className="primary" disabled={!(Number(measured.replace(',', '.')) >= 1 && Number(measured.replace(',', '.')) <= 20)} onClick={() => { const scale = BASE_SCALE * 5 / Number(measured.replace(',', '.')); setCalibratedScale(scale); setView(v => zoomAt(v, center, scale)); setCalibration(false); }}>Originalgröße anzeigen</button></div>
    </Dialog>}
  </div>;
}
