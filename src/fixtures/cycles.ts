import type { Cycle, KEuroRate } from '../types';

export const CYCLES: Cycle[] = [
  { id: 'cyc-2025h2', name: '2025-H2', status: 'closed', startDate: '2025-07-01', endDate: '2025-12-31' },
  { id: 'cyc-2026h1', name: '2026-H1', status: 'open', startDate: '2026-01-01', endDate: '2026-06-30' },
  { id: 'cyc-2026h2', name: '2026-H2', status: 'draft', startDate: '2026-07-01', endDate: '2026-12-31' },
];

export const CURRENT_CYCLE_ID = 'cyc-2026h1';

export const K_EURO_RATES: KEuroRate[] = [
  { metier: 'Backend', rate: 0.85, cycleId: 'cyc-2026h1' },
  { metier: 'Frontend', rate: 0.8, cycleId: 'cyc-2026h1' },
  { metier: 'Data', rate: 0.95, cycleId: 'cyc-2026h1' },
  { metier: 'DevOps', rate: 1.0, cycleId: 'cyc-2026h1' },
  { metier: 'QA', rate: 0.7, cycleId: 'cyc-2026h1' },
  { metier: 'Mobile', rate: 0.85, cycleId: 'cyc-2026h1' },
];
