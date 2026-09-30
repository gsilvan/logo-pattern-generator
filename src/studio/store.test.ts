import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('idb-keyval', () => ({ get: vi.fn(), set: vi.fn().mockResolvedValue(undefined), del: vi.fn().mockResolvedValue(undefined) }));
import { set } from 'idb-keyval';
import { useStudio } from './store';
import { initialProject } from './model';
beforeEach(() => { useStudio.setState({ project: structuredClone(initialProject), draft: null, past: [], future: [], selectedIds: [], selectedId: null }); vi.clearAllMocks(); });
describe('transform transactions', () => {
  it('previews many frames without history or persistence, then commits one undo step', async () => {
    const start = useStudio.getState().project;
    useStudio.getState().beginTransform();
    for (let i = 1; i <= 20; i++) useStudio.getState().previewTransform({ ...start, tileWidthMm: 100 + i });
    expect(useStudio.getState().project).toBe(start);
    expect(useStudio.getState().past).toHaveLength(0);
    expect(set).not.toHaveBeenCalled();
    useStudio.getState().commitTransform();
    await Promise.resolve(); await Promise.resolve();
    expect(useStudio.getState().past).toEqual([start]);
    expect(useStudio.getState().project.tileWidthMm).toBe(120);
    expect(set).toHaveBeenCalledTimes(1);
    useStudio.getState().undo();
    expect(useStudio.getState().project).toBe(start);
    useStudio.getState().redo();
    expect(useStudio.getState().project.tileWidthMm).toBe(120);
  });
  it('cancels drafts and does not record a click without a transformation', () => {
    const start = useStudio.getState().project;
    useStudio.getState().beginTransform();
    useStudio.getState().commitTransform();
    expect(useStudio.getState().past).toHaveLength(0);
    useStudio.getState().beginTransform();
    useStudio.getState().previewTransform({ ...start, tileHeightMm: 150 });
    useStudio.getState().cancelTransform();
    expect(useStudio.getState().project).toBe(start);
    expect(useStudio.getState().draft).toBeNull();
    expect(useStudio.getState().past).toHaveLength(0);
  });
});
