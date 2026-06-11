import { describe, it, expect } from 'vitest';
import { calcEstimationTotals, calcTotalDays } from '../calc';
import type { InductorSelection, PrototypeInductor, CustomJU, JU } from '../../types';

const ju = (id: string, variable: number, fixed: number, unit_type: JU['unit_type']): JU => ({
  id, name: id, long_name: id, variable, fixed, unit_type,
  occurrence: 1, occurrence_locked: false, custom: false, metier: 'H-DESIGN',
});

const inductorWith = (jus: JU[]): PrototypeInductor => ({
  id: 'ind-1', name: 'Test', category: 'Test',
  crans: [{ id: 'cr-1', name: 'C', jus }],
});

const selOf = (juOccurrences: { juId: string; occurrence: number; locked: boolean }[]): InductorSelection => ({
  inductorId: 'ind-1', selectedCranId: 'cr-1', inductorOccurrence: 1, juOccurrences,
});

describe('calcEstimationTotals (HIW-174 §8/§9)', () => {
  it('applies Total = (Variable × Occurrence) + Fixed per man_day JU', () => {
    const inds = [inductorWith([ju('j1', 2, 0.5, 'man_day')])];
    const sel = selOf([{ juId: 'j1', occurrence: 3, locked: false }]);
    // (2 × 3) + 0.5 = 6.5
    expect(calcEstimationTotals([sel], inds, [], 1).manDays).toBeCloseTo(6.5);
  });

  it('segregates man_day / bench_hours / kilometres into separate buckets', () => {
    const inds = [inductorWith([
      ju('md', 2, 0, 'man_day'),
      ju('bh', 5, 1, 'bench_hours'),
      ju('km', 10, 0, 'kilometres'),
    ])];
    const sel = selOf([
      { juId: 'md', occurrence: 2, locked: false }, // 4
      { juId: 'bh', occurrence: 3, locked: false }, // 16
      { juId: 'km', occurrence: 2, locked: false }, // 20
    ]);
    const t = calcEstimationTotals([sel], inds, [], 1);
    expect(t.manDays).toBeCloseTo(4);
    expect(t.benchHours).toBeCloseTo(16);
    expect(t.km).toBeCloseTo(20);
  });

  it('derives FTE = manDays / 209 and stubs keuro to 0 (SDD §11)', () => {
    const inds = [inductorWith([ju('j1', 209, 0, 'man_day')])];
    const sel = selOf([{ juId: 'j1', occurrence: 1, locked: false }]);
    const t = calcEstimationTotals([sel], inds, [], 1);
    expect(t.manDays).toBeCloseTo(209);
    expect(t.fte).toBeCloseTo(1);
    expect(t.keuro).toBe(0);
  });

  it('multiplies every bucket by globalOccurrences; zero ⇒ all zero (BR-13)', () => {
    const inds = [inductorWith([ju('md', 2, 0, 'man_day'), ju('bh', 1, 0, 'bench_hours')])];
    const sel = selOf([{ juId: 'md', occurrence: 1, locked: false }, { juId: 'bh', occurrence: 1, locked: false }]);
    const x3 = calcEstimationTotals([sel], inds, [], 3);
    expect(x3.manDays).toBeCloseTo(6);
    expect(x3.benchHours).toBeCloseTo(3);
    const x0 = calcEstimationTotals([sel], inds, [], 0);
    expect(x0.manDays).toBe(0);
    expect(x0.benchHours).toBe(0);
  });

  it('falls back to ju.occurrence when no override and skips cran-less inductors (BR-12)', () => {
    const inds = [inductorWith([ju('j1', 2, 0, 'man_day')])];
    const noCran: InductorSelection = { inductorId: 'ind-1', selectedCranId: null, inductorOccurrence: 1, juOccurrences: [] };
    expect(calcEstimationTotals([noCran], inds, [], 1).manDays).toBe(0);
    const withSel = selOf([]); // no juOccurrences override → uses ju.occurrence (1)
    expect(calcEstimationTotals([withSel], inds, [], 1).manDays).toBeCloseTo(2); // (2×1)+0
  });

  it('custom JUs contribute their days to man-days (legacy model preserved in 3A)', () => {
    const customJUs: CustomJU[] = [{ id: 'c1', description: 'x', days: 4 }];
    expect(calcEstimationTotals([], [], customJUs, 2).manDays).toBeCloseTo(8);
  });

  it('calcTotalDays returns the man-days bucket (backward-compatible)', () => {
    const inds = [inductorWith([ju('j1', 3, 0, 'man_day')])];
    const sel = selOf([{ juId: 'j1', occurrence: 2, locked: false }]);
    expect(calcTotalDays([sel], inds, [], 1)).toBeCloseTo(6);
  });
});
