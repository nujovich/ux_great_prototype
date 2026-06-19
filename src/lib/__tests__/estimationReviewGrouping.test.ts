import { describe, it, expect } from 'vitest';
import { groupRowsByPlNumber } from '../estimationReviewGrouping';
import type { EstimationReviewGridRow } from '../estimationReviewRows';

function row(over: Partial<EstimationReviewGridRow>): EstimationReviewGridRow {
  return {
    id: 'PL', lineName: 'L', projectName: 'P', plNumber: 'PL-001', plName: 'Auth Platform',
    status: 'Draft', metier: 'H-DESIGN',
    assignedEngineerId: 'eng-1',
    totalFte: 0, totalBh: 0, totalKm: 0,
    yearlyFte: { '2026': 0 }, yearlyBh: { '2026': 0 }, yearlyKm: { '2026': 0 },
    yearlyKEuro: { '2026': 0 },
    engineerApproval: '', cpoApproval: '',
    cycleId: 'cycle-1',
    ...over,
  } as EstimationReviewGridRow;
}

const years = ['2026'];

describe('groupRowsByPlNumber', () => {
  it('groups rows by plNumber, one table per PL Number', () => {
    const rows = [
      row({ id: 'PL-001-DES', plNumber: 'PL-001', plName: 'Auth Platform', metier: 'H-DESIGN' }),
      row({ id: 'PL-002-DES', plNumber: 'PL-002', plName: 'Payments', metier: 'H-DESIGN' }),
      row({ id: 'PL-001-SW', plNumber: 'PL-001', plName: 'Auth Platform', metier: 'H-SOFTWARE' }),
    ];
    const groups = groupRowsByPlNumber(rows, years);
    expect(groups.map((g) => g.plNumber)).toEqual(['PL-001', 'PL-002']);
    expect(groups[0].plName).toBe('Auth Platform');
    expect(groups[0].rows.map((r) => r.id)).toEqual(['PL-001-DES', 'PL-001-SW']);
  });

  it('keeps table order immutable (sorted by plNumber) regardless of row order', () => {
    // Rows arrive with PL-002 first (e.g. after a column sort): table order must NOT follow.
    const rows = [
      row({ id: 'PL-002-DES', plNumber: 'PL-002', plName: 'Payments' }),
      row({ id: 'PL-001-DES', plNumber: 'PL-001', plName: 'Auth Platform' }),
    ];
    const groups = groupRowsByPlNumber(rows, years);
    expect(groups.map((g) => g.plNumber)).toEqual(['PL-001', 'PL-002']);
  });

  it('falls back to id/lineName when plNumber/plName are absent', () => {
    const rows = [row({ id: 'X-1', plNumber: undefined, plName: undefined, lineName: 'Loose line' })];
    const [g] = groupRowsByPlNumber(rows, years);
    expect(g.plNumber).toBe('X-1');
    expect(g.plName).toBe('Loose line');
  });

  it('sums subtotals (totals + per-year) within each PL group', () => {
    const rows = [
      row({ plNumber: 'PL-001', totalFte: 1.5, totalBh: 10, totalKm: 100,
            yearlyFte: { '2026': 1.5 }, yearlyKEuro: { '2026': 20 } }),
      row({ plNumber: 'PL-001', totalFte: 0.5, totalBh: 5, totalKm: 50,
            yearlyFte: { '2026': 0.5 }, yearlyKEuro: { '2026': 30 } }),
    ];
    const [g] = groupRowsByPlNumber(rows, years);
    expect(g.subtotal.totalFte).toBeCloseTo(2.0);
    expect(g.subtotal.totalBh).toBe(15);
    expect(g.subtotal.totalKm).toBe(150);
    expect(g.subtotal.yearlyFte['2026']).toBeCloseTo(2.0);
    expect(g.subtotal.yearlyKEuro['2026']).toBe(50);
  });
});
