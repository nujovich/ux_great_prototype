import { describe, it, expect } from 'vitest';
import { canSaveDraft, canPromoteDefinitive } from '../saveGate';
import type { InductorSelection, CustomJU } from '../../types';

const sel = (cran: string | null): InductorSelection => ({
  inductorId: 'i', selectedCranId: cran, inductorOccurrence: 1, juOccurrences: [],
});
const custom = (name: string): CustomJU => ({ id: 'c', name, variable: 1, fixed: 0, occurrence: 1, unitType: 'man_day' });

describe('canSaveDraft (HIW-174 §9 — block empty Draft)', () => {
  it('false when there is no selected cran and no named custom JU', () => {
    expect(canSaveDraft([sel(null)], [])).toBe(false);
    expect(canSaveDraft([], [])).toBe(false);
    expect(canSaveDraft([sel(null)], [custom('  ')])).toBe(false); // whitespace name doesn't count
  });
  it('true when at least one inductor has a selected cran', () => {
    expect(canSaveDraft([sel('cr-1')], [])).toBe(true);
  });
  it('true when at least one named custom JU exists (no-workload-standard path, BR-11)', () => {
    expect(canSaveDraft([], [custom('My JU')])).toBe(true);
  });
});

describe('canPromoteDefinitive', () => {
  it('allows a Custom-JU-only estimation (HIW-174 K5)', () => {
    expect(
      canPromoteDefinitive([], [{ id: 'c1', name: 'Bench setup', variable: 1, fixed: 0, occurrence: 2, unitType: 'man_day' }], 1),
    ).toBe(true);
  });
  it('blocks when nothing is configured', () => {
    expect(canPromoteDefinitive([], [], 1)).toBe(false);
  });
  it('blocks when globalOccurrence is 0', () => {
    expect(canPromoteDefinitive([], [{ id: 'c1', name: 'x', variable: 1, fixed: 0, occurrence: 1, unitType: 'man_day' }], 0)).toBe(false);
  });
});
