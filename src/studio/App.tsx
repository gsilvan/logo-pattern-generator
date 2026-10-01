import { backgroundPlacement, pageMarks } from './banderoleGeometry';
import { fontFamilies } from './fonts';
import { symbolData } from './symbols';
import { BanderolePreview } from './BanderolePreview';
import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { Workspace } from './Workspace';
import { Dialog } from './Dialog';
import { useStudio } from './store';
import {
  cmToMm,
  mmToCm,
  parseCm,
  type Motif,
  type Project,
  type PackagingKind,
  type PackagingDocument,
  type PackagingLayer,
  type PackagingPage,
} from './model';
import {
  readAsset,
  exportPng,
  exportPdf,
  exportPackagingPdf,
  exportPackagingSvg,
  openProject,
  saveProject,
} from './files';
import { PackagingWorkspace, addPackagingText } from './PackagingCanvas';
import { resetWorkspaceViews } from './WorkspaceView';
import {
  listPackagingTemplates,
  makePackagingDocument,
  packagingTypes,
} from './packagingTemplates';
const backgrounds = Object.values(
  import.meta.glob('../backgrounds/*.png', { eager: true, query: '?url', import: 'default' }),
) as string[];
type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
};
function NumberField({ label, value, onChange, min, max, step, unit }: NumberFieldProps) {
  const [text, setText] = useState(
      new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, useGrouping: false }).format(
        value,
      ),
    ),
    [invalid, setInvalid] = useState(false),
    focused = useRef(false);
  useEffect(() => {
    if (!focused.current)
      setText(
        new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, useGrouping: false }).format(
          value,
        ),
      );
  }, [value]);
  const commit = () => {
    focused.current = false;
    const n = parseCm(text);
    if (n === null || n < min || n > max) {
      setInvalid(true);
      setText(
        new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, useGrouping: false }).format(
          value,
        ),
      );
    } else {
      setInvalid(false);
      if (n !== value) onChange(n);
      setText(
        new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, useGrouping: false }).format(n),
      );
    }
  };
  return (
    <label className={`field ${invalid ? 'invalid' : ''}`}>
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        aria-label={label}
        aria-invalid={invalid}
      />
      <small>{unit}</small>
    </label>
  );
}
function editNumber(
  label: string,
  value: number,
  onChange: (n: number) => void,
  min: number,
  max: number,
  step = 0.1,
  unit = 'cm',
) {
  return (
    <NumberField
      key={label}
      label={label}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
      unit={unit}
    />
  );
}
export function App() {
  const project = useStudio((s) => s.draft ?? s.project),
    update = useStudio((s) => s.update),
    setProject = useStudio((s) => s.setProject),
    restore = useStudio((s) => s.restore),
    newSession = useStudio((s) => s.newSession),
    ready = useStudio((s) => s.ready),
    undo = useStudio((s) => s.undo),
    redo = useStudio((s) => s.redo),
    past = useStudio((s) => s.past),
    future = useStudio((s) => s.future),
    selectedId = useStudio((s) => s.selectedId),
    selectedIds = useStudio((s) => s.selectedIds),
    select = useStudio((s) => s.select);
  const [tab, setTab] = useState<'pattern' | 'packaging'>('pattern'),
    [toolsOpen, setToolsOpen] = useState(false),
    [showExport, setShowExport] = useState(false),
    [session, setSession] = useState(0),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [ppi, setPpi] = useState(300),
    [showNewSession, setShowNewSession] = useState(false),
    [sessionError, setSessionError] = useState('');
  const [packagingKind, setPackagingKind] = useState<PackagingKind>('banderole');
  const [packagingSelection, setPackagingSelection] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [includeCutMarks, setIncludeCutMarks] = useState(true);
  const [includeDieLines, setIncludeDieLines] = useState(true);
  const [includeInnerGuides, setIncludeInnerGuides] = useState(true);
  const [textMode, setTextMode] = useState<'text' | 'paths'>('text');
  const [packagingExportPages, setPackagingExportPages] = useState(0);
  const packagingDocument =
    project.packagingDocuments?.[packagingKind] ?? makePackagingDocument(packagingKind);
  const packagingPage = packagingDocument.pages[packagingDocument.selectedPage];
  const bleedMm = packagingPage.bleedMm ?? 3;
  const backgroundLayer = packagingPage.layers.find((layer) => layer.role === 'background');
  const printOptions = {
    cutMarks: includeCutMarks,
    dieLines: includeDieLines,
    innerGuides: includeInnerGuides,
    textMode,
  };
  const packagingLayer = packagingPage.layers.find(
    (layer) => packagingSelection.length === 1 && layer.id === packagingSelection[0],
  );
  const activeExport = useRef<AbortController | null>(null);
  const selected = project.motifs.find((m) => m.id === selectedId);
  useEffect(() => {
    void restore();
    const flush = () => useStudio.getState().commitTransform();
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);
  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      for (const menu of document.querySelectorAll<HTMLDetailsElement>(
        '.projectMenu[open],.viewMenu[open]',
      ))
        if (!menu.contains(event.target as Node)) menu.open = false;
    };
    const escapeMenus = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        for (const menu of document.querySelectorAll<HTMLDetailsElement>(
          '.projectMenu[open],.viewMenu[open]',
        )) {
          menu.open = false;
          menu.querySelector('summary')?.focus();
        }
    };
    document.addEventListener('pointerdown', closeMenus);
    document.addEventListener('keydown', escapeMenus);
    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      document.removeEventListener('keydown', escapeMenus);
    };
  }, []);
  async function run(fn: (signal: AbortSignal) => Promise<void>) {
    if (busy) return;
    const controller = new AbortController();
    activeExport.current = controller;
    setBusy(true);
    setMessage('Verarbeite Datei…');
    try {
      await fn(controller.signal);
      setMessage('Fertig.');
    } catch (e) {
      setMessage(
        e instanceof DOMException && e.name === 'AbortError'
          ? 'Abgebrochen.'
          : e instanceof Error
            ? e.message
            : 'Ein Fehler ist aufgetreten.',
      );
    } finally {
      activeExport.current = null;
      setBusy(false);
    }
  }
  async function upload(
    event: ChangeEvent<HTMLInputElement>,
    purpose: 'motif' | 'background' | 'logo',
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    await run(async () => {
      const asset = await readAsset(file);
      update((p) => {
        const assets = [...p.assets, asset];
        if (purpose === 'background') return { ...p, assets, backgroundAssetId: asset.id };
        if (purpose === 'logo')
          return { ...p, assets, packaging: { ...p.packaging, logoAssetId: asset.id } };
        const widthMm = 30;
        const motif: Motif = {
          id: crypto.randomUUID(),
          name: asset.name,
          assetId: asset.id,
          xMm: p.tileWidthMm / 2,
          yMm: p.tileHeightMm / 2,
          widthMm,
          heightMm: (widthMm * asset.height) / asset.width,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
        };
        select(motif.id);
        return { ...p, assets, motifs: [...p.motifs, motif] };
      });
    });
    event.target.value = '';
  }
  async function uploadPackaging(event: ChangeEvent<HTMLInputElement>, background = false) {
    const file = event.target.files?.[0];
    if (!file) return;
    await run(async () => {
      const asset = await readAsset(file);
      const widthMm = Math.min(55, packagingPage.widthMm * 0.28);
      const layer: PackagingLayer = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'image',
        dataUrl: asset.dataUrl,
        xMm: packagingPage.widthMm / 2,
        yMm: packagingPage.heightMm / 2,
        widthMm,
        heightMm: (widthMm * asset.height) / asset.width,
        rotation: 0,
        fontFamily: 'Arial',
        fontSizePt: 12,
        color: '#27303d',
        bold: false,
        italic: false,
        visible: true,
        locked: background,
        ...(background
          ? { role: 'background', ...backgroundPlacement(asset.width, asset.height, bleedMm) }
          : {}),
      };
      if (background)
        updatePackagingPage({
          layers: [layer, ...packagingPage.layers.filter((item) => item.role !== 'background')],
        });
      else addPackagingLayer(layer);
      setMessage(background ? 'Hintergrundbild hinzugefügt.' : 'Bild zur Verpackung hinzugefügt.');
    });
    event.target.value = '';
  }
  function loadPackagingTemplate(sample: number) {
    updatePackagingDocument(makePackagingDocument(packagingKind, sample));
    setPackagingSelection([]);
    setShowTemplates(false);
    setMessage('Beispiel geladen.');
  }
  function deleteLayer(id: string) {
    update((p) => ({ ...p, motifs: p.motifs.filter((m) => m.id !== id) }));
    if (selectedIds.includes(id)) select(null);
  }
  function requestNewSession() {
    setSessionError('');
    setShowNewSession(true);
  }
  async function startNewSession() {
    setBusy(true);
    setSessionError('');
    try {
      await newSession();
      resetWorkspaceViews();
      setTab('pattern');
      setToolsOpen(false);
      setSession((n) => n + 1);
      setPpi(300);
      setMessage('Neues Projekt gestartet.');
      setShowNewSession(false);
    } catch {
      setSessionError('Die lokale Sicherung konnte nicht gelöscht werden. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
    }
  }
  function changeMotif(fn: (m: Motif) => Motif) {
    if (!selectedId) return;
    update((p) => ({ ...p, motifs: p.motifs.map((m) => (m.id === selectedId ? fn(m) : m)) }));
  }
  function moveLayer(id: string, delta: number) {
    update((p) => {
      const list = [...p.motifs],
        i = list.findIndex((m) => m.id === id),
        j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return p;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...p, motifs: list };
    });
  }
  function updateDimension(
    key: 'sheetWidthMm' | 'sheetHeightMm' | 'tileWidthMm' | 'tileHeightMm',
    cm: number,
  ) {
    update((p) => ({ ...p, [key]: cmToMm(cm) }));
  }
  function updatePack<K extends keyof Project['packaging']>(
    key: K,
    value: Project['packaging'][K],
  ) {
    update((p) => ({ ...p, packaging: { ...p.packaging, [key]: value } }));
  }
  function updatePackagingDocument(next: PackagingDocument) {
    update((p) => ({ ...p, packagingDocuments: { ...p.packagingDocuments, [next.kind]: next } }));
  }
  function updatePackagingLayer(
    id: string,
    fn: (layer: PackagingLayer) => PackagingLayer,
    preview = false,
  ) {
    const apply = (project: Project): Project => {
      const document = project.packagingDocuments?.[packagingKind];
      if (!document) return project;
      return {
        ...project,
        packagingDocuments: {
          ...project.packagingDocuments,
          [packagingKind]: {
            ...document,
            pages: document.pages.map((page, index) =>
              index !== document.selectedPage
                ? page
                : {
                    ...page,
                    layers: page.layers.map((layer) => (layer.id === id ? fn(layer) : layer)),
                  },
            ),
          },
        },
      };
    };
    const state = useStudio.getState();
    if (preview) state.previewTransform(apply(state.draft ?? state.project));
    else state.update(apply);
  }
  function updatePackagingPage(changes: Partial<PackagingPage>) {
    updatePackagingDocument({
      ...packagingDocument,
      pages: packagingDocument.pages.map((page, index) =>
        index === packagingDocument.selectedPage ? { ...page, ...changes } : page,
      ),
    });
  }
  function addPackagingLayer(layer: PackagingLayer) {
    const pages = [...packagingDocument.pages];
    pages[packagingDocument.selectedPage] = {
      ...packagingPage,
      layers: [...packagingPage.layers, layer],
    };
    updatePackagingDocument({ ...packagingDocument, pages });
    setPackagingSelection([layer.id]);
  }
  const effectivePpi =
    selected && project.assets.find((a) => a.id === selected.assetId)?.width
      ? Math.round(
          project.assets.find((a) => a.id === selected.assetId)!.width / (selected.widthMm / 25.4),
        )
      : null;
  return (
    <div className="appShell">
      <header className="topbar">
        <span className="brand">Musterersteller</span>
        <details className="projectMenu">
          <summary>Projekt</summary>
          <div className="menuPanel">
            <button
              disabled={!ready || busy}
              onClick={(e) => {
                e.currentTarget.closest('details')?.removeAttribute('open');
                requestNewSession();
              }}
            >
              Neues Projekt starten…
            </button>
            <button disabled={busy} onClick={() => void run(() => saveProject(project))}>
              Projekt speichern
            </button>
            <label className="fileButton">
              Projekt öffnen
              <input
                aria-label="Projekt öffnen"
                type="file"
                accept=".zip,.json"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    void run(async () => {
                      setProject(await openProject(f));
                      setSession((n) => n + 1);
                    });
                  e.target.value = '';
                  e.target.closest('details')?.removeAttribute('open');
                }}
              />
            </label>
          </div>
        </details>
        <div className="historyActions">
          <button
            aria-label="Rückgängig"
            title="Rückgängig · Strg+Z"
            onClick={undo}
            disabled={!past.length}
          >
            ↶
          </button>
          <button
            aria-label="Wiederholen"
            title="Wiederholen · Strg+Umschalt+Z"
            onClick={redo}
            disabled={!future.length}
          >
            ↷
          </button>
        </div>
        <nav aria-label="Arbeitsbereich">
          <button aria-pressed={tab === 'pattern'} onClick={() => setTab('pattern')}>
            Muster
          </button>
          <button aria-pressed={tab === 'packaging'} onClick={() => setTab('packaging')}>
            Verpackungen
          </button>
        </nav>
        <div className="headerActions">
          <button
            className="newProjectButton"
            disabled={!ready || busy}
            onClick={requestNewSession}
          >
            Neues Projekt
          </button>
          <button
            className="toolsToggle"
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen(!toolsOpen)}
          >
            Werkzeuge
          </button>
          <button
            className="primary"
            disabled={!ready}
            onClick={() => {
              if (packagingKind === 'banderole') {
                const marks = pageMarks(packagingPage);
                setIncludeCutMarks(marks.cutMarks);
                setIncludeDieLines(marks.dieLines);
                setIncludeInnerGuides(marks.innerGuides);
              }
              setShowExport(true);
            }}
          >
            Exportieren
          </button>
        </div>
      </header>
      <main className="layout">
        <div className="workspace">
          {tab === 'pattern' ? (
            ready ? (
              <Workspace key={session} />
            ) : (
              <div className="loading">Projekt laden…</div>
            )
          ) : (
            <div className="packWorkspace">
              <div className="packToolbar">
                <label>
                  Verpackung
                  <select
                    aria-label="Verpackungsart"
                    value={packagingKind}
                    onChange={(e) => {
                      setPackagingKind(e.target.value as PackagingKind);
                      setPackagingSelection([]);
                    }}
                  >
                    {packagingTypes.map((type) => (
                      <option key={type.kind} value={type.kind}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={() => setShowTemplates(true)}>Beispiel laden</button>
                {packagingKind === 'carton' && (
                  <label>
                    Seite
                    <select
                      aria-label="Faltschachtelseite"
                      value={packagingDocument.selectedPage}
                      onChange={(e) =>
                        updatePackagingDocument({
                          ...packagingDocument,
                          selectedPage: Number(e.target.value),
                        })
                      }
                    >
                      <option value={0}>Außen</option>
                      <option value={1}>Innen</option>
                    </select>
                  </label>
                )}
                <span>
                  {(packagingPage.widthMm / 10).toLocaleString('de-DE')} ×{' '}
                  {(packagingPage.heightMm / 10).toLocaleString('de-DE')} cm
                </span>
              </div>
              <PackagingWorkspace
                key={`${packagingKind}-${packagingDocument.selectedPage}`}
                document={packagingDocument}
                selectedIds={packagingSelection}
                onSelection={setPackagingSelection}
                onUpdatePage={updatePackagingPage}
              />
            </div>
          )}
        </div>
        <aside className={`sidebar ${toolsOpen ? 'isOpen' : ''}`} aria-label="Werkzeuge">
          <div className="mobilePanelHeader">
            <strong>Werkzeuge</strong>
            <button aria-label="Werkzeuge schließen" onClick={() => setToolsOpen(false)}>
              ×
            </button>
          </div>
          {tab === 'pattern' ? (
            <>
              <section>
                <h2>Kachel</h2>
                <div className="fieldGrid">
                  {editNumber(
                    'Kachelbreite',
                    mmToCm(project.tileWidthMm),
                    (n) => updateDimension('tileWidthMm', n),
                    0.5,
                    35,
                  )}
                  {editNumber(
                    'Kachelhöhe',
                    mmToCm(project.tileHeightMm),
                    (n) => updateDimension('tileHeightMm', n),
                    0.5,
                    35,
                  )}
                </div>
                <h2>Tuchgröße</h2>
                <div className="fieldGrid">
                  {editNumber(
                    'Tuchbreite',
                    mmToCm(project.sheetWidthMm),
                    (n) => updateDimension('sheetWidthMm', n),
                    18,
                    35,
                  )}
                  {editNumber(
                    'Tuchhöhe',
                    mmToCm(project.sheetHeightMm),
                    (n) => updateDimension('sheetHeightMm', n),
                    18,
                    35,
                  )}
                </div>
              </section>
              <section className="layersSection">
                <div className="sectionHeader">
                  <h2>Ebenen</h2>
                  <span>{project.motifs.length}</span>
                </div>
                <label className="uploadButton">
                  + Motiv hochladen
                  <input
                    aria-label="Motiv hochladen"
                    type="file"
                    disabled={busy}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                    onChange={(e) => void upload(e, 'motif')}
                  />
                </label>
                <p className="hint">PNG, JPEG, WebP, SVG oder PDF · bis 30 MB</p>
                <div className="layers">
                  {[...project.motifs].reverse().map((m) => (
                    <div
                      className={`layer ${selectedIds.includes(m.id) ? 'selected' : ''}`}
                      key={m.id}
                    >
                      <button
                        className="layerName"
                        aria-pressed={selectedIds.includes(m.id)}
                        onClick={(e) => {
                          const ids = m.groupId
                            ? project.motifs.filter((x) => x.groupId === m.groupId).map((x) => x.id)
                            : [m.id];
                          useStudio
                            .getState()
                            .selectMany(e.shiftKey ? [...new Set([...selectedIds, ...ids])] : ids);
                        }}
                      >
                        <img src={project.assets.find((a) => a.id === m.assetId)?.dataUrl} alt="" />
                        <span>{m.name}</span>
                      </button>
                      <button
                        aria-label={`${m.visible ? 'Ebene ausblenden' : 'Ebene einblenden'}: ${m.name}`}
                        title={m.visible ? 'Ausblenden' : 'Einblenden'}
                        onClick={() =>
                          update((p) => ({
                            ...p,
                            motifs: p.motifs.map((x) =>
                              x.id === m.id ? { ...x, visible: !x.visible } : x,
                            ),
                          }))
                        }
                      >
                        {m.visible ? '◉' : '○'}
                      </button>
                      <button
                        aria-label={`${m.locked ? 'Ebene entsperren' : 'Ebene sperren'}: ${m.name}`}
                        title={m.locked ? 'Entsperren' : 'Sperren'}
                        onClick={() =>
                          update((p) => ({
                            ...p,
                            motifs: p.motifs.map((x) =>
                              x.id === m.id ? { ...x, locked: !x.locked } : x,
                            ),
                          }))
                        }
                      >
                        {m.locked ? '▣' : '□'}
                      </button>
                      <button
                        aria-label={`Ebene ${m.name} nach oben`}
                        title="Nach oben"
                        disabled={project.motifs.at(-1)?.id === m.id}
                        onClick={() => moveLayer(m.id, 1)}
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Ebene ${m.name} nach unten`}
                        title="Nach unten"
                        disabled={project.motifs[0]?.id === m.id}
                        onClick={() => moveLayer(m.id, -1)}
                      >
                        ↓
                      </button>
                      <button
                        className="deleteLayerButton"
                        aria-label={`Ebene ${m.name} löschen`}
                        title="Ebene löschen"
                        onClick={() => deleteLayer(m.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {project.motifs.length === 0 && <p className="hint">Noch keine Motive.</p>}
                {selectedIds.length > 1 && (
                  <button
                    onClick={() => {
                      const groupId = crypto.randomUUID();
                      update((p) => ({
                        ...p,
                        motifs: p.motifs.map((m) =>
                          selectedIds.includes(m.id) ? { ...m, groupId } : m,
                        ),
                      }));
                    }}
                  >
                    Gruppe bilden
                  </button>
                )}
                {selected?.groupId && (
                  <button
                    onClick={() => {
                      const groupId = selected.groupId;
                      update((p) => ({
                        ...p,
                        motifs: p.motifs.map((m) =>
                          m.groupId === groupId ? { ...m, groupId: undefined } : m,
                        ),
                      }));
                    }}
                  >
                    Gruppe lösen
                  </button>
                )}
              </section>
              {selected && (
                <section>
                  <h2>
                    {selectedIds.length > 1 ? `${selectedIds.length} Ebenen ausgewählt` : 'Motiv'}
                  </h2>
                  {selectedIds.length === 1 && (
                    <>
                      <fieldset disabled={selected.locked}>
                        <div className="fieldGrid">
                          {editNumber(
                            'Position X',
                            selected.xMm / 10,
                            (n) => changeMotif((m) => ({ ...m, xMm: cmToMm(n) })),
                            -100,
                            100,
                          )}
                          {editNumber(
                            'Position Y',
                            selected.yMm / 10,
                            (n) => changeMotif((m) => ({ ...m, yMm: cmToMm(n) })),
                            -100,
                            100,
                          )}
                          {editNumber(
                            'Motivbreite',
                            selected.widthMm / 10,
                            (n) =>
                              changeMotif((m) => ({
                                ...m,
                                widthMm: cmToMm(n),
                                heightMm: (cmToMm(n) * m.heightMm) / m.widthMm,
                              })),
                            0.2,
                            100,
                          )}
                          {editNumber(
                            'Drehung',
                            selected.rotation,
                            (n) => changeMotif((m) => ({ ...m, rotation: n })),
                            -36000,
                            36000,
                            1,
                            '°',
                          )}
                          {editNumber(
                            'Deckkraft',
                            selected.opacity * 100,
                            (n) => changeMotif((m) => ({ ...m, opacity: n / 100 })),
                            0,
                            100,
                            1,
                            '%',
                          )}
                        </div>
                      </fieldset>
                      {effectivePpi !== null && (
                        <p className={effectivePpi < 300 ? 'qualityWarning' : 'hint'}>
                          Bildauflösung: ca. {effectivePpi} PPI
                          {effectivePpi < 300
                            ? ' · Für 300 PPI kleiner platzieren oder größere Datei wählen.'
                            : ''}
                        </p>
                      )}
                      <div className="row">
                        <button
                          onClick={() => {
                            const copy = {
                              ...selected,
                              id: crypto.randomUUID(),
                              groupId: undefined,
                              xMm: selected.xMm + 5,
                              yMm: selected.yMm + 5,
                            };
                            update((p) => ({ ...p, motifs: [...p.motifs, copy] }));
                            select(copy.id);
                          }}
                        >
                          Duplizieren
                        </button>
                        <button onClick={() => deleteLayer(selected.id)}>Ebene löschen</button>
                      </div>
                    </>
                  )}
                  {selectedIds.length > 1 && (
                    <p className="hint">
                      Gemeinsam auf der Arbeitsfläche bewegen, drehen und skalieren.
                    </p>
                  )}
                </section>
              )}
              <section className="settingsSection">
                <h2>Hintergrund</h2>
                <label className="field colorField">
                  <span>Farbe</span>
                  <input
                    aria-label="Hintergrundfarbe"
                    type="color"
                    value={project.backgroundColor}
                    onChange={(e) => update((p) => ({ ...p, backgroundColor: e.target.value }))}
                  />
                </label>
                <label className="uploadButton secondary">
                  Hintergrundbild hochladen
                  <input
                    aria-label="Hintergrundbild hochladen"
                    type="file"
                    disabled={busy}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                    onChange={(e) => void upload(e, 'background')}
                  />
                </label>
                <div className="backgrounds">
                  {backgrounds.map((src, i) => (
                    <button
                      key={src}
                      title={`Vorlage ${i + 1}`}
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const blob = await (await fetch(src)).blob();
                          const a = await readAsset(
                            new File([blob], `Design ${i + 1}.png`, { type: 'image/png' }),
                          );
                          update((p) => ({
                            ...p,
                            assets: [...p.assets, a],
                            backgroundAssetId: a.id,
                          }));
                        })
                      }
                    >
                      <img src={src} alt={`Hintergrund ${i + 1}`} />
                    </button>
                  ))}
                </div>
                {project.backgroundAssetId && (
                  <button onClick={() => update((p) => ({ ...p, backgroundAssetId: null }))}>
                    Hintergrundbild entfernen
                  </button>
                )}
              </section>
            </>
          ) : (
            <>
              <section>
                <h2>{packagingTypes.find((type) => type.kind === packagingKind)?.label}</h2>
                <p className="hint">
                  PDF-Seite {packagingPage.widthMm.toLocaleString('de-DE')} ×{' '}
                  {packagingPage.heightMm.toLocaleString('de-DE')} mm
                </p>
                {packagingKind === 'banderole' && <p className="hint">Stanzmaß 235 × 47 mm</p>}
                {packagingKind === 'banderole' && (
                  <label className="textField">
                    Beschnitt (mm)
                    <select
                      aria-label="Beschnitt (mm)"
                      value={bleedMm}
                      onChange={(e) => updatePackagingPage({ bleedMm: Number(e.target.value) })}
                    >
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} mm
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button onClick={() => addPackagingLayer(addPackagingText(packagingDocument))}>
                  + Text hinzufügen
                </button>
                <div className="iconChoices" aria-label="Textsymbol hinzufügen">
                  {['♡', '✿', '✓', '♻'].map((symbol) => (
                    <button
                      key={symbol}
                      aria-label={`Symbol ${symbol} hinzufügen`}
                      onClick={() =>
                        addPackagingLayer({
                          ...addPackagingText(packagingDocument),
                          name: `Symbol ${symbol}`,
                          text: symbol,
                          ...(packagingKind === 'banderole'
                            ? { type: 'image' as const, dataUrl: symbolData(symbol) }
                            : {}),
                          fontSizePt: 28,
                          widthMm: 18,
                          heightMm: 18,
                        })
                      }
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
                <label className="uploadButton">
                  + Bild oder Logo hochladen
                  <input
                    aria-label="Bild oder Logo zur Verpackung hinzufügen"
                    type="file"
                    disabled={busy}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                    onChange={(e) => void uploadPackaging(e)}
                  />
                </label>
                <button className="secondary" onClick={() => setShowTemplates(true)}>
                  Beispiele und leere Stanze
                </button>
              </section>
              <section className="layersSection">
                <div className="sectionHeader">
                  <h2>
                    Ebenen ·{' '}
                    {packagingDocument.pages.reduce((sum, page) => sum + page.layers.length, 0)}
                  </h2>
                </div>
                <div className="layers">
                  {[...packagingPage.layers].reverse().map((layer) => (
                    <div
                      className={`layer ${packagingSelection.includes(layer.id) ? 'selected' : ''}`}
                      key={layer.id}
                    >
                      <button
                        className="layerName"
                        aria-pressed={packagingSelection.includes(layer.id)}
                        onClick={(e) =>
                          setPackagingSelection((ids) =>
                            e.shiftKey
                              ? ids.includes(layer.id)
                                ? ids.filter((id) => id !== layer.id)
                                : [...ids, layer.id]
                              : [layer.id],
                          )
                        }
                      >
                        {layer.type === 'image' && (
                          <img src={layer.dataUrl} alt="" width={24} height={24} />
                        )}
                        <span>
                          {layer.name}
                          {layer.locked ? ' (gesperrt)' : ''}
                        </span>
                      </button>
                      <button
                        aria-label={`${layer.visible ? 'Ebene ausblenden' : 'Ebene einblenden'}: ${layer.name}`}
                        onClick={() =>
                          updatePackagingLayer(layer.id, (item) => ({
                            ...item,
                            visible: !item.visible,
                          }))
                        }
                      >
                        {layer.visible ? '◉' : '○'}
                      </button>
                      <button
                        aria-label={`Ebene ${layer.name} nach oben`}
                        disabled={
                          layer.role === 'background' ||
                          packagingPage.layers.at(-1)?.id === layer.id
                        }
                        onClick={() => {
                          const layers = [...packagingPage.layers];
                          const index = layers.findIndex((item) => item.id === layer.id);
                          [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
                          const pages = [...packagingDocument.pages];
                          pages[packagingDocument.selectedPage] = { ...packagingPage, layers };
                          updatePackagingDocument({ ...packagingDocument, pages });
                        }}
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Ebene ${layer.name} nach unten`}
                        disabled={
                          layer.role === 'background' ||
                          packagingPage.layers[0]?.id === layer.id ||
                          packagingPage.layers[
                            packagingPage.layers.findIndex((item) => item.id === layer.id) - 1
                          ]?.role === 'background'
                        }
                        onClick={() => {
                          const layers = [...packagingPage.layers];
                          const index = layers.findIndex((item) => item.id === layer.id);
                          [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
                          const pages = [...packagingDocument.pages];
                          pages[packagingDocument.selectedPage] = { ...packagingPage, layers };
                          updatePackagingDocument({ ...packagingDocument, pages });
                        }}
                      >
                        ↓
                      </button>
                      <button
                        aria-label={`Ebene ${layer.name} duplizieren`}
                        onClick={() =>
                          addPackagingLayer({
                            ...layer,
                            role: undefined,
                            locked: false,
                            id: crypto.randomUUID(),
                            name: `${layer.name} Kopie`,
                            xMm: layer.xMm + 4,
                            yMm: layer.yMm + 4,
                          })
                        }
                      >
                        ⧉
                      </button>
                      <button
                        aria-label={`Ebene ${layer.name} löschen`}
                        onClick={() => {
                          updatePackagingDocument({
                            ...packagingDocument,
                            pages: packagingDocument.pages.map((page, index) =>
                              index === packagingDocument.selectedPage
                                ? {
                                    ...page,
                                    layers: page.layers.filter((item) => item.id !== layer.id),
                                  }
                                : page,
                            ),
                          });
                          if (packagingSelection.includes(layer.id)) setPackagingSelection([]);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {!packagingPage.layers.length && (
                  <p className="hint">Diese Seite enthält noch keine Gestaltung.</p>
                )}
              </section>
              {packagingLayer?.type === 'image' && (
                <section>
                  <h2>Bild</h2>
                  <div className="fieldGrid">
                    {(['xMm', 'yMm', 'widthMm', 'heightMm', 'rotation'] as const).map(
                      (key, index) =>
                        editNumber(
                          ['Position X', 'Position Y', 'Breite', 'Höhe', 'Drehung'][index],
                          key === 'rotation' ? packagingLayer[key] : packagingLayer[key] / 10,
                          (value) =>
                            updatePackagingLayer(packagingLayer.id, (layer) => ({
                              ...layer,
                              [key]: key === 'rotation' ? value : value * 10,
                            })),
                          key === 'widthMm' || key === 'heightMm' ? 0.01 : -360,
                          1000,
                          0.1,
                          key === 'rotation' ? '°' : 'cm',
                        ),
                    )}
                  </div>
                </section>
              )}
              {packagingLayer && packagingLayer.type === 'text' && (
                <section>
                  <h2>Text</h2>
                  {packagingLayer.replacedFont && (
                    <p className="hint">
                      Schrift ersetzt: {packagingLayer.replacedFont} → {packagingLayer.fontFamily}
                    </p>
                  )}
                  <label className="textField">
                    Ebenenname
                    <input
                      value={packagingLayer.name}
                      onChange={(e) =>
                        updatePackagingLayer(packagingLayer.id, (layer) => ({
                          ...layer,
                          name: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="textField">
                    Inhalt
                    <textarea
                      onFocus={() => useStudio.getState().beginTransform()}
                      onBlur={() => useStudio.getState().commitTransform()}
                      value={packagingLayer.text ?? ''}
                      onChange={(e) =>
                        updatePackagingLayer(
                          packagingLayer.id,
                          (layer) => ({
                            ...layer,
                            text: e.target.value,
                          }),
                          true,
                        )
                      }
                    />
                  </label>
                  <label className="textField">
                    Schrift
                    <select
                      value={packagingLayer.fontFamily}
                      onChange={(e) =>
                        updatePackagingLayer(packagingLayer.id, (layer) => ({
                          ...layer,
                          fontFamily: e.target.value,
                        }))
                      }
                    >
                      {(packagingKind === 'banderole'
                        ? fontFamilies
                        : [
                            'Arial',
                            'Georgia',
                            'Times New Roman',
                            'Verdana',
                            'Courier New',
                            'system-ui',
                          ]
                      ).map((font) => (
                        <option key={font}>{font}</option>
                      ))}
                    </select>
                  </label>
                  <div className="fieldGrid">
                    {editNumber(
                      'Schriftgröße',
                      packagingLayer.fontSizePt,
                      (n) =>
                        updatePackagingLayer(packagingLayer.id, (layer) => ({
                          ...layer,
                          fontSizePt: n,
                        })),
                      4,
                      200,
                      1,
                      'pt',
                    )}
                    {editNumber(
                      'Drehung',
                      packagingLayer.rotation,
                      (n) =>
                        updatePackagingLayer(packagingLayer.id, (layer) => ({
                          ...layer,
                          rotation: n,
                        })),
                      -360,
                      360,
                      1,
                      '°',
                    )}
                  </div>
                  <label className="field colorField">
                    <span>Textfarbe</span>
                    <input
                      aria-label="Textfarbe"
                      type="color"
                      value={packagingLayer.color}
                      onChange={(e) =>
                        updatePackagingLayer(packagingLayer.id, (layer) => ({
                          ...layer,
                          color: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    aria-pressed={packagingLayer.bold}
                    onClick={() =>
                      updatePackagingLayer(packagingLayer.id, (layer) => ({
                        ...layer,
                        bold: !layer.bold,
                      }))
                    }
                  >
                    Fett
                  </button>
                  <button
                    aria-pressed={packagingLayer.italic}
                    onClick={() =>
                      updatePackagingLayer(packagingLayer.id, (layer) => ({
                        ...layer,
                        italic: !layer.italic,
                      }))
                    }
                  >
                    Kursiv
                  </button>
                </section>
              )}
              {packagingKind === 'banderole' ? (
                <>
                  <section>
                    <h2>Hintergrund</h2>
                    <label className="textField">
                      Hintergrundfarbe
                      <input
                        type="color"
                        value={packagingPage.background}
                        onChange={(e) => updatePackagingPage({ background: e.target.value })}
                      />
                    </label>
                    <label className="uploadButton">
                      Hintergrundbild hochladen
                      <input
                        aria-label="Hintergrundbild der Banderole hochladen"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(e) => void uploadPackaging(e, true)}
                      />
                    </label>
                    {backgroundLayer && (
                      <>
                        <button
                          onClick={() => {
                            updatePackagingLayer(backgroundLayer.id, (layer) => ({
                              ...layer,
                              locked: !layer.locked,
                            }));
                            setPackagingSelection(
                              backgroundLayer.locked ? [backgroundLayer.id] : [],
                            );
                          }}
                        >
                          {backgroundLayer.locked ? 'Bild bearbeiten' : 'Bild sperren'}
                        </button>
                        <button
                          onClick={() => {
                            updatePackagingPage({
                              layers: packagingPage.layers.filter(
                                (layer) => layer.role !== 'background',
                              ),
                            });
                            setPackagingSelection([]);
                          }}
                        >
                          Bild entfernen
                        </button>
                      </>
                    )}
                  </section>
                </>
              ) : (
                <section>
                  <h2>Hilfslinien</h2>
                  <p className="hint">
                    Stanz- und Falzlinien werden beim PDF-Export separat zugeschaltet.
                  </p>
                </section>
              )}
            </>
          )}
        </aside>
      </main>
      <footer className="statusbar">
        <span role="status">{message || 'Bereit'}</span>
        {busy && <button onClick={() => activeExport.current?.abort()}>Abbrechen</button>}
        <a className="legalLink" href={`${import.meta.env.BASE_URL}impressum.html`}>
          Impressum
        </a>
      </footer>
      {showExport && (
        <Dialog
          title="Exportieren"
          className={
            tab === 'packaging' && packagingKind === 'banderole'
              ? 'banderoleExportDialog'
              : undefined
          }
          onClose={() => {
            if (!busy) setShowExport(false);
          }}
        >
          <p>
            {tab === 'pattern'
              ? `Tuch ${mmToCm(project.sheetWidthMm)} × ${mmToCm(project.sheetHeightMm)} cm`
              : 'Banderole und Verpackung'}{' '}
            · RGB · Maße 1:1
          </p>
          {tab === 'pattern' && (
            <label className="textField">
              Auflösung
              <select value={ppi} disabled={busy} onChange={(e) => setPpi(Number(e.target.value))}>
                <option value={300}>300 PPI · Druck</option>
                <option value={150}>150 PPI · Entwurf</option>
              </select>
            </label>
          )}
          <div className="exportGrid">
            {tab === 'pattern' ? (
              <>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void run((signal) => exportPng(project, 'sheet', ppi, signal))}
                >
                  Tuch PNG
                </button>
                <button
                  disabled={busy}
                  onClick={() => void run((signal) => exportPdf(project, 'sheet', ppi, signal))}
                >
                  Tuch PDF
                </button>
                <button
                  disabled={busy}
                  onClick={() => void run((signal) => exportPng(project, 'tile', ppi, signal))}
                >
                  Kachel PNG
                </button>
              </>
            ) : (
              <div className="packExportOptions">
                <label>
                  <input
                    type="checkbox"
                    checked={includeCutMarks}
                    onChange={(e) => setIncludeCutMarks(e.target.checked)}
                  />{' '}
                  Schnittmarken
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={includeDieLines}
                    onChange={(e) => setIncludeDieLines(e.target.checked)}
                  />{' '}
                  {packagingKind === 'banderole' ? 'Stanzkontur' : 'Stanz- und Falzlinien'}
                </label>
                {packagingKind === 'banderole' && (
                  <>
                    <label>
                      <input
                        type="checkbox"
                        checked={includeInnerGuides}
                        onChange={(e) => setIncludeInnerGuides(e.target.checked)}
                      />
                      Innere Hilfslinien
                    </label>
                    <label className="textField">
                      Textausgabe
                      <select
                        value={textMode}
                        onChange={(e) => setTextMode(e.target.value as 'text' | 'paths')}
                      >
                        <option value="text">Bearbeitbarer Text</option>
                        <option value="paths">Text als Pfade</option>
                      </select>
                    </label>
                    <p className="hint">Beschnitt {bleedMm} mm · Endformat 235 × 47 mm</p>
                    <BanderolePreview document={packagingDocument} options={printOptions} />
                  </>
                )}
                {packagingKind === 'carton' && (
                  <label>
                    Seiten
                    <select
                      aria-label="PDF-Seiten der Faltschachtel"
                      onChange={(e) => setPackagingExportPages(Number(e.target.value))}
                      value={packagingExportPages}
                    >
                      <option value={0}>Außen und innen</option>
                      <option value={1}>Nur innen</option>
                      <option value={2}>Nur außen</option>
                    </select>
                  </label>
                )}
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      let selectedDocument = packagingDocument;
                      if (packagingKind === 'carton') {
                        if (packagingExportPages === 1)
                          selectedDocument = {
                            ...packagingDocument,
                            pages: [packagingDocument.pages[1]],
                          };
                        if (packagingExportPages === 2)
                          selectedDocument = {
                            ...packagingDocument,
                            pages: [packagingDocument.pages[0]],
                          };
                      }
                      await exportPackagingPdf(selectedDocument, {
                        cutMarks: includeCutMarks,
                        dieLines: includeDieLines,
                        innerGuides: includeInnerGuides,
                        textMode,
                      });
                    })
                  }
                >
                  Verpackung als PDF
                </button>
                {packagingKind === 'banderole' && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(() => exportPackagingSvg(packagingDocument, printOptions))
                    }
                  >
                    Banderole als SVG
                  </button>
                )}
              </div>
            )}
          </div>
          {message && <p aria-live="polite">{message}</p>}
          <div className="dialogActions">
            {busy ? (
              <button onClick={() => activeExport.current?.abort()}>Abbrechen</button>
            ) : (
              <button onClick={() => setShowExport(false)}>Schließen</button>
            )}
          </div>
        </Dialog>
      )}
      {showTemplates && (
        <Dialog title="Beispiel laden" onClose={() => setShowTemplates(false)}>
          <p>
            Vorlagen haben die Originalmaße der Stanze. Das Laden ersetzt den Entwurf dieser
            Verpackungsart.
          </p>
          <div className="templateChoices">
            {listPackagingTemplates(packagingKind).map((template) => (
              <button key={template.id} onClick={() => loadPackagingTemplate(template.sample)}>
                {template.name}
              </button>
            ))}
          </div>
          <div className="dialogActions">
            <button onClick={() => setShowTemplates(false)}>Schließen</button>
          </div>
        </Dialog>
      )}
      {showNewSession && (
        <Dialog
          title="Neues Projekt starten?"
          onClose={() => {
            if (!busy) setShowNewSession(false);
          }}
        >
          <p>
            Der aktuelle Entwurf und die lokale Sicherung werden gelöscht. Speichere dein Projekt
            vorher, wenn du es später weiterbearbeiten möchtest.
          </p>
          {sessionError && (
            <p role="alert" className="qualityWarning">
              {sessionError}
            </p>
          )}
          <div className="dialogActions">
            <button disabled={busy} onClick={() => setShowNewSession(false)}>
              Abbrechen
            </button>
            <button className="primary" disabled={busy} onClick={() => void startNewSession()}>
              {busy ? 'Bitte warten…' : 'Neues Projekt starten'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
