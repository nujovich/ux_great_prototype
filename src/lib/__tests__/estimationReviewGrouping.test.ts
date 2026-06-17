import { describe, it, expect } from 'vitest';
import { groupRowsByAssignee } from '../estimationReviewGrouping';
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
const name = (id: string | null) => (id === null ? 'Unassigned' : `Name ${id}`);

describe('groupRowsByAssignee', () => {
  it('groups rows by assignee preserving first-seen order', () => {
    const rows = [
      row({ id: 'A', assignedEngineerId: 'eng-1' }),
      row({ id: 'B', assignedEngineerId: 'eng-2' }),
      row({ id: 'C', assignedEngineerId: 'eng-1' }),
    ];
    const groups = groupRowsByAssignee(rows, name, years);
    expect(groups.map((g) => g.assigneeId)).toEqual(['eng-1', 'eng-2']);
    expect(groups[0].rows.map((r) => r.id)).toEqual(['A', 'C']);
    expect(groups[0].assigneeName).toBe('Name eng-1');
  });

  it('buckets rows with no assignee under a null/Unassigned group', () => {
    const rows = [row({ id: 'A', assignedEngineerId: null })];
    const groups = groupRowsByAssignee(rows, name, years);
    expect(groups[0].assigneeId).toBeNull();
    expect(groups[0].assigneeName).toBe('Unassigned');
  });

  it('sums subtotals (totals + per-year) within each group', () => {
    const rows = [
      row({ assignedEngineerId: 'eng-1', totalFte: 1.5, totalBh: 10, totalKm: 100,
            yearlyFte: { '2026': 1.5 }, yearlyKEuro: { '2026': 20 } }),
      row({ assignedEngineerId: 'eng-1', totalFte: 0.5, totalBh: 5, totalKm: 50,
            yearlyFte: { '2026': 0.5 }, yearlyKEuro: { '2026': 30 } }),
    ];
    const [g] = groupRowsByAssignee(rows, name, years);
    expect(g.subtotal.totalFte).toBeCloseTo(2.0);
    expect(g.subtotal.totalBh).toBe(15);
    expect(g.subtotal.totalKm).toBe(150);
    expect(g.subtotal.yearlyFte['2026']).toBeCloseTo(2.0);
    expect(g.subtotal.yearlyKEuro['2026']).toBe(50);
  });
});
