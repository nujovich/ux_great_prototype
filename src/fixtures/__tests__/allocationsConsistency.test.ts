import { describe, it, expect } from 'vitest';
import { ALLOCATIONS } from '../allocations';
import type { AllocationRow } from '../../types';
import { SOCIETES } from '../societes';

const round4 = (n: number) => Math.round(n * 10000) / 10000;

function allRows(): AllocationRow[] {
  return ALLOCATIONS.flatMap((a) => [
    ...(a.originalRow ? [a.originalRow] : []),
    ...a.splits,
  ]);
}

describe('allocations fixture consistency', () => {
  it('every row Total FTE equals the sum of its yearly FTE', () => {
    for (const row of allRows()) {
      const yearlySum = round4(Object.values(row.fteByYear).reduce((a, b) => a + b, 0));
      expect(
        round4(row.totalFte),
        `${row.id} totalFte ${row.totalFte} != Σ fteByYear ${yearlySum}`,
      ).toBe(yearlySum);
    }
  });

  it('every assigned societe is a valid option (no typos that render as Unassigned)', () => {
    const valid = new Set<string>(SOCIETES);
    for (const row of allRows()) {
      if (row.societe !== null) {
        expect(valid.has(row.societe), `${row.id} societe "${row.societe}" not in SOCIETES`).toBe(
          true,
        );
      }
    }
  });
});
