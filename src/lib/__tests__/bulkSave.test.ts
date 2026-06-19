import { describe, it, expect } from 'vitest';
import { buildBulkEstimations } from '../bulkSave';
import type { Estimation } from '../../types';

const base: Omit<Estimation, 'lineId'> = {
  inductorSelections: [{ inductorId: 'i1', selectedCranId: 'c1', inductorOccurrence: 1, juOccurrences: [{ juId: 'j1', occurrence: 2, locked: false }] }],
  customJUs: [{ id: 'cu1', name: 'X', variable: 1, fixed: 0, occurrence: 1, unitType: 'man_day' }],
  globalOccurrences: 2,
  yearlyBreakdown: [],
  totalDays: 10,
  totalKEuro: 0,
  status: 'Draft',
};

describe('buildBulkEstimations (HIW-174 §5)', () => {
  it('produces one Estimation per line id, each stamped with its own lineId and Draft status', () => {
    const out = buildBulkEstimations(['PL-1', 'PL-2'], base);
    expect(Object.keys(out)).toEqual(['PL-1', 'PL-2']);
    expect(out['PL-1'].lineId).toBe('PL-1');
    expect(out['PL-2'].lineId).toBe('PL-2');
    expect(out['PL-1'].status).toBe('Draft');
  });
  it('shares the same config (selections/customJUs/globalOccurrences/totals) across every line', () => {
    const out = buildBulkEstimations(['PL-1', 'PL-2'], base);
    expect(out['PL-2'].inductorSelections).toEqual(base.inductorSelections);
    expect(out['PL-2'].customJUs).toEqual(base.customJUs);
    expect(out['PL-2'].globalOccurrences).toBe(2);
    expect(out['PL-2'].totalDays).toBe(10);
  });
  it('deep-clones config so mutating one line does not bleed into another', () => {
    const out = buildBulkEstimations(['PL-1', 'PL-2'], base);
    out['PL-1'].inductorSelections[0].juOccurrences[0].occurrence = 99;
    expect(out['PL-2'].inductorSelections[0].juOccurrences[0].occurrence).toBe(2);
  });
  it('returns an empty object for an empty line list', () => {
    expect(buildBulkEstimations([], base)).toEqual({});
  });
});
