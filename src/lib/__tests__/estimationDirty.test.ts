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
    expect(isEstimationDirty(empty, { ...empty, customJUs: [{ id: 'c1', name: 'x', variable: 1, fixed: 0, occurrence: 2 }] })).toBe(true);
  });
  it('detects changed inductor selections', () => {
    const cur: DirtyState = { ...empty, inductorSelections: [{ inductorId: 'i1', selectedCranId: 'c1', inductorOccurrence: 1, juOccurrences: [] }] };
    expect(isEstimationDirty(empty, cur)).toBe(true);
  });
  it('is false when a previously-saved (non-empty) baseline equals the current state', () => {
    const saved: DirtyState = {
      inductorSelections: [{ inductorId: 'i1', selectedCranId: 'c1', inductorOccurrence: 2, juOccurrences: [{ juId: 'j1', occurrence: 2, locked: false }] }],
      customJUs: [{ id: 'c1', name: 'x', variable: 1, fixed: 0, occurrence: 3 }],
      globalOccurrences: 4,
    };
    expect(isEstimationDirty(saved, { ...saved })).toBe(false);
  });
});
