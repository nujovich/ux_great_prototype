import type { Cycle, KEuroRate } from '../types';

export const CYCLES: Cycle[] = [
  { id: 'cyc-2025h2', name: '2025-H2', start_date: '2025-07-01', is_active: false, created_at: '2025-06-01T10:00:00Z' },
  { id: 'cyc-2026h1', name: '2026-H1', start_date: '2026-01-01', is_active: true, created_at: '2025-12-01T10:00:00Z' },
  { id: 'cyc-2026h2', name: '2026-H2', start_date: '2026-07-01', is_active: false, created_at: '2026-06-01T10:00:00Z' },
];

export const CURRENT_CYCLE_ID = 'cyc-2026h1';

export const K_EURO_RATES: KEuroRate[] = [
  { metier: 'H-DESIGN', rate: 0.85, cycleId: 'cyc-2026h1' },
  { metier: 'H-SOFTWARE', rate: 0.80, cycleId: 'cyc-2026h1' },
  { metier: 'H-TUNING', rate: 0.95, cycleId: 'cyc-2026h1' },
  { metier: 'H-PROJECT', rate: 1.00, cycleId: 'cyc-2026h1' },
  { metier: 'H-TESTING', rate: 0.70, cycleId: 'cyc-2026h1' },
  { metier: 'H-CUSTOMER', rate: 0.85, cycleId: 'cyc-2026h1' },
];
