import type { Allocation } from '../types';

export const ALLOCATIONS: Allocation[] = [
  {
    lineId: 'PL-024',
    splits: [{ engineerId: 'eng-2', percentage: 100, days: 10 }],
  },
  {
    lineId: 'PL-025',
    splits: [
      { engineerId: 'eng-3', percentage: 60, days: 21 },
      { engineerId: 'eng-4', percentage: 40, days: 14 },
    ],
  },
  {
    lineId: 'PL-026',
    splits: [{ engineerId: 'eng-7', percentage: 100, days: 12 }],
  },
];
