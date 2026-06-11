import { describe, it, expect } from 'vitest';
import { preloadSelections } from '../preload';
import { isEstimationDirty } from '../estimationDirty';
import type { PrototypeInductor } from '../../types';

const ind = (id: string, cranIds: string[]): PrototypeInductor => ({
  id, name: id, category: 'X',
  crans: cranIds.map((cid) => ({ id: cid, name: cid, jus: [] })),
});

describe('preloadSelections (HIW-174 additional comment)', () => {
  it('creates one selection per inductor with no cran for multi/zero-cran inductors', () => {
    const sels = preloadSelections([ind('i1', ['a', 'b']), ind('i2', [])]);
    expect(sels.map((s) => s.inductorId)).toEqual(['i1', 'i2']);
    expect(sels[0].selectedCranId).toBeNull();
    expect(sels[1].selectedCranId).toBeNull();
  });
  it('auto-selects the sole cran for single-cran inductors and seeds its JU occurrences', () => {
    const single = ind('i3', ['only']);
    single.crans[0].jus = [{ id: 'j1', name: 'j1', long_name: 'j1', variable: 1, fixed: 0, unit_type: 'man_day', occurrence: 1, occurrence_locked: false, custom: false, metier: 'H-DESIGN' }];
    const [sel] = preloadSelections([single]);
    expect(sel.selectedCranId).toBe('only');
    expect(sel.juOccurrences).toEqual([{ juId: 'j1', occurrence: 1, locked: false }]);
  });
  it('a freshly-preloaded panel is NOT dirty against the same preloaded baseline', () => {
    // Guards against the open-panel-immediately-dirty bug: the dirty baseline for an
    // unestimated line must be the preloaded selections, not the empty PRISTINE state.
    const inductors = [ind('i1', ['a', 'b']), ind('i2', ['only'])];
    inductors[1].crans[0].jus = [{ id: 'j1', name: 'j1', long_name: 'j1', variable: 1, fixed: 0, unit_type: 'man_day', occurrence: 1, occurrence_locked: false, custom: false, metier: 'H-DESIGN' }];
    const preloaded = preloadSelections(inductors);
    const baseline = { inductorSelections: preloaded, customJUs: [], globalOccurrences: 1 };
    const current = { inductorSelections: preloadSelections(inductors), customJUs: [], globalOccurrences: 1 };
    expect(isEstimationDirty(baseline, current)).toBe(false);
  });
});
