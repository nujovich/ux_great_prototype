import { describe, it, expect } from 'vitest';
// Import the filtered métier list that the dropdown renders from.
// We test the exported constant directly because @testing-library/react is not
// a project dependency and there is no existing component-render test pattern
// in this repo to follow — all tests are pure-unit style.
import { FILTER_METIERS } from '../GridFilters';

const EXCLUDED = ['H-NP', 'H-TESTING', 'H-PROJECT'] as const;
const ESTIMABLE = ['H-DESIGN', 'H-SOFTWARE'] as const;

describe('GridFiltersBar — métier dropdown options (HIW-174 §4)', () => {
  it('excludes H-NP from the métier filter options', () => {
    expect(FILTER_METIERS).not.toContain('H-NP');
  });

  it('excludes H-TESTING from the métier filter options', () => {
    expect(FILTER_METIERS).not.toContain('H-TESTING');
  });

  it('excludes H-PROJECT from the métier filter options', () => {
    expect(FILTER_METIERS).not.toContain('H-PROJECT');
  });

  it('still includes H-DESIGN (estimable métier)', () => {
    expect(FILTER_METIERS).toContain('H-DESIGN');
  });

  it('still includes H-SOFTWARE (estimable métier)', () => {
    expect(FILTER_METIERS).toContain('H-SOFTWARE');
  });

  it('contains exactly the 4 estimable métiers and no excluded ones', () => {
    for (const excluded of EXCLUDED) {
      expect(FILTER_METIERS, `${excluded} must not appear`).not.toContain(excluded);
    }
    for (const estimable of ESTIMABLE) {
      expect(FILTER_METIERS, `${estimable} must appear`).toContain(estimable);
    }
    // Total: METIERS has 7, minus 3 excluded = 4
    expect(FILTER_METIERS).toHaveLength(4);
  });
});
