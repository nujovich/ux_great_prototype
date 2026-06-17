import type { LineStatus, Metier } from '../types';

export interface TimelineSnapshot {
  date: string; // YYYY-MM-DD
  cycleId: string;
  byMetier: Partial<Record<Metier, Partial<Record<LineStatus, number>>>>;
}

/**
 * Static Status Evolution data for the active cycle (cyc-2026h1).
 *
 * Prototype stand-in for the backend event-log replay described in PRD §7.3.
 * Each métier's line total is constant; statuses flow forward over time
 * (PRD §7.2). The last snapshot (2026-06-17) reproduces the live distribution
 * of PROJECT_LINES so the timeline reconciles with the pie chart and matrix.
 */
export const TIMELINE_SNAPSHOTS: TimelineSnapshot[] = [
  {
    date: '2026-01-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 8 },
      'H-SOFTWARE': { 'To do': 6 },
      'H-TUNING': { 'To do': 4 },
      'H-CUSTOMER': { 'To do': 3 },
      'H-TESTING': { 'To do': 1 },
    },
  },
  {
    date: '2026-02-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 6, 'Draft': 2 },
      'H-SOFTWARE': { 'To do': 5, 'Draft': 1 },
      'H-TUNING': { 'To do': 3, 'Draft': 1 },
      'H-CUSTOMER': { 'To do': 2, 'Draft': 1 },
      'H-TESTING': { 'To do': 1 },
    },
  },
  {
    date: '2026-03-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 5, 'Draft': 2, 'Estimated': 1 },
      'H-SOFTWARE': { 'To do': 4, 'Draft': 1, 'Estimated': 1 },
      'H-TUNING': { 'To do': 2, 'Draft': 1, 'Estimated': 1 },
      'H-CUSTOMER': { 'To do': 2, 'Draft': 1 },
      'H-TESTING': { 'Draft': 1 },
    },
  },
  {
    date: '2026-04-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 4, 'Draft': 2, 'Estimated': 2 },
      'H-SOFTWARE': { 'To do': 3, 'Draft': 2, 'Estimated': 1 },
      'H-TUNING': { 'To do': 2, 'Draft': 1, 'Estimated': 1 },
      'H-CUSTOMER': { 'To do': 1, 'Draft': 2 },
      'H-TESTING': { 'Draft': 1 },
    },
  },
  {
    date: '2026-05-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 3, 'Draft': 2, 'Estimated': 2, 'Approved': 1 },
      'H-SOFTWARE': { 'To do': 2, 'Draft': 2, 'Estimated': 1, 'Approved': 1 },
      'H-TUNING': { 'To do': 1, 'Draft': 2, 'Estimated': 1 },
      'H-CUSTOMER': { 'To do': 1, 'Draft': 1, 'Estimated': 1 },
      'H-TESTING': { 'Draft': 1 },
    },
  },
  {
    date: '2026-06-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 3, 'Draft': 1, 'Estimated': 2, 'Modification Requested': 1, 'Approved': 1 },
      'H-SOFTWARE': { 'To do': 2, 'Draft': 1, 'Estimated': 1, 'Modification Requested': 1, 'Approved': 1 },
      'H-TUNING': { 'To do': 1, 'Draft': 1, 'Estimated': 1, 'Modification Requested': 1 },
      'H-CUSTOMER': { 'To do': 1, 'Draft': 1, 'Estimated': 1 },
      'H-TESTING': { 'Draft': 1 },
    },
  },
  {
    date: '2026-06-17',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 3, 'Draft': 1, 'Estimated': 2, 'Modification Requested': 1, 'Approved': 1 },
      'H-SOFTWARE': { 'To do': 2, 'Draft': 1, 'Estimated': 1, 'Modification Requested': 1, 'Approved': 1 },
      'H-TUNING': { 'To do': 1, 'Draft': 1, 'Estimated': 1, 'Modification Requested': 1 },
      'H-CUSTOMER': { 'To do': 1, 'Draft': 1, 'Estimated': 1 },
      'H-TESTING': { 'Draft': 1 },
    },
  },
];
