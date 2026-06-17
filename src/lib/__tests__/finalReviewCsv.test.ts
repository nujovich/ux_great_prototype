import { describe, it, expect } from 'vitest';
import { buildFinalReviewCsvRows } from '../finalReviewCsv';
import { buildPlSheetMatrix } from '../finalReviewXlsx';
import { buildPlTree } from '../finalReviewAggregation';
import type { ProjectLine, Allocation, AllocationRow } from '../../types';

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
  ownerN2?: string; fteByYear?: Record<string, number>; keByYear?: Record<string, number>;
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
      keuro: s.keuro,
      isDirty: false,
      plNumber: 'PL-001',
      plName: 'Line 1',
      metier: 'H-DESIGN',
      ownerN2: s.ownerN2 ?? '',
      juCode: '',
      juDescription: '',
      fmmDescription: '',
      organType: '',
      energy: '',
      allianceCode: '',
      vehicleCode: '',
      standardEmissions: '',
      market: '',
      totalFte: s.fte,
      fteByYear: s.fteByYear ?? {},
      keByYear: s.keByYear ?? {},
    })),
  };
}

/** Make an AllocationRow for direct use with buildPlTree / buildPlSheetMatrix. */
function makeRow(over: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1', plNumber: 'PL-001', plName: 'Line 1', metier: 'H-DESIGN',
    ownerN2: 'O1', juCode: 'JU1', juDescription: 'd', fmmDescription: 'f',
    organType: '', energy: '', allianceCode: '', vehicleCode: '',
    standardEmissions: '', market: '', totalFte: 1,
    fteByYear: { '2025': 1 }, keByYear: { '2025': 100 },
    societe: 'S1', costType: 'FTE', fte: 1, keuro: 100,
    engineerId: 'e', percentage: 100, days: 0, isDirty: false,
    ...over,
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

// ── Issue 1: CSV↔XLSX Owner N2 parity ─────────────────────────────────────
describe('Owner N2 parity — CSV vs XLSX (issue 1)', () => {
  it('CSV Owner N2 must match XLSX Owner N2 for the same allocation row', () => {
    const OWNER = 'N2-MANAGER';
    const line = makeLine({ id: 'PL-001' });
    const alloc = makeAlloc('PL-001', [
      {
        id: 'r1', societe: 'Renault SAS-Paris', costType: 'FTE', fte: 1.0, keuro: 100,
        ownerN2: OWNER, fteByYear: { '2025': 1 }, keByYear: { '2025': 100 },
      },
    ]);

    // CSV path — locate Owner N2 by column name, resilient to reordering.
    const csvRows = buildFinalReviewCsvRows([line], [alloc]);
    const csvHeader = csvRows[0].split(',');
    const csvOwnerIdx = csvHeader.indexOf('Owner N2');
    const csvOwner = csvRows[1].split(',')[csvOwnerIdx];

    // XLSX path: build via AllocationRow → buildPlTree → buildPlSheetMatrix
    const allocRow = makeRow({ ownerN2: OWNER, fteByYear: { '2025': 1 }, keByYear: { '2025': 100 } });
    const [pl] = buildPlTree([allocRow], ['2025']);
    const matrix = buildPlSheetMatrix(pl, ['2025']);
    // Data row is index 1 (after header). Locate Owner N2 by column name — resilient to reordering.
    const ownerN2Idx = (matrix[0] as string[]).indexOf('Owner N2');
    const xlsxOwner = matrix[1][ownerN2Idx];

    expect(csvOwner).toBe(OWNER);
    expect(xlsxOwner).toBe(OWNER);
    expect(csvOwner).toBe(xlsxOwner);
  });
});

// ── Issue 2: Societe header spelling ──────────────────────────────────────
describe('Societe header spelling parity — CSV vs XLSX (issue 2)', () => {
  it('XLSX header must spell "Societe" (no accent), matching the spec and CSV', () => {
    const allocRow = makeRow({});
    const [pl] = buildPlTree([allocRow], ['2025']);
    const header = buildPlSheetMatrix(pl, ['2025'])[0] as string[];

    // Must contain the spec-correct spelling (no accent)
    expect(header).toContain('Societe');
    // Must NOT contain the accented variant
    expect(header).not.toContain('Société');
  });

  it('CSV header spells "Societe" (spec baseline, already correct)', () => {
    const [header] = buildFinalReviewCsvRows([], []);
    expect(header.split(',')).toContain('Societe');
  });
});

// ── Issue 1 (HIGH): Total K€ fallback to keuro when keByYear is empty ────────
describe('Total K€ fallback — keByYear empty (issue 1)', () => {
  it('CSV: uses keuro as Total K€ when keByYear is empty (not 0)', () => {
    const line = makeLine({ id: 'PL-001' });
    const alloc = makeAlloc('PL-001', [
      {
        id: 'r1', societe: 'S1', costType: 'FTE', fte: 1.0,
        keuro: 42,
        fteByYear: {},
        keByYear: {}, // empty — must fall back to keuro
      },
    ]);
    const csvRows = buildFinalReviewCsvRows([line], [alloc]);
    const csvHdr = csvRows[0].split(',');
    const keIdx = csvHdr.indexOf('Total K€');
    const csvKe = Number(csvRows[1].split(',')[keIdx]);
    expect(csvKe).toBe(42); // must use keuro fallback, not 0
  });

  it('Aggregation/XLSX: totalKe uses keuro fallback when keByYear is empty', () => {
    const allocRow = makeRow({
      keuro: 42,
      fteByYear: {},
      keByYear: {}, // empty — totalKe must come from keuro
      totalFte: 1,
    });
    const [pl] = buildPlTree([allocRow], []); // no years either
    expect(pl.subtotal.totalKe).toBe(42);
  });
});

// ── Issue 3: Total K€ source parity (CSV keuro vs XLSX sum(keByYear)) ─────
describe('Total K€ source parity — CSV vs XLSX (issue 3)', () => {
  it('CSV Total K€ must equal XLSX Total K€ when keByYear is populated', () => {
    // Use a fixture where split.keuro differs from sum(keByYear) to surface the bug
    const KE_YEAR = 80; // intentionally different from keuro=100 in base mk
    const line = makeLine({ id: 'PL-001' });
    const alloc = makeAlloc('PL-001', [
      {
        id: 'r1', societe: 'S1', costType: 'FTE', fte: 1.0,
        keuro: 999, // stale/different value — should NOT be used
        fteByYear: { '2025': 1 },
        keByYear: { '2025': KE_YEAR },
      },
    ]);

    // CSV Total K€ — locate by column name, resilient to reordering.
    const csvRows = buildFinalReviewCsvRows([line], [alloc]);
    const csvHeader = csvRows[0].split(',');
    const csvTotalKeIdx = csvHeader.indexOf('Total K€');
    const csvKe = Number(csvRows[1].split(',')[csvTotalKeIdx]);

    // XLSX Total K€
    const allocRow = makeRow({
      keuro: 999,
      fteByYear: { '2025': 1 },
      keByYear: { '2025': KE_YEAR },
    });
    const [pl] = buildPlTree([allocRow], ['2025']);
    const matrix = buildPlSheetMatrix(pl, ['2025']);
    // XLSX header: Métier, Owner N2, Societe, Cost Type, FMM Desc, JU Desc, JU Code, Total FTE, Total K€, ...
    // Total K€ is at index 8 in the header row
    const header = matrix[0] as string[];
    const totalKeIdx = header.indexOf('Total K€');
    const xlsxKe = matrix[1][totalKeIdx];

    expect(csvKe).toBe(KE_YEAR);
    expect(xlsxKe).toBe(KE_YEAR);
    expect(csvKe).toBe(xlsxKe);
  });
});
