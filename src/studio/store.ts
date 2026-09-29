import { create } from 'zustand';
import { initialProject, type Project } from './model';
import { get, set } from 'idb-keyval';
const MAX_HISTORY = 30;
type State = { project: Project; past: Project[]; future: Project[]; selectedId: string | null; selectedIds: string[]; setProject: (p: Project) => void; update: (fn: (p: Project) => Project) => void; undo: () => void; redo: () => void; select: (id: string | null) => void; selectMany: (ids: string[]) => void; restore: () => Promise<void> };
export const useStudio = create<State>((setState, getState) => ({
  project: initialProject, past: [], future: [], selectedId: null, selectedIds: [],
  setProject: p => { setState({ project: p, past: [], future: [] }); void set('bergtuch-project', p); },
  update: fn => { const s = getState(); const next = fn(s.project); if (next === s.project) return; setState({ project: next, past: [...s.past, s.project].slice(-MAX_HISTORY), future: [] }); void set('bergtuch-project', next); },
  undo: () => { const s = getState(); if (!s.past.length) return; const p = s.past.at(-1)!; setState({ project: p, past: s.past.slice(0,-1), future: [s.project,...s.future] }); void set('bergtuch-project', p); },
  redo: () => { const s = getState(); if (!s.future.length) return; const [p,...rest] = s.future; setState({ project: p, past: [...s.past,s.project], future: rest }); void set('bergtuch-project', p); },
  select: id => setState({ selectedId: id, selectedIds: id ? [id] : [] }),
  selectMany: ids => setState({ selectedId: ids[0] ?? null, selectedIds: ids }),
  restore: async () => { const p = await get<Project>('bergtuch-project'); if (p?.version === 1) setState({ project: p }); },
}));
