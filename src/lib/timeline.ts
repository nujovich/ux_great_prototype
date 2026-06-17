import type { LineStatus, Metier } from '../types';
import type { TimelineSnapshot } from '../fixtures/timeline';

export interface TimelinePoint {
  date: string; // YYYY-MM-DD
  status_counts: Record<LineStatus, number>;
}

export const TIMELINE_STATUSES: LineStatus[] = [
  'To do',
  'Draft',
  'Estimated',
  'Sent',
  'Modification Requested',
  'Approved',
];

/**
 * Build the Status Evolution series for the Management timeline chart.
 *
 * - MGMT-BR-06: only snapshots belonging to `cycleId` are kept.
 * - MGMT-BR-05: `metierFilter === 'all'` sums every métier; otherwise only that métier counts.
 * - MGMT-BR-03: every point exposes all 6 statuses (missing ones default to 0).
 */
export function buildTimelineSeries(
  snapshots: TimelineSnapshot[],
  cycleId: string,
  metierFilter: Metier | 'all',
): TimelinePoint[] {
  return snapshots
    .filter((s) => s.cycleId === cycleId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((snapshot) => {
      const metiers = (
        metierFilter === 'all'
          ? (Object.keys(snapshot.byMetier) as Metier[])
          : [metierFilter]
      );
      const status_counts = {} as Record<LineStatus, number>;
      for (const status of TIMELINE_STATUSES) {
        let total = 0;
        for (const metier of metiers) {
          total += snapshot.byMetier[metier]?.[status] ?? 0;
        }
        status_counts[status] = total;
      }
      return { date: snapshot.date, status_counts };
    });
}
