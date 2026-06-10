import { describe, it, expect } from 'vitest';
import { buildFinalReviewCsvRows } from '../finalReviewCsv';
import type { ProjectLine, Allocation } from '../../types';

function makeLine(overrides: Partial<ProjectLine> = {}): ProjectLine {
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
    ...overrides,
  } as ProjectLine;
}

function makeAlloc(lineId: string, splits: Array<{
  id: string; societe: string | null; costType: 'FTE' | 'TSA' | 'TC'; fte: number; keuro: number;
}>): Allocation {
  return {
    lineId,
    splits: splits.map((s) => ({
      id: s.id,
      engineerId: 'eng-1',
      percentage: 100,
      days: Math.round(s.fte * 209),
      fte: s.fte,
      societe: s.societe,
      costType: s.costType,
      diversity: null,
      keuro: s.keuro,
      isDirty: false,
    })),
  };
}

describe('buildFinalReviewCsvRows (FR-BR-10)', () => {
  it('returns header row with 13 spec-defined columns', () => {
    const [header] = buildFinalReviewCsvRows([], []);
    const cols = header.split(',');
    expect(cols).toHaveLength(13);
    expect(cols[0]).toBe('PL Number');
    expect(cols[4]).toBe('Societe');
    expect(cols[9]).toBe('Total FTE');
    expect(cols[11]).toBe('Total BH');
    expect(cols[12]).toBe('Total KM');
  });

  it('produces one row per allocation split (FR-BR-10: one row per JU proxy)', () => {
    const line = makeLine({ id: 'PL-001' });
    const alloc = makeAlloc('PL-001', [
      { id: 'r1', societe: 'Renault SAS-Paris', costType: 'FTE', fte: 0.5, keuro: 0.43 },
      { id: 'r2', societe: 'RNBV-Amsterdam',    costType: 'TSA', fte: 0.5, keuro: 0.43 },
    ]);
    const rows = buildFinalReviewCsvRows([line], [alloc]);
    expect(rows).toHaveLength(3); // 1 header + 2 data rows
  });

  it('produces one row for a line with no allocation', () => {
    const line = makeLine({ id: 'PL-002' });
    const rows = buildFinalReviewCsvRows([line], []);
    expect(rows).toHaveLength(2); // 1 header + 1 data row (empty societe/costType)
  });

  it('sets FMM Description, JU Description, JU Code to placeholder (FINAL-01 pending)', () => {
    const line = makeLine({ id: 'PL-001' });
    const alloc = makeAlloc('PL-001', [
      { id: 'r1', societe: 'Renault SAS-Paris', costType: 'FTE', fte: 1.0, keuro: 0.85 },
    ]);
    const [, dataRow] = buildFinalReviewCsvRows([line], [alloc]);
    const cols = dataRow.split(',');
    expect(cols[6]).toBe('—'); // FMM Description
    expect(cols[7]).toBe('—'); // JU Description
    expect(cols[8]).toBe('—'); // JU Code
  });

  it('sets Total BH and Total KM to 0 (unit_type not in data model)', () => {
    const line = makeLine({ id: 'PL-001' });
    const alloc = makeAlloc('PL-001', [
      { id: 'r1', societe: 'Renault SAS-Paris', costType: 'FTE', fte: 1.0, keuro: 0.85 },
    ]);
    const [, dataRow] = buildFinalReviewCsvRows([line], [alloc]);
    const cols = dataRow.split(',');
    expect(cols[11]).toBe('0'); // Total BH
    expect(cols[12]).toBe('0'); // Total KM
  });

  it('no subtotal rows — only data rows and header (FR-BR-10)', () => {
    const lines = [makeLine({ id: 'PL-001' }), makeLine({ id: 'PL-002' })];
    const allocs = [
      makeAlloc('PL-001', [{ id: 'r1', societe: 'Renault SAS-Paris', costType: 'FTE', fte: 1.0, keuro: 0.85 }]),
      makeAlloc('PL-002', [{ id: 'r2', societe: 'RNBV-Amsterdam',    costType: 'TSA', fte: 0.5, keuro: 0.43 }]),
    ];
    const rows = buildFinalReviewCsvRows(lines, allocs);
    expect(rows).toHaveLength(3); // 1 header + 2 data rows
  });
});
