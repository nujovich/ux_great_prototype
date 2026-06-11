# HIW-174 Phase 3B — Estimation Panel UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **⚠️ GIT SAFETY (every task):** Do NOT run `git checkout`/`switch`/`reset`/`branch`/`stash`. Stay on `main`. Only `git add` + `git commit`. Inspect with read-only `git diff`/`show`/`log`. After each commit confirm its parent is the previous task's commit. (A stray checkout corrupted branch state in Phase 2.)

**Goal:** Surface the PRD Job-Unit model in the Estimation Panel — show Variable / Fixed / Unit Type and the per-JU total via `(Variable × Occurrence) + Fixed`; render single-cran inductors as a fixed label (no dropdown) with an explicit "Clear selection" for multi-cran; preload all inductors on open; replace the right-side summary with Total ETPs / Bench Hours / KMs / K€ (from `calcEstimationTotals`) and remove the yearly-distribution chart; and redesign the Custom JU form to Name / Variable / Fixed / Occurrence.

**Architecture:** Consumes the Phase 3A calc engine. UI changes live in `EstimationPanel.tsx`; each feature is backed by a small pure seam in `src/lib/` (testable without `@testing-library/react`, which is absent): `juTotal(ju, occurrence)`, `shouldShowCranDropdown(cranCount)`, `preloadSelections(inductors)`. Totals read `calcEstimationTotals`. The Custom-JU model change (`{days}` → `{name, variable, fixed, occurrence}`) is a vertical slice touching the type, the calc's custom path, and the form together.

**Tech Stack:** React 19 + Vite + TS, Zustand, Vitest. Métiers `H-*`. Status `Modification Requested`.

**Decisions (from Phase 3 kickoff):** Total K€ = stub `0` with a "calculated in Allocation" hint; BH/KM fixtures exist (3A); preload ALL inductors on open (keep the "Load Inductors" modal to adjust).

**Phase 3A foundation already in place:** `calcEstimationTotals(selections, inductors, customJUs, globalOccurrences): { manDays, fte, benchHours, km, keuro }`; `calcTotalDays` (man-days); `formatFTE`/`formatBenchHours`/`formatKm` (+ existing `formatDays`/`formatKEuro`); JU fixtures rebalanced (`occurrence`=count=1, `variable`=coefficient, some `bench_hours`/`kilometres`).

**Known gap to fix FIRST (final-review of 3A):** the panel's per-JU and per-inductor day display currently shows the raw `occurrence` count, NOT the formula result — inconsistent with the right-side total for crans whose coefficients ≠ 1. Task 1 fixes this.

---

## File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/lib/juTotal.ts` | **NEW** pure `juTotal` + `shouldShowCranDropdown` | testable seams |
| `src/lib/__tests__/juTotal.test.ts` | **NEW** tests | |
| `src/lib/preload.ts` | **NEW** `preloadSelections(inductors)` | testable seam |
| `src/lib/__tests__/preload.test.ts` | **NEW** tests | |
| `src/types/index.ts` | `CustomJU` model | `{id,name,variable,fixed,occurrence}` |
| `src/lib/calc.ts` | custom-JU calc path | use formula; remove dead `calcFTE` |
| `src/lib/__tests__/calc.test.ts` | custom-JU test | update to new model |
| `src/components/estimation/EstimationPanel.tsx` | the panel | JU display, cran UX, preload, totals, custom form |
| `src/i18n/en.ts`,`es.ts`,`types.ts` | labels | new totals/unit/clear keys |

Run: `npx vitest run`; `npx tsc -b`. Baseline at start of 3B: **126 tests passing**.

---

## Task 1: Per-JU formula total + Variable / Fixed / Unit Type display

**Files:**
- Create: `src/lib/juTotal.ts`, `src/lib/__tests__/juTotal.test.ts`
- Modify: `src/components/estimation/EstimationPanel.tsx` (InductorTreeView JU rows + inductor subtotal badge; FlatJUView columns)
- Modify: `src/i18n/en.ts`,`es.ts`,`types.ts` (a `colUnit` label; `colVar`/`colFixed` already exist)

- [ ] **Step 1: Write the failing seam test**

Create `src/lib/__tests__/juTotal.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { juTotal, shouldShowCranDropdown } from '../juTotal';
import type { JU } from '../../types';

const mk = (variable: number, fixed: number): JU => ({
  id: 'j', name: 'j', long_name: 'j', variable, fixed, unit_type: 'man_day',
  occurrence: 1, occurrence_locked: false, custom: false, metier: 'H-DESIGN',
});

describe('juTotal (HIW-174 §8)', () => {
  it('computes (variable × occurrence) + fixed', () => {
    expect(juTotal(mk(2, 0.5), 3)).toBeCloseTo(6.5);
  });
  it('treats missing variable/fixed as 0', () => {
    expect(juTotal({ id: 'x', name: 'x', occurrence: 1, occurrence_locked: false, custom: false, metier: 'H-DESIGN' } as JU, 4)).toBe(0);
  });
});

describe('shouldShowCranDropdown (HIW-174 §7)', () => {
  it('hides the dropdown for a single cran (fixed label)', () => {
    expect(shouldShowCranDropdown(1)).toBe(false);
  });
  it('shows the dropdown for multiple crans', () => {
    expect(shouldShowCranDropdown(2)).toBe(true);
  });
  it('hides for zero crans (no-workload case)', () => {
    expect(shouldShowCranDropdown(0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (module missing)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/juTotal.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create the seam**

Create `src/lib/juTotal.ts`:

```ts
import type { JU } from '../types';

/** Per-JU total in its own unit: (Variable × Occurrence) + Fixed (§8). */
export function juTotal(ju: JU, occurrence: number): number {
  return (ju.variable ?? 0) * occurrence + (ju.fixed ?? 0);
}

/** A single-cran inductor renders a fixed label, not a dropdown (§7). */
export function shouldShowCranDropdown(cranCount: number): boolean {
  return cranCount > 1;
}
```

- [ ] **Step 4: Run the test, expect PASS**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/juTotal.test.ts`
Expected: PASS.

- [ ] **Step 5: Add a unit-column i18n label + a unit formatter map**

`src/i18n/en.ts` `panel` section: add `colUnit: 'Unit',`. `src/i18n/es.ts`: `colUnit: 'Unidad',`. `src/i18n/types.ts` panel type: add `colUnit: string;`.

- [ ] **Step 6: Show Variable / Fixed / Unit + formula total in the JU rows (InductorTreeView)**

In `src/components/estimation/EstimationPanel.tsx`, import `juTotal`:
```ts
import { juTotal } from '../../lib/juTotal';
```
and a small unit formatter helper near the top of the file (module scope):
```ts
import { formatDays, formatKEuro, formatFTE, formatBenchHours, formatKm } from '../../lib/format';
// ...
const UNIT_LABEL: Record<string, string> = {
  man_day: 'MD', bench_hours: 'BH', kilometres: 'km', kiloeuros: 'k€',
};
function formatJuTotal(unit: string | undefined, value: number): string {
  switch (unit) {
    case 'bench_hours': return formatBenchHours(value);
    case 'kilometres': return formatKm(value);
    default: return formatDays(value);
  }
}
```
In `InductorTreeView`, the JU row currently renders the short name, long name, an occurrence `<input>`, and `formatDays(juDays)`. Replace the `juDays` derivation and the days `<span>` so the row shows read-only Variable, Fixed, Unit, the occurrence input, and the formula total. Find the block that begins `const juDays = jo.occurrence;` and the `<span ...>{formatDays(juDays)}</span>` and replace with:
```tsx
              const total = juTotal(ju, jo.occurrence);
              return (
                <div
                  key={ju.id}
                  className={`flex items-center gap-2 border-t border-slate-100 px-3 py-1.5 pl-8 ${jo.locked ? 'bg-amber-50' : 'bg-white'}`}
                >
                  <span className="w-16 font-mono text-[10px] text-slate-400">{ju.name}</span>
                  <span className="flex-1 text-xs text-slate-700">{ju.long_name ?? ju.name}</span>
                  <span className="w-10 text-right text-[10px] text-slate-400" title="Variable">{(ju.variable ?? 0).toFixed(1)}</span>
                  <span className="w-10 text-right text-[10px] text-slate-400" title="Fixed">{(ju.fixed ?? 0).toFixed(1)}</span>
                  <span className="w-8 text-center text-[9px] uppercase text-slate-400" title={ju.unit_type}>{UNIT_LABEL[ju.unit_type ?? 'man_day']}</span>
                  <input
                    type="number"
                    min={0}
                    value={jo.occurrence}
                    onChange={(e) => onUpdateJUOccurrence(sel.inductorId, ju.id, Math.max(0, Number(e.target.value) || 0))}
                    disabled={!canEdit}
                    className={`w-12 rounded border px-1.5 py-0.5 text-right text-xs focus:outline-none disabled:opacity-60 ${
                      jo.locked ? 'border-amber-400 bg-amber-50 focus:border-amber-500' : 'border-blue-200 bg-blue-50 focus:border-brand-400'
                    }`}
                  />
                  <span className="w-14 text-right text-[10px] font-semibold text-brand-700 font-mono">{formatJuTotal(ju.unit_type, total)}</span>
                  {canEdit && (
                    <button
                      onClick={() => onToggleJULock(sel.inductorId, ju.id)}
                      className={`rounded p-0.5 text-xs transition-colors ${jo.locked ? 'text-amber-600' : 'text-slate-300 hover:text-slate-500'}`}
                      title={jo.locked ? t('panel.unlockTitle') : t('panel.lockTitle')}
                    >
                      <Lock size={12} />
                    </button>
                  )}
                </div>
              );
```
(The min was changed from 1 to 0 to allow zero occurrence, BR-13.)

- [ ] **Step 7: Fix the per-inductor subtotal badge to use the formula (man-day bucket)**

In `InductorTreeView`, the inductor header computes `indDays` by summing `jo.occurrence`. Replace that reduce so it sums the formula total of the cran's **man_day** JUs (the badge is a man-day subtotal; BH/KM show in the right panel):
```ts
        const indDays = cranJUs.reduce((acc, ju) => {
          if ((ju.unit_type ?? 'man_day') !== 'man_day') return acc;
          const jo = sel.juOccurrences.find((o) => o.juId === ju.id);
          const occ = jo?.occurrence ?? ju.occurrence;
          return acc + juTotal(ju, occ);
        }, 0);
```
(Leave the JSX that renders `indDays` via `formatDays` as-is.)

- [ ] **Step 8: Add Variable / Fixed / Unit columns to FlatJUView**

In `FlatJUView`, the header row renders `colShort`, `colJobUnit`, `colInductorCran`, `colOcc`, `colDays`. Insert `colVar`, `colFixed`, `colUnit` headers before `colOcc`, and in each row render `(ju.variable ?? 0).toFixed(1)`, `(ju.fixed ?? 0).toFixed(1)`, `UNIT_LABEL[ju.unit_type ?? 'man_day']`, and change the per-row days cell to `formatJuTotal(ju.unit_type, juTotal(ju, jo.occurrence))`. (Match the existing `<th>`/`<td>` styling; `colVar`/`colFixed` i18n keys already exist, `colUnit` added in Step 5.)

- [ ] **Step 9: Verify + commit**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/lib/__tests__/juTotal.test.ts   # PASS
npx tsc -b                                          # clean
npx vitest run                                      # full suite green (126 + juTotal tests)
git -C /home/nujovich/ux_great_prototype add src/lib/juTotal.ts src/lib/__tests__/juTotal.test.ts src/components/estimation/EstimationPanel.tsx src/i18n/
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): show JU Variable/Fixed/Unit + formula total in panel (HIW-174 §8)"
```
Confirm parent is the 3B base commit.

---

## Task 2: Single-cran fixed label + Clear selection + no empty option after selection

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx` (InductorTreeView cran selector)
- Modify: `src/i18n/en.ts`,`es.ts`,`types.ts` (`clearCran` label)

`shouldShowCranDropdown` (Task 1 seam) decides label vs dropdown. The current cran selector is a `<select>` with a `<option value="">{t('panel.selectCran')}</option>` empty option always present.

- [ ] **Step 1: Add the Clear-selection i18n**

`en.ts` panel: `clearCran: 'Clear',`. `es.ts` panel: `clearCran: 'Limpiar',`. `types.ts` panel: `clearCran: string;`.

- [ ] **Step 2: Replace the cran selector block**

In `InductorTreeView`, import `shouldShowCranDropdown` (from `../../lib/juTotal`) at the top of the file. Find the cran selector — the `<span>{t('panel.cranLabel')}</span>` + `<select value={sel.selectedCranId ?? ''} ...>` block — and replace it with: a fixed label when there is exactly one cran, otherwise a dropdown that (a) omits the empty `— select —` option once a cran is selected, and (b) shows a "Clear" button when a cran is selected:

```tsx
              <span className="text-[10px] text-slate-400">{t('panel.cranLabel')}</span>
              {!shouldShowCranDropdown(availableCrans.length) ? (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  {availableCrans[0]?.name ?? '—'}
                </span>
              ) : (
                <>
                  <select
                    value={sel.selectedCranId ?? ''}
                    onChange={(e) => e.target.value && onSelectCran(sel.inductorId, e.target.value)}
                    disabled={!canEdit}
                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs focus:border-brand-400 focus:outline-none disabled:bg-slate-50"
                  >
                    {!sel.selectedCranId && <option value="">{t('panel.selectCran')}</option>}
                    {availableCrans.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {canEdit && sel.selectedCranId && (
                    <button
                      onClick={() => onClearCran(sel.inductorId)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                    >
                      {t('panel.clearCran')}
                    </button>
                  )}
                </>
              )}
```
For a single-cran inductor, auto-selecting the only cran is desirable so its JUs load. In the `selectCran` effect or on render, when `availableCrans.length === 1 && !sel.selectedCranId && canEdit`, call `onSelectCran(sel.inductorId, availableCrans[0].id)` once — implement by adding, right after `const cranJUs = …` in the map body, a guarded effect-free auto-select is risky; instead handle it in the preload/selectCran path: in Task 3's `preloadSelections`, pre-select the cran for single-cran inductors (see Task 3 Step 3). For already-open multi-cran lines this block is sufficient.

- [ ] **Step 3: Add the `onClearCran` handler + thread the prop**

In `EstimationPanel`, add a handler that resets a selection's cran and JU occurrences:
```ts
const clearCran = useCallback((inductorId: string) => {
  setSelections((prev) => prev.map((sel) =>
    sel.inductorId === inductorId ? { ...sel, selectedCranId: null, juOccurrences: [] } : sel,
  ));
}, []);
```
Add `onClearCran: (inductorId: string) => void;` to `TreeProps` and pass `onClearCran={clearCran}` where `<InductorTreeView .../>` is rendered.

- [ ] **Step 4: Verify + commit**

```bash
cd /home/nujovich/ux_great_prototype
npx tsc -b            # clean
npx vitest run        # full suite green
git -C /home/nujovich/ux_great_prototype add src/components/estimation/EstimationPanel.tsx src/i18n/
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): single-cran fixed label + Clear selection, no empty option after select (HIW-174 §7)"
```
Confirm parent is Task 1's commit.

---

## Task 3: Preload all inductors on panel open

**Files:**
- Create: `src/lib/preload.ts`, `src/lib/__tests__/preload.test.ts`
- Modify: `src/components/estimation/EstimationPanel.tsx` (the open `useEffect`)

- [ ] **Step 1: Write the failing seam test**

Create `src/lib/__tests__/preload.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { preloadSelections } from '../preload';
import type { PrototypeInductor } from '../../types';

const ind = (id: string, cranIds: string[]): PrototypeInductor => ({
  id, name: id, category: 'X',
  crans: cranIds.map((cid) => ({ id: cid, name: cid, jus: [] })),
});

describe('preloadSelections (HIW-174 additional comment)', () => {
  it('creates one selection per inductor with no cran for multi/zero-cran inductors', () => {
    const sels = preloadSelections([ind('i1', ['a', 'b']), ind('i2', [])]);
    expect(sels.map((s) => s.inductorId)).toEqual(['i1', 'i2']);
    expect(sels[0].selectedCranId).toBeNull();
    expect(sels[1].selectedCranId).toBeNull();
  });
  it('auto-selects the sole cran for single-cran inductors and seeds its JU occurrences', () => {
    const single = ind('i3', ['only']);
    single.crans[0].jus = [{ id: 'j1', name: 'j1', long_name: 'j1', variable: 1, fixed: 0, unit_type: 'man_day', occurrence: 1, occurrence_locked: false, custom: false, metier: 'H-DESIGN' }];
    const [sel] = preloadSelections([single]);
    expect(sel.selectedCranId).toBe('only');
    expect(sel.juOccurrences).toEqual([{ juId: 'j1', occurrence: 1, locked: false }]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/preload.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Create the seam**

Create `src/lib/preload.ts`:

```ts
import type { InductorSelection, PrototypeInductor } from '../types';

/**
 * Preload one selection per inductor (HIW-174: inductors appear already loaded).
 * Single-cran inductors auto-select their only cran and seed JU occurrences (§7);
 * multi-cran and zero-cran inductors start with no cran.
 */
export function preloadSelections(inductors: PrototypeInductor[]): InductorSelection[] {
  return inductors.map((ind) => {
    if (ind.crans.length === 1) {
      const cran = ind.crans[0];
      return {
        inductorId: ind.id,
        selectedCranId: cran.id,
        inductorOccurrence: 1,
        juOccurrences: cran.jus.map((ju) => ({ juId: ju.id, occurrence: ju.occurrence, locked: false })),
      };
    }
    return { inductorId: ind.id, selectedCranId: null, inductorOccurrence: 1, juOccurrences: [] };
  });
}
```

- [ ] **Step 4: Run the test, expect PASS**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/preload.test.ts`
Expected: PASS.

- [ ] **Step 5: Use it in the panel's open effect**

In `src/components/estimation/EstimationPanel.tsx`, import `preloadSelections` and `INDUCTORS` (INDUCTORS is already imported). Find the open `useEffect` that sets `setSelections(existing?.inductorSelections ?? [])` and change the selections line so that, when there is no existing estimation, all inductors are preloaded:
```ts
      setSelections(existing?.inductorSelections ?? preloadSelections(INDUCTORS));
```
Leave the rest of the effect unchanged.

- [ ] **Step 6: Verify + commit**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/lib/__tests__/preload.test.ts   # PASS
npx tsc -b                                          # clean
npx vitest run                                      # full suite green
git -C /home/nujovich/ux_great_prototype add src/lib/preload.ts src/lib/__tests__/preload.test.ts src/components/estimation/EstimationPanel.tsx
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): preload all inductors on panel open (HIW-174 §6)"
```
Confirm parent is Task 2's commit.

---

## Task 4: Right-side totals (ETPs / Bench Hours / KMs / K€) + remove yearly chart

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx` (totals computation + summary panel)
- Modify: `src/lib/calc.ts` (remove dead `calcFTE` export)
- Modify: `src/i18n/en.ts`,`es.ts`,`types.ts` (totals labels)

- [ ] **Step 1: Add totals i18n**

`en.ts` panel: add `totalEtp: 'Total ETPs', totalBh: 'Total Bench Hours', totalKm: 'Total KMs', keuroHint: 'Calculated in Allocation',`. `es.ts` panel: `totalEtp: 'Total ETPs', totalBh: 'Total Bench Hours', totalKm: 'Total KMs', keuroHint: 'Se calcula en Allocation',`. `types.ts` panel: add the four `: string` keys. (Keep existing `totalKeuro`; `totalDays`/`yearlyDist` become unused — leave the keys or remove them, but at minimum stop referencing them.)

- [ ] **Step 2: Compute the segregated totals in the panel**

In `EstimationPanel`, replace the `totalDays`/`totalKEuro`/`breakdown` memos with a single totals memo from `calcEstimationTotals`. Find:
```ts
const totalDays = useMemo(() => calcTotalDays(selections, INDUCTORS, customJUs, globalOccurrences), [...]);
const totalKEuro = useMemo(() => (line ? calcKEuro(totalDays, line.metier) : 0), [...]);
const breakdown = useMemo(() => yearlyBreakdown(totalDays), [totalDays]);
```
Replace with:
```ts
import { calcEstimationTotals } from '../../lib/calc';
// ...
const totals = useMemo(
  () => calcEstimationTotals(selections, INDUCTORS, customJUs, globalOccurrences),
  [selections, customJUs, globalOccurrences],
);
const totalDays = totals.manDays; // persisted in the Estimation record on save
```
(Keep a `totalDays` local because the save/persist path stores `Estimation.totalDays`. The `calcKEuro`/`yearlyBreakdown` imports can be dropped if now unused — verify with `tsc`.)

- [ ] **Step 3: Replace the summary panel JSX (4 totals, no chart)**

In the right-side summary, replace the Total-days card, Total-k€ card, and the entire yearly-distribution bar-chart block with four total cards reading `totals`:
```tsx
import { formatFTE, formatBenchHours, formatKm, formatKEuro } from '../../lib/format';
// ...
              <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalEtp')}</div>
                <div className="text-xl font-bold text-slate-900">{formatFTE(totals.fte)}</div>
              </div>
              <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalBh')}</div>
                <div className="text-lg font-bold text-slate-900">{formatBenchHours(totals.benchHours)}</div>
              </div>
              <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalKm')}</div>
                <div className="text-lg font-bold text-slate-900">{formatKm(totals.km)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalKeuro')}</div>
                <div className="text-lg font-bold text-slate-900">{formatKEuro(totals.keuro)}</div>
                <p className="mt-1 text-[9px] text-slate-400">{t('panel.keuroHint')}</p>
              </div>
```
Delete the `breakdown.map(...)` chart block and the legend lines that referenced `yearlyDist`/`legendInherits`/`legendLocked` if they only fed the chart. Keep the global-occurrence input above these cards.

- [ ] **Step 4: Remove the dead `calcFTE` export**

In `src/lib/calc.ts`, delete the standalone `export function calcFTE(...)` (FTE is provided by `calcEstimationTotals().fte`). Confirm nothing imports it: `grep -rn "calcFTE" src/` returns no hits after removal.

- [ ] **Step 5: Verify + commit**

```bash
cd /home/nujovich/ux_great_prototype
npx tsc -b            # clean (fix any now-unused import it flags: calcKEuro/yearlyBreakdown/calcTotalDays)
npx vitest run        # full suite green
git -C /home/nujovich/ux_great_prototype add src/components/estimation/EstimationPanel.tsx src/lib/calc.ts src/i18n/
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): right-side totals ETPs/BH/KM/K€, remove yearly chart (HIW-174 §9)"
```
Confirm parent is Task 3's commit. NOTE: if `yearlyBreakdown` is now unused anywhere, also remove it from `calc.ts`; if a test imports it, update that test.

---

## Task 5: Custom JU model → { name, variable, fixed, occurrence } + form

**Files:**
- Modify: `src/types/index.ts` (`CustomJU`)
- Modify: `src/lib/calc.ts` (custom-JU contribution via formula)
- Modify: `src/lib/__tests__/calc.test.ts` (custom-JU test)
- Modify: `src/components/estimation/EstimationPanel.tsx` (`CustomJUSection`)

- [ ] **Step 1: Update the failing calc test for the new custom model**

In `src/lib/__tests__/calc.test.ts`, replace the custom-JU test so it uses the new model and the formula:
```ts
  it('custom JUs contribute (variable × occurrence) + fixed to man-days', () => {
    const customJUs: CustomJU[] = [{ id: 'c1', name: 'x', variable: 2, fixed: 1, occurrence: 3 }];
    // (2 × 3) + 1 = 7, × global 2 = 14
    expect(calcEstimationTotals([], [], customJUs, 2).manDays).toBeCloseTo(14);
  });
```

- [ ] **Step 2: Run it, expect FAIL** (type + calc still use `days`)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/calc.test.ts`
Expected: FAIL (compile or assertion).

- [ ] **Step 3: Change the `CustomJU` type**

In `src/types/index.ts`, replace:
```ts
export interface CustomJU {
  id: string;
  description: string;
  days: number;
}
```
with:
```ts
export interface CustomJU {
  id: string;
  name: string;
  variable: number;
  fixed: number;
  occurrence: number;
}
```

- [ ] **Step 4: Update the calc custom-JU path**

In `src/lib/calc.ts`, replace `for (const c of customJUs) manDays += c.days;` with:
```ts
  for (const c of customJUs) manDays += (c.variable ?? 0) * c.occurrence + (c.fixed ?? 0);
```

- [ ] **Step 5: Redesign the Custom JU form**

In `CustomJUSection` (in `EstimationPanel.tsx`), the add-default and the per-row inputs use `description`/`days`. Replace:
- the add-default object `{ id: ..., description: '', days: 1 }` → `{ id: \`ju-${Date.now()}\`, name: '', variable: 1, fixed: 0, occurrence: 1 }`;
- the row inputs: a Name text input bound to `ju.name`, then three number inputs bound to `ju.variable`, `ju.fixed`, `ju.occurrence` (each updating via the existing `onChange((j) => j.map(...))` pattern). Show the computed total `formatDays(juTotal({ variable: ju.variable, fixed: ju.fixed } as JU, ju.occurrence))` (import `juTotal`) read-only at the end of the row. Keep the Trash2 delete button and the `canEditCustomJU` gating.

Example row (match existing styling/classes):
```tsx
            <div key={ju.id} className="flex items-center gap-2">
              <input value={ju.name} placeholder={t('panel.customName')} disabled={!canEditCustomJU}
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50" />
              <input type="number" step={0.5} value={ju.variable} disabled={!canEditCustomJU} title={t('panel.colVar')}
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, variable: Number(e.target.value) } : x)))}
                className="w-14 rounded border border-slate-300 px-2 py-1 text-right text-xs disabled:bg-slate-50" />
              <input type="number" step={0.5} value={ju.fixed} disabled={!canEditCustomJU} title={t('panel.colFixed')}
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, fixed: Number(e.target.value) } : x)))}
                className="w-14 rounded border border-slate-300 px-2 py-1 text-right text-xs disabled:bg-slate-50" />
              <input type="number" min={0} value={ju.occurrence} disabled={!canEditCustomJU} title={t('panel.colOcc')}
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, occurrence: Math.max(0, Number(e.target.value) || 0) } : x)))}
                className="w-14 rounded border border-slate-300 px-2 py-1 text-right text-xs disabled:bg-slate-50" />
              <span className="w-14 text-right text-[10px] font-mono text-brand-700">{formatDays(juTotal({ variable: ju.variable, fixed: ju.fixed } as JU, ju.occurrence))}</span>
              {canEditCustomJU && (
                <button onClick={() => onChange((j) => j.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
              )}
            </div>
```
Add i18n `panel.customName` = `'Name'` (en) / `'Nombre'` (es) + types.

- [ ] **Step 6: Check for other `CustomJU` references**

Run `grep -rn "\.days\b\|description:" src/` and `grep -rn "customJUs\|CustomJU" src/` to find any other code using the old `{description, days}` shape (e.g. copy/persist paths in `dataStore`, `CopyEstimationModal`). Update each to the new shape. If `dataStore` fixtures seed custom JUs, migrate them. (Likely none seed custom JUs, but verify.)

- [ ] **Step 7: Verify + commit**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/lib/__tests__/calc.test.ts   # PASS
npx tsc -b                                       # clean (resolve all CustomJU shape errors)
npx vitest run                                   # full suite green
git -C /home/nujovich/ux_great_prototype add src/types/index.ts src/lib/calc.ts src/lib/__tests__/calc.test.ts src/components/estimation/EstimationPanel.tsx src/i18n/
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): Custom JU model Name/Variable/Fixed/Occurrence + formula (HIW-174 §8.5)"
```
Confirm parent is Task 4's commit.

---

## Task 6: Verify "No workload standard" + Custom-JU-only save path

**Files:**
- Modify (if needed): `src/components/estimation/EstimationPanel.tsx` (save-enable logic)

The "No workload standard found" message already exists (`panel.noWorkloadStandard`, shown when a selection's cran is null/empty or yields no JUs). The remaining requirement (BR-11): when no workload standard applies, the engineer can still estimate via Custom JUs, and Save-as-Draft enables once ≥1 valid Custom JU exists.

- [ ] **Step 1: Read the current Save-as-Draft enable condition**

Read `EstimationPanel.tsx` and find the `hasMinimumForDraft` (or the `disabled=` expression on the Save-draft button). Determine whether it already enables on Custom JUs.

- [ ] **Step 2: Ensure Custom-JU-only enables Draft**

If the draft-enable condition does not already account for Custom JUs, update it so Save-as-Draft is enabled when there is at least one inductor with a selected cran **OR** at least one Custom JU with a name and a positive total. Concretely, define:
```ts
const hasAnyCustomJU = customJUs.some((c) => c.name.trim().length > 0);
const hasAnySelection = selections.some((s) => s.selectedCranId);
const hasMinimumForDraft = hasAnySelection || hasAnyCustomJU;
```
and use `hasMinimumForDraft` for the Save-as-Draft button's enabled state (this also implements the §9 "block empty Draft" rule that Phase 4 will formalize — keep it minimal here: enable only when there's something to save).

- [ ] **Step 3: Verify + commit**

```bash
cd /home/nujovich/ux_great_prototype
npx tsc -b            # clean
npx vitest run        # full suite green
git -C /home/nujovich/ux_great_prototype add src/components/estimation/EstimationPanel.tsx
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): allow Custom-JU-only estimation under no-workload-standard (BR-11, HIW-174 §6)"
```
Confirm parent is Task 5's commit. (If Step 1 shows the behavior already exists, mark this task done with no code change and note it.)

---

## Done criteria for Phase 3B

- JU rows (tree + flat) show Variable, Fixed, Unit Type and the per-JU total via `(Variable × Occurrence) + Fixed`; the inductor subtotal badge uses the formula (man-day bucket).
- Single-cran inductors render a fixed label (auto-selected); multi-cran show a dropdown with no `— select —` after a cran is chosen, plus a "Clear" action.
- Opening a line with no prior estimation preloads all inductors (single-cran ones with their cran selected).
- Right-side summary shows Total ETPs / Total Bench Hours / Total KMs / Total K€ (K€ stub 0 with "calculated in Allocation" hint); the yearly-distribution chart is gone.
- Custom JU form is Name / Variable / Fixed / Occurrence and contributes via the formula; `CustomJU` type migrated everywhere; dead `calcFTE` removed.
- Custom-JU-only estimation enables Save-as-Draft under the no-workload-standard state.
- `npx tsc -b` clean; `npx vitest run` fully green (126 + juTotal + preload tests; calc custom test updated).

## Deferred to later phases
- Two-step save in all states, empty-draft block (formalized), pre-save summary (Total FTE/BH/KM annual breakdown, no K€) → **Phase 4**.
- Multi-line compatibility block + error UI, copy (compat + legacy), parent-child → **Phase 5**.
- Custom JU `Unit Type` + FMM fields → future iteration (minimal form only now).
