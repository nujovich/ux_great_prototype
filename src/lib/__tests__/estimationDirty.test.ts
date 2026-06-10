import { describe, it, expect } from 'vitest';
import { isEstimationDirty, type DirtyState } from '../estimationDirty';

const empty: DirtyState = { inductorSelections: [], customJUs: [], globalOccurrences: 1 };

describe('isEstimationDirty (HIW-174 §4)', () => {
  it('is false when current equals baseline', () => {
    expect(isEstimationDirty(empty, { ...empty })).toBe(false);
  });
  it('is false when baseline is undefined and current is the pristine default', () => {
    expect(isEstimationDirty(undefined, empty)).toBe(false);
  });
  it('detects a changed global occurrence', () => {
    expect(isEstimationDirty(empty, { ...empty, globalOccurrences: 2 })).toBe(true);
  });
  it('detects added custom JUs', () => {
    expect(isEstimationDirty(empty, { ...empty, customJUs: [{ id: 'c1', description: 'x', days: 2 }] })).toBe(true);
  });
  it('detects changed inductor selections', () => {
    const cur: DirtyState = { ...empty, inductorSelections: [{ inductorId: 'i1', selectedCranId: 'c1', inductorOccurrence: 1, juOccurrences: [] }] };
    expect(isEstimationDirty(empty, cur)).toBe(true);
  });
});
