import { describe, it, expect } from 'vitest';
import { mergeLegacyEstimation, type LegacyJU } from '../legacyCopy';
import type { JU, PrototypeInductor } from '../../types';

const ju = (id: string, variable: number, fixed: number, occurrence: number, unit: JU['unit_type'] = 'man_day'): JU =>
  ({ id, name: id, long_name: id, variable, fixed, unit_type: unit, occurrence, occurrence_locked: false, custom: false, metier: 'H-DESIGN' });

// Current workload: inductor I1 with JUs j1 (changed coeffs), j2 (unchanged), j4 (new JU); inductor I2 (new inductor)
const current: PrototypeInductor[] = [
  { id: 'I1', name: 'I1', category: 'C', crans: [{ id: 'cr1', name: 'cr1', jus: [ju('j1', 4, 1, 0), ju('j2', 2, 0, 0), ju('j4', 1, 0, 0)] }] },
  { id: 'I2', name: 'I2', category: 'C', crans: [{ id: 'cr2', name: 'cr2', jus: [ju('j5', 3, 0, 0)] }] },
];

// Historical estimation: j1 (coeffs differ: was 2/0), j2 (same 2/0), j3 (orphan — not in current)
const historical: LegacyJU[] = [
  { juId: 'j1', inductorId: 'I1', cranId: 'cr1', variable: 2, fixed: 0, occurrence: 5 }, // total = 10
  { juId: 'j2', inductorId: 'I1', cranId: 'cr1', variable: 2, fixed: 0, occurrence: 3 },
  { juId: 'j3', inductorId: 'I1', cranId: 'cr1', variable: 1, fixed: 0, occurrence: 4 },
];

describe('mergeLegacyEstimation (HIW-174 §12.2)', () => {
  const out = mergeLegacyEstimation(historical, current);
  const sel = out.inductorSelections.find((s) => s.inductorId === 'I1')!;
  const occOf = (id: string) => sel.juOccurrences.find((o) => o.juId === id)?.occurrence;

  it('rule 1 — unchanged JU keeps historical occurrence', () => {
    expect(occOf('j2')).toBe(3);
  });
  it('rule 2 — changed coefficients recalc occurrence to preserve historical total', () => {
    // historical total j1 = 2*5+0 = 10; current 4/1 → (10-1)/4 = 2.25
    expect(occOf('j1')).toBeCloseTo(2.25, 5);
  });
  it('rule 3 — orphaned JU becomes a Custom JU', () => {
    const cj = out.customJUs.find((c) => c.name.includes('j3'));
    expect(cj).toBeDefined();
    expect(cj!.variable).toBe(1);
    expect(cj!.occurrence).toBe(4);
  });
  it('rule 4 — new JU under a historical inductor is added with occurrence 0', () => {
    expect(occOf('j4')).toBe(0);
  });
  it('rule 5 — new inductor absent from history is NOT auto-added', () => {
    expect(out.inductorSelections.find((s) => s.inductorId === 'I2')).toBeUndefined();
  });
  it('selects the cran referenced by the historical JUs', () => {
    expect(sel.selectedCranId).toBe('cr1');
  });

  it('rule 2 — current variable 0 yields occurrence 0 (no divide-by-zero)', () => {
    const cur: PrototypeInductor[] = [
      { id: 'I9', name: 'I9', category: 'C', crans: [{ id: 'cr9', name: 'cr9', jus: [ju('jz', 0, 0, 0)] }] },
    ];
    const hist: LegacyJU[] = [{ juId: 'jz', inductorId: 'I9', cranId: 'cr9', variable: 2, fixed: 0, occurrence: 5 }];
    const result = mergeLegacyEstimation(hist, cur);
    const s = result.inductorSelections.find((x) => x.inductorId === 'I9');
    expect(s?.juOccurrences.find((o) => o.juId === 'jz')?.occurrence).toBe(0);
  });
});
