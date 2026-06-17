import { describe, it, expect } from 'vitest';
import { filterApprovedLines, buildApprovedRows } from '../../lib/finalReviewHelpers';
import type { ProjectLine, Allocation } from '../../types';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeLine(over: Partial<ProjectLine> = {}): ProjectLine {
  return {
    id: 'PL-001',
    projectName: 'Project A',
    lineName: 'Line 1',
    metier: 'H-DESIGN',
    status: 'Approved',
    cycleId: 'cyc-2026h1',
    assignedEngineerId: 'eng-1',
    estimatedDays: 209,
    estimatedKEuro: 1.0,
    lastUpdatedAt: '2026-01-01T00:00:00.000Z',
    rejectionComment: null,
    lastUpdatedBy: 'user-1',
    ...over,
  } as ProjectLine;
}

// ── Issue 5: FR-BR-09 real predicate test ─────────────────────────────────

describe('FinalReviewPage — FR-BR-09 (real predicate via filterApprovedLines)', () => {
  it('excludes lines from inactive cycles', () => {
    const lines: ProjectLine[] = [
      makeLine({ id: 'a', status: 'Approved', cycleId: 'cyc-2026h1' }),
      makeLine({ id: 'b', status: 'Approved', cycleId: 'cyc-2025h2' }), // inactive cycle
      makeLine({ id: 'c', status: 'Draft',    cycleId: 'cyc-2026h1' }), // wrong status
    ];
    const result = filterApprovedLines(lines, 'cyc-2026h1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns empty array when no active cycle has approved lines', () => {
    const lines: ProjectLine[] = [
      makeLine({ id: 'a', status: 'Draft', cycleId: 'cyc-2026h1' }),
    ];
    expect(filterApprovedLines(lines, 'cyc-2026h1')).toHaveLength(0);
  });

  it('returns all approved lines for the active cycle when multiple exist', () => {
    const lines: ProjectLine[] = [
      makeLine({ id: 'a', status: 'Approved', cycleId: 'cyc-2026h1' }),
      makeLine({ id: 'b', status: 'Approved', cycleId: 'cyc-2026h1' }),
      makeLine({ id: 'c', status: 'Approved', cycleId: 'cyc-2025h1' }),
    ];
    const result = filterApprovedLines(lines, 'cyc-2026h1');
    expect(result.map((l) => l.id)).toEqual(['a', 'b']);
  });
});

// ── Issue 4: Zero-split approved lines must appear in on-screen/XLSX path ─

describe('buildApprovedRows — zero-split approved lines (issue 4)', () => {
  it('includes an approved line with no allocation splits as a zero placeholder row', () => {
    const line = makeLine({ id: 'PL-001' });
    const rows = buildApprovedRows([line], []); // no allocations at all
    expect(rows).toHaveLength(1);
    expect(rows[0].plNumber).toBe('PL-001');
    expect(rows[0].totalFte).toBe(0);
  });

  it('includes zero-split rows alongside allocated rows', () => {
    const lineA = makeLine({ id: 'PL-001', metier: 'H-DESIGN', lineName: 'Line A' });
    const lineB = makeLine({ id: 'PL-002', metier: 'H-SOFTWARE', lineName: 'Line B' });

    const allocA: Allocation = {
      lineId: 'PL-001',
      splits: [
        {
          id: 'r1', plNumber: 'PL-001', plName: 'Line A', metier: 'H-DESIGN',
          ownerN2: 'O1', juCode: 'JU1', juDescription: 'd', fmmDescription: 'f',
          organType: '', energy: '', allianceCode: '', vehicleCode: '',
          standardEmissions: '', market: '', totalFte: 1,
          fteByYear: { '2025': 1 }, keByYear: { '2025': 100 },
          societe: 'S1', costType: 'FTE', fte: 1, keuro: 100,
          engineerId: 'e', percentage: 100, days: 0, isDirty: false,
        },
      ],
    };

    const rows = buildApprovedRows([lineA, lineB], [allocA]);
    // lineA has 1 split; lineB has no allocation → zero placeholder
    expect(rows).toHaveLength(2);
    const plBRow = rows.find((r) => r.plNumber === 'PL-002');
    expect(plBRow).toBeDefined();
    expect(plBRow!.totalFte).toBe(0);
    expect(plBRow!.societe).toBeNull();
  });

  it('does not include the zero-split placeholder when splits exist (no duplication)', () => {
    const line = makeLine({ id: 'PL-001', metier: 'H-DESIGN', lineName: 'Line 1' });
    const alloc: Allocation = {
      lineId: 'PL-001',
      splits: [
        {
          id: 'r1', plNumber: 'PL-001', plName: 'Line 1', metier: 'H-DESIGN',
          ownerN2: 'O1', juCode: 'JU1', juDescription: 'd', fmmDescription: 'f',
          organType: '', energy: '', allianceCode: '', vehicleCode: '',
          standardEmissions: '', market: '', totalFte: 1,
          fteByYear: { '2025': 1 }, keByYear: { '2025': 100 },
          societe: 'S1', costType: 'FTE', fte: 1, keuro: 100,
          engineerId: 'e', percentage: 100, days: 0, isDirty: false,
        },
      ],
    };
    const rows = buildApprovedRows([line], [alloc]);
    expect(rows).toHaveLength(1);
    expect(rows[0].totalFte).toBe(1);
  });
});
