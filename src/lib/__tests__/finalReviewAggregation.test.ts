import { describe, it, expect } from 'vitest';
import { buildPlTree, filterPlTree } from '../finalReviewAggregation';
import type { AllocationRow } from '../../types';

const mk = (over: Partial<AllocationRow>): AllocationRow => ({
  id: 'x', plNumber: 'PL1', plName: 'Line 1', metier: 'BE', ownerN2: 'O1',
  juCode: 'JU1', juDescription: 'd', fmmDescription: 'f', organType: '', energy: '',
  allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
  totalFte: 1, fteByYear: { '2025': 1 }, keByYear: { '2025': 100 },
  societe: 'S1', costType: 'FTE', fte: 1, keuro: 100,
  engineerId: 'e', percentage: 100, days: 0, isDirty: false, ...over,
});

describe('buildPlTree', () => {
  it('groups PL → Métier → Society → Cost Type → JU rows', () => {
    const rows = [
      mk({ id: 'a', plNumber: 'PL1', metier: 'BE', societe: 'S1', costType: 'FTE' }),
      mk({ id: 'b', plNumber: 'PL1', metier: 'BE', societe: 'S1', costType: 'FTE' }),
      mk({ id: 'c', plNumber: 'PL2', metier: 'EE', societe: 'S2', costType: 'TC' }),
    ];
    const tree = buildPlTree(rows, ['2025']);
    expect(tree.map((p) => p.plNumber)).toEqual(['PL1', 'PL2']);
    const pl1 = tree[0];
    expect(pl1.metiers).toHaveLength(1);
    expect(pl1.metiers[0].societes[0].costTypes[0].rows).toHaveLength(2);
  });

  it('computes subtotals at every level and a PL total per year', () => {
    const rows = [
      mk({ id: 'a', fteByYear: { '2025': 1 }, keByYear: { '2025': 100 } }),
      mk({ id: 'b', totalFte: 2, fteByYear: { '2025': 2 }, keByYear: { '2025': 200 } }),
    ];
    const [pl] = buildPlTree(rows, ['2025']);
    expect(pl.subtotal.fteByYear['2025']).toBe(3);
    expect(pl.subtotal.keByYear['2025']).toBe(300);
    expect(pl.metiers[0].subtotal.fteByYear['2025']).toBe(3);
    expect(pl.metiers[0].societes[0].costTypes[0].subtotal.keByYear['2025']).toBe(300);
    expect(pl.subtotal.bhByYear['2025']).toBe(0);
    expect(pl.subtotal.kmByYear['2025']).toBe(0);
    expect(pl.subtotal.totalBh).toBe(0);
    expect(pl.subtotal.totalKm).toBe(0);
  });

  it('groups rows with no société under "—"', () => {
    const [pl] = buildPlTree([mk({ id: 'a', societe: null })], ['2025']);
    expect(pl.metiers[0].societes[0].societe).toBe('—');
  });
});

describe('filterPlTree', () => {
  it('filters by PL number or name, empty query returns all', () => {
    const tree = buildPlTree([
      mk({ id: 'a', plNumber: 'PL1', plName: 'Alpha' }),
      mk({ id: 'b', plNumber: 'PL2', plName: 'Beta' }),
    ], ['2025']);
    expect(filterPlTree(tree, 'PL2').map((p) => p.plNumber)).toEqual(['PL2']);
    expect(filterPlTree(tree, 'alpha').map((p) => p.plNumber)).toEqual(['PL1']);
    expect(filterPlTree(tree, '')).toHaveLength(2);
  });
});
