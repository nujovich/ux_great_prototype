import { describe, it, expect } from 'vitest';
import { ALLOCATIONS } from '../allocations';

describe('ALLOCATIONS fixture invariants', () => {
  it('every row Total FTE equals the sum of its per-year FTE', () => {
    const offenders: string[] = [];
    for (const alloc of ALLOCATIONS) {
      const rows = [...(alloc.originalRow ? [alloc.originalRow] : []), ...alloc.splits];
      for (const row of rows) {
        const perYearSum = Object.values(row.fteByYear).reduce((a, b) => a + b, 0);
        if (Math.abs(row.totalFte - perYearSum) > 0.001) {
          offenders.push(`${row.id}: totalFte=${row.totalFte} but Σ fteByYear=${perYearSum}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
