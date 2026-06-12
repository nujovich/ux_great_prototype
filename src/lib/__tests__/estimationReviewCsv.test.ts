import { describe, it, expect } from 'vitest';
import { generateCsv } from '../estimationReviewCsv';
import type { EstimationReviewGridRow } from '../estimationReviewRows';
import type { ProjectLine } from '../../types';

function makeRow(overrides: Partial<EstimationReviewGridRow> = {}): EstimationReviewGridRow {
  const base: ProjectLine = {
    id: 'PL-001',
    name: 'Auth API',
    project_id: 'PROJ-A-H-SOFTWARE',
    lineName: 'Auth API',
    projectName: 'PROJ-A',
    metier: 'H-SOFTWARE',
    status: 'Estimated',
    updated_at: '2026-06-10T00:00:00Z',
    assignedEngineerId: 'eng-1',
    estimatedDays: 20,
    estimatedKEuro: 50,
    cycleId: 'cycle-1',
    lastUpdatedBy: 'eng-1',
    lastUpdatedAt: '2026-06-10T00:00:00Z',
  };
  return {
    ...base,
    totalFte: 0.10,
    totalBh: 0,
    totalKm: 0,
    yearlyKEuro: { '2026': 25, '2027': 25 },
    yearlyFte: { '2026': 0, '2027': 0 },
    yearlyBh: { '2026': 0, '2027': 0 },
    yearlyKm: { '2026': 0, '2027': 0 },
    engineerApproval: '✓',
    cpoApproval: '— (not yet sent)',
    ...overrides,
  };
}

describe('generateCsv', () => {
  const cycleYears = ['2026', '2027'];

  it('returns empty string for empty rows', () => {
    expect(generateCsv([], [], cycleYears)).toBe('');
  });

  it('includes header row with static + yearly columns', () => {
    const csv = generateCsv([makeRow()], [], cycleYears);
    expect(csv).toContain('PL Number');
    expect(csv).toContain('Engineer Approval');
    expect(csv).toContain('K€ 2026');
    expect(csv).toContain('K€ 2027');
  });

  it('includes row data for all filtered mode (second arg ignored)', () => {
    const csv = generateCsv([makeRow()], [], cycleYears);
    expect(csv).toContain('PL-001');
    expect(csv).toContain('Auth API');
    expect(csv).toContain('H-SOFTWARE');
  });

  it('exports only selected rows when selectedIds provided', () => {
    const rows = [
      makeRow({ id: 'PL-001' }),
      makeRow({ id: 'PL-002', lineName: 'Other' }),
    ];
    const csv = generateCsv(rows, ['PL-001'], cycleYears);
    expect(csv).toContain('PL-001');
    expect(csv).not.toContain('PL-002');
  });

  it('exports all rows when selectedIds is empty array', () => {
    const rows = [
      makeRow({ id: 'PL-001' }),
      makeRow({ id: 'PL-002', lineName: 'Other' }),
    ];
    const csv = generateCsv(rows, [], cycleYears);
    expect(csv).toContain('PL-001');
    expect(csv).toContain('PL-002');
  });
});
