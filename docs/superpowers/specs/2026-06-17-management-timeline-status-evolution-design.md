# Management View — Timeline Chart (Status Evolution) Design

- **Date:** 2026-06-17
- **Ticket:** HIW-178 (retest GAP)
- **Reference:** Management View PRD §7 "Timeline Chart — Status Evolution"
- **Scope:** Frontend prototype only (`ux_great_prototype`). Kit (Python dependency) changes are out of scope.

## Problem

The HIW-178 retest confirmed role access (PMO/Admin/RCRC) works, but flagged one open GAP:
the Management View is missing the **Status Evolution timeline chart** described in PRD §7. The page
currently renders only the status distribution pie chart and the (Métier × Status) matrix table.

## PRD §7 summary

- A **line chart** with **one line per status** (6 lines), showing how the count of (PL, Métier)
  pairs in each status has evolved over time.
- **X axis:** time, from the cycle start date to today.
- **Y axis:** count of (PL, Métier) pairs.
- **Filterable by métier** (same dropdown as the pie chart).
- Expected pattern (§7.2): `To do`/`Draft` decrease while `Estimated`/`Sent`/`Approved` increase;
  spikes in `Modification Requested` indicate CPO feedback rounds.
- Data source (§7.3): an event log of timestamped status transitions, replayed into daily counts,
  retained indefinitely.

## Decisions

1. **Timeline data source:** a static **daily-counts fixture** matching the kit's `TimelineDataPoint`
   shape (`{ date, status_counts }`), broken down per métier. The prototype does **not** build a real
   event log + replay — that is backend/kit work. This keeps the prototype simple and matches the
   kit/endpoint contract (`GET /management/dashboard/timeline`).
2. **Rendering:** a hand-rolled **SVG** line chart, consistent with the existing custom-SVG pie chart
   (`StatusPieChart`). No new charting library is added.

## Business rules the timeline must honor

- **MGMT-BR-02** — count (PL, Métier) **pairs**, not unique PL Numbers. In the prototype each line is
  effectively a (PL, Métier) row, so the timeline counts lines, consistent with the pie chart.
- **MGMT-BR-03** — all **6 statuses** are shown: the chart always renders 6 lines, even if a status is
  flat at 0.
- **MGMT-BR-05** — a single métier filter applies to **both** charts simultaneously: the timeline
  reuses the existing `metierFilter` state in `ManagementPage`.
- **MGMT-BR-06** — **active cycle only**: the fixture is scoped to the active cycle; no timeline is
  shown when there is no active cycle (consistent with the existing no-cycle guard).
- **MGMT-BR-07 / MGMT-BR-08** — read-only, no auto-refresh: data reflects page-load state only.

The status filter dropdown does **not** affect the timeline — PRD §7.1 specifies métier filtering
only, and the chart always shows the 6 status lines.

## Components

### 1. `src/components/management/statusColors.ts` (extraction)

`STATUS_COLORS` currently lives inside `StatusPieChart.tsx`. Extract it to a shared module so the pie
chart and the timeline use the same palette and the same status set. `StatusPieChart` imports from the
new module (mechanical refactor, no visual change).

```ts
export const STATUS_COLORS: Record<LineStatus, string> = {
  'To do':    '#94a3b8',
  'Draft':    '#f59e0b',
  'Estimated': '#3b82f6',
  'Sent':     '#a855f7',
  'Modification Requested': '#ef4444',
  'Approved': '#22c55e',
};
```

### 2. `src/fixtures/timeline.ts` (new)

Periodic snapshots of the active cycle, broken down per métier so the shared métier filter works.

```ts
interface TimelineSnapshot {
  date: string; // YYYY-MM-DD
  byMetier: Record<Metier, Record<LineStatus, number>>;
}
```

- **Cadence:** ~biweekly points from the active cycle `start_date` (2026-01-01) to today
  (2026-06-17) — roughly 12 points. Enough to show the curve without bloating the fixture.
- **Reconciliation:** the **last snapshot's totals equal the current pie/matrix counts** for the
  active cycle, so the prototype is internally consistent.
- **Shape of the curve:** follows §7.2 — `To do`/`Draft` decrease over time; `Estimated`/`Sent`/
  `Approved` increase; at least one `Modification Requested` spike.
- Scoped to the active cycle (`cyc-2026h1`) — MGMT-BR-06.
- Only the 5 Management métiers (H-NP and H-PROJECT excluded — MGMT-BR-04).

### 3. `src/components/management/StatusLineChart.tsx` (new)

Hand-rolled SVG line chart, same visual language as `StatusPieChart`.

- **Props:** the aggregated series — an array of `{ date, status_counts: Partial<Record<LineStatus, number>> }`.
- **X axis:** time from cycle start to today, with a small number of date ticks.
- **Y axis:** count, scaled to the series max, with gridline ticks.
- **6 polylines**, one per status, colored via `statusColors` (MGMT-BR-03), always rendered.
- **Legend:** same swatch pattern as the pie; labels via `statusI18nKey`.
- **Tooltips:** minimal — native `<title>` on the data-point dots. No custom overlay, no library (YAGNI).
- **Empty state:** reuse `mgmt.noData`.

### 4. `ManagementPage` wiring

- Derive the timeline series from the fixture by applying the existing `metierFilter`
  (`'all'` → sum across the 5 métiers; a specific métier → that métier's snapshots). MGMT-BR-05.
- Status filter does **not** affect the timeline.
- Placement: **below the pie chart, above the matrix table** (PRD ordering §6 → §7).

### 5. i18n

Add `mgmt.timelineTitle` (and axis labels if needed) to `src/i18n/en.ts` and any other existing
locale files, following the existing key structure.

## Data flow

```
CYCLES (active) ──┐
                  ├─► ManagementPage
TIMELINE fixture ─┘        │ apply metierFilter (MGMT-BR-05)
                          ▼
                   aggregated series [{ date, status_counts }]
                          │
                          ▼
                   <StatusLineChart /> ── statusColors, statusI18nKey
```

## Testing (Strict TDD — tests first)

- **`StatusLineChart` unit tests:** renders 6 status lines + legend; Y scale derives from the series
  max; empty state when the series is empty; line colors come from `statusColors`.
- **`ManagementPage` integration tests:**
  - timeline renders for the active cycle;
  - responds to the métier filter (MGMT-BR-05) — switching métier changes the series;
  - status filter does NOT change the timeline; all 6 status lines always present (MGMT-BR-03);
  - not shown when there is no active cycle (MGMT-BR-06).
- Run `npm test` (Vitest + React Testing Library, `src/**/__tests__/`).

## Error handling / edge cases

- No active cycle → existing no-cycle guard already short-circuits the page; the timeline is never
  reached.
- Empty fixture for the active cycle → `StatusLineChart` shows the `mgmt.noData` empty state.
- A status absent from a snapshot is treated as 0 (line stays flat), keeping all 6 lines present.

## Out of scope (follow-up)

- Resolving `MGMT-01` ("Timeline data source: event log vs daily snapshot") in the kit's Python specs
  per PRD §7. This is a change to the `great-sdd-kit` dependency, not this frontend prototype.
- A real event-log table + replay, and the live `GET /management/dashboard/timeline` integration.
