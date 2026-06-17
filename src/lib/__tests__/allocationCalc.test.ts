import { describe, it, expect } from 'vitest';
import {
  calcRowKeuro,
  validateAllocationSave,
  rowNeedsWarning,
  rowIsUnresolved,
  distributeTcKeByYear,
  splitFteProportional,
  applyAllocationFilters,
  sortAllocationRows,
  groupRowsByPl,
  recalcKeByRate,
} from '../allocationCalc';
import type { AllocationRow } from '../../types';
import type { AllocationFilterState } from '../../types';

function row(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1',
    engineerId: 'eng-1',
    percentage: 100,
    days: 209,
    fte: 1.0,
    societe: null,
    costType: 'FTE',
    keuro: 0,
    isDirty: false,
    plNumber: 'PL-01',
    plName: 'Project Alpha',
    metier: 'H-DESIGN',
    ownerN2: 'Zone-A',
    juCode: 'JU-001',
    juDescription: 'Test JU',
    fmmDescription: '',
    organType: '',
    energy: '',
    allianceCode: '',
    vehicleCode: '',
    standardEmissions: '',
    market: '',
    totalFte: 1.0,
    fteByYear: { '2024': 0.5, '2025': 0.5 },
    keByYear: { '2024': 0, '2025': 0 },
    ...overrides,
  };
}

describe('calcRowKeuro (ALLOC-BR-04)', () => {
  it('K€ = FTE × rate', () => {
    expect(calcRowKeuro(209, 0.85)).toBeCloseTo(0.85);
  });

  it('zero days gives zero K€', () => {
    expect(calcRowKeuro(0, 0.85)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calcRowKeuro(100, 0.85)).toBeCloseTo(0.41);
  });
});

describe('validateAllocationSave (ALLOC-BR-06/13)', () => {
  it('TSA without societe blocks save', () => {
    const result = validateAllocationSave([row({ costType: 'TSA', societe: null })]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('TSA');
  });

  it('TC without societe blocks save (ALLOC-BR-13)', () => {
    const result = validateAllocationSave([row({ costType: 'TC', societe: null })]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('TC');
  });

  it('FTE without societe does NOT block save (ALLOC-BR-07)', () => {
    const result = validateAllocationSave([row({ costType: 'FTE', societe: null })]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('TSA with societe is valid', () => {
    const result = validateAllocationSave([row({ costType: 'TSA', societe: 'Renault SAS-Paris' })]);
    expect(result.valid).toBe(true);
  });

  it('empty rows array is valid', () => {
    expect(validateAllocationSave([]).valid).toBe(true);
  });
});

describe('rowNeedsWarning (ALLOC-BR-07)', () => {
  it('FTE row with fte > 0 and no societe triggers warning', () => {
    expect(rowNeedsWarning(row({ costType: 'FTE', fte: 1.0, societe: null }))).toBe(true);
  });

  it('FTE row with societe does not trigger warning', () => {
    expect(rowNeedsWarning(row({ costType: 'FTE', fte: 1.0, societe: 'Renault SAS-Paris' }))).toBe(false);
  });

  it('zero FTE does not trigger warning', () => {
    expect(rowNeedsWarning(row({ costType: 'FTE', fte: 0, societe: null }))).toBe(false);
  });
});

describe('distributeTcKeByYear (ALLOC-BR-20)', () => {
  it('distributes proportionally to FTE share', () => {
    const result = distributeTcKeByYear(1000, { '2024': 1.0, '2025': 2.0, '2026': 1.0 });
    expect(result['2024']).toBeCloseTo(250);
    expect(result['2025']).toBeCloseTo(500);
    expect(result['2026']).toBeCloseTo(250);
  });

  it('returns zeros when totalFte is zero', () => {
    const result = distributeTcKeByYear(1000, { '2024': 0, '2025': 0 });
    expect(result['2024']).toBe(0);
    expect(result['2025']).toBe(0);
  });

  it('sum of distributed values equals totalKe (rounding tolerance)', () => {
    const result = distributeTcKeByYear(100, { '2024': 1.0, '2025': 1.0, '2026': 1.0 });
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, 1);
  });
});

describe('splitFteProportional (ALLOC-BR-23)', () => {
  it('splits FTE proportionally across two societes', () => {
    const result = splitFteProportional({ '2024': 2.0, '2025': 4.0 }, [25, 75]);
    expect(result[0]['2024']).toBeCloseTo(0.5);
    expect(result[0]['2025']).toBeCloseTo(1.0);
    expect(result[1]['2024']).toBeCloseTo(1.5);
    expect(result[1]['2025']).toBeCloseTo(3.0);
  });

  it('FTE sum per year equals original (invariant ALLOC-BR-23)', () => {
    const original: Record<string, number> = { '2024': 3.0, '2025': 5.0 };
    const result = splitFteProportional(original, [30, 70]);
    for (const year of Object.keys(original)) {
      const sum = result.reduce((acc, r) => acc + r[year], 0);
      expect(sum).toBeCloseTo(original[year], 1);
    }
  });
});

describe('applyAllocationFilters (ALLOC-BR-14, ALLOC-BR-25)', () => {
  const baseFilters: AllocationFilterState = {
    plSearch: '', metier: '', ownerN2: '', societe: '', costType: '', unresolvedOnly: false,
  };

  const makeFilterRow = (overrides: Partial<AllocationRow> = {}): AllocationRow => ({
    id: 'r1', engineerId: 'eng-1', percentage: 100, days: 209, fte: 1.0, totalFte: 1.0,
    fteByYear: { '2025': 0.5, '2026': 0.5 }, keByYear: { '2025': 425, '2026': 425 },
    societe: null, costType: 'FTE', keuro: 850, isDirty: false,
    plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A',
    juCode: 'JU-001', juDescription: '', fmmDescription: '', organType: '', energy: '',
    allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
    ...overrides,
  });

  const rows = [
    makeFilterRow({ plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A', societe: 'Renault SAS-Paris', costType: 'FTE' }),
    makeFilterRow({ id: 'r2', plNumber: 'PL-02', plName: 'Project Beta', metier: 'H-TESTING', ownerN2: 'Zone-B', societe: null, costType: 'TC' }),
    makeFilterRow({ id: 'r3', plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A', societe: null, costType: 'FTE' }),
  ];

  it('empty filters return all rows', () => {
    expect(applyAllocationFilters(rows, baseFilters)).toHaveLength(3);
  });

  it('plSearch filters by plNumber', () => {
    expect(applyAllocationFilters(rows, { ...baseFilters, plSearch: 'PL-01' })).toHaveLength(2);
  });

  it('plSearch filters by plName (case-insensitive)', () => {
    expect(applyAllocationFilters(rows, { ...baseFilters, plSearch: 'beta' })).toHaveLength(1);
  });

  it('metier filter', () => {
    expect(applyAllocationFilters(rows, { ...baseFilters, metier: 'H-TESTING' })).toHaveLength(1);
  });

  it('societe = __unassigned__ shows only rows without societe', () => {
    const result = applyAllocationFilters(rows, { ...baseFilters, societe: '__unassigned__' });
    expect(result).toHaveLength(2);
    result.forEach(r => expect(r.societe).toBeNull());
  });

  it('unresolvedOnly shows only rows where societe is null', () => {
    const result = applyAllocationFilters(rows, { ...baseFilters, unresolvedOnly: true });
    expect(result).toHaveLength(2);
    result.forEach(r => expect(r.societe).toBeNull());
  });

  it('unresolvedOnly excludes rows that have a societe assigned', () => {
    const result = applyAllocationFilters(rows, { ...baseFilters, unresolvedOnly: true });
    const assignedRows = result.filter(r => r.societe !== null);
    expect(assignedRows).toHaveLength(0);
  });
});

describe('sortAllocationRows (ALLOC-BR-19)', () => {
  const makeSortRow = (id: string, plNumber: string, metier: string, ownerN2: string, juCode: string): AllocationRow => ({
    id, engineerId: 'eng-1', percentage: 100, days: 209, fte: 1.0, totalFte: 1.0,
    fteByYear: {}, keByYear: {}, societe: null, costType: 'FTE', keuro: 0, isDirty: false,
    plNumber, plName: '', metier, ownerN2, juCode, juDescription: '', fmmDescription: '',
    organType: '', energy: '', allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
  });

  it('sorts by PL Number then Métier then Owner N2 then JU Code', () => {
    const unsorted = [
      makeSortRow('d', 'PL-02', 'H-DESIGN', 'Z', 'JU-01'),
      makeSortRow('c', 'PL-01', 'H-TESTING', 'A', 'JU-01'),
      makeSortRow('a', 'PL-01', 'H-DESIGN', 'A', 'JU-01'),
      makeSortRow('b', 'PL-01', 'H-DESIGN', 'A', 'JU-02'),
    ];
    const sorted = sortAllocationRows(unsorted);
    expect(sorted.map(r => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('groupRowsByPl', () => {
  const makeRow = (id: string, plNumber: string, plName: string, metier: string): AllocationRow => ({
    id, engineerId: 'eng-1', percentage: 100, days: 209, fte: 1.0, totalFte: 1.0,
    fteByYear: {}, keByYear: {}, societe: null, costType: 'FTE', keuro: 0, isDirty: false,
    plNumber, plName, metier, ownerN2: 'Z', juCode: 'JU-01', juDescription: '', fmmDescription: '',
    organType: '', energy: '', allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
  });

  it('groups rows into one bucket per plNumber', () => {
    const rows = [
      makeRow('a', 'PL-01', 'Alpha', 'H-DESIGN'),
      makeRow('b', 'PL-01', 'Alpha', 'H-TESTING'),
      makeRow('c', 'PL-02', 'Beta', 'H-DESIGN'),
    ];
    const groups = groupRowsByPl(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0].plNumber).toBe('PL-01');
    expect(groups[0].plName).toBe('Alpha');
    expect(groups[0].rows.map(r => r.id)).toEqual(['a', 'b']);
    expect(groups[1].plNumber).toBe('PL-02');
    expect(groups[1].rows.map(r => r.id)).toEqual(['c']);
  });

  it('preserves the incoming row order within and across groups', () => {
    const rows = [
      makeRow('a', 'PL-02', 'Beta', 'H-DESIGN'),
      makeRow('b', 'PL-01', 'Alpha', 'H-DESIGN'),
      makeRow('c', 'PL-02', 'Beta', 'H-TESTING'),
    ];
    const groups = groupRowsByPl(rows);
    expect(groups.map(g => g.plNumber)).toEqual(['PL-02', 'PL-01']);
    expect(groups[0].rows.map(r => r.id)).toEqual(['a', 'c']);
  });

  it('returns an empty array for no rows', () => {
    expect(groupRowsByPl([])).toEqual([]);
  });
});

describe('recalcKeByRate', () => {
  it('FTE: K€ = fte × FTE rate per year', () => {
    const result = recalcKeByRate(
      { '2025': 0.5, '2026': 0.5 },
      'Horse Spain S.L.-Valladolid',
      'FTE',
    );
    expect(result).toEqual({ '2025': 53, '2026': 51.5 });
  });

  it('TSA: K€ = fte × TSA rate per year', () => {
    const result = recalcKeByRate(
      { '2025': 1, '2026': 1 },
      'CHENNAI GESC H',
      'TSA',
    );
    expect(result).toEqual({ '2025': 54, '2026': 56.7 });
  });

  it('unknown societe → 0 per year', () => {
    expect(recalcKeByRate({ '2025': 1 }, 'Renault SAS-Paris', 'FTE')).toEqual({ '2025': 0 });
  });

  it('null societe (Unassigned) → 0 per year', () => {
    expect(recalcKeByRate({ '2025': 1, '2026': 2 }, null, 'FTE')).toEqual({ '2025': 0, '2026': 0 });
  });

  it('year not in rate table → 0 for that year', () => {
    expect(recalcKeByRate({ '2099': 1 }, 'Oyak Horse', 'FTE')).toEqual({ '2099': 0 });
  });

  it('TC is not rate-based → returns existing zeros (handled by popup elsewhere)', () => {
    expect(recalcKeByRate({ '2025': 0.5 }, 'Oyak Horse', 'TC')).toEqual({ '2025': 0 });
  });
});

describe('rowIsUnresolved', () => {
  it('is true when societe is null regardless of cost type', () => {
    expect(rowIsUnresolved(row({ societe: null, costType: 'FTE' }))).toBe(true);
    expect(rowIsUnresolved(row({ societe: null, costType: 'TSA' }))).toBe(true);
    expect(rowIsUnresolved(row({ societe: null, costType: 'TC' }))).toBe(true);
  });

  it('is false when a societe is assigned', () => {
    expect(rowIsUnresolved(row({ societe: 'Oyak Horse', costType: 'FTE' }))).toBe(false);
  });
});
