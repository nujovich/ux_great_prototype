import { describe, it, expect } from 'vitest';
import { buildTimelineSeries } from '../timeline';
import type { TimelineSnapshot } from '../../fixtures/timeline';

const snapshots: TimelineSnapshot[] = [
  {
    date: '2026-01-01',
    cycleId: 'cyc-A',
    byMetier: { 'H-DESIGN': { 'To do': 3 }, 'H-SOFTWARE': { 'To do': 2 } },
  },
  {
    date: '2026-02-01',
    cycleId: 'cyc-A',
    byMetier: { 'H-DESIGN': { 'Approved': 3 }, 'H-SOFTWARE': { 'Draft': 2 } },
  },
  {
    date: '2026-01-01',
    cycleId: 'cyc-OTHER',
    byMetier: { 'H-DESIGN': { 'To do': 99 } },
  },
];

describe('buildTimelineSeries', () => {
  it('keeps only snapshots for the requested cycle (MGMT-BR-06)', () => {
    const series = buildTimelineSeries(snapshots, 'cyc-A', 'all');
    expect(series).toHaveLength(2);
    expect(series.map((p) => p.date)).toEqual(['2026-01-01', '2026-02-01']);
  });

  it('sums across all métiers when filter is "all" (MGMT-BR-05)', () => {
    const series = buildTimelineSeries(snapshots, 'cyc-A', 'all');
    expect(series[0].status_counts['To do']).toBe(5);
    expect(series[1].status_counts['Approved']).toBe(3);
    expect(series[1].status_counts['Draft']).toBe(2);
  });

  it('restricts to a single métier when filtered (MGMT-BR-05)', () => {
    const series = buildTimelineSeries(snapshots, 'cyc-A', 'H-DESIGN');
    expect(series[0].status_counts['To do']).toBe(3);
    expect(series[1].status_counts['Approved']).toBe(3);
    expect(series[1].status_counts['Draft']).toBe(0);
  });

  it('always includes all 6 statuses, defaulting missing ones to 0 (MGMT-BR-03)', () => {
    const series = buildTimelineSeries(snapshots, 'cyc-A', 'all');
    expect(Object.keys(series[0].status_counts)).toHaveLength(6);
    expect(series[0].status_counts['Sent']).toBe(0);
  });

  it('returns an empty series when no snapshot matches the cycle', () => {
    expect(buildTimelineSeries(snapshots, 'cyc-NONE', 'all')).toEqual([]);
  });
});
