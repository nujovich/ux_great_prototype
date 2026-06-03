import { describe, it, expect } from 'vitest';
import { calcTotalDays } from '../calc';
import type { InductorSelection, PrototypeInductor, CustomJU } from '../../types';

describe('calcTotalDays (BR-13: zero occurrence)', () => {
  it('zero globalOccurrences contributes zero to the output (BR-13)', () => {
    const selections: InductorSelection[] = [
      {
        inductorId: 'ind-1',
        selectedCranId: 'cr-1-1',
        inductorOccurrence: 1,
        juOccurrences: [],
      },
    ];
    const inductors: PrototypeInductor[] = [
      {
        id: 'ind-1',
        name: 'Test inductor',
        category: 'Test',
        crans: [
          {
            id: 'cr-1-1',
            name: 'Test cran',
            jus: [{ id: 'ju-1', name: 'JU 1', long_name: 'JU 1', occurrence: 2.0, occurrence_locked: false, custom: false, metier: 'H-DESIGN' as const }],
          },
        ],
      },
    ];
    const customJUs: CustomJU[] = [];

    expect(calcTotalDays(selections, inductors, customJUs, 0)).toBe(0);
  });

  it('non-zero globalOccurrences multiplies normally', () => {
    const selections: InductorSelection[] = [
      {
        inductorId: 'ind-1',
        selectedCranId: 'cr-1-1',
        inductorOccurrence: 1,
        juOccurrences: [],
      },
    ];
    const inductors: PrototypeInductor[] = [
      {
        id: 'ind-1',
        name: 'Test inductor',
        category: 'Test',
        crans: [
          {
            id: 'cr-1-1',
            name: 'Test cran',
            jus: [{ id: 'ju-1', name: 'JU 1', long_name: 'JU 1', occurrence: 2.0, occurrence_locked: false, custom: false, metier: 'H-DESIGN' as const }],
          },
        ],
      },
    ];
    const customJUs: CustomJU[] = [];

    expect(calcTotalDays(selections, inductors, customJUs, 3)).toBe(6);
  });
});
