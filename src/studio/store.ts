import { create } from 'zustand';
import { initialProject, type Project } from './model';
import { del, get, set } from 'idb-keyval';
const MAX_HISTORY = 30;
let persistence: Promise<unknown> = Promise.resolve();
function enqueuePersistence(operation: () => Promise<unknown>) { persistence = persistence.catch(() => undefined).then(operation); return persistence; }
const PROJECT_KEY = 'musterersteller-project';
const LEGACY_PROJECT_KEY = 'bergtuch-project';
function persistProject(project: Project) { return enqueuePersistence(() => set(PROJECT_KEY, project)); }
function clearPersistedProject() { return enqueuePersistence(async () => { await del(PROJECT_KEY); await del(LEGACY_PROJECT_KEY); }); }
type State = { draft: Project | null; beginTransform: () => void; previewTransform: (project: Project) => void; commitTransform: () => void; cancelTransform: () => void; ready: boolean; project: Project; past: Project[]; future: Project[]; selectedId: string | null; selectedIds: string[]; setProject: (p: Project) => void; update: (fn: (p: Project) => Project) => void; undo: () => void; redo: () => void; select: (id: string | null) => void; selectMany: (ids: string[]) => void; restore: () => Promise<void>; newSession: () => Promise<void> };
export const useStudio = create<State>((setState, getState) => ({
  draft: null,
  beginTransform: () => setState({ draft: getState().project }),
  previewTransform: draft => setState({ draft }),
  commitTransform: () => { const { draft, project, update } = getState(); if (draft && draft !== project) update(() => draft); setState({ draft: null }); },
  cancelTransform: () => setState({ draft: null }),
  ready: false, project: structuredClone(initialProject), past: [], future: [], selectedId: null, selectedIds: [],
  setProject: p => { setState({ draft: null, ready: true, project: p, past: [], future: [], selectedId: null, selectedIds: [] }); void persistProject(p); },
  update: fn => { const s = getState(); const next = fn(s.project); if (next === s.project) return; setState({ draft: null, project: next, past: [...s.past, s.project].slice(-MAX_HISTORY), future: [] }); void persistProject(next); },
  undo: () => { const s = getState(); if (!s.past.length) return; const p = s.past.at(-1)!; setState({ draft: null, project: p, past: s.past.slice(0,-1), future: [s.project,...s.future] }); void persistProject(p); },
  redo: () => { const s = getState(); if (!s.future.length) return; const [p,...rest] = s.future; setState({ draft: null, project: p, past: [...s.past,s.project], future: rest }); void persistProject(p); },
  select: id => setState({ selectedId: id, selectedIds: id ? [id] : [] }),
  selectMany: ids => setState({ selectedId: ids[0] ?? null, selectedIds: ids }),
  restore: async () => { try { let p = await get<Project>(PROJECT_KEY); if (!p) { p = await get<Project>(LEGACY_PROJECT_KEY); if (p) { await set(PROJECT_KEY, p); await del(LEGACY_PROJECT_KEY); } } if (p?.version === 1) setState({ project: p }); } finally { setState({ ready: true }); } },
  newSession: async () => { await clearPersistedProject(); const project = structuredClone(initialProject); setState({ draft: null, ready: true, project, past: [], future: [], selectedId: null, selectedIds: [] }); },
}));
