import { describe, it, expect } from 'vitest';
import { juTotal, shouldShowCranDropdown } from '../juTotal';
import type { JU } from '../../types';

const mk = (variable: number, fixed: number): JU => ({
  id: 'j', name: 'j', long_name: 'j', variable, fixed, unit_type: 'man_day',
  occurrence: 1, occurrence_locked: false, custom: false, metier: 'H-DESIGN',
});

describe('juTotal (HIW-174 §8)', () => {
  it('computes (variable × occurrence) + fixed', () => {
    expect(juTotal(mk(2, 0.5), 3)).toBeCloseTo(6.5);
  });
  it('treats missing variable/fixed as 0', () => {
    expect(juTotal({ id: 'x', name: 'x', occurrence: 1, occurrence_locked: false, custom: false, metier: 'H-DESIGN' } as JU, 4)).toBe(0);
  });
});

describe('shouldShowCranDropdown (HIW-174 §7)', () => {
  it('hides the dropdown for a single cran (fixed label)', () => {
    expect(shouldShowCranDropdown(1)).toBe(false);
  });
  it('shows the dropdown for multiple crans', () => {
    expect(shouldShowCranDropdown(2)).toBe(true);
  });
  it('hides for zero crans (no-workload case)', () => {
    expect(shouldShowCranDropdown(0)).toBe(false);
  });
});
