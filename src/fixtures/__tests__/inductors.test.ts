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
