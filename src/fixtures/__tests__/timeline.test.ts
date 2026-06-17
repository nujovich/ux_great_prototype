import { describe, it, expect } from 'vitest';
import { TIMELINE_SNAPSHOTS } from '../timeline';
import { PROJECT_LINES } from '../projectLines';
import type { LineStatus, Metier } from '../../types';

const ACTIVE = 'cyc-2026h1';
const MGMT_METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-CUSTOMER', 'H-TESTING'];
const STATUSES: LineStatus[] = ['To do', 'Draft', 'Estimated', 'Sent', 'Modification Requested', 'Approved'];

function totalsByMetier(byMetier: Record<string, Partial<Record<LineStatus, number>>>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(byMetier).map(([m, counts]) => [
      m,
      Object.values(counts).reduce((a, n) => a + (n ?? 0), 0),
    ]),
  );
}

function snapshotTotal(byMetier: Record<string, Partial<Record<LineStatus, number>>>): number {
  return Object.values(byMetier).reduce(
    (acc, counts) => acc + Object.values(counts).reduce((a, n) => a + (n ?? 0), 0),
    0,
  );
}

describe('TIMELINE_SNAPSHOTS', () => {
  const active = TIMELINE_SNAPSHOTS.filter((s) => s.cycleId === ACTIVE);

  it('has chronological dates within the active cycle range', () => {
    const dates = active.map((s) => s.date);
    expect(dates.length).toBeGreaterThanOrEqual(2);
    expect([...dates].sort((a, b) => a.localeCompare(b))).toEqual(dates);
    expect(dates[0]).toBe('2026-01-01');
    expect(dates[dates.length - 1]).toBe('2026-06-17');
  });

  it('only references management métiers (MGMT-BR-04)', () => {
    for (const s of active) {
      for (const metier of Object.keys(s.byMetier)) {
        expect(MGMT_METIERS).toContain(metier as Metier);
      }
    }
  });

  it('keeps each métier line total constant across snapshots', () => {
    const expected = totalsByMetier(active[active.length - 1].byMetier);
    for (const s of active) {
      expect(totalsByMetier(s.byMetier)).toEqual(expected);
    }
  });

  it('last snapshot reconciles with the live active-cycle distribution (MGMT-BR-02)', () => {
    const liveLines = PROJECT_LINES.filter(
      (l) => l.cycleId === ACTIVE && MGMT_METIERS.includes(l.metier as Metier),
    );
    const liveTotals = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<LineStatus, number>;
    for (const l of liveLines) liveTotals[l.status as LineStatus] += 1;

    const last = active[active.length - 1];
    const fixtureTotals = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<LineStatus, number>;
    for (const counts of Object.values(last.byMetier)) {
      for (const s of STATUSES) fixtureTotals[s] += counts[s] ?? 0;
    }

    expect(fixtureTotals).toEqual(liveTotals);
    expect(snapshotTotal(last.byMetier)).toBe(liveLines.length);
  });
});
