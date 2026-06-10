# HIW-174 Phase 3A — Estimation Calc Engine & Data Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the real PRD estimation formula `Total = (Variable × Occurrence) + Fixed` with per-`unit_type` segregation (ETPs/Bench Hours/KM), rebalance the JU fixtures so the formula no longer double-counts, add a few non-`man_day` fixtures, and add FTE/BH/KM formatters — the tested calculation foundation that Phase 3B's panel UI will consume.

**Architecture:** Pure functions only (no UI changes here). A new `calcEstimationTotals` computes per-JU `(variable × occurrence) + fixed`, buckets each JU by `unit_type` into man-days / bench-hours / kilometres, multiplies by the global occurrence, and derives FTE = man-days / 209. `calcTotalDays` is kept (delegates to man-days) so existing callers and the persisted `Estimation.totalDays` keep working. The `ju()` fixture helper is rebalanced so `occurrence` becomes the editable **count** (default 1) and `variable` holds the per-unit **coefficient** — preserving every current man-day total while making the formula correct.

**Tech Stack:** TypeScript, Vitest (pure unit tests; no `@testing-library/react`).

**Decisions locked (Phase 3 kickoff, design: `docs/superpowers/specs/2026-06-10-hiw-174-pre-estimation-prd-alignment-design.md`):**
- **Total K€ = stub `0`** in Pre-Estimation (SDD §11: K€ is computed in Allocation). The right panel will still show a "Total K€" field (Phase 3B), reading this stub.
- **Add some `bench_hours` / `kilometres` fixtures** so BH/KM totals are exercisable.
- The `variable = occurrence`, `fixed = 0` convention from Phase 1 is **rebalanced here** (see memory `phase3-ju-formula-rebalance`).
- Work directly on `main`.

**Model (locked):** Each JU carries read-only `variable` (coefficient), `fixed`, and `unit_type`; the engineer edits `occurrence` (a count, default 1). JU contribution in its own unit = `(variable × occurrence) + fixed`. Buckets: `man_day` → man-days (→ FTE = man-days/209), `bench_hours` → BH, `kilometres` → KM, `kiloeuros` → ignored in PEV (K€ stub 0). Custom JUs keep their current `{days}` model in 3A and contribute to man-days (the Custom-JU model redesign is Phase 3B). The global occurrence multiplies every bucket (≤0 ⇒ 0, BR-13).

---

## File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/lib/calc.ts` | estimation math | add `EstimationTotals` + `calcEstimationTotals`; `calcTotalDays` delegates to man-days |
| `src/lib/__tests__/calc.test.ts` | calc tests | rewrite for the new model |
| `src/fixtures/inductors.ts` | inductor/JU fixtures | rebalance `ju()` (occurrence=count=1, variable=coeff) + `unit_type` param; mark some BH/KM JUs |
| `src/fixtures/__tests__/inductors.test.ts` | fixture tests | extend: coefficients + unit-type coverage |
| `src/lib/format.ts` | display formatters | add `formatFTE`, `formatBenchHours`, `formatKm` |
| `src/lib/__tests__/format.test.ts` | formatter tests | create |

Run tests: `npx vitest run`; typecheck: `npx tsc -b`. Baseline at start of Phase 3A: **115 tests passing**.

---

## Task 1: Calc engine — formula + unit-type segregation

**Files:**
- Modify: `src/lib/calc.ts`
- Modify (rewrite): `src/lib/__tests__/calc.test.ts`

The current `calcTotalDays` sums each JU's `occurrence` directly. Replace the math with the real formula and unit segregation, exposing a richer `calcEstimationTotals`, and keep `calcTotalDays` as a thin man-days accessor.

- [ ] **Step 1: Rewrite the calc test for the new model (write the failing tests first)**

Replace the entire contents of `src/lib/__tests__/calc.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { calcEstimationTotals, calcTotalDays } from '../calc';
import type { InductorSelection, PrototypeInductor, CustomJU, JU } from '../../types';

const ju = (id: string, variable: number, fixed: number, unit_type: JU['unit_type']): JU => ({
  id, name: id, long_name: id, variable, fixed, unit_type,
  occurrence: 1, occurrence_locked: false, custom: false, metier: 'H-DESIGN',
});

const inductorWith = (jus: JU[]): PrototypeInductor => ({
  id: 'ind-1', name: 'Test', category: 'Test',
  crans: [{ id: 'cr-1', name: 'C', jus }],
});

const selOf = (juOccurrences: { juId: string; occurrence: number; locked: boolean }[]): InductorSelection => ({
  inductorId: 'ind-1', selectedCranId: 'cr-1', inductorOccurrence: 1, juOccurrences,
});

describe('calcEstimationTotals (HIW-174 §8/§9)', () => {
  it('applies Total = (Variable × Occurrence) + Fixed per man_day JU', () => {
    const inds = [inductorWith([ju('j1', 2, 0.5, 'man_day')])];
    const sel = selOf([{ juId: 'j1', occurrence: 3, locked: false }]);
    // (2 × 3) + 0.5 = 6.5
    expect(calcEstimationTotals([sel], inds, [], 1).manDays).toBeCloseTo(6.5);
  });

  it('segregates man_day / bench_hours / kilometres into separate buckets', () => {
    const inds = [inductorWith([
      ju('md', 2, 0, 'man_day'),
      ju('bh', 5, 1, 'bench_hours'),
      ju('km', 10, 0, 'kilometres'),
    ])];
    const sel = selOf([
      { juId: 'md', occurrence: 2, locked: false }, // 4
      { juId: 'bh', occurrence: 3, locked: false }, // 16
      { juId: 'km', occurrence: 2, locked: false }, // 20
    ]);
    const t = calcEstimationTotals([sel], inds, [], 1);
    expect(t.manDays).toBeCloseTo(4);
    expect(t.benchHours).toBeCloseTo(16);
    expect(t.km).toBeCloseTo(20);
  });

  it('derives FTE = manDays / 209 and stubs keuro to 0 (SDD §11)', () => {
    const inds = [inductorWith([ju('j1', 209, 0, 'man_day')])];
    const sel = selOf([{ juId: 'j1', occurrence: 1, locked: false }]);
    const t = calcEstimationTotals([sel], inds, [], 1);
    expect(t.manDays).toBeCloseTo(209);
    expect(t.fte).toBeCloseTo(1);
    expect(t.keuro).toBe(0);
  });

  it('multiplies every bucket by globalOccurrences; zero ⇒ all zero (BR-13)', () => {
    const inds = [inductorWith([ju('md', 2, 0, 'man_day'), ju('bh', 1, 0, 'bench_hours')])];
    const sel = selOf([{ juId: 'md', occurrence: 1, locked: false }, { juId: 'bh', occurrence: 1, locked: false }]);
    const x3 = calcEstimationTotals([sel], inds, [], 3);
    expect(x3.manDays).toBeCloseTo(6);
    expect(x3.benchHours).toBeCloseTo(3);
    const x0 = calcEstimationTotals([sel], inds, [], 0);
    expect(x0.manDays).toBe(0);
    expect(x0.benchHours).toBe(0);
  });

  it('falls back to ju.occurrence when no override and skips cran-less inductors (BR-12)', () => {
    const inds = [inductorWith([ju('j1', 2, 0, 'man_day')])];
    const noCran: InductorSelection = { inductorId: 'ind-1', selectedCranId: null, inductorOccurrence: 1, juOccurrences: [] };
    expect(calcEstimationTotals([noCran], inds, [], 1).manDays).toBe(0);
    const withSel = selOf([]); // no juOccurrences override → uses ju.occurrence (1)
    expect(calcEstimationTotals([withSel], inds, [], 1).manDays).toBeCloseTo(2); // (2×1)+0
  });

  it('custom JUs contribute their days to man-days (legacy model preserved in 3A)', () => {
    const customJUs: CustomJU[] = [{ id: 'c1', description: 'x', days: 4 }];
    expect(calcEstimationTotals([], [], customJUs, 2).manDays).toBeCloseTo(8);
  });

  it('calcTotalDays returns the man-days bucket (backward-compatible)', () => {
    const inds = [inductorWith([ju('j1', 3, 0, 'man_day')])];
    const sel = selOf([{ juId: 'j1', occurrence: 2, locked: false }]);
    expect(calcTotalDays([sel], inds, [], 1)).toBeCloseTo(6);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (`calcEstimationTotals` not exported)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/calc.test.ts`
Expected: FAIL — `calcEstimationTotals is not a function` / import error.

- [ ] **Step 3: Implement the new calc**

Replace the body of `src/lib/calc.ts` (keep the file header comment) with:

```ts
import type { InductorSelection, PrototypeInductor, CustomJU, Metier } from '../types';

const MAN_DAY_FTE_DIVISOR = 209; // §9.2: working days per year

export interface EstimationTotals {
  manDays: number;
  fte: number;
  benchHours: number;
  km: number;
  keuro: number;
}

/**
 * Computes estimation totals per the PRD formula `Total = (Variable × Occurrence) + Fixed`
 * for each Job Unit, bucketed by `unit_type`:
 *   man_day → man-days (→ FTE = man-days / 209), bench_hours → BH, kilometres → KM.
 * Cran-less inductors are skipped (BR-12). The global occurrence multiplies every bucket;
 * a global of 0 yields all-zero output (BR-13). K€ is not computed in Pre-Estimation
 * (SDD §11) — `keuro` is a stub 0. Custom JUs contribute their `days` to man-days.
 */
export function calcEstimationTotals(
  selections: InductorSelection[],
  inductors: PrototypeInductor[],
  customJUs: CustomJU[],
  globalOccurrences: number,
): EstimationTotals {
  const g = globalOccurrences <= 0 ? 0 : globalOccurrences;
  let manDays = 0;
  let benchHours = 0;
  let km = 0;

  for (const sel of selections) {
    if (!sel.selectedCranId) continue; // BR-12
    const cranJUs = inductors
      .find((i) => i.id === sel.inductorId)
      ?.crans.find((c) => c.id === sel.selectedCranId)
      ?.jus ?? [];
    for (const ju of cranJUs) {
      const override = sel.juOccurrences.find((o) => o.juId === ju.id);
      const occurrence = override?.occurrence ?? ju.occurrence;
      const total = (ju.variable ?? 0) * occurrence + (ju.fixed ?? 0);
      switch (ju.unit_type) {
        case 'bench_hours': benchHours += total; break;
        case 'kilometres': km += total; break;
        default: manDays += total; break; // man_day (kiloeuros ignored: K€ stub)
      }
    }
  }

  for (const c of customJUs) manDays += c.days; // legacy custom model (3A)

  manDays *= g;
  benchHours *= g;
  km *= g;

  const fte = manDays > 0 ? Math.round((manDays / MAN_DAY_FTE_DIVISOR) * 100) / 100 : 0;
  return { manDays, fte, benchHours, km, keuro: 0 };
}

/** Man-days bucket only — kept for backward compatibility with existing callers
 * and the persisted `Estimation.totalDays`. */
export function calcTotalDays(
  selections: InductorSelection[],
  inductors: PrototypeInductor[],
  customJUs: CustomJU[],
  globalOccurrences: number,
): number {
  return calcEstimationTotals(selections, inductors, customJUs, globalOccurrences).manDays;
}

/** FTE = man-days / 209 (§9.2). */
export function calcFTE(manDays: number): number {
  return manDays > 0 ? Math.round((manDays / MAN_DAY_FTE_DIVISOR) * 100) / 100 : 0;
}

/** K€ is NOT computed in Pre-Estimation (SDD §11); stub kept for the UI. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calcKEuro(_days: number, _metier: Metier): number {
  return 0;
}

/** Uniform 12-month distribution of man-days. Retained for any current callers;
 * the right-side chart that consumed it is removed in Phase 3B. */
export function yearlyBreakdown(totalDays: number): number[] {
  if (totalDays <= 0) return Array(12).fill(0);
  const monthly = Math.round((totalDays / 12) * 100) / 100;
  const months = Array(12).fill(monthly);
  const diff = Math.round((totalDays - monthly * 12) * 100) / 100;
  if (diff !== 0) months[11] = Math.round((months[11] + diff) * 100) / 100;
  return months;
}
```

- [ ] **Step 4: Run the calc test (PASS) + full suite + tsc**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/lib/__tests__/calc.test.ts   # PASS
npx tsc -b                                       # clean
npx vitest run                                   # full suite — see note below
```
Note: the full suite may show failures in fixtures/inductors expectations that depend on the OLD man-day values — those are rebalanced in Task 2 (the fixture `variable`/`occurrence` change keeps man-day totals identical, so any panel/fixture test asserting totals stays green once Task 2 lands). If a NON-fixture test fails here, investigate; if only fixture-total expectations differ, proceed to Task 2 and re-run.

- [ ] **Step 5: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/lib/calc.ts src/lib/__tests__/calc.test.ts
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): estimation formula (Variable×Occurrence)+Fixed with unit-type segregation (HIW-174 §8/§9)"
```

---

## Task 2: Rebalance JU fixtures + add bench_hours/kilometres coverage

**Files:**
- Modify: `src/fixtures/inductors.ts`
- Modify: `src/fixtures/__tests__/inductors.test.ts`

The `ju()` helper currently sets `variable = occurrence` and `occurrence = <param>`, which double-counts under the real formula. Rebalance so the param is the **coefficient** (`variable`), `occurrence` defaults to **1** (the editable count), and a per-JU `unit_type` can be set. With `occurrence = 1` and `fixed = 0`, every man-day JU total is `variable × 1 + 0 = variable` — identical to today's day value.

- [ ] **Step 1: Update the failing fixture test first**

In `src/fixtures/__tests__/inductors.test.ts`, ADD these cases inside the existing `describe('inductor fixtures …')` block (keep the existing 3 tests):

```ts
  it('every JU has occurrence defaulting to 1 (count) and a numeric variable coefficient', () => {
    const jus = INDUCTORS.flatMap((i) => i.crans.flatMap((c) => c.jus));
    for (const ju of jus) {
      expect(ju.occurrence).toBe(1);
      expect(typeof ju.variable).toBe('number');
      expect(ju.variable).toBeGreaterThan(0);
    }
  });

  it('covers bench_hours and kilometres unit types (not only man_day)', () => {
    const units = new Set(INDUCTORS.flatMap((i) => i.crans.flatMap((c) => c.jus)).map((j) => j.unit_type));
    expect(units.has('man_day')).toBe(true);
    expect(units.has('bench_hours')).toBe(true);
    expect(units.has('kilometres')).toBe(true);
  });
```

- [ ] **Step 2: Run it, expect FAIL** (occurrence is not 1 yet; no BH/KM)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/fixtures/__tests__/inductors.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rebalance the `ju()` helper**

In `src/fixtures/inductors.ts`, replace the helper (lines 3-17) with one whose 3rd param is the `variable` coefficient, `occurrence` defaults to 1, and `unit_type` is settable:

```ts
const ju = (
  id: string,
  name: string,
  variable: number,
  metier: Metier = 'H-DESIGN',
  fixed = 0,
  unit_type: JU['unit_type'] = 'man_day',
): JU => ({
  id, name, long_name: name,
  variable, fixed, unit_type,
  occurrence: 1,
  occurrence_locked: false, fmm: '', smm: '', dmm: '',
  generic_profile: '', custom: false, metier,
});
```

(The existing positional calls `ju('id', 'name', 1.5)` and `ju('id', 'name', 1.5, 'H-SOFTWARE')` keep working — the 3rd arg, previously "occurrence", is now `variable` with the same numeric value, so every man-day total is unchanged.)

- [ ] **Step 4: Mark some JUs as bench_hours / kilometres**

Give the QA/testing inductor bench-hours JUs and the mobile inductor a kilometres JU (illustrative engineering units). In `src/fixtures/inductors.ts`, update the `ind-9` (E2E test cases) and `ind-10` (Mobile views) JU calls to pass the `unit_type` arg (note the positional `fixed` arg before it — pass `0`):

For `ind-9` crans, change its JUs to bench_hours, e.g.:
```ts
        ju('ju-9-1-1', 'QA-SE01 Selenium framework setup', 1.0, 'H-TESTING', 0, 'bench_hours'),
        ju('ju-9-1-2', 'QA-SE02 Test case implementation', 0.5, 'H-TESTING', 0, 'bench_hours'),
```
(apply the same `, 0, 'bench_hours'` to all four `ind-9` JUs across its two crans.)

For `ind-10`'s second cran, make one JU kilometres (road-test mileage), e.g.:
```ts
        ju('ju-10-2-2', 'MOB-R02 Field road test', 2.0, 'H-CUSTOMER', 0, 'kilometres'),
```
Leave the other `ind-10` JUs as man_day. (Read the file first to copy the exact existing JU ids/names; only append the `, 0, '<unit>'` args — do not change ids/names/coefficients.)

- [ ] **Step 5: Run fixture test (PASS) + calc test still green + full suite + tsc**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/fixtures/__tests__/inductors.test.ts   # PASS
npx vitest run src/lib/__tests__/calc.test.ts             # PASS (formula intact)
npx tsc -b                                                 # clean
npx vitest run                                             # full suite PASS
```
Man-day totals are unchanged (variable == old occurrence, occurrence == 1), so any totals-based test stays green.

- [ ] **Step 6: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/fixtures/inductors.ts src/fixtures/__tests__/inductors.test.ts
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): rebalance JU fixtures (occurrence=count, variable=coeff) + add BH/KM units (HIW-174 §7/§8)"
```

---

## Task 3: FTE / Bench-Hours / KM formatters

**Files:**
- Modify: `src/lib/format.ts`
- Test: `src/lib/__tests__/format.test.ts` (create)

Phase 3B's right-side totals need unit-aware formatters alongside the existing `formatDays`/`formatKEuro`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatFTE, formatBenchHours, formatKm, formatDays, formatKEuro } from '../format';

describe('unit formatters (HIW-174 §6 totals)', () => {
  it('formats FTE/ETP with one decimal', () => {
    expect(formatFTE(1.234)).toBe('1.2 ETP');
    expect(formatFTE(null)).toBe('—');
  });
  it('formats bench hours', () => {
    expect(formatBenchHours(16)).toBe('16.0 BH');
    expect(formatBenchHours(null)).toBe('—');
  });
  it('formats kilometres', () => {
    expect(formatKm(20.5)).toBe('20.5 km');
    expect(formatKm(null)).toBe('—');
  });
  it('keeps existing day and k€ formatters', () => {
    expect(formatDays(6.5)).toBe('6.5 d');
    expect(formatKEuro(0)).toBe('0.0 k€');
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (new formatters missing)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/format.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add the formatters**

Append to `src/lib/format.ts` (keep existing functions):

```ts
export function formatFTE(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)} ETP`;
}

export function formatBenchHours(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)} BH`;
}

export function formatKm(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)} km`;
}
```

- [ ] **Step 4: Run test (PASS) + tsc**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/lib/__tests__/format.test.ts   # PASS
npx tsc -b                                          # clean
npx vitest run                                      # full suite PASS
```

- [ ] **Step 5: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/lib/format.ts src/lib/__tests__/format.test.ts
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): add FTE/Bench-Hours/KM formatters for unit-type totals (HIW-174 §6)"
```

---

## Done criteria for Phase 3A

- `calcEstimationTotals` implements `(Variable × Occurrence) + Fixed` per JU, segregated into man-days / bench-hours / km, with FTE = man-days/209 and `keuro` stub 0; `calcTotalDays` returns man-days.
- JU fixtures rebalanced (`occurrence = 1` count, `variable` = coefficient) with man-day totals unchanged; at least one bench_hours and one kilometres JU exist.
- `formatFTE` / `formatBenchHours` / `formatKm` available.
- `npx tsc -b` clean; `npx vitest run` fully green.

## Phase 3B (next plan, consumes 3A)
- Display Variable / Fixed / Unit Type per JU (tree + flat) and JU total via the formula.
- Single-cran inductor → fixed label (no dropdown); multi-cran dropdown without `— select —` after selection + explicit "Clear selection".
- Preload all inductors on panel open when no prior estimation.
- Right-side totals → Total ETPs / Total Bench Hours / Total KMs / Total K€ (reading `calcEstimationTotals`); remove the yearly-distribution bar chart.
- Custom JU model → `{ name, variable, fixed, occurrence }` + form redesign (calc's custom handling updates from `days` to the formula then).
- Verify the existing "No workload standard" message + Custom-JU-only save path.
