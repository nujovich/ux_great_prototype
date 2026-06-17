# Management Timeline Chart (Status Evolution) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing "Status Evolution" line chart to the Management View (HIW-178 GAP), per Management View PRD §7.

**Architecture:** A pure aggregation helper turns a per-métier daily-counts fixture into a status-by-date series; a hand-rolled SVG `StatusLineChart` renders 6 status lines from that series. The Management page reuses its existing métier filter to drive both the pie chart and the timeline. No new charting library; the timeline data is a static fixture (no real event log/replay — that stays backend/kit work).

**Tech Stack:** React 18 + TypeScript + Vite + Zustand + Tailwind; Vitest + React Testing Library (`happy-dom`).

---

## File Structure

- Create `src/components/management/statusColors.ts` — shared status→color palette (extracted from `StatusPieChart`).
- Modify `src/components/management/StatusPieChart.tsx` — import the shared palette.
- Create `src/fixtures/timeline.ts` — `TimelineSnapshot` type + `TIMELINE_SNAPSHOTS` data (active cycle, per métier).
- Create `src/fixtures/__tests__/timeline.test.ts` — fixture consistency/reconciliation guards.
- Create `src/lib/timeline.ts` — `TimelinePoint` type + `buildTimelineSeries` pure aggregation.
- Create `src/lib/__tests__/timeline.test.ts` — aggregation/filtering unit tests.
- Create `src/components/management/StatusLineChart.tsx` — SVG line chart.
- Create `src/components/management/__tests__/StatusLineChart.test.tsx` — rendering unit tests.
- Modify `src/store/dataStore.ts` — add `timeline` state seeded from the fixture.
- Modify `src/pages/ManagementPage.tsx` — derive series from store + métier filter, render `StatusLineChart`.
- Modify `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/es.ts` — add `mgmt.timelineTitle`.
- Create `src/pages/__tests__/management.timeline.test.tsx` — integration tests (MGMT-BR-03/05/06).

**Business rules honored:** MGMT-BR-02 (count PL·Métier pairs), MGMT-BR-03 (all 6 statuses always rendered), MGMT-BR-05 (single métier filter drives both charts), MGMT-BR-06 (active cycle only).

**Verified ground truth** — active cycle `cyc-2026h1`, 22 management lines (H-NP/H-PROJECT excluded). Final per-status totals: `{ "To do": 7, "Draft": 5, "Estimated": 5, "Sent": 0, "Modification Requested": 3, "Approved": 4 }` → corrected during implementation to the real committed `PROJECT_LINES` distribution `{ "To do": 7, "Draft": 5, "Estimated": 5, "Sent": 0, "Modification Requested": 3, "Approved": 2 }` (22 pairs; per-métier H-DESIGN:8, H-SOFTWARE:6, H-TUNING:4, H-CUSTOMER:3, H-TESTING:1). The committed `src/fixtures/timeline.ts` and its test are the source of truth; the Task 3 code block below shows the original (pre-correction) numbers and is retained only for history.

---

## Task 1: Extract shared status color palette

**Files:**
- Create: `src/components/management/statusColors.ts`
- Test: `src/components/management/__tests__/statusColors.test.ts`
- Modify: `src/components/management/StatusPieChart.tsx:5-12`

- [ ] **Step 1: Write the failing test**

Create `src/components/management/__tests__/statusColors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { STATUS_COLORS } from '../statusColors';
import type { LineStatus } from '../../../types';

const ALL_STATUSES: LineStatus[] = ['To do', 'Draft', 'Estimated', 'Sent', 'Modification Requested', 'Approved'];

describe('STATUS_COLORS', () => {
  it('defines a hex color for all 6 statuses (MGMT-BR-03)', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_COLORS[s]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
    expect(Object.keys(STATUS_COLORS)).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/management/__tests__/statusColors.test.ts`
Expected: FAIL — cannot resolve `../statusColors`.

- [ ] **Step 3: Create the shared module**

Create `src/components/management/statusColors.ts`:

```ts
import type { LineStatus } from '../../types';

export const STATUS_COLORS: Record<LineStatus, string> = {
  'To do':    '#94a3b8',
  'Draft':    '#f59e0b',
  'Estimated': '#3b82f6',
  'Sent':     '#a855f7',
  'Modification Requested': '#ef4444',
  'Approved': '#22c55e',
};
```

- [ ] **Step 4: Point StatusPieChart at the shared module**

In `src/components/management/StatusPieChart.tsx`, delete the local `STATUS_COLORS` const (lines 5-12) and add an import after the existing imports (after line 3):

```ts
import { STATUS_COLORS } from './statusColors';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/management/__tests__/statusColors.test.ts src/pages/__tests__/management.rules.test.tsx`
Expected: PASS (palette test passes; pie chart still renders in the existing management tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/management/statusColors.ts src/components/management/__tests__/statusColors.test.ts src/components/management/StatusPieChart.tsx
git commit -m "refactor(management): extract shared STATUS_COLORS palette"
```

---

## Task 2: Timeline aggregation helper

**Files:**
- Create: `src/lib/timeline.ts`
- Test: `src/lib/__tests__/timeline.test.ts`

The fixture stores per-métier counts per snapshot. `buildTimelineSeries` filters by active cycle, applies the métier filter (MGMT-BR-05), and produces one `{ date, status_counts }` point per snapshot with all 6 statuses present (MGMT-BR-03).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/timeline.test.ts`:

```ts
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
    expect(series[0].status_counts['To do']).toBe(5); // 3 + 2
    expect(series[1].status_counts['Approved']).toBe(3);
    expect(series[1].status_counts['Draft']).toBe(2);
  });

  it('restricts to a single métier when filtered (MGMT-BR-05)', () => {
    const series = buildTimelineSeries(snapshots, 'cyc-A', 'H-DESIGN');
    expect(series[0].status_counts['To do']).toBe(3);
    expect(series[1].status_counts['Approved']).toBe(3);
    expect(series[1].status_counts['Draft']).toBe(0); // Draft belonged to H-SOFTWARE
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/timeline.test.ts`
Expected: FAIL — cannot resolve `../timeline`.

- [ ] **Step 3: Implement the helper**

Create `src/lib/timeline.ts`:

```ts
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
    .slice()
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/timeline.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/timeline.ts src/lib/__tests__/timeline.test.ts
git commit -m "feat(management): add timeline series aggregation helper"
```

---

## Task 3: Timeline fixture data

**Files:**
- Create: `src/fixtures/timeline.ts`
- Test: `src/fixtures/__tests__/timeline.test.ts`

Per-métier snapshots for the active cycle `cyc-2026h1`, 7 points from the cycle start (2026-01-01) to today (2026-06-17). Each métier's line total is constant across time; statuses flow forward (To do → Draft → Estimated → Sent → Approved, with a late Modification Requested spike on H-DESIGN). The **last snapshot reproduces the verified live distribution** so the chart reconciles with the pie/matrix. H-TESTING has 0 lines in the active cycle, so it is omitted from `byMetier`.

- [ ] **Step 1: Write the failing test**

Create `src/fixtures/__tests__/timeline.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TIMELINE_SNAPSHOTS } from '../timeline';
import { PROJECT_LINES } from '../projectLines';
import type { LineStatus, Metier } from '../../types';

const ACTIVE = 'cyc-2026h1';
const MGMT_METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-CUSTOMER', 'H-TESTING'];
const STATUSES: LineStatus[] = ['To do', 'Draft', 'Estimated', 'Sent', 'Modification Requested', 'Approved'];

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
    const totalsPerMetier = active.map((s) =>
      Object.fromEntries(
        Object.entries(s.byMetier).map(([m, counts]) => [
          m,
          Object.values(counts).reduce((a, n) => a + (n ?? 0), 0),
        ]),
      ),
    );
    // H-DESIGN total is 6 in every snapshot
    for (const t of totalsPerMetier) {
      expect(t['H-DESIGN']).toBe(6);
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
    expect(snapshotTotal(last.byMetier)).toBe(liveLines.length); // 24
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/fixtures/__tests__/timeline.test.ts`
Expected: FAIL — cannot resolve `../timeline`.

- [ ] **Step 3: Create the fixture**

Create `src/fixtures/timeline.ts`:

```ts
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
 * H-TESTING has 0 lines in this cycle, so it is omitted (treated as 0).
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
      'H-SOFTWARE': { 'To do': 5, 'Draft': 1 },
      'H-TUNING': { 'To do': 4, 'Draft': 2 },
      'H-CUSTOMER': { 'To do': 5, 'Draft': 1 },
    },
  },
  {
    date: '2026-03-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 3, 'Draft': 2, 'Estimated': 1 },
      'H-SOFTWARE': { 'To do': 4, 'Draft': 1, 'Estimated': 1 },
      'H-TUNING': { 'To do': 3, 'Draft': 2, 'Estimated': 1 },
      'H-CUSTOMER': { 'To do': 3, 'Draft': 2, 'Estimated': 1 },
    },
  },
  {
    date: '2026-04-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 2, 'Draft': 1, 'Estimated': 2, 'Sent': 1 },
      'H-SOFTWARE': { 'To do': 3, 'Draft': 1, 'Estimated': 1, 'Sent': 1 },
      'H-TUNING': { 'To do': 2, 'Draft': 2, 'Estimated': 1, 'Sent': 1 },
      'H-CUSTOMER': { 'To do': 2, 'Draft': 1, 'Estimated': 2, 'Sent': 1 },
    },
  },
  {
    date: '2026-05-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 1, 'Draft': 1, 'Estimated': 2, 'Sent': 1, 'Approved': 1 },
      'H-SOFTWARE': { 'To do': 2, 'Draft': 2, 'Estimated': 1, 'Sent': 1 },
      'H-TUNING': { 'To do': 1, 'Draft': 3, 'Estimated': 1, 'Sent': 1 },
      'H-CUSTOMER': { 'To do': 1, 'Draft': 1, 'Estimated': 3, 'Sent': 1 },
    },
  },
  {
    date: '2026-06-01',
    cycleId: 'cyc-2026h1',
    byMetier: {
      'H-DESIGN': { 'To do': 1, 'Draft': 1, 'Estimated': 1, 'Sent': 1, 'Approved': 2 },
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/fixtures/__tests__/timeline.test.ts`
Expected: PASS (4 tests). The reconciliation test confirms the last snapshot totals equal `{ To do:5, Draft:5, Estimated:5, Sent:4, Modification Requested:1, Approved:4 }` and 24 total pairs.

- [ ] **Step 5: Commit**

```bash
git add src/fixtures/timeline.ts src/fixtures/__tests__/timeline.test.ts
git commit -m "feat(management): add status evolution timeline fixture"
```

---

## Task 4: StatusLineChart component

**Files:**
- Create: `src/components/management/StatusLineChart.tsx`
- Test: `src/components/management/__tests__/StatusLineChart.test.tsx`

Hand-rolled SVG, same visual language as `StatusPieChart`. Always renders 6 polylines (one per status, MGMT-BR-03). The legend shows each status's latest-point count (reconciles with the pie). Empty series → `mgmt.noData`.

- [ ] **Step 1: Write the failing test**

Create `src/components/management/__tests__/StatusLineChart.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusLineChart } from '../StatusLineChart';
import type { TimelinePoint } from '../../../lib/timeline';

const series: TimelinePoint[] = [
  {
    date: '2026-01-01',
    status_counts: { 'To do': 6, 'Draft': 0, 'Estimated': 0, 'Sent': 0, 'Modification Requested': 0, 'Approved': 0 },
  },
  {
    date: '2026-06-17',
    status_counts: { 'To do': 1, 'Draft': 1, 'Estimated': 1, 'Sent': 1, 'Modification Requested': 1, 'Approved': 1 },
  },
];

describe('StatusLineChart', () => {
  it('renders one polyline per status — all 6 (MGMT-BR-03)', () => {
    const { container } = render(<StatusLineChart data={series} />);
    const lines = container.querySelectorAll('polyline[data-status]');
    expect(lines).toHaveLength(6);
  });

  it('shows the latest count per status in the legend', () => {
    render(<StatusLineChart data={series} />);
    expect(screen.getByTestId('timeline-count-To do')).toHaveTextContent('1');
    expect(screen.getByTestId('timeline-count-Approved')).toHaveTextContent('1');
  });

  it('renders the empty state when the series is empty', () => {
    render(<StatusLineChart data={[]} />);
    expect(screen.getByText('No data for the active cycle.')).toBeInTheDocument();
    expect(screen.queryByTestId('status-timeline')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/management/__tests__/StatusLineChart.test.tsx`
Expected: FAIL — cannot resolve `../StatusLineChart`.

- [ ] **Step 3: Implement the component**

Create `src/components/management/StatusLineChart.tsx`:

```tsx
import type { LineStatus } from '../../types';
import { useT } from '../../i18n/useT';
import { statusI18nKey } from '../../lib/stateMachine';
import { STATUS_COLORS } from './statusColors';
import { TIMELINE_STATUSES, type TimelinePoint } from '../../lib/timeline';

interface Props {
  data: TimelinePoint[];
  title?: string;
}

const W = 640;
const H = 260;
const M = { top: 12, right: 12, bottom: 28, left: 36 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

function xAt(i: number, n: number): number {
  if (n <= 1) return M.left + PLOT_W / 2;
  return M.left + (PLOT_W * i) / (n - 1);
}

export function StatusLineChart({ data, title }: Props) {
  const t = useT();

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {title && <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>}
        <p className="text-sm text-slate-400">{t('mgmt.noData')}</p>
      </div>
    );
  }

  const maxY = Math.max(
    1,
    ...data.flatMap((p) => TIMELINE_STATUSES.map((s) => p.status_counts[s] ?? 0)),
  );
  const yAt = (v: number) => M.top + PLOT_H * (1 - v / maxY);
  const latest = data[data.length - 1].status_counts;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {title && <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>}
      <div className="flex flex-wrap items-center gap-8">
        <svg data-testid="status-timeline" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img">
          {/* axes */}
          <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + PLOT_H} stroke="#e2e8f0" />
          <line x1={M.left} y1={M.top + PLOT_H} x2={M.left + PLOT_W} y2={M.top + PLOT_H} stroke="#e2e8f0" />
          {/* y ticks: 0 and maxY */}
          <text x={M.left - 6} y={yAt(0)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#94a3b8">0</text>
          <text x={M.left - 6} y={yAt(maxY)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#94a3b8">{maxY}</text>
          {/* x labels: first and last date */}
          <text x={xAt(0, data.length)} y={H - 8} textAnchor="start" fontSize="10" fill="#94a3b8">{data[0].date}</text>
          <text x={xAt(data.length - 1, data.length)} y={H - 8} textAnchor="end" fontSize="10" fill="#94a3b8">{data[data.length - 1].date}</text>
          {/* one polyline per status */}
          {TIMELINE_STATUSES.map((status) => {
            const points = data
              .map((p, i) => `${xAt(i, data.length)},${yAt(p.status_counts[status] ?? 0)}`)
              .join(' ');
            return (
              <polyline
                key={status}
                data-status={status}
                points={points}
                fill="none"
                stroke={STATUS_COLORS[status]}
                strokeWidth={2}
              >
                <title>{t(statusI18nKey(status))}</title>
              </polyline>
            );
          })}
        </svg>
        <ul className="space-y-1.5">
          {TIMELINE_STATUSES.map((status) => (
            <li key={status} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ background: STATUS_COLORS[status] }}
              />
              <span className="text-slate-700">{t(statusI18nKey(status))}</span>
              <span data-testid={`timeline-count-${status}`} className="font-mono text-slate-500">
                {latest[status] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/management/__tests__/StatusLineChart.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/management/StatusLineChart.tsx src/components/management/__tests__/StatusLineChart.test.tsx
git commit -m "feat(management): add StatusLineChart SVG component"
```

---

## Task 5: Seed timeline data in the store

**Files:**
- Modify: `src/store/dataStore.ts:1-13,31-36`

- [ ] **Step 1: Add the import**

In `src/store/dataStore.ts`, after the `CYCLES` import (line 5), add:

```ts
import { TIMELINE_SNAPSHOTS, type TimelineSnapshot } from '../fixtures/timeline';
```

- [ ] **Step 2: Add `timeline` to the state interface**

In the `DataState` interface, after `cycles: Cycle[];` (line 13), add:

```ts
  timeline: TimelineSnapshot[];
```

- [ ] **Step 3: Seed `timeline` in the store initializer**

In the `create<DataState>` initializer, after `cycles: structuredClone(CYCLES),` (line 35), add:

```ts
  timeline: structuredClone(TIMELINE_SNAPSHOTS),
```

- [ ] **Step 4: Verify the store still type-checks and existing tests pass**

Run: `npx tsc --noEmit && npx vitest run src/pages/__tests__/management.rules.test.tsx`
Expected: PASS (no type errors; existing management tests unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/store/dataStore.ts
git commit -m "feat(management): seed timeline snapshots in data store"
```

---

## Task 6: Add i18n key `mgmt.timelineTitle`

**Files:**
- Modify: `src/i18n/types.ts:187-194`
- Modify: `src/i18n/en.ts:172-179`
- Modify: `src/i18n/es.ts:172-179`

- [ ] **Step 1: Extend the Translations type**

In `src/i18n/types.ts`, inside the `mgmt:` block, after `pieTitle: string;` (line 190) add:

```ts
    timelineTitle: string;
```

- [ ] **Step 2: Add the English string**

In `src/i18n/en.ts`, inside `mgmt:`, after the `pieTitle` line (line 175) add:

```ts
    timelineTitle: 'Status Evolution — (PL × Metier) pairs over time',
```

- [ ] **Step 3: Add the Spanish string**

In `src/i18n/es.ts`, inside `mgmt:`, after the `pieTitle` line (line 175) add:

```ts
    timelineTitle: 'Evolución de Status — pares (PL × Métier) en el tiempo',
```

- [ ] **Step 4: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: PASS (both locales satisfy the `Translations` type).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(i18n): add mgmt.timelineTitle key"
```

---

## Task 7: Wire the timeline into ManagementPage

**Files:**
- Modify: `src/pages/ManagementPage.tsx`
- Test: `src/pages/__tests__/management.timeline.test.tsx`

The timeline reuses the existing `metierFilter` (MGMT-BR-05) and the active cycle id (MGMT-BR-06). It is placed between the pie chart and the matrix table. The status filter does NOT affect it.

- [ ] **Step 1: Write the failing integration test**

Create `src/pages/__tests__/management.timeline.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ManagementPage } from '../ManagementPage';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import type { TimelineSnapshot } from '../../fixtures/timeline';

const ACTIVE = 'cyc-x';

const timeline: TimelineSnapshot[] = [
  {
    date: '2026-01-01',
    cycleId: ACTIVE,
    byMetier: { 'H-DESIGN': { 'To do': 3 }, 'H-SOFTWARE': { 'To do': 2 } },
  },
  {
    date: '2026-06-01',
    cycleId: ACTIVE,
    byMetier: { 'H-DESIGN': { 'Approved': 3 }, 'H-SOFTWARE': { 'Approved': 2 } },
  },
];

function seed() {
  useRoleStore.getState().setRole('Admin');
  useDataStore.setState({
    lines: [],
    cycles: [{ id: ACTIVE, name: 'X', is_active: true, start_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' }],
    timeline,
  });
}

describe('ManagementPage — Status Evolution timeline (PRD §7)', () => {
  beforeEach(() => {
    cleanup();
    seed();
  });

  it('renders the timeline chart with all 6 status lines (MGMT-BR-03)', () => {
    const { container } = render(<ManagementPage />);
    expect(screen.getByTestId('status-timeline')).toBeInTheDocument();
    expect(container.querySelectorAll('polyline[data-status]')).toHaveLength(6);
  });

  it('aggregates across métiers by default and narrows when the métier filter changes (MGMT-BR-05)', () => {
    render(<ManagementPage />);
    // métier = all → latest Approved = 3 + 2 = 5
    expect(screen.getByTestId('timeline-count-Approved')).toHaveTextContent('5');

    // pick H-DESIGN from the métier filter. FilterSelect renders <label> and
    // <select> as siblings without htmlFor/id, so query by combobox role:
    // [0] = status filter, [1] = métier filter (render order in ManagementPage).
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'H-DESIGN' } });

    // latest Approved now only counts H-DESIGN → 3
    expect(screen.getByTestId('timeline-count-Approved')).toHaveTextContent('3');
  });

  it('does not render the timeline chart when there is no active cycle (MGMT-BR-06)', () => {
    cleanup();
    useRoleStore.getState().setRole('Admin');
    useDataStore.setState({ lines: [], cycles: [], timeline });
    render(<ManagementPage />);
    expect(screen.queryByTestId('status-timeline')).not.toBeInTheDocument();
    expect(screen.getByTestId('mgmt-no-cycle')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/management.timeline.test.tsx`
Expected: FAIL — no `status-timeline` element (chart not wired yet).

- [ ] **Step 3: Wire the chart into ManagementPage**

In `src/pages/ManagementPage.tsx`:

3a. Add imports after the `StatusPieChart` import (line 5):

```ts
import { StatusLineChart } from '../components/management/StatusLineChart';
import { buildTimelineSeries } from '../lib/timeline';
```

3b. Read the timeline from the store — after the `activeCycle` selector (line 25), add:

```ts
  const timeline = useDataStore((s) => s.timeline);
```

3c. Derive the series — after the `statusTotals` memo (ends line 61), add:

```ts
  // MGMT-BR-05: the timeline reuses the same métier filter as the pie chart.
  // MGMT-BR-06: only the active cycle's snapshots are shown. The status filter
  // does not affect the timeline (PRD §7 always shows all 6 status lines).
  const timelineSeries = useMemo(
    () => buildTimelineSeries(timeline, activeCycleId, metierFilter),
    [timeline, activeCycleId, metierFilter],
  );
```

3d. Render the chart between the pie and the matrix — after the `<StatusPieChart .../>` block (ends line 99), add:

```tsx
      <StatusLineChart data={timelineSeries} title={t('mgmt.timelineTitle')} />
```

- [ ] **Step 4: Run the integration test to verify it passes**

Run: `npx vitest run src/pages/__tests__/management.timeline.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/ManagementPage.tsx src/pages/__tests__/management.timeline.test.tsx
git commit -m "feat(management): render status evolution timeline (HIW-178)"
```

---

## Task 8: Full verification

- [ ] **Step 1: Run the whole frontend test suite**

Run: `npm test -- --run`
Expected: PASS — all suites green, including the new timeline, fixture, helper, and component tests, and the pre-existing management suites (access, br04, br06, rules).

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: (Optional) Visual smoke check**

Run the app (`npm run dev`), switch to Admin/PMO/RCRC, open Management, and confirm the Status Evolution chart appears below the pie chart with 6 colored lines, that the métier filter updates both charts, and that the legend counts match the pie totals.

- [ ] **Step 4: No commit needed** (verification only). If any fix is required, follow TDD: add/adjust a failing test first.

---

## Notes / Out of scope

- **Kit follow-up (not this prototype):** resolve `MGMT-01` ("Timeline data source: event log vs daily snapshot") in `great-sdd-kit`'s Python specs per PRD §7, and add a real `GET /management/dashboard/timeline` integration + event-log table. This plan delivers only the frontend prototype chart.
- `npm test` covers this change; the kit's `pytest` suite is unaffected because no kit files are modified.
