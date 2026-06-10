import type { Allocation } from '../types';

const FTE_DIVISOR = 209;

function makeRow(
  id: string,
  engineerId: string,
  percentage: number,
  days: number,
  societe: string | null = null,
  costType: 'FTE' | 'TSA' | 'TC' = 'FTE',
): Allocation['splits'][0] {
  return {
    id,
    engineerId,
    percentage,
    days,
    fte: Math.round((days / FTE_DIVISOR) * 100) / 100,
    societe,
    costType,
    diversity: null,
    keuro: 0,
    isDirty: false,
  };
}

export const ALLOCATIONS: Allocation[] = [
  {
    lineId: 'PL-024',
    splits: [makeRow('row-024-1', 'eng-2', 100, 10, 'Renault SAS-Paris', 'FTE')],
  },
  {
    lineId: 'PL-025',
    splits: [
      makeRow('row-025-1', 'eng-3', 60, 21, 'Horse Spain S.L.-Valladolid', 'TSA'),
      makeRow('row-025-2', 'eng-4', 40, 14, null, 'FTE'),
    ],
  },
  {
    lineId: 'PL-026',
    splits: [makeRow('row-026-1', 'eng-7', 100, 12, 'RNBV-Amsterdam', 'TC')],
  },
];
