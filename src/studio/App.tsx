import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { Workspace } from './Workspace';
import { Dialog } from './Dialog';
import { useStudio } from './store';
import { cmToMm, mmToCm, parseCm, type Motif, type Project } from './model';
import { readAsset, exportPng, exportPdf, openProject, saveProject } from './files';
import { renderPackaging } from './render';
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
function PackPreview({ kind }: { kind: 'front' | 'back' | 'band' }) {
  const project = useStudio((s) => s.project);
  const [url, setUrl] = useState('');
  const lastUrl = useRef('');
  useEffect(
    () => () => {
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    },
    [],
  );
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void renderPackaging(project, kind, 65)
        .then(
          (c) =>
            new Promise<Blob>((res, rej) =>
              c.toBlob((b) => (b ? res(b) : rej(Error('Vorschau fehlgeschlagen')))),
            ),
        )
        .then((b) => {
          const next = URL.createObjectURL(b);
          if (active) {
            if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
            lastUrl.current = next;
            setUrl(next);
          } else URL.revokeObjectURL(next);
        })
        .catch(console.error);
    }, 140);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [project, kind]);
  return (
    <figure className="packPreview">
      {url ? (
        <img src={url} alt={`${kind} Vorschau`} />
      ) : (
        <div className="packPending">Lade Vorschau…</div>
      )}
      <figcaption>
        {kind === 'front' ? 'Vorderseite' : kind === 'back' ? 'Rückseite' : 'Banderole'}
      </figcaption>
    </figure>
  );
}
export function App() {
  const project = useStudio((s) => s.project),
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
  const activeExport = useRef<AbortController | null>(null);
  const selected = project.motifs.find((m) => m.id === selectedId);
  useEffect(() => {
    void restore();
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
            Banderole
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
          <button className="primary" disabled={!ready} onClick={() => setShowExport(true)}>
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
            <div className="packGrid">
              <PackPreview kind="front" />
              <PackPreview kind="back" />
              <PackPreview kind="band" />
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
                <h2>Banderole</h2>
                <label className="uploadButton">
                  + Logo hochladen
                  <input
                    aria-label="Logo hochladen"
                    type="file"
                    disabled={busy}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                    onChange={(e) => void upload(e, 'logo')}
                  />
                </label>
                <div className="fieldGrid">
                  {editNumber(
                    'Logobreite',
                    project.packaging.logoWidthMm / 10,
                    (n) => updatePack('logoWidthMm', cmToMm(n)),
                    0.2,
                    10,
                  )}
                  {editNumber(
                    'Drehung',
                    project.packaging.logoRotation,
                    (n) => updatePack('logoRotation', n),
                    -36000,
                    36000,
                    1,
                    '°',
                  )}
                  {editNumber(
                    'Position X',
                    project.packaging.logoXMm / 10,
                    (n) => updatePack('logoXMm', cmToMm(n)),
                    -20,
                    30,
                  )}
                  {editNumber(
                    'Position Y',
                    project.packaging.logoYMm / 10,
                    (n) => updatePack('logoYMm', cmToMm(n)),
                    -20,
                    30,
                  )}
                </div>
              </section>
              <section>
                <h2>Firmendaten</h2>
                {(['company', 'street', 'zip', 'city'] as const).map((key, i) => (
                  <label className="textField" key={key}>
                    <span>{['Firma', 'Straße', 'PLZ', 'Ort'][i]}</span>
                    <input
                      value={project.packaging[key]}
                      onChange={(e) => updatePack(key, e.target.value)}
                    />
                  </label>
                ))}
              </section>
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
          <label className="textField">
            Auflösung
            <select value={ppi} disabled={busy} onChange={(e) => setPpi(Number(e.target.value))}>
              <option value={300}>300 PPI · Druck</option>
              <option value={150}>150 PPI · Entwurf</option>
            </select>
          </label>
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
              <>
                {(['front', 'back', 'band'] as const).map((kind) => (
                  <div className="exportPair" key={kind}>
                    <span>
                      {kind === 'front'
                        ? 'Vorderseite'
                        : kind === 'back'
                          ? 'Rückseite'
                          : 'Banderole'}
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => void run((signal) => exportPng(project, kind, ppi, signal))}
                    >
                      PNG
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void run((signal) => exportPdf(project, kind, ppi, signal))}
                    >
                      PDF
                    </button>
                  </div>
                ))}
              </>
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
