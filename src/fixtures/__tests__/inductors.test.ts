import { describe, it, expect } from 'vitest';
import { INDUCTORS } from '../inductors';

describe('INDUCTORS fixture', () => {
  it('exposes at least one inductor with crans (happy path)', () => {
    expect(INDUCTORS.some((i) => i.crans.length > 0)).toBe(true);
  });

  it('covers the edge case of an inductor with no cran (crans: [])', () => {
    const noCran = INDUCTORS.filter((i) => i.crans.length === 0);
    expect(noCran.length).toBeGreaterThan(0);
  });

  it('keeps unique inductor ids', () => {
    const ids = INDUCTORS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('inductor fixtures (HIW-174 §7/§8 foundation)', () => {
  it('every JU carries numeric variable and fixed coefficients', () => {
    const jus = INDUCTORS.flatMap((i) => i.crans.flatMap((c) => c.jus));
    expect(jus.length).toBeGreaterThan(0);
    for (const ju of jus) {
      expect(typeof ju.variable).toBe('number');
      expect(typeof ju.fixed).toBe('number');
    }
  });

  it('provides at least one single-cran inductor (fixed-label case)', () => {
    const singleCran = INDUCTORS.filter((i) => i.crans.length === 1);
    expect(singleCran.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps the zero-cran inductor for the no-workload-standard case', () => {
    expect(INDUCTORS.some((i) => i.crans.length === 0)).toBe(true);
  });

  it('every JU has occurrence defaulting to 1 (count) and a numeric variable coefficient', () => {
    const jus = INDUCTORS.flatMap((i) => i.crans.flatMap((c) => c.jus));
    for (const ju of jus) {
      expect(ju.occurrence).toBe(1);
      expect(typeof ju.variable).toBe('number');
      expect(ju.variable).toBeGreaterThan(0);
    }
  });

  it('covers bench_hours and kilometres unit types (not only man_day)', () => {
    const units = new Set(INDUCTORS.flatMap((i) => i.crans.flatMap((c) => c.jus)).map((j) => j.unit_type));
    expect(units.has('man_day')).toBe(true);
    expect(units.has('bench_hours')).toBe(true);
    expect(units.has('kilometres')).toBe(true);
  });
});
