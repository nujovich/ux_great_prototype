import { describe, it, expect } from 'vitest';
import { PROJECT_LINES } from '../projectLines';

describe('project line fixtures (HIW-174 §4 PRD columns)', () => {
  it('every line populates the PRD grid columns', () => {
    expect(PROJECT_LINES.length).toBeGreaterThan(0);
    for (const l of PROJECT_LINES) {
      for (const f of ['requestType', 'client', 'market', 'allianceCode', 'vehicleCode', 'energy', 'estimateType', 'engineering', 'pcDate', 'coDate', 'sopDate'] as const) {
        expect(l[f], `${l.id} missing ${f}`).toBeTruthy();
      }
    }
  });

  it('milestone dates are ordered SP <= PC <= CO <= SOP', () => {
    for (const l of PROJECT_LINES) {
      if (l.spDate && l.pcDate && l.coDate && l.sopDate) {
        expect(l.spDate <= l.pcDate, `${l.id} SP<=PC`).toBe(true);
        expect(l.pcDate <= l.coDate, `${l.id} PC<=CO`).toBe(true);
        expect(l.coDate <= l.sopDate, `${l.id} CO<=SOP`).toBe(true);
      }
    }
  });

  it('still preserves the null-injection-system coverage for compatibility tests', () => {
    expect(PROJECT_LINES.some((l) => l.injectionSystem == null)).toBe(true);
    expect(PROJECT_LINES.some((l) => l.injectionSystem != null)).toBe(true);
  });
});
