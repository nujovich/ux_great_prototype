import { describe, it, expect } from 'vitest';
import {
  calcRowKeuro,
  validateAllocationSave,
  rowNeedsWarning,
} from '../allocationCalc';
import type { AllocationRow } from '../../types';

function row(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1',
    engineerId: 'eng-1',
    percentage: 100,
    days: 209,
    fte: 1.0,
    societe: null,
    costType: 'FTE',
    diversity: null,
    keuro: 0,
    isDirty: false,
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
