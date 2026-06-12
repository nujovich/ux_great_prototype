import { describe, it, expect } from 'vitest';
import { buildCranSelection } from '../cranSelection';
import type { PrototypeInductor } from '../../types';

const inductor = (cranIds: { id: string; juIds: string[] }[]): PrototypeInductor => ({
  id: 'ind-1',
  name: 'Test Inductor',
  category: 'Test',
  crans: cranIds.map(({ id, juIds }) => ({
    id,
    name: id,
    jus: juIds.map((jid) => ({
      id: jid,
      name: jid,
      long_name: jid,
      variable: 2,
      fixed: 0,
      unit_type: 'man_day' as const,
      occurrence: 3,
      occurrence_locked: false,
      custom: false,
      metier: 'H-DESIGN',
    })),
  })),
});

describe('buildCranSelection (HIW-14 §6)', () => {
  it('returns a selection with the chosen cranId and JUs seeded from cran defaults', () => {
    const ind = inductor([{ id: 'cr-1', juIds: ['j1', 'j2'] }]);
    const sel = buildCranSelection(ind, 'cr-1');
    expect(sel.selectedCranId).toBe('cr-1');
    expect(sel.juOccurrences).toHaveLength(2);
    expect(sel.juOccurrences[0]).toEqual({ juId: 'j1', occurrence: 3, locked: false });
    expect(sel.juOccurrences[1]).toEqual({ juId: 'j2', occurrence: 3, locked: false });
  });

  it('resets all occurrences to the JU default (not the previous cran values)', () => {
    const ind = inductor([
      { id: 'cr-1', juIds: ['j1'] },
      { id: 'cr-2', juIds: ['j3'] },
    ]);
    const sel = buildCranSelection(ind, 'cr-2');
    expect(sel.juOccurrences).toHaveLength(1);
    expect(sel.juOccurrences[0].juId).toBe('j3');
    expect(sel.juOccurrences[0].occurrence).toBe(3);
    expect(sel.juOccurrences[0].locked).toBe(false);
  });

  it('seeds an empty juOccurrences list when the cran has no JUs', () => {
    const ind = inductor([{ id: 'cr-empty', juIds: [] }]);
    const sel = buildCranSelection(ind, 'cr-empty');
    expect(sel.juOccurrences).toEqual([]);
  });

  it('seeds an empty juOccurrences list when the cranId is not found', () => {
    const ind = inductor([{ id: 'cr-1', juIds: ['j1'] }]);
    const sel = buildCranSelection(ind, 'cr-ghost');
    expect(sel.juOccurrences).toEqual([]);
    expect(sel.selectedCranId).toBe('cr-ghost');
  });

  it('sets inductorOccurrence to 1', () => {
    const ind = inductor([{ id: 'cr-1', juIds: ['j1'] }]);
    const sel = buildCranSelection(ind, 'cr-1');
    expect(sel.inductorOccurrence).toBe(1);
  });
});
