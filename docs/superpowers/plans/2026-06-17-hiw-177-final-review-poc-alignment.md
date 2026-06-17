# Final Review POC Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Final Review detailed table with the POC tree-grid (single hierarchical Name column + reduced metric columns) and disable both download buttons.

**Architecture:** `PLGroupedTable` is rewritten into a collapsible tree-grid driven by the existing `buildPlTree` aggregation (Métier → Société → Cost Type leaf). The per-PL accordion shell and PL search bar are unchanged. Download buttons (global CSV in `FinalReviewPage`, per-PL XLSX in `PLAccordion`) are rendered `disabled` with an explanatory tooltip; the export libraries are left intact.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + React Testing Library, lucide-react, Tailwind. Strict TDD mode is active — test first, run it red, implement, run it green, commit.

**Spec:** `docs/superpowers/specs/2026-06-17-hiw-177-final-review-poc-alignment-design.md`

**Out of scope (already satisfied in `main` — see spec):** Send Stage 3 role restriction (KO #2) and scroll+search. Do **not** touch `src/fixtures/roles.ts` or its tests.

---

## File Structure

- **Modify** `src/i18n/types.ts` — add `colName` and `exportDisabledHint` keys to the `finalReview` interface block.
- **Modify** `src/i18n/es.ts` / `src/i18n/en.ts` — add the two new key translations.
- **Rewrite** `src/components/finalReview/PLGroupedTable.tsx` — tree-grid component.
- **Rewrite** `src/components/finalReview/__tests__/PLGroupedTable.test.tsx` — tree-grid tests.
- **Modify** `src/components/finalReview/PLAccordion.tsx` — disable the per-PL XLSX button.
- **Create** `src/components/finalReview/__tests__/PLAccordion.test.tsx` — assert XLSX button disabled.
- **Modify** `src/pages/FinalReviewPage.tsx` — disable the global CSV button.
- **Create** `src/pages/__tests__/FinalReviewPage.export.test.tsx` — assert CSV button disabled.

Notes that constrain the code:
- `tsconfig.app.json` has `noUnusedLocals` + `noUnusedParameters` = true. Keep `onClick`/`onExport` wired (a `disabled` button never fires them) so no symbol becomes unused. Do **not** delete the export-lib imports.
- Default test language is English (verified: existing tests assert `PL total`, not `Total PL`).
- The `Button` component (`src/components/shared/Button.tsx`) spreads `...rest`, so `disabled` and `title` pass straight through to the `<button>`.

---

## Task 1: Add i18n keys (`colName`, `exportDisabledHint`)

**Files:**
- Modify: `src/i18n/types.ts:158-186` (finalReview block)
- Modify: `src/i18n/es.ts:143-171`
- Modify: `src/i18n/en.ts:143-171`

This is a mechanical, type-checked change with no unit test. It must land first because Task 2/3/4 reference these keys.

- [ ] **Step 1: Add the keys to the type interface**

In `src/i18n/types.ts`, inside the `finalReview: { ... }` block, add these two lines right after `colMetier: string;` (line 163):

```ts
    colName: string;
    exportDisabledHint: string;
```

- [ ] **Step 2: Add the Spanish translations**

In `src/i18n/es.ts`, inside the `finalReview: { ... }` block, add right after `colMetier: 'Métier',` (line 148):

```ts
    colName: 'Nombre',
    exportDisabledHint: 'Descarga deshabilitada en el prototipo',
```

- [ ] **Step 3: Add the English translations**

In `src/i18n/en.ts`, inside the `finalReview: { ... }` block, add right after `colMetier: 'Metier',` (line 148):

```ts
    colName: 'Name',
    exportDisabledHint: 'Download disabled in the prototype',
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors. (The keys are not yet used; adding them to all three files keeps `es`/`en` structurally matching `types`.)

- [ ] **Step 5: Commit**

```bash
git add src/i18n/types.ts src/i18n/es.ts src/i18n/en.ts
git commit -m "feat(final-review): add colName + exportDisabledHint i18n keys (HIW-177)"
```

---

## Task 2: Rewrite PLGroupedTable as the POC tree-grid

**Files:**
- Test: `src/components/finalReview/__tests__/PLGroupedTable.test.tsx` (rewrite)
- Modify: `src/components/finalReview/PLGroupedTable.tsx` (rewrite)

Hierarchy: Métier (collapsible) → Société (collapsible) → Cost Type (leaf). Métiers collapsed by default. Columns: `Name`, `Total FTE`, `Total K€` (gated by `canViewKeuro`), `FTE {year}`, `K€ {year}` (gated). Parenthesised counts = number of cost-type leaf rows in the subtree (société = its `costTypes.length`; métier = sum across its sociétés), matching the POC "(n)" reading.

- [ ] **Step 1: Replace the test file**

Overwrite `src/components/finalReview/__tests__/PLGroupedTable.test.tsx` with:

```tsx
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('PLGroupedTable (tree-grid)', () => {
  it('shows métier rows and PL total, with sociétés collapsed by default', () => {
    const [pl] = buildPlTree(
      [mk({ id: 'a' }), mk({ id: 'b', totalFte: 2, fteByYear: { '2025': 2 } })],
      ['2025'],
    );
    render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    expect(screen.getByText('BE (1)')).toBeInTheDocument();        // métier row visible
    expect(screen.getByText(/PL total/i)).toBeInTheDocument();
    expect(screen.getByText('3.00')).toBeInTheDocument();          // métier/PL total FTE 1+2
    expect(screen.queryByText('S1 (1)')).not.toBeInTheDocument();  // société hidden by default
  });

  it('expands métier to reveal société, then société to reveal the cost type leaf', () => {
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    fireEvent.click(screen.getByRole('button', { name: /BE \(1\)/ }));
    expect(screen.getByText('S1 (1)')).toBeInTheDocument();        // société now visible
    fireEvent.click(screen.getByRole('button', { name: /S1 \(1\)/ }));
    expect(screen.getByText('FTE')).toBeInTheDocument();           // cost type leaf
  });

  it('renders the reduced column set and drops the old detail columns', () => {
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Total FTE')).toBeInTheDocument();
    expect(screen.getByText('Total K€')).toBeInTheDocument();
    expect(screen.getByText('FTE 2025')).toBeInTheDocument();
    expect(screen.getByText('K€ 2025')).toBeInTheDocument();
    expect(screen.queryByText('Owner N2')).not.toBeInTheDocument();
    expect(screen.queryByText('JU Code')).not.toBeInTheDocument();
    expect(screen.queryByText('Total BH')).not.toBeInTheDocument();
  });

  it('hides K€ columns when canViewKeuro is false', () => {
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    const { rerender } = render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    expect(screen.getByText('K€ 2025')).toBeInTheDocument();
    rerender(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro={false} />);
    expect(screen.queryByText('K€ 2025')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test — expect red**

Run: `npx vitest run src/components/finalReview/__tests__/PLGroupedTable.test.tsx`
Expected: FAIL (current component renders `Owner N2`/`JU Code` headers, has no chevron buttons, and shows société rows unconditionally).

- [ ] **Step 3: Rewrite the component**

Overwrite `src/components/finalReview/PLGroupedTable.tsx` with:

```tsx
import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useT } from '../../i18n/useT';
import type { MetierNode, PlNode, Subtotal } from '../../lib/finalReviewAggregation';

interface Props {
  pl: PlNode;
  years: string[];
  canViewKeuro: boolean;
}

/** Total cost-type leaf rows under a métier (matches the POC "(n)" count). */
function metierLeafCount(metier: MetierNode): number {
  return metier.societes.reduce((n, s) => n + s.costTypes.length, 0);
}

/** Renders the metric cells: Total FTE, [Total K€], FTE per year, [K€ per year]. */
function MetricCells({
  subtotal,
  years,
  canViewKeuro,
}: {
  subtotal: Subtotal;
  years: string[];
  canViewKeuro: boolean;
}) {
  return (
    <>
      <td className="px-2 py-1 border text-right">{subtotal.totalFte.toFixed(2)}</td>
      {canViewKeuro && (
        <td className="px-2 py-1 border text-right">{subtotal.totalKe.toFixed(0)}</td>
      )}
      {years.map((y) => (
        <td key={`fte-${y}`} className="px-2 py-1 border text-right">
          {(subtotal.fteByYear[y] ?? 0).toFixed(2)}
        </td>
      ))}
      {canViewKeuro &&
        years.map((y) => (
          <td key={`ke-${y}`} className="px-2 py-1 border text-right">
            {(subtotal.keByYear[y] ?? 0).toFixed(0)}
          </td>
        ))}
    </>
  );
}

export function PLGroupedTable({ pl, years, canViewKeuro }: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <table className="min-w-full text-xs border-collapse">
      <thead className="bg-gray-100">
        <tr>
          <th scope="col" className="px-2 py-1 border text-left">{t('finalReview.colName')}</th>
          <th scope="col" className="px-2 py-1 border text-right">{t('finalReview.colTotalFte')}</th>
          {canViewKeuro && (
            <th scope="col" className="px-2 py-1 border text-right">{t('finalReview.colTotalKe')}</th>
          )}
          {years.map((y) => (
            <th scope="col" key={`h-fte-${y}`} className="px-2 py-1 border text-right">{`FTE ${y}`}</th>
          ))}
          {canViewKeuro &&
            years.map((y) => (
              <th scope="col" key={`h-ke-${y}`} className="px-2 py-1 border text-right">{`K€ ${y}`}</th>
            ))}
        </tr>
      </thead>
      <tbody>
        {pl.metiers.map((metierNode) => {
          const mKey = `m:${metierNode.metier}`;
          const mOpen = expanded.has(mKey);
          return (
            <Fragment key={mKey}>
              <tr className="font-semibold bg-gray-50">
                <td className="px-2 py-1 border">
                  <button type="button" className="flex items-center gap-1" onClick={() => toggle(mKey)}>
                    {mOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{`${metierNode.metier} (${metierLeafCount(metierNode)})`}</span>
                  </button>
                </td>
                <MetricCells subtotal={metierNode.subtotal} years={years} canViewKeuro={canViewKeuro} />
              </tr>

              {mOpen &&
                metierNode.societes.map((societeNode) => {
                  const sKey = `${mKey}/s:${societeNode.societe}`;
                  const sOpen = expanded.has(sKey);
                  return (
                    <Fragment key={sKey}>
                      <tr className="bg-white">
                        <td className="px-2 py-1 border">
                          <button
                            type="button"
                            className="flex items-center gap-1 pl-4"
                            onClick={() => toggle(sKey)}
                          >
                            {sOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{`${societeNode.societe} (${societeNode.costTypes.length})`}</span>
                          </button>
                        </td>
                        <MetricCells subtotal={societeNode.subtotal} years={years} canViewKeuro={canViewKeuro} />
                      </tr>

                      {sOpen &&
                        societeNode.costTypes.map((ctNode) => {
                          const cKey = `${sKey}/c:${ctNode.costType}`;
                          return (
                            <tr key={cKey} className="bg-white">
                              <td className="px-2 py-1 border">
                                <span className="pl-12 inline-block">{ctNode.costType}</span>
                              </td>
                              <MetricCells subtotal={ctNode.subtotal} years={years} canViewKeuro={canViewKeuro} />
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
            </Fragment>
          );
        })}

        {/* PL total */}
        <tr className="font-semibold bg-gray-100">
          <td className="px-2 py-1 border">{t('finalReview.plTotal')}</td>
          <MetricCells subtotal={pl.subtotal} years={years} canViewKeuro={canViewKeuro} />
        </tr>
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run the test — expect green**

Run: `npx vitest run src/components/finalReview/__tests__/PLGroupedTable.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/finalReview/PLGroupedTable.tsx src/components/finalReview/__tests__/PLGroupedTable.test.tsx
git commit -m "feat(final-review): POC tree-grid with collapsible Métier→Société→Cost Type (HIW-177)"
```

---

## Task 3: Disable the per-PL XLSX button (PLAccordion)

**Files:**
- Test: `src/components/finalReview/__tests__/PLAccordion.test.tsx` (create)
- Modify: `src/components/finalReview/PLAccordion.tsx:39-51`

- [ ] **Step 1: Write the failing test**

Create `src/components/finalReview/__tests__/PLAccordion.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PLAccordion } from '../PLAccordion';
import { buildPlTree } from '../../../lib/finalReviewAggregation';
import type { AllocationRow } from '../../../types';

const mk = (o: Partial<AllocationRow>): AllocationRow => ({
  id: 'x', plNumber: 'PL1', plName: 'L', metier: 'BE', ownerN2: 'O1', juCode: 'JU1',
  juDescription: 'd', fmmDescription: 'f', organType: '', energy: '', allianceCode: '',
  vehicleCode: '', standardEmissions: '', market: '', totalFte: 1,
  fteByYear: { '2025': 1 }, keByYear: { '2025': 100 }, societe: 'S1', costType: 'FTE',
  fte: 1, keuro: 100, engineerId: 'e', percentage: 100, days: 0, isDirty: false, ...o,
});

describe('PLAccordion', () => {
  it('renders the per-PL Excel export button disabled', () => {
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    render(<PLAccordion pl={pl} years={['2025']} canViewKeuro canExport onExport={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Export Excel/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test — expect red**

Run: `npx vitest run src/components/finalReview/__tests__/PLAccordion.test.tsx`
Expected: FAIL (button is currently enabled).

- [ ] **Step 3: Disable the button**

In `src/components/finalReview/PLAccordion.tsx`, replace the export `<button>` (lines 40-50) so it is disabled with a tooltip. Replace this block:

```tsx
          <button
            type="button"
            className="ml-4 flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 bg-white hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              onExport(pl);
            }}
          >
            <Download size={12} />
            {t('finalReview.exportXlsx')}
          </button>
```

with:

```tsx
          <button
            type="button"
            disabled
            title={t('finalReview.exportDisabledHint')}
            className="ml-4 flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              onExport(pl);
            }}
          >
            <Download size={12} />
            {t('finalReview.exportXlsx')}
          </button>
```

(The `onClick`/`onExport` wiring is kept on purpose: a disabled button never fires it, and removing it would trip `noUnusedParameters` on the `onExport` prop.)

- [ ] **Step 4: Run the test — expect green**

Run: `npx vitest run src/components/finalReview/__tests__/PLAccordion.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/finalReview/PLAccordion.tsx src/components/finalReview/__tests__/PLAccordion.test.tsx
git commit -m "feat(final-review): disable per-PL Excel export button (HIW-177)"
```

---

## Task 4: Disable the global CSV button (FinalReviewPage)

**Files:**
- Test: `src/pages/__tests__/FinalReviewPage.export.test.tsx` (create)
- Modify: `src/pages/FinalReviewPage.tsx:89-96`

Default role is `Engineer`, which has both `view:final-review` and `export:final-review`, so the page renders and the CSV button is present.

- [ ] **Step 1: Write the failing test**

Create `src/pages/__tests__/FinalReviewPage.export.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinalReviewPage } from '../FinalReviewPage';

describe('FinalReviewPage export', () => {
  it('renders the global CSV export button disabled', () => {
    render(<FinalReviewPage />);
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test — expect red**

Run: `npx vitest run src/pages/__tests__/FinalReviewPage.export.test.tsx`
Expected: FAIL (CSV button is currently enabled).

- [ ] **Step 3: Disable the button**

In `src/pages/FinalReviewPage.tsx`, replace the CSV `<Button>` block (lines 90-95). Replace this:

```tsx
            <Button
              variant="secondary"
              onClick={() => exportFinalReviewCsv(approvedLines, allocations, `final-review-${activeCycleId}.csv`)}
            >
              <Download size={14} /> {t('finalReview.exportCsv')}
            </Button>
```

with:

```tsx
            <Button
              variant="secondary"
              disabled
              title={t('finalReview.exportDisabledHint')}
              onClick={() => exportFinalReviewCsv(approvedLines, allocations, `final-review-${activeCycleId}.csv`)}
            >
              <Download size={14} /> {t('finalReview.exportCsv')}
            </Button>
```

(`onClick` and the `exportFinalReviewCsv` import are kept: a disabled button never fires, and dropping the import would trip `noUnusedLocals`.)

- [ ] **Step 4: Run the test — expect green**

Run: `npx vitest run src/pages/__tests__/FinalReviewPage.export.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/FinalReviewPage.tsx src/pages/__tests__/FinalReviewPage.export.test.tsx
git commit -m "feat(final-review): disable global CSV export button (HIW-177)"
```

---

## Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: all tests pass, including the unchanged `src/fixtures/__tests__/roles.test.ts` (Send Stage 3 guard) and `src/lib/__tests__/finalReviewCsv.test.ts` (CSV lib unaffected).

- [ ] **Step 2: Type-check the build**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors (confirms no unused imports/params introduced).

- [ ] **Step 3: SDD kit rule check (sanity, unchanged)**

Run: `pytest node_modules/great-sdd-kit/tests/ -v`
Expected: green — this change is frontend-only and does not touch the Python rules. If pytest is unavailable in the environment, note it and skip; do not treat as a failure of this change.

---

## Self-Review

- **Spec coverage:** Item #1 (table rework + reduced columns) → Tasks 1–2. Item #2 (disable both downloads) → Tasks 3–4. Items #3/#5 → out of scope, verified already-satisfied (Task 5 Step 1 re-confirms the roles guard stays green). No spec requirement is unmapped.
- **Placeholder scan:** No TBD/TODO; every code step shows complete code and exact commands.
- **Type consistency:** `MetierNode`/`PlNode`/`Subtotal` imported from `finalReviewAggregation` match their definitions. `metierLeafCount(metier: MetierNode)` matches the imported type. `MetricCells` prop shape is consistent across all call sites. The `mk` test helper matches `AllocationRow` and is repeated verbatim in both test files. i18n keys `colName`/`exportDisabledHint`/`colTotalFte`/`colTotalKe`/`plTotal`/`exportXlsx`/`exportCsv` all exist after Task 1.
