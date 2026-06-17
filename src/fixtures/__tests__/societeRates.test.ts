import { describe, it, expect } from 'vitest';
import { FTE_RATES, TSA_RATES } from '../societeRates';

describe('societeRates fixture (mirror of kit §11.1/§11.2)', () => {
  it('mirrors FTE rates for Horse Spain Valladolid', () => {
    expect(FTE_RATES['Horse Spain S.L.-Valladolid']).toEqual({
      '2024': 107, '2025': 106, '2026': 103, '2027': 101,
    });
  });

  it('mirrors FTE rates for Oyak Horse', () => {
    expect(FTE_RATES['Oyak Horse']).toEqual({
      '2024': 100, '2025': 75, '2026': 68, '2027': 69,
    });
  });

  it('mirrors TSA rates for CHENNAI GESC H', () => {
    expect(TSA_RATES['CHENNAI GESC H']).toEqual({
      '2025': 54, '2026': 56.7, '2027': 59.5,
    });
  });
});
