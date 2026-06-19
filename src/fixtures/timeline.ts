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
 *
 * HIW-175: PROJECT_LINES now holds 6 PL Numbers × 5 métiers, where the 4
 * estimable management métiers (H-DESIGN, H-SOFTWARE, H-TUNING, H-CUSTOMER)
 * each appear once per PL (6 lines each, 24 total in the management scope).
 * H-TESTING has no project lines, so it no longer appears in the timeline.
 */
export const TIMELINE_SNAPSHOTS: TimelineSnapshot[] = [
  {
    date: '2026-01-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 6 },
      'H-SOFTWARE': { 'To do': 6 },
      'H-TUNING': { 'To do': 6 },
      'H-CUSTOMER': { 'To do': 6 },
    },
  },
  {
    date: '2026-02-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 4, 'Draft': 2 },
      'H-SOFTWARE': { 'To do': 4, 'Draft': 2 },
      'H-TUNING': { 'To do': 4, 'Draft': 2 },
      'H-CUSTOMER': { 'To do': 4, 'Draft': 2 },
    },
  },
  {
    date: '2026-03-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 3, 'Draft': 2, 'Estimated': 1 },
      'H-SOFTWARE': { 'To do': 3, 'Draft': 2, 'Estimated': 1 },
      'H-TUNING': { 'To do': 3, 'Draft': 2, 'Estimated': 1 },
      'H-CUSTOMER': { 'To do': 3, 'Draft': 1, 'Estimated': 2 },
    },
  },
  {
    date: '2026-04-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 2, 'Draft': 1, 'Estimated': 1, 'Sent': 2 },
      'H-SOFTWARE': { 'To do': 2, 'Draft': 1, 'Estimated': 1, 'Sent': 2 },
      'H-TUNING': { 'To do': 2, 'Draft': 2, 'Estimated': 1, 'Sent': 1 },
      'H-CUSTOMER': { 'To do': 2, 'Draft': 1, 'Estimated': 2, 'Sent': 1 },
    },
  },
  {
    date: '2026-05-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 1, 'Draft': 1, 'Estimated': 1, 'Sent': 1, 'Approved': 2 },
      'H-SOFTWARE': { 'To do': 2, 'Draft': 1, 'Estimated': 1, 'Sent': 1, 'Approved': 1 },
      'H-TUNING': { 'To do': 1, 'Draft': 2, 'Estimated': 1, 'Sent': 1, 'Approved': 1 },
      'H-CUSTOMER': { 'To do': 1, 'Draft': 1, 'Estimated': 2, 'Sent': 1, 'Approved': 1 },
    },
  },
  {
    date: '2026-06-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 1, 'Draft': 1, 'Estimated': 1, 'Sent': 1, 'Modification Requested': 1, 'Approved': 1 },
      'H-SOFTWARE': { 'To do': 2, 'Draft': 1, 'Estimated': 1, 'Sent': 1, 'Approved': 1 },
      'H-TUNING': { 'To do': 1, 'Draft': 2, 'Estimated': 1, 'Sent': 1, 'Approved': 1 },
      'H-CUSTOMER': { 'To do': 1, 'Draft': 1, 'Estimated': 2, 'Sent': 1, 'Approved': 1 },
    },
  },
  {
    date: '2026-06-17',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 1, 'Draft': 1, 'Estimated': 1, 'Sent': 1, 'Modification Requested': 1, 'Approved': 1 },
      'H-SOFTWARE': { 'To do': 2, 'Draft': 1, 'Estimated': 1, 'Sent': 1, 'Approved': 1 },
      'H-TUNING': { 'To do': 1, 'Draft': 2, 'Estimated': 1, 'Sent': 1, 'Approved': 1 },
      'H-CUSTOMER': { 'To do': 1, 'Draft': 1, 'Estimated': 2, 'Sent': 1, 'Approved': 1 },
    },
  },
];
