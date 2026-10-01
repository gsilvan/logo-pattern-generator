import { useState } from 'react';
import { Editor } from './Editor';
import { PatternSurface } from './PatternSurface';
import { useStudio } from './store';
import { useWorkspaceView, ViewToolbar } from './WorkspaceView';

const cm = (mm: number) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(mm / 10);
export function Workspace() {
  const project = useStudio((s) => s.project);
  const controls = useWorkspaceView('pattern', project.sheetWidthMm, project.sheetHeightMm);
  const { host, size, view, onView: setView, hand } = controls;
  const [bounds, setBounds] = useState(true),
    [sheet, setSheet] = useState(true);
  const tw = project.tileWidthMm * view.scale,
    th = project.tileHeightMm * view.scale;
  const lines: string[] = [];
  if (bounds && tw >= 8 && th >= 8) {
    for (let x = ((view.x % tw) + tw) % tw; x <= size.width; x += tw)
      lines.push(`M${x} 0V${size.height}`);
    for (let y = ((view.y % th) + th) % th; y <= size.height; y += th)
      lines.push(`M0 ${y}H${size.width}`);
  }
  const label = `Tuch · ${cm(project.sheetWidthMm)} × ${cm(project.sheetHeightMm)} cm`;
  return (
    <div className="patternWorkspace">
      <ViewToolbar
        controls={controls}
        fitLabel="Tuch einpassen"
        dimensions={`Kachel ${cm(project.tileWidthMm)} × ${cm(project.tileHeightMm)} cm`}
      >
        <button onClick={() => controls.fit(project.tileWidthMm, project.tileHeightMm)}>
          Kachel einpassen
        </button>
        <label>
          <input type="checkbox" checked={bounds} onChange={(e) => setBounds(e.target.checked)} />
          Kachelgrenzen
        </label>
        <label>
          <input type="checkbox" checked={sheet} onChange={(e) => setSheet(e.target.checked)} />
          Tuchrahmen
        </label>
      </ViewToolbar>
      <div
        className="canvasViewport"
        ref={host}
        data-scale={view.scale}
        data-offset-x={view.x}
        data-offset-y={view.y}
      >
        {size.width > 1 && (
          <>
            <PatternSurface view={view} {...size} />
            <Editor view={view} {...size} hand={hand} onView={setView} />
          </>
        )}
        <svg
          className="guides"
          width={size.width}
          height={size.height}
          aria-label={sheet ? label : 'Kachelgrenzen'}
        >
          <path d={lines.join('')} className="tileGuideHalo" />
          <path d={lines.join('')} className="tileGuide" />
          {sheet && (
            <g data-testid="sheet-guide">
              <rect
                className="sheetGuideHalo"
                x={view.x}
                y={view.y}
                width={project.sheetWidthMm * view.scale}
                height={project.sheetHeightMm * view.scale}
              />
              <rect
                className="sheetGuide"
                x={view.x}
                y={view.y}
                width={project.sheetWidthMm * view.scale}
                height={project.sheetHeightMm * view.scale}
              />
              <rect fill="#253447" x={view.x - 1} y={view.y - 23} width={190} height={23} rx={2} />
              <text x={view.x + 7} y={view.y - 8} fill="white" fontSize={11}>
                {label}
              </text>
            </g>
          )}
        </svg>
        {!project.motifs.length && !project.backgroundAssetId && (
          <div className="emptyCanvas">Motiv über „Motiv hochladen“ hinzufügen.</div>
        )}
      </div>
    </div>
  );
}
