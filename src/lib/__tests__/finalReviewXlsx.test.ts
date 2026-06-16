import { describe, it, expect } from 'vitest';
import { buildPlSheetMatrix } from '../finalReviewXlsx';
import { buildPlTree } from '../finalReviewAggregation';
import type { AllocationRow } from '../../types';

const mk = (o: Partial<AllocationRow>): AllocationRow => ({
  id: 'x', plNumber: 'PL1', plName: 'Alpha', metier: 'BE', ownerN2: 'O1', juCode: 'JU1',
  juDescription: 'd', fmmDescription: 'f', organType: '', energy: '', allianceCode: '',
  vehicleCode: '', standardEmissions: '', market: '', totalFte: 1,
  fteByYear: { '2025': 1 }, keByYear: { '2025': 100 }, societe: 'S1', costType: 'FTE',
  fte: 1, keuro: 100, engineerId: 'e', percentage: 100, days: 0, isDirty: false, ...o,
});

describe('buildPlSheetMatrix', () => {
  it('produces a header row with all JU + per-year columns', () => {
    const [pl] = buildPlTree([mk({})], ['2025']);
    const m = buildPlSheetMatrix(pl, ['2025']);
    const header = m[0];
    expect(header).toContain('Métier');
    expect(header).toContain('JU Code');
    expect(header).toContain('Total FTE');
    expect(header).toContain('Total K€');
    expect(header).toContain('Total BH');
    expect(header).toContain('Total KM');
    expect(header).toContain('FTE 2025');
    expect(header).toContain('K€ 2025');
    expect(header).toContain('BH 2025');
    expect(header).toContain('KM 2025');
    // per-year columns must be metric-grouped: K€ 2025 comes after FTE 2025
    expect(header.indexOf('K€ 2025')).toBeGreaterThan(header.indexOf('FTE 2025'));
  });

  it('includes a JU data row and a PL total row with aggregated values', () => {
    const [pl] = buildPlTree([mk({ id: 'a' }), mk({ id: 'b', totalFte: 2, fteByYear: { '2025': 2 } })], ['2025']);
    const m = buildPlSheetMatrix(pl, ['2025']);
    // a JU data row carries the JU code
    expect(m.some((row) => row.includes('JU1'))).toBe(true);
    // a PL total row exists carrying total FTE 3
    expect(m.some((row) => row.includes('PL total') && row.includes(3))).toBe(true);
  });

  it('contains no prototype/internal fields (no row ids, no isDirty)', () => {
    const [pl] = buildPlTree([mk({ id: 'secret-id' })], ['2025']);
    const m = buildPlSheetMatrix(pl, ['2025']);
    expect(m.flat()).not.toContain('secret-id');
  });
});
