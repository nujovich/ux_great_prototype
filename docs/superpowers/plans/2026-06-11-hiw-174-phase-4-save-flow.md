# HIW-174 Phase 4 — Save Flow (two-step + pre-save summary)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **⚠️ GIT SAFETY (every task):** Do NOT run `git checkout`/`switch`/`reset`/`branch`/`stash`. Stay on `main`. Only `git add` + `git commit`. Inspect with read-only `git diff`/`show`/`log`. After each commit confirm its parent is the previous task's commit. (A stray checkout corrupted branch state in Phase 2.)

**Goal:** Enforce the two-step save in every editing session — `Save as Draft` must precede `Save as Definitive` even for `Draft` and `Modification Requested` lines (BR-02/BR-15) — keep the empty-draft block, and show a pre-save summary (Total ETPs / Bench Hours / KMs + annual breakdown by FTE/BH/KM, **no K€**) after `Save as Draft`, leaving the panel open so the engineer can then promote.

**Architecture:** Three changes to the existing estimation panel + a new pure calc seam. (1) Fix the `hasDraftedThisSession` draft-gate so it starts `false` and resets on every line open (per-session gate). (2) Add a pure `annualBreakdown(totals, spDate, durationMonths)` to `calc.ts` (uniform monthly distribution from SP over `durationMonths`, aggregated by calendar year; FTE/year = man-days-year / 209). (3) Make `Save as Draft` persist the draft, keep the panel open, and open a pre-save summary modal (Total ETPs/BH/KM + the annual breakdown table, no K€); `Promote` becomes enabled after the draft save. The empty-draft rule is extracted into a tested `canSaveDraft` seam.

**Tech Stack:** React 19 + Vite + TS, Zustand, Vitest (pure unit tests; no `@testing-library/react`).

**Decisions (Phase 4 kickoff, design `docs/superpowers/specs/2026-06-10-hiw-174-pre-estimation-prd-alignment-design.md`):**
- Pre-save summary = a modal shown AFTER `Save as Draft`; the panel stays open; `Save as Draft` no longer closes the panel.
- Annual breakdown = uniform monthly over `durationMonths` from `spDate`, aggregated by calendar year; missing `durationMonths` ⇒ all in the SP year.
- Multi-line save (one summary per line) is **deferred to Phase 5** — `Save as Draft` today edits/saves a single line; the summary is for that line.
- Work directly on `main`.

**Key current facts (verified):**
- `hasDraftedThisSession` init (EstimationPanel.tsx:62-64) wrongly starts `true` for `Draft`/`Estimated`/`Modification Requested` → lets those promote without a fresh draft. **This is the BR-15 gap to fix.**
- `handleSaveDraft` (lines 237-247) persists `Draft`, sets the gate true, toasts, and **closes the panel** (`onClose()`).
- `hasMinimumForDraft = hasAnySelection || hasAnyCustomJU` (lines 295-300) already blocks empty drafts (Phase 3B).
- `totals = calcEstimationTotals(...)` (lines 84-88). `calc.ts` has NO annual breakdown function (removed in 3B).
- `Estimation.yearlyBreakdown: number[]` field exists; persist writes `[]`. The summary is computed at display time — we do NOT persist the annual breakdown (leave `yearlyBreakdown: []`).
- ProjectLine has `spDate`, `durationMonths` (+ pc/co/sop) — confirmed on fixtures.

---

## File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/lib/saveGate.ts` | **NEW** pure `canSaveDraft` | testable empty-draft rule |
| `src/lib/__tests__/saveGate.test.ts` | **NEW** | |
| `src/lib/calc.ts` | add `annualBreakdown` + `AnnualBreakdownRow` | |
| `src/lib/__tests__/calc.test.ts` | add annual-breakdown tests | |
| `src/components/estimation/PreSaveSummaryModal.tsx` | **NEW** summary modal | totals + annual table |
| `src/components/estimation/EstimationPanel.tsx` | draft-gate fix + save flow | |
| `src/i18n/en.ts`,`es.ts`,`types.ts` | summary labels | |

Run: `npx vitest run`; `npx tsc -b`. Baseline at start of Phase 4: **134 tests passing**.

---

## Task 1: Fix the draft-gate (BR-15) + extract the empty-draft rule

**Files:**
- Create: `src/lib/saveGate.ts`, `src/lib/__tests__/saveGate.test.ts`
- Modify: `src/components/estimation/EstimationPanel.tsx`

- [ ] **Step 1: Write the failing seam test**

Create `src/lib/__tests__/saveGate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canSaveDraft } from '../saveGate';
import type { InductorSelection, CustomJU } from '../../types';

const sel = (cran: string | null): InductorSelection => ({
  inductorId: 'i', selectedCranId: cran, inductorOccurrence: 1, juOccurrences: [],
});
const custom = (name: string): CustomJU => ({ id: 'c', name, variable: 1, fixed: 0, occurrence: 1 });

describe('canSaveDraft (HIW-174 §9 — block empty Draft)', () => {
  it('false when there is no selected cran and no named custom JU', () => {
    expect(canSaveDraft([sel(null)], [])).toBe(false);
    expect(canSaveDraft([], [])).toBe(false);
    expect(canSaveDraft([sel(null)], [custom('  ')])).toBe(false); // whitespace name doesn't count
  });
  it('true when at least one inductor has a selected cran', () => {
    expect(canSaveDraft([sel('cr-1')], [])).toBe(true);
  });
  it('true when at least one named custom JU exists (no-workload-standard path, BR-11)', () => {
    expect(canSaveDraft([], [custom('My JU')])).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (module missing)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/saveGate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create the seam**

Create `src/lib/saveGate.ts`:

```ts
import type { InductorSelection, CustomJU } from '../types';

/**
 * The empty-Draft block (HIW-174 §9): Save-as-Draft is allowed only when there is at
 * least one inductor with a selected cran OR at least one named Custom JU. Zero
 * occurrence is still allowed (BR-13) — it just contributes zero to the totals.
 */
export function canSaveDraft(selections: InductorSelection[], customJUs: CustomJU[]): boolean {
  const hasSelection = selections.some((s) => s.selectedCranId !== null);
  const hasNamedCustom = customJUs.some((c) => c.name.trim().length > 0);
  return hasSelection || hasNamedCustom;
}
```

- [ ] **Step 4: Run the test, expect PASS**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/saveGate.test.ts`
Expected: PASS.

- [ ] **Step 5: Use the seam + fix the draft-gate in the panel**

In `src/components/estimation/EstimationPanel.tsx`:
- import `canSaveDraft`:
  ```ts
  import { canSaveDraft } from '../../lib/saveGate';
  ```
- Change the `hasDraftedThisSession` initial state to always `false` (per-session gate). Replace:
  ```ts
  const [hasDraftedThisSession, setHasDraftedThisSession] = useState<boolean>(
    line?.status === 'Draft' || line?.status === 'Estimated' || line?.status === 'Modification Requested',
  );
  ```
  with:
  ```ts
  const [hasDraftedThisSession, setHasDraftedThisSession] = useState<boolean>(false);
  ```
- In the open `useEffect` (the one that resets `selections`/`customJUs`/etc. on `[line, existing]`), add a reset so switching/opening a line clears the gate:
  ```ts
      setHasDraftedThisSession(false);
  ```
  (place it alongside the other `set...` calls inside the `Promise.resolve().then(() => { ... })`).
- Replace the `hasMinimumForDraft` definition to use the seam:
  ```ts
  const hasMinimumForDraft = canSaveDraft(selections, customJUs);
  ```
  (Remove the now-redundant `hasAnyCustomJU`/`hasAnySelection` locals if they're not used elsewhere — check with `tsc`; `hasMinimumForDefinitive` keeps its own condition.)

- [ ] **Step 6: Verify + commit**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/lib/__tests__/saveGate.test.ts   # PASS
npx tsc -b                                           # clean
npx vitest run                                       # full suite green (134 + saveGate tests)
git -C /home/nujovich/ux_great_prototype add src/lib/saveGate.ts src/lib/__tests__/saveGate.test.ts src/components/estimation/EstimationPanel.tsx
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): per-session draft gate (BR-15) + extracted empty-draft rule (HIW-174 §3/§9)"
```
Confirm parent is the Phase 4 base commit.

---

## Task 2: Annual breakdown calc (FTE / BH / KM by year)

**Files:**
- Modify: `src/lib/calc.ts`
- Modify: `src/lib/__tests__/calc.test.ts`

- [ ] **Step 1: Write the failing test (add to calc.test.ts)**

Append to `src/lib/__tests__/calc.test.ts` a new describe block:

```ts
import { calcEstimationTotals, calcTotalDays, annualBreakdown } from '../calc';
// (merge the import above with the existing calc import line)

describe('annualBreakdown (HIW-174 §9 pre-save summary)', () => {
  const totals = { manDays: 12, fte: 0, benchHours: 24, km: 6, keuro: 0 };

  it('distributes uniformly over durationMonths from SP and aggregates by calendar year', () => {
    // 24 months from 2026-01: 12 months in 2026, 12 in 2027 → half each
    const rows = annualBreakdown(totals, '2026-01-01', 24);
    expect(rows.map((r) => r.year)).toEqual([2026, 2027]);
    expect(rows[0].manDays).toBeCloseTo(6);
    expect(rows[1].manDays).toBeCloseTo(6);
    expect(rows[0].benchHours).toBeCloseTo(12);
    expect(rows[0].km).toBeCloseTo(3);
    // fte is man-days(year)/209 rounded to 2 decimals: 6/209 ≈ 0.0287 → 0.03
    expect(rows[0].fte).toBeCloseTo(0.03, 2);
  });

  it('puts everything in the SP year when durationMonths is missing', () => {
    const rows = annualBreakdown(totals, '2026-05-01', undefined);
    expect(rows).toHaveLength(1);
    expect(rows[0].year).toBe(2026);
    expect(rows[0].manDays).toBeCloseTo(12);
  });

  it('spans the correct years when SP starts mid-year', () => {
    // start 2026-07, 12 months → 6 months in 2026, 6 in 2027
    const rows = annualBreakdown(totals, '2026-07-01', 12);
    expect(rows.map((r) => r.year)).toEqual([2026, 2027]);
    expect(rows[0].manDays).toBeCloseTo(6);
    expect(rows[1].manDays).toBeCloseTo(6);
  });

  it('returns an empty array when spDate is missing', () => {
    expect(annualBreakdown(totals, undefined, 12)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (`annualBreakdown` not exported)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/calc.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `annualBreakdown` in calc.ts**

Add to `src/lib/calc.ts` (after `calcEstimationTotals`):

```ts
export interface AnnualBreakdownRow {
  year: number;
  manDays: number;
  fte: number;
  benchHours: number;
  km: number;
}

/**
 * Distributes the estimation totals uniformly across `durationMonths` starting at `spDate`
 * and aggregates by calendar year (§9.4). FTE per year = man-days(year) / 209.
 * Missing `durationMonths` (or ≤0) puts everything in the SP year; missing `spDate`
 * returns no rows (the summary then shows only the grand totals).
 */
export function annualBreakdown(
  totals: EstimationTotals,
  spDate: string | undefined,
  durationMonths: number | undefined,
): AnnualBreakdownRow[] {
  if (!spDate) return [];
  const startYear = Number(spDate.slice(0, 4));
  const startMonth = Number(spDate.slice(5, 7)); // 1-12
  if (!Number.isFinite(startYear) || !Number.isFinite(startMonth)) return [];

  const months = durationMonths && durationMonths > 0 ? Math.floor(durationMonths) : 1;
  const perMonthMd = totals.manDays / months;
  const perMonthBh = totals.benchHours / months;
  const perMonthKm = totals.km / months;

  const byYear = new Map<number, { manDays: number; benchHours: number; km: number }>();
  for (let i = 0; i < months; i++) {
    const monthIndex = startMonth - 1 + i; // 0-based from Jan of startYear
    const year = startYear + Math.floor(monthIndex / 12);
    const acc = byYear.get(year) ?? { manDays: 0, benchHours: 0, km: 0 };
    acc.manDays += perMonthMd;
    acc.benchHours += perMonthBh;
    acc.km += perMonthKm;
    byYear.set(year, acc);
  }

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => ({
      year,
      manDays: Math.round(v.manDays * 100) / 100,
      fte: Math.round((v.manDays / MAN_DAY_FTE_DIVISOR) * 100) / 100,
      benchHours: Math.round(v.benchHours * 100) / 100,
      km: Math.round(v.km * 100) / 100,
    }));
}
```

- [ ] **Step 4: Run the test, expect PASS**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/calc.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify + commit**

```bash
cd /home/nujovich/ux_great_prototype
npx tsc -b            # clean
npx vitest run        # full suite green
git -C /home/nujovich/ux_great_prototype add src/lib/calc.ts src/lib/__tests__/calc.test.ts
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): annual breakdown by FTE/BH/KM for pre-save summary (HIW-174 §9)"
```
Confirm parent is Task 1's commit.

---

## Task 3: Pre-save summary modal after Save as Draft

**Files:**
- Create: `src/components/estimation/PreSaveSummaryModal.tsx`
- Modify: `src/components/estimation/EstimationPanel.tsx` (save flow + render the modal + promote-confirm totals)
- Modify: `src/i18n/en.ts`,`es.ts`,`types.ts` (summary labels)

- [ ] **Step 1: Add summary i18n**

`en.ts` panel section, add:
```ts
    summaryTitle: 'Pre-save summary',
    summaryNoKeuro: 'K€ is calculated in Allocation.',
    summaryYear: 'Year',
    summaryClose: 'Close',
```
`es.ts` panel section:
```ts
    summaryTitle: 'Resumen previo al guardado',
    summaryNoKeuro: 'El K€ se calcula en Allocation.',
    summaryYear: 'Año',
    summaryClose: 'Cerrar',
```
`types.ts` panel type: add `summaryTitle: string; summaryNoKeuro: string; summaryYear: string; summaryClose: string;`.

- [ ] **Step 2: Create the summary modal component**

Create `src/components/estimation/PreSaveSummaryModal.tsx`:

```tsx
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { annualBreakdown, type EstimationTotals } from '../../lib/calc';
import { formatFTE, formatBenchHours, formatKm } from '../../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  lineName: string;
  totals: EstimationTotals;
  spDate?: string;
  durationMonths?: number;
}

export function PreSaveSummaryModal({ open, onClose, lineName, totals, spDate, durationMonths }: Props) {
  const t = useT();
  const rows = annualBreakdown(totals, spDate, durationMonths);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t('panel.summaryTitle')} — ${lineName}`}
      footer={<Button variant="primary" onClick={onClose}>{t('panel.summaryClose')}</Button>}
    >
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-[10px] text-slate-500">{t('panel.totalEtp')}</div>
          <div className="text-lg font-bold text-slate-900">{formatFTE(totals.fte)}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-[10px] text-slate-500">{t('panel.totalBh')}</div>
          <div className="text-lg font-bold text-slate-900">{formatBenchHours(totals.benchHours)}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-[10px] text-slate-500">{t('panel.totalKm')}</div>
          <div className="text-lg font-bold text-slate-900">{formatKm(totals.km)}</div>
        </div>
      </div>
      {rows.length > 0 && (
        <table className="mt-4 w-full text-xs">
          <thead className="text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1 text-left font-medium">{t('panel.summaryYear')}</th>
              <th className="px-2 py-1 text-right font-medium">{t('panel.totalEtp')}</th>
              <th className="px-2 py-1 text-right font-medium">{t('panel.totalBh')}</th>
              <th className="px-2 py-1 text-right font-medium">{t('panel.totalKm')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} className="border-t border-slate-100">
                <td className="px-2 py-1 text-left text-slate-700">{r.year}</td>
                <td className="px-2 py-1 text-right text-slate-600">{formatFTE(r.fte)}</td>
                <td className="px-2 py-1 text-right text-slate-600">{formatBenchHours(r.benchHours)}</td>
                <td className="px-2 py-1 text-right text-slate-600">{formatKm(r.km)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-[10px] text-slate-400">{t('panel.summaryNoKeuro')}</p>
    </Modal>
  );
}
```

- [ ] **Step 3: Wire the save flow — Save as Draft opens the summary, keeps the panel open**

In `src/components/estimation/EstimationPanel.tsx`:
- import the modal:
  ```ts
  import { PreSaveSummaryModal } from './PreSaveSummaryModal';
  ```
- add state: `const [showSummary, setShowSummary] = useState(false);`
- change `handleSaveDraft` so it persists the draft, marks the gate, toasts, and opens the summary INSTEAD of closing the panel:
  ```ts
  function handleSaveDraft() {
    const validation = validateBeforeSave(line!);
    if (!validation.valid) {
      pushToast(validation.errors.join(' '), 'error');
      return;
    }
    persist('Draft');
    setHasDraftedThisSession(true);
    pushToast(t('panel.toastDraftSaved', { id: line!.id }), 'success');
    setShowSummary(true);
  }
  ```
  (Remove the `onClose()` call from `handleSaveDraft`.)
- render the summary modal near the other modals at the end of the component JSX (only when `line` exists):
  ```tsx
  {line && (
    <PreSaveSummaryModal
      open={showSummary}
      onClose={() => setShowSummary(false)}
      lineName={line.lineName}
      totals={totals}
      spDate={line.spDate}
      durationMonths={line.durationMonths}
    />
  )}
  ```
- also reset `showSummary` to false in the open `useEffect` (alongside the other resets) so switching lines closes any stale summary.

- [ ] **Step 4: Update the Promote-confirm modal to show FTE/BH/KM (no K€)**

In the `confirmPromote` Modal body, replace the days + k€ lines with the unit-type totals (consistent with the pre-save summary; the promote confirmation should not show K€):
```tsx
  <ul className="mt-3 space-y-1 text-sm text-slate-600">
    <li>• {t('panel.totalEtp')}: {formatFTE(totals.fte)}</li>
    <li>• {t('panel.totalBh')}: {formatBenchHours(totals.benchHours)}</li>
    <li>• {t('panel.totalKm')}: {formatKm(totals.km)}</li>
  </ul>
```
(`formatFTE`/`formatBenchHours`/`formatKm` are already imported in the panel from Phase 3B. The `confirmDays`/`confirmKeuro` i18n keys become unused — leave them or remove; at minimum stop referencing `confirmKeuro`.)

- [ ] **Step 5: Verify + commit**

```bash
cd /home/nujovich/ux_great_prototype
npx tsc -b            # clean (resolve any now-unused import like formatKEuro/formatDays if dropped)
npx vitest run        # full suite green
git -C /home/nujovich/ux_great_prototype add src/components/estimation/PreSaveSummaryModal.tsx src/components/estimation/EstimationPanel.tsx src/i18n/
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): pre-save summary modal after Save as Draft; promote confirm shows FTE/BH/KM (HIW-174 §9)"
```
Confirm parent is Task 2's commit.

---

## Done criteria for Phase 4

- Opening any editable line (`To do`/`Draft`/`Modification Requested`) starts with `Promote` disabled; it enables only after `Save as Draft` is clicked in the current session (BR-02/BR-15). Switching lines via the navigator re-arms the gate.
- `Save as Draft` is disabled for an empty estimation (no selected cran and no named Custom JU); zero occurrence is still allowed.
- `Save as Draft` persists the draft, keeps the panel open, and shows the pre-save summary modal: Total ETPs / Bench Hours / KMs + an annual breakdown table (FTE/BH/KM per year), with a "K€ calculated in Allocation" note and **no K€ figure**.
- The promote-confirm modal shows FTE/BH/KM (no K€).
- `npx tsc -b` clean; `npx vitest run` fully green (134 + saveGate + annualBreakdown tests).

## Deferred to Phase 5
- Multi-line save (apply one config to all compatible lines, each with its own dates) → then the pre-save summary shows one block per line.
- Multi-line compatibility block + error UI, copy (compatibility + legacy cycle), parent-child relationships.

## Out of scope / noted
- `Estimation.yearlyBreakdown: number[]` stays persisted as `[]` (the annual breakdown is computed at display time, not stored). Removing the vestigial field is a later cleanup.
- "Not estimated" → "To do" display label still pending product confirmation.
