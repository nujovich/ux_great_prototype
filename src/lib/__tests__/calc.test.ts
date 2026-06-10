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

  it('day value = per-JU occurrence; inductorOccurrence is NOT a multiplier (BR-09 mirroring)', () => {
    // inductorOccurrence=3 must be ignored by the calc: non-locked JUs already
    // mirror it via their occurrence value, locked JUs keep their own value.
    const selections: InductorSelection[] = [
      {
        inductorId: 'ind-1',
        selectedCranId: 'cr-1-1',
        inductorOccurrence: 3,
        juOccurrences: [
          { juId: 'ju-1', occurrence: 3, locked: false }, // mirrored to inductor occ
          { juId: 'ju-2', occurrence: 1, locked: true },  // kept manual value
        ],
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
            jus: [
              { id: 'ju-1', name: 'JU 1', long_name: 'JU 1', occurrence: 1.5, occurrence_locked: false, custom: false, metier: 'H-DESIGN' as const },
              { id: 'ju-2', name: 'JU 2', long_name: 'JU 2', occurrence: 0.5, occurrence_locked: false, custom: false, metier: 'H-DESIGN' as const },
            ],
          },
        ],
      },
    ];

    // 3 + 1 = 4 (sum of occurrences), NOT 3*(3+1)=12 and NOT 3*(1.5+0.5)=6
    expect(calcTotalDays(selections, inductors, [], 1)).toBe(4);
  });
});
