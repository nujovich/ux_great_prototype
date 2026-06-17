import { describe, it, expect } from 'vitest';
import { groupRowsByProject } from '../estimationReviewGrouping';
import type { EstimationReviewGridRow } from '../estimationReviewRows';

function row(over: Partial<EstimationReviewGridRow>): EstimationReviewGridRow {
  return {
    id: 'PL', lineName: 'L', projectName: 'P', status: 'Draft',
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

describe('groupRowsByProject', () => {
  it('groups rows by projectName preserving first-seen order', () => {
    const rows = [
      row({ id: 'A', projectName: 'Auth Platform' }),
      row({ id: 'B', projectName: 'Payments' }),
      row({ id: 'C', projectName: 'Auth Platform' }),
    ];
    const groups = groupRowsByProject(rows, years);
    expect(groups.map((g) => g.projectName)).toEqual(['Auth Platform', 'Payments']);
    expect(groups[0].rows.map((r) => r.id)).toEqual(['A', 'C']);
  });

  it('sums subtotals (totals + per-year) within each group', () => {
    const rows = [
      row({ projectName: 'Auth Platform', totalFte: 1.5, totalBh: 10, totalKm: 100,
            yearlyFte: { '2026': 1.5 }, yearlyKEuro: { '2026': 20 } }),
      row({ projectName: 'Auth Platform', totalFte: 0.5, totalBh: 5, totalKm: 50,
            yearlyFte: { '2026': 0.5 }, yearlyKEuro: { '2026': 30 } }),
    ];
    const [g] = groupRowsByProject(rows, years);
    expect(g.subtotal.totalFte).toBeCloseTo(2.0);
    expect(g.subtotal.totalBh).toBe(15);
    expect(g.subtotal.totalKm).toBe(150);
    expect(g.subtotal.yearlyFte['2026']).toBeCloseTo(2.0);
    expect(g.subtotal.yearlyKEuro['2026']).toBe(50);
  });
});
