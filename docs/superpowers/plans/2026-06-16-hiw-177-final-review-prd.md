# HIW-177 Final Review — PRD Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Final Review page from a single métier-aggregate table into the PRD view: a searchable per-Project-Line accordion, each PL showing a grouped table (Métier → Society → Cost Type → Job Unit rows) with 5 levels of subtotals and per-year FTE/K€ (BH/KM stubbed), plus per-PL Excel export. Role gating and global CSV export are already correct and stay as-is.

**Architecture:** Final Review consumes the **HIW-176 allocation data model** (`AllocationRow[]` from `useDataStore().allocations`, joined to approved `ProjectLine`s), NOT the current `byMetier` line aggregate. A new pure aggregation library (`src/lib/finalReviewAggregation.ts`) builds the PL → Métier → Society → Cost Type → JU tree with subtotals; the page renders it as accordions. This keeps all grouping/subtotal logic unit-testable and the React layer thin.

**Tech Stack:** React 19 + TypeScript + Zustand, Vitest + React Testing Library, i18n via `useT()`. New dependency for Excel export (see Decision D3).

**Worktree / branch:** `.claude/worktrees/hiw-177-final-review`, branch `worktree-hiw-177-final-review` (fast-forwarded to `main` @ `49c511f`). Baseline test suite is green.

---

## Current State (verified on correct base)

DONE — do not touch:
- **Req 1 / 8 — Role gating:** `send:stage3` exists, granted to PMO + Admin only (`src/fixtures/roles.ts`); button gated by `can('send:stage3')` (`FinalReviewPage.tsx:86-89`), purely role-based with no coupling to column/sort state. The ticket's "column reorder lets all roles send" bug does **not** exist in this code.
- **Req 7 — Global CSV export:** `src/lib/finalReviewCsv.ts` produces the 13 spec columns (`FR_CSV_COLUMNS`), wired at `FinalReviewPage.tsx:78-84`, tested in `finalReviewCsv.test.ts`. BH/KM/FMM/JU fields are stubbed (`0` / `—`) per FINAL-01.

OPEN — this plan:
- Req 2: per-PL accordion + search bar
- Req 3: within-PL grouping Métier → Society → Cost Type → JU
- Req 4: JU row columns + per-year FTE/K€ (BH/KM stub)
- Req 5: subtotals at 5 levels
- Req 6: per-PL Excel (.xlsx) export

## Design Decisions

- **D1 — Layout = accordion, not tabs.** Per the reviewer comment ("En vez de tabs… cada línea de proyecto… con un desplegable"). One collapsible section per PL; expanding shows that PL's grouped table.
- **D2 — Data source = `AllocationRow[]`.** `useDataStore().allocations.flatMap(a => a.splits)` gives rows carrying `plNumber, plName, metier, ownerN2, societe, costType, juCode, juDescription, fmmDescription, totalFte, fteByYear, keByYear`. Filter to PLs that are `Approved` in the active cycle (same predicate as `approvedLines` in `FinalReviewPage.tsx:31-34`).
- **D3 — Excel library (CONFIRM BEFORE Slice 5):** recommend **SheetJS `xlsx`** (light, browser-friendly Vite build, simple array→sheet). `exceljs` only if styled/merged subtotal rows are required. This is the one external dependency added by this plan.
- **D4 — BH/KM stubbed to `0`.** Not in the data model (FINAL-01), consistent with the existing CSV export. Columns render with `0` so the layout matches the PRD; wire real values when FINAL-01 lands.
- **D5 — Years** come from `Object.keys(row.fteByYear)` (sorted), reusing the allocation convention (`['2025','2026']`).

---

## File Structure

- Create `src/lib/finalReviewAggregation.ts` — pure tree-builder + subtotals (the core; fully TDD).
- Create `src/lib/__tests__/finalReviewAggregation.test.ts`.
- Create `src/components/finalReview/PLAccordion.tsx` — one collapsible PL section.
- Create `src/components/finalReview/PLGroupedTable.tsx` — the Métier→Society→CostType→JU table + subtotal rows for one PL.
- Create `src/components/finalReview/__tests__/PLAccordion.test.tsx`.
- Create `src/lib/finalReviewXlsx.ts` — per-PL `.xlsx` builder (Slice 5).
- Modify `src/pages/FinalReviewPage.tsx` — replace `byMetier` table with search + accordion list; keep header, CSV button, Stage 3 button, stat cards.
- Modify `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/es.ts` — new `finalReview` keys.
- Modify `package.json` — add xlsx lib (Slice 5).

---

## Slice 1 — Aggregation library (pure, TDD)

**Why first:** It is the data backbone for Reqs 3/4/5 and is fully testable without UI or the D1/D3 decisions.

**Files:**
- Create: `src/lib/finalReviewAggregation.ts`
- Test: `src/lib/__tests__/finalReviewAggregation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildPlTree, type PlNode } from '../finalReviewAggregation';
import type { AllocationRow } from '../../types';

const mk = (over: Partial<AllocationRow>): AllocationRow => ({
  id: 'x', plNumber: 'PL1', plName: 'Line 1', metier: 'BE', ownerN2: 'O1',
  juCode: 'JU1', juDescription: 'd', fmmDescription: 'f', organType: '', energy: '',
  allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
  totalFte: 1, fteByYear: { '2025': 1 }, keByYear: { '2025': 100 },
  societe: 'S1', costType: 'FTE', fte: 1, keuro: 100,
  engineerId: 'e', percentage: 100, days: 0, isDirty: false, ...over,
});

describe('buildPlTree', () => {
  it('groups PL → Métier → Society → Cost Type → JU rows', () => {
    const rows = [
      mk({ id: 'a', plNumber: 'PL1', metier: 'BE', societe: 'S1', costType: 'FTE' }),
      mk({ id: 'b', plNumber: 'PL1', metier: 'BE', societe: 'S1', costType: 'FTE' }),
      mk({ id: 'c', plNumber: 'PL2', metier: 'EE', societe: 'S2', costType: 'TC' }),
    ];
    const tree = buildPlTree(rows, ['2025']);
    expect(tree.map((p) => p.plNumber)).toEqual(['PL1', 'PL2']);
    const pl1 = tree[0];
    expect(pl1.metiers).toHaveLength(1);
    expect(pl1.metiers[0].societes[0].costTypes[0].rows).toHaveLength(2);
  });

  it('computes subtotals at every level and a PL total per year', () => {
    const rows = [
      mk({ id: 'a', fteByYear: { '2025': 1 }, keByYear: { '2025': 100 } }),
      mk({ id: 'b', fteByYear: { '2025': 2 }, keByYear: { '2025': 200 } }),
    ];
    const [pl] = buildPlTree(rows, ['2025']);
    expect(pl.subtotal.fteByYear['2025']).toBe(3);
    expect(pl.subtotal.keByYear['2025']).toBe(300);
    expect(pl.metiers[0].subtotal.fteByYear['2025']).toBe(3);
    expect(pl.metiers[0].societes[0].costTypes[0].subtotal.keByYear['2025']).toBe(300);
    // BH/KM stubbed
    expect(pl.subtotal.bhByYear['2025']).toBe(0);
    expect(pl.subtotal.kmByYear['2025']).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/finalReviewAggregation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/finalReviewAggregation.ts`**

```ts
import type { AllocationRow } from '../types';

export interface Subtotal {
  totalFte: number;
  totalKe: number;
  totalBh: number; // stubbed (FINAL-01)
  totalKm: number; // stubbed (FINAL-01)
  fteByYear: Record<string, number>;
  keByYear: Record<string, number>;
  bhByYear: Record<string, number>; // stubbed
  kmByYear: Record<string, number>; // stubbed
}

export interface CostTypeNode { costType: string; rows: AllocationRow[]; subtotal: Subtotal; }
export interface SocieteNode { societe: string; costTypes: CostTypeNode[]; subtotal: Subtotal; }
export interface MetierNode { metier: string; societes: SocieteNode[]; subtotal: Subtotal; }
export interface PlNode { plNumber: string; plName: string; metiers: MetierNode[]; subtotal: Subtotal; }

function emptySubtotal(years: string[]): Subtotal {
  const zero = () => Object.fromEntries(years.map((y) => [y, 0]));
  return {
    totalFte: 0, totalKe: 0, totalBh: 0, totalKm: 0,
    fteByYear: zero(), keByYear: zero(), bhByYear: zero(), kmByYear: zero(),
  };
}

function accumulate(into: Subtotal, row: AllocationRow, years: string[]): void {
  into.totalFte += row.totalFte ?? 0;
  for (const y of years) {
    const fte = row.fteByYear[y] ?? 0;
    const ke = row.keByYear[y] ?? 0;
    into.fteByYear[y] += fte;
    into.keByYear[y] += ke;
    into.totalKe += ke;
    // bh/km remain 0 until FINAL-01
  }
}

function sumChildren(subs: Subtotal[], years: string[]): Subtotal {
  const out = emptySubtotal(years);
  for (const s of subs) {
    out.totalFte += s.totalFte;
    out.totalKe += s.totalKe;
    for (const y of years) {
      out.fteByYear[y] += s.fteByYear[y];
      out.keByYear[y] += s.keByYear[y];
    }
  }
  return out;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    (m.get(k) ?? m.set(k, []).get(k)!).push(it);
  }
  return m;
}

/** Build the PL → Métier → Society → Cost Type → JU tree with subtotals at each level. */
export function buildPlTree(rows: AllocationRow[], years: string[]): PlNode[] {
  const plMap = groupBy(rows, (r) => r.plNumber);
  const pls: PlNode[] = [];
  for (const [plNumber, plRows] of plMap) {
    const metierMap = groupBy(plRows, (r) => r.metier);
    const metiers: MetierNode[] = [];
    for (const [metier, mRows] of metierMap) {
      const socMap = groupBy(mRows, (r) => r.societe ?? '—');
      const societes: SocieteNode[] = [];
      for (const [societe, sRows] of socMap) {
        const ctMap = groupBy(sRows, (r) => r.costType);
        const costTypes: CostTypeNode[] = [];
        for (const [costType, cRows] of ctMap) {
          const sub = emptySubtotal(years);
          cRows.forEach((r) => accumulate(sub, r, years));
          costTypes.push({ costType, rows: cRows, subtotal: sub });
        }
        societes.push({ societe, costTypes, subtotal: sumChildren(costTypes.map((c) => c.subtotal), years) });
      }
      metiers.push({ metier, societes, subtotal: sumChildren(societes.map((s) => s.subtotal), years) });
    }
    pls.push({
      plNumber, plName: plRows[0].plName, metiers,
      subtotal: sumChildren(metiers.map((m) => m.subtotal), years),
    });
  }
  return pls.sort((a, b) => a.plNumber.localeCompare(b.plNumber));
}

/** Filter a PL tree by a PL number/name search query (case-insensitive). */
export function filterPlTree(tree: PlNode[], query: string): PlNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return tree;
  return tree.filter(
    (p) => p.plNumber.toLowerCase().includes(q) || p.plName.toLowerCase().includes(q),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/finalReviewAggregation.test.ts`
Expected: PASS.

- [ ] **Step 5: Add a filterPlTree test + commit**

Add a small test asserting `filterPlTree(tree, 'PL2')` returns only PL2 and `filterPlTree(tree, '')` returns all. Then:

```bash
git add src/lib/finalReviewAggregation.ts src/lib/__tests__/finalReviewAggregation.test.ts
git commit -m "feat(final-review): PL aggregation tree with 5-level subtotals (HIW-177 Slice 1)"
```

---

## Slice 2 — i18n keys

**Files:** `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/es.ts` (the `finalReview` block).

- [ ] **Step 1:** Add to the `finalReview` interface in `types.ts`:

```ts
  searchPlaceholder: string;
  colSociete: string;
  colCostType: string;
  colOwnerN2: string;
  colJuCode: string;
  colJuDesc: string;
  colFmmDesc: string;
  colTotalFte: string;
  colTotalKe: string;
  colTotalBh: string;
  colTotalKm: string;
  plTotal: string;
  subtotalMetier: string;
  subtotalSociete: string;
  subtotalCostType: string;
  exportXlsx: string;
  noRows: string;
```

- [ ] **Step 2:** Add matching values to `en.ts` and `es.ts` (neutral professional Spanish). Example en: `searchPlaceholder: 'Search PL number or name…'`, `exportXlsx: 'Export Excel (this PL)'`, `plTotal: 'PL total'`. Example es: `searchPlaceholder: 'Buscar número o nombre de PL…'`, `exportXlsx: 'Exportar Excel (este PL)'`, `plTotal: 'Total PL'`.

- [ ] **Step 3:** `npm run typecheck` → PASS (locale/type parity). Commit:

```bash
git commit -am "feat(final-review): i18n keys for grouped view (HIW-177 Slice 2)"
```

---

## Slice 3 — PL grouped table component (Reqs 3, 4) + subtotals (Req 5)

**Files:**
- Create: `src/components/finalReview/PLGroupedTable.tsx`
- Test: `src/components/finalReview/__tests__/PLGroupedTable.test.tsx`

The component receives one `PlNode` + `years` + `canViewKeuro` and renders, inside a single `<table>`:
header row (Métier, Owner N2, Société, Cost Type, FMM Desc, JU Desc, JU Code, Total FTE, Total K€, Total BH, Total KM, then `FTE {y}`, `K€ {y}`, `BH {y}`, `KM {y}` per year), then for each métier → société → cost type: the JU `<tr>` rows, a Cost Type subtotal row, a Société subtotal row, a Métier subtotal row, and finally a PL-total row. K€ columns hidden when `!canViewKeuro`.

- [ ] **Step 1: Write the failing test** — assert JU rows + subtotal rows render with expected values:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PLGroupedTable } from '../PLGroupedTable';
import { buildPlTree } from '../../../lib/finalReviewAggregation';
import type { AllocationRow } from '../../../types';

const mk = (o: Partial<AllocationRow>): AllocationRow => ({
  id: 'x', plNumber: 'PL1', plName: 'L', metier: 'BE', ownerN2: 'O1', juCode: 'JU1',
  juDescription: 'd', fmmDescription: 'f', organType: '', energy: '', allianceCode: '',
  vehicleCode: '', standardEmissions: '', market: '', totalFte: 1,
  fteByYear: { '2025': 1 }, keByYear: { '2025': 100 }, societe: 'S1', costType: 'FTE',
  fte: 1, keuro: 100, engineerId: 'e', percentage: 100, days: 0, isDirty: false, ...o,
});

it('renders JU rows and a PL total row', () => {
  const [pl] = buildPlTree([mk({ id: 'a' }), mk({ id: 'b', totalFte: 2, fteByYear: { '2025': 2 } })], ['2025']);
  render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
  expect(screen.getAllByText('JU1').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText(/PL total/i)).toBeInTheDocument();
  expect(screen.getByText('3.00')).toBeInTheDocument(); // total FTE 1+2
});
```

- [ ] **Step 2: Verify it fails** (`npm test -- src/components/finalReview/__tests__/PLGroupedTable.test.tsx`).

- [ ] **Step 3: Implement `PLGroupedTable.tsx`.** Iterate `pl.metiers → societes → costTypes → rows`. Render JU `<tr>` per row using `AllocationRow` fields (BH/KM cells show `0`). After each `costTypes` block render a subtotal `<tr>` (label from `t('finalReview.subtotalCostType')`), then société subtotal, then métier subtotal, then one PL-total row using `pl.subtotal`. Helper to render the numeric cell group (Total FTE/K€/BH/KM + per-year) keeps it DRY. Hide K€ columns when `!canViewKeuro`.

- [ ] **Step 4: Run test** → PASS. Add a test asserting the métier/société/cost-type subtotal rows exist and that K€ columns disappear when `canViewKeuro={false}`.

- [ ] **Step 5: Commit**

```bash
git add src/components/finalReview/PLGroupedTable.tsx src/components/finalReview/__tests__/PLGroupedTable.test.tsx
git commit -m "feat(final-review): grouped JU table with 5-level subtotals (HIW-177 Slice 3)"
```

---

## Slice 4 — PL accordion + search bar, wired into the page (Req 2)

**Files:**
- Create: `src/components/finalReview/PLAccordion.tsx` (+ test)
- Modify: `src/pages/FinalReviewPage.tsx`

- [ ] **Step 1: PLAccordion test (failing)** — a collapsible section showing `plNumber — plName`, collapsed by default, expanding to reveal the `PLGroupedTable`:

```tsx
it('expands to reveal the PL table on click', async () => {
  const user = userEvent.setup();
  const [pl] = buildPlTree([/* one row */], ['2025']);
  render(<PLAccordion pl={pl} years={['2025']} canViewKeuro canExport={false} onExport={() => {}} />);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: new RegExp(pl.plNumber) }));
  expect(screen.getByRole('table')).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement `PLAccordion.tsx`** — `useState` open flag; header button shows `plNumber — plName` + the PL `subtotal` summary (Total FTE / K€) and, when `canExport`, an "Export Excel (this PL)" button (`onExport(pl)`); body renders `<PLGroupedTable>` when open.

- [ ] **Step 3: Rewrite `FinalReviewContent` in `FinalReviewPage.tsx`:**
  - Keep imports/header/CSV button/Stage 3 button/stat cards.
  - Build rows: `const allocRows = useMemo(() => allocations.flatMap(a => a.splits).filter(r => approvedPlNumbers.has(r.plNumber)), [...])` where `approvedPlNumbers` is a Set of `approvedLines` PL numbers.
  - `const years = useMemo(() => [...new Set(allocRows.flatMap(r => Object.keys(r.fteByYear)))].sort(), [allocRows])`.
  - `const tree = useMemo(() => buildPlTree(allocRows, years), [allocRows, years])`.
  - `const [search, setSearch] = useState('')`; `const visible = filterPlTree(tree, search)`.
  - Replace the `byMetier` `<table>` block (`FinalReviewPage.tsx:100-141`) with: a search `<input>` (placeholder `t('finalReview.searchPlaceholder')`) and `visible.map(pl => <PLAccordion key={pl.plNumber} … />)`; show `t('finalReview.noRows')` when empty.
  - `onExport` is a no-op stub until Slice 5.

- [ ] **Step 4: Tests** — `npm test -- src/components/finalReview src/pages/__tests__/finalReview.test.ts` → PASS (update `finalReview.test.ts` if it asserts the old métier table).

- [ ] **Step 5: Commit**

```bash
git add src/components/finalReview/PLAccordion.tsx src/components/finalReview/__tests__/PLAccordion.test.tsx src/pages/FinalReviewPage.tsx src/pages/__tests__/finalReview.test.ts
git commit -m "feat(final-review): per-PL accordion + PL search bar (HIW-177 Slice 4)"
```

---

## Slice 5 — Excel (.xlsx) export per Project Line (Req 6)

**CONFIRM D3 (library) before starting.**

**Files:**
- Modify: `package.json` (add `xlsx`)
- Create: `src/lib/finalReviewXlsx.ts` (+ test for the row-matrix builder)
- Modify: `src/components/finalReview/PLAccordion.tsx` (wire `onExport`), `src/pages/FinalReviewPage.tsx` (provide handler)

- [ ] **Step 1:** `npm install xlsx` (or `exceljs` per D3). Commit the lockfile change separately.

- [ ] **Step 2: Test the pure matrix builder (failing)** — `buildPlSheetMatrix(pl, years)` returns a 2D array: header row, JU rows, and subtotal rows in the same order as on screen, no prototype data. Assert column headers and that a PL-total row is present.

- [ ] **Step 3: Implement `finalReviewXlsx.ts`:** `buildPlSheetMatrix(pl, years)` (pure, tested) + `exportPlToXlsx(pl, years, filename)` which uses `XLSX.utils.aoa_to_sheet(matrix)` → `XLSX.utils.book_new()` → `XLSX.writeFile(wb, filename)` with filename `final-review-${pl.plNumber}.xlsx`, one sheet per file.

- [ ] **Step 4: Wire** `onExport={(pl) => exportPlToXlsx(pl, years, …)}` in the page, passed through `PLAccordion`, gated by `can('export:final-review')`.

- [ ] **Step 5: Tests** → PASS. Commit:

```bash
git add package.json package-lock.json src/lib/finalReviewXlsx.ts src/lib/__tests__/finalReviewXlsx.test.ts src/components/finalReview/PLAccordion.tsx src/pages/FinalReviewPage.tsx
git commit -m "feat(final-review): per-PL Excel export (HIW-177 Slice 5)"
```

---

## Self-Review Checklist

- [ ] Data comes from `AllocationRow[]` (D2), not the old `byMetier` line aggregate.
- [ ] Reqs 1/7/8 untouched and still green.
- [ ] Aggregation tree + subtotals fully unit-tested independent of UI.
- [ ] Accordion default-collapsed; search filters by PL number AND name.
- [ ] K€ columns hidden without `view:k-euro-rates`; BH/KM render `0` (D4) with a code comment citing FINAL-01.
- [ ] i18n parity (`typecheck` green); no hardcoded UI strings added.
- [ ] xlsx export produces one sheet per PL, same grouping + subtotals, no prototype data.

## Final verification

Run: `npm run typecheck && npm test && npm run lint`
Expected: 0 type errors, all tests pass, no new lint errors in touched files.

## Out of scope

- Real Stage 3 / HVT transmission (FINAL-01 blocked — only button visibility matters, already done).
- Real BH/KM values (no data-model field yet — stubbed to `0`).
