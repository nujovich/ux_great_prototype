import { describe, it, expect } from 'vitest';
import { propagateInductorOccurrence } from '../propagate';
import type { InductorSelection } from '../../types';

const sel = (jus: { juId: string; occurrence: number; locked: boolean }[]): InductorSelection => ({
  inductorId: 'i1', selectedCranId: 'cr1', inductorOccurrence: 1, juOccurrences: jus,
});

describe('propagateInductorOccurrence (HIW-14 §2)', () => {
  it('sets inductorOccurrence and updates all unlocked JUs', () => {
    const result = propagateInductorOccurrence(
      sel([
        { juId: 'j1', occurrence: 1, locked: false },
        { juId: 'j2', occurrence: 3, locked: false },
      ]),
      10,
    );
    expect(result.inductorOccurrence).toBe(10);
    expect(result.juOccurrences.find((j) => j.juId === 'j1')!.occurrence).toBe(10);
    expect(result.juOccurrences.find((j) => j.juId === 'j2')!.occurrence).toBe(10);
  });

  it('leaves locked JUs unchanged', () => {
    const result = propagateInductorOccurrence(
      sel([
        { juId: 'j1', occurrence: 5, locked: true },
        { juId: 'j2', occurrence: 1, locked: false },
      ]),
      20,
    );
    expect(result.juOccurrences.find((j) => j.juId === 'j1')!.occurrence).toBe(5);
    expect(result.juOccurrences.find((j) => j.juId === 'j2')!.occurrence).toBe(20);
  });

  it('allows zero occurrence (BR-13)', () => {
    const result = propagateInductorOccurrence(
      sel([{ juId: 'j1', occurrence: 5, locked: false }]),
      0,
    );
    expect(result.juOccurrences[0].occurrence).toBe(0);
  });

  it('returns a new object — does not mutate the input', () => {
    const original = sel([{ juId: 'j1', occurrence: 1, locked: false }]);
    const result = propagateInductorOccurrence(original, 7);
    expect(result).not.toBe(original);
    expect(original.inductorOccurrence).toBe(1);
  });

  it('updates inductorOccurrence even when all JUs are locked', () => {
    const result = propagateInductorOccurrence(
      sel([{ juId: 'j1', occurrence: 5, locked: true }]),
      99,
    );
    expect(result.inductorOccurrence).toBe(99);
    expect(result.juOccurrences[0].occurrence).toBe(5);
  });
});
