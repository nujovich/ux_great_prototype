# HIW-176 Allocation Retest Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the 3 GAP + 4 KO fixes from the HIW-176 retest to the Allocation view (edit TC K€, rate-based K€ recalc, unsaved-changes warning, first-render unresolved highlight, undo fix, split K€ fix, split-slot delete).

**Architecture:** Pure calculation helpers live in `src/lib/allocationCalc.ts`; a new fixture `src/fixtures/societeRates.ts` mirrors the SDD kit rate tables verbatim. UI behavior changes are in the three Allocation components and orchestrated by `AllocationPage.tsx`. The SDD kit is not modified.

**Tech Stack:** React 18 + TypeScript + Vite, Vitest + React Testing Library + `@testing-library/jest-dom`, Tailwind classes. Test runner: `npm test` (vitest run). Kit conformance: `pytest node_modules/great-sdd-kit/tests/ -v`.

**Strict TDD is active.** Every behavior change is preceded by a failing test.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/fixtures/societeRates.ts` *(new)* | Verbatim mirror of kit `FTE_RATES` / `TSA_RATES`. |
| `src/lib/allocationCalc.ts` | Add `recalcKeByRate`, `rowIsUnresolved`. |
| `src/types/index.ts` | Add `originalRow?: AllocationRow` to `Allocation`. |
| `src/fixtures/allocations.ts` | Seed `originalRow` for the pre-split line-2. |
| `src/pages/AllocationPage.tsx` | Recalc on cost-type/societe change; TC edit-vs-create flow; split K€ fix; undo fix. |
| `src/components/allocation/TCPopup.tsx` | Pre-fill from `keByYear`; unsaved-changes warning. |
| `src/components/allocation/SplitModal.tsx` | Per-slot delete (min-2 guard). |
| `src/components/allocation/AllocationGrid.tsx` | Edit-K€ affordance on TC rows; unresolved highlight on first render. |

---

## Task 1: Mirror kit rate tables into a fixture

**Files:**
- Create: `src/fixtures/societeRates.ts`
- Test: `src/fixtures/__tests__/societeRates.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/fixtures/__tests__/societeRates.test.ts
import { describe, it, expect } from 'vitest';
import { FTE_RATES, TSA_RATES } from '../societeRates';

describe('societeRates fixture (mirror of kit §11.1/§11.2)', () => {
  it('mirrors FTE rates for Horse Spain Valladolid', () => {
    expect(FTE_RATES['Horse Spain S.L.-Valladolid']).toEqual({
      '2024': 107, '2025': 106, '2026': 103, '2027': 101,
    });
  });

  it('mirrors FTE rates for Oyak Horse', () => {
    expect(FTE_RATES['Oyak Horse']).toEqual({
      '2024': 100, '2025': 75, '2026': 68, '2027': 69,
    });
  });

  it('mirrors TSA rates for CHENNAI GESC H', () => {
    expect(TSA_RATES['CHENNAI GESC H']).toEqual({
      '2025': 54, '2026': 56.7, '2027': 59.5,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/fixtures/__tests__/societeRates.test.ts`
Expected: FAIL — cannot find module `../societeRates`.

- [ ] **Step 3: Write the fixture**

```typescript
// src/fixtures/societeRates.ts
// Verbatim mirror of great-sdd-kit specs/allocation_specs.py §11.1 (FTE) and §11.2 (TSA).
// When kit rates change, mirror them here deliberately. No automated sync (YAGNI).

export const FTE_RATES: Record<string, Record<string, number>> = {
  'Horse Spain S.L.-Valladolid': { '2024': 107, '2025': 106, '2026': 103, '2027': 101 },
  'Horse Spain S.L.-Seville': { '2024': 107, '2025': 106, '2026': 103, '2027': 101 },
  'Horse Spain S.L.-Madrid': { '2024': 107, '2025': 106, '2026': 103, '2027': 101 },
  'Horse Romania S.A.-Bucarest': { '2024': 100, '2025': 79, '2026': 76, '2027': 74 },
  'Horse Romania S.A.-Titu': { '2024': 100, '2025': 79, '2026': 76, '2027': 74 },
  'Horse Romania S.A.-Pitesti': { '2024': 100, '2025': 79, '2026': 76, '2027': 74 },
  'Horse Brasil S.A.-Curitiba': { '2024': 85, '2025': 87, '2026': 80, '2027': 78 },
  'Oyak Horse': { '2024': 100, '2025': 75, '2026': 68, '2027': 69 },
};

export const TSA_RATES: Record<string, Record<string, number>> = {
  'CHENNAI GESC H': { '2025': 54, '2026': 56.7, '2027': 59.5 },
  GEHEUNG: { '2025': 155, '2026': 162.75, '2027': 170.89 },
  'Ampere/RG': { '2025': 155, '2026': 162.75, '2027': 170.89 },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/fixtures/__tests__/societeRates.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/fixtures/societeRates.ts src/fixtures/__tests__/societeRates.test.ts
git commit -m "feat(allocation): mirror kit FTE/TSA rate tables as fixture"
```

---

## Task 2: `recalcKeByRate` helper

**Files:**
- Modify: `src/lib/allocationCalc.ts`
- Test: `src/lib/__tests__/allocationCalc.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/allocationCalc.test.ts` (add `recalcKeByRate` to the existing import from `../allocationCalc`):

```typescript
import { recalcKeByRate } from '../allocationCalc';

describe('recalcKeByRate', () => {
  it('FTE: K€ = fte × FTE rate per year', () => {
    const result = recalcKeByRate(
      { '2025': 0.5, '2026': 0.5 },
      'Horse Spain S.L.-Valladolid',
      'FTE',
    );
    // 0.5 × 106 = 53 ; 0.5 × 103 = 51.5
    expect(result).toEqual({ '2025': 53, '2026': 51.5 });
  });

  it('TSA: K€ = fte × TSA rate per year', () => {
    const result = recalcKeByRate(
      { '2025': 1, '2026': 1 },
      'CHENNAI GESC H',
      'TSA',
    );
    expect(result).toEqual({ '2025': 54, '2026': 56.7 });
  });

  it('unknown societe → 0 per year', () => {
    expect(recalcKeByRate({ '2025': 1 }, 'Renault SAS-Paris', 'FTE')).toEqual({ '2025': 0 });
  });

  it('null societe (Unassigned) → 0 per year', () => {
    expect(recalcKeByRate({ '2025': 1, '2026': 2 }, null, 'FTE')).toEqual({ '2025': 0, '2026': 0 });
  });

  it('year not in rate table → 0 for that year', () => {
    expect(recalcKeByRate({ '2099': 1 }, 'Oyak Horse', 'FTE')).toEqual({ '2099': 0 });
  });

  it('TC is not rate-based → returns existing zeros (handled by popup elsewhere)', () => {
    expect(recalcKeByRate({ '2025': 0.5 }, 'Oyak Horse', 'TC')).toEqual({ '2025': 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/allocationCalc.test.ts`
Expected: FAIL — `recalcKeByRate` is not exported.

- [ ] **Step 3: Add the implementation**

Add to `src/lib/allocationCalc.ts` (add the import at the top, after the existing `import type` line):

```typescript
import { FTE_RATES, TSA_RATES } from '../fixtures/societeRates';
import type { CostType } from '../types';
```

```typescript
/**
 * Recalculate K€ per year from the societe rate tables (mirror of kit §11.1/§11.2).
 * FTE → fte × FTE_RATES; TSA → fte × TSA_RATES. TC is handled by the popup, not here.
 * Unknown societe / missing year / null societe → 0 (mirrors the kit's `.get(..., 0)`).
 */
export function recalcKeByRate(
  fteByYear: Record<string, number>,
  societe: string | null,
  costType: CostType,
): Record<string, number> {
  const table = costType === 'TSA' ? TSA_RATES : costType === 'FTE' ? FTE_RATES : null;
  const rates = table && societe ? (table[societe] ?? {}) : {};
  return Object.fromEntries(
    Object.entries(fteByYear).map(([year, fte]) => [
      year,
      Math.round(fte * (rates[year] ?? 0) * 100) / 100,
    ]),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/allocationCalc.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/allocationCalc.ts src/lib/__tests__/allocationCalc.test.ts
git commit -m "feat(allocation): add recalcKeByRate helper"
```

---

## Task 3: `rowIsUnresolved` helper

**Files:**
- Modify: `src/lib/allocationCalc.ts`
- Test: `src/lib/__tests__/allocationCalc.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/allocationCalc.test.ts` (add `rowIsUnresolved` to the import; reuse the existing `row()` factory in that file):

```typescript
import { rowIsUnresolved } from '../allocationCalc';

describe('rowIsUnresolved', () => {
  it('is true when societe is null regardless of cost type', () => {
    expect(rowIsUnresolved(row({ societe: null, costType: 'FTE' }))).toBe(true);
    expect(rowIsUnresolved(row({ societe: null, costType: 'TSA' }))).toBe(true);
    expect(rowIsUnresolved(row({ societe: null, costType: 'TC' }))).toBe(true);
  });

  it('is false when a societe is assigned', () => {
    expect(rowIsUnresolved(row({ societe: 'Oyak Horse', costType: 'FTE' }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/allocationCalc.test.ts`
Expected: FAIL — `rowIsUnresolved` is not exported.

- [ ] **Step 3: Add the implementation**

Add to `src/lib/allocationCalc.ts`:

```typescript
/**
 * A row is "unresolved" when it has no societe assigned. Used to flag rows on first
 * render: a blocking error for TSA/TC (ALLOC-BR-06/13), a non-blocking warning for FTE
 * (ALLOC-BR-07). Independent of dirty state.
 */
export function rowIsUnresolved(row: AllocationRow): boolean {
  return row.societe == null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/allocationCalc.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/allocationCalc.ts src/lib/__tests__/allocationCalc.test.ts
git commit -m "feat(allocation): add rowIsUnresolved helper"
```

---

## Task 4: Recalc K€ on cost-type / societe change

**Files:**
- Modify: `src/pages/AllocationPage.tsx:64-72`
- Test: `src/pages/__tests__/AllocationPage.recalc.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/__tests__/AllocationPage.recalc.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — K€ recalc on cost-type/societe change', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO'); // can edit + view K€
  });

  it('recomputes K€ from the rate table when a known societe is assigned on an FTE row', async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // Row alloc-1-a is FTE, fteByYear {2025:0.5, 2026:0.5}. Assign Oyak Horse (FTE rate 75/68).
    const societeSelect = screen.getByLabelText('Société for alloc-1-a');
    await user.selectOptions(societeSelect, 'Oyak Horse');

    // K€ cells for this row should now read 0.5×75=38 (2025) and 0.5×68=34 (2026), rounded.
    const row = societeSelect.closest('tr')!;
    const cells = within(row).getAllByRole('cell').map((c) => c.textContent);
    expect(cells).toContain('38');
    expect(cells).toContain('34');
  });
});
```

> Note: `Oyak Horse` must be selectable. If it is not in `SOCIETES`, this test will fail at `selectOptions`; in that case add `Oyak Horse` to `src/fixtures/societes.ts` in this task so a rate-backed societe is demonstrable. Confirm the current `SOCIETES` contents before running and adjust the chosen societe to one present in both `SOCIETES` and `FTE_RATES`, or extend `SOCIETES`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/__tests__/AllocationPage.recalc.test.tsx`
Expected: FAIL — K€ still shows the seeded 425 (no recalc).

- [ ] **Step 3: Implement recalc in the change handlers**

In `src/pages/AllocationPage.tsx`, add `recalcKeByRate` to the import from `../lib/allocationCalc`, then replace the two handlers (lines 64-72):

```typescript
  // Inline cell changes
  const handleChangeSociete = (rowId: string, societe: string) => {
    const next = societe || null;
    const target = displayRows.find((r) => r.id === rowId);
    if (target && target.costType !== 'TC') {
      updateRow(rowId, {
        societe: next,
        keByYear: recalcKeByRate(target.fteByYear, next, target.costType),
      });
    } else {
      updateRow(rowId, { societe: next });
    }
  };

  const handleChangeCostType = (rowId: string, costType: CostType) => {
    const target = displayRows.find((r) => r.id === rowId);
    if (costType === 'TC') {
      updateRow(rowId, { costType });
      setTcEditMode('create');
      setTcTarget(target ?? null);
    } else if (target) {
      updateRow(rowId, {
        costType,
        keByYear: recalcKeByRate(target.fteByYear, target.societe, costType),
      });
    } else {
      updateRow(rowId, { costType });
    }
  };
```

> `setTcEditMode` is introduced in Task 8. If implementing Task 4 before Task 8, temporarily omit the `setTcEditMode('create')` line and add it back in Task 8.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/__tests__/AllocationPage.recalc.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AllocationPage.tsx src/pages/__tests__/AllocationPage.recalc.test.tsx src/fixtures/societes.ts
git commit -m "feat(allocation): recalc K€ from rate table on cost-type/societe change"
```

---

## Task 5: Fix split K€ (proportional, not zero)

**Files:**
- Modify: `src/pages/AllocationPage.tsx:91-114`
- Test: `src/pages/__tests__/AllocationPage.split.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/__tests__/AllocationPage.split.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — split K€ is proportional', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('child rows keep proportional K€ instead of 0', async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // alloc-1-a: keByYear {2025:425, 2026:425}. Split 60/40 → child A K€ 2025 = 255.
    const row = screen.getByLabelText('Société for alloc-1-a').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /split/i }));

    const pctInputs = screen.getAllByRole('spinbutton');
    await user.clear(pctInputs[0]);
    await user.type(pctInputs[0], '60');
    await user.clear(pctInputs[1]);
    await user.type(pctInputs[1], '40');

    const dialog = screen.getByRole('dialog');
    const selects = within(dialog).getAllByRole('combobox');
    await user.selectOptions(selects[0], 'Renault SAS-Paris');
    await user.selectOptions(selects[1], 'RNBV-Amsterdam');

    await user.click(within(dialog).getByRole('button', { name: /confirm/i }));

    // First child K€ 2025 = 425 × 0.6 = 255 (not 0).
    const grid = screen.getByText('Renault SAS-Paris').closest('tr')!;
    const cells = within(grid).getAllByRole('cell').map((c) => c.textContent);
    expect(cells).toContain('255');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/__tests__/AllocationPage.split.test.tsx`
Expected: FAIL — child K€ is `0`.

- [ ] **Step 3: Implement the fix**

In `src/pages/AllocationPage.tsx` `handleSplitConfirm`, compute child K€ proportionally (matching the modal's live preview) and use it instead of the zero map:

```typescript
  const handleSplitConfirm = (slots: Array<{ societe: string; percentage: number }>) => {
    if (!splitTarget) return;
    const pcts = slots.map((s) => s.percentage);
    const childFteByYear = splitFteProportional(splitTarget.fteByYear, pcts);
    const childKeByYear = splitFteProportional(splitTarget.keByYear, pcts);
    const children: AllocationRow[] = slots.map((slot, i) => ({
      ...splitTarget,
      id: `${splitTarget.id}-split-${i}`,
      societe: slot.societe || null,
      percentage: slot.percentage,
      fteByYear: childFteByYear[i],
      keByYear: childKeByYear[i],
      isSplitChild: true,
      splitParentId: splitTarget.id,
      isDirty: true,
    }));
    setDisplayRows((prev) => {
      const idx = prev.findIndex((r) => r.id === splitTarget.id);
      return [...prev.slice(0, idx), ...children, ...prev.slice(idx + 1)];
    });
    setSplitTarget(null);
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/__tests__/AllocationPage.split.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AllocationPage.tsx src/pages/__tests__/AllocationPage.split.test.tsx
git commit -m "fix(allocation): split children keep proportional K€ (ALLOC-BR-23)"
```

---

## Task 6: Fix Undo for pre-split fixture rows

**Root cause:** fixture children `alloc-2-a/b` carry `splitParentId: 'alloc-2-orig'`, but no row with that id exists in the store, so `handleUndoSplit` finds no `original` and returns without doing anything. Fix: store the original pre-split row on the `Allocation` and fall back to it.

**Files:**
- Modify: `src/types/index.ts` (add `originalRow?` to `Allocation`)
- Modify: `src/fixtures/allocations.ts` (seed `originalRow` for line-2)
- Modify: `src/pages/AllocationPage.tsx:116-132` (undo fallback)
- Test: `src/pages/__tests__/AllocationPage.undo.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/__tests__/AllocationPage.undo.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — undo restores the original pre-split row', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('collapses the two seeded split children back into one row on undo', async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // line-2 starts as two children (Renault SAS / Renault Korea split). Two Undo buttons.
    const undoButtons = screen.getAllByRole('button', { name: /^undo$/i });
    expect(undoButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(undoButtons[0]);

    // After undo, the JU-T-001 thermal campaign appears as a single row again:
    // there is exactly one cell with JU code 'JU-T-001'.
    const juCells = screen.getAllByText('JU-T-001');
    expect(juCells.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/__tests__/AllocationPage.undo.test.tsx`
Expected: FAIL — Undo is a no-op, two `JU-T-001` cells remain.

- [ ] **Step 3a: Add `originalRow` to the `Allocation` type**

In `src/types/index.ts`, extend the `Allocation` interface:

```typescript
export interface Allocation {
  lineId: string;
  splits: AllocationRow[];
  /** Pre-split snapshot used to restore a row on undo (ALLOC-BR-12). */
  originalRow?: AllocationRow;
}
```

- [ ] **Step 3b: Seed `originalRow` on line-2**

In `src/fixtures/allocations.ts`, add `originalRow` to the `line-2` allocation object (the un-split parent that the two children derive from). Add it as a sibling of `splits` in the `line-2` entry:

```typescript
  {
    lineId: 'line-2',
    originalRow: makeRow({
      id: 'alloc-2-orig',
      plNumber: 'PL-002',
      plName: 'Scenic EV Homologation',
      metier: 'H-TESTING',
      ownerN2: 'Zone-EMEA',
      juCode: 'JU-T-001',
      juDescription: 'Thermal Test Campaign',
      societe: 'RNBV-Amsterdam',
      costType: 'FTE',
      percentage: 100,
      days: 209,
      fte: 1.0,
      totalFte: 1.0,
      fteByYear: { '2025': 0.5, '2026': 0.5 },
      keByYear: { '2025': 425, '2026': 425 },
      keuro: 850,
    }),
    splits: [
      // ...existing alloc-2-a and alloc-2-b unchanged...
    ],
  },
```

- [ ] **Step 3c: Add the undo fallback**

In `src/pages/AllocationPage.tsx` `handleUndoSplit`, look up the original from `splits` first, then fall back to the allocation's `originalRow`:

```typescript
  const handleUndoSplit = (rowId: string) => {
    const row = displayRows.find((r) => r.id === rowId);
    if (!row?.splitParentId) return;
    const parentId = row.splitParentId;
    const original =
      allocations.flatMap((a) => a.splits).find((r) => r.id === parentId) ??
      allocations.find((a) => a.originalRow?.id === parentId)?.originalRow;
    if (!original) return;
    setDisplayRows((prev) => {
      const firstChildIdx = prev.findIndex((r) => r.splitParentId === parentId);
      const withoutChildren = prev.filter((r) => r.splitParentId !== parentId);
      return [
        ...withoutChildren.slice(0, firstChildIdx),
        { ...original, isDirty: false, isSplitChild: false },
        ...withoutChildren.slice(firstChildIdx),
      ];
    });
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/__tests__/AllocationPage.undo.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/fixtures/allocations.ts src/pages/AllocationPage.tsx src/pages/__tests__/AllocationPage.undo.test.tsx
git commit -m "fix(allocation): undo restores original pre-split row via originalRow"
```

---

## Task 7: Delete a slot in the Split dialog

**Files:**
- Modify: `src/components/allocation/SplitModal.tsx`
- Test: `src/components/allocation/__tests__/SplitModal.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/allocation/__tests__/SplitModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SplitModal } from '../SplitModal';
import type { AllocationRow } from '../../../types';

function row(): AllocationRow {
  return {
    id: 'r1', engineerId: 'e', percentage: 100, days: 209, fte: 1, keuro: 0,
    societe: null, costType: 'FTE', isDirty: false,
    plNumber: 'PL-1', plName: 'P', metier: 'H-DESIGN', ownerN2: 'Z',
    juCode: 'JU-1', juDescription: '', fmmDescription: '', organType: '', energy: '',
    allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
    totalFte: 1, fteByYear: { '2025': 0.5, '2026': 0.5 }, keByYear: { '2025': 50, '2026': 50 },
  };
}

describe('SplitModal — remove slot', () => {
  it('removes a slot when more than 2 exist, and hides remove at the 2-slot minimum', async () => {
    const user = userEvent.setup();
    render(<SplitModal open row={row()} societeOptions={['A', 'B']} onConfirm={vi.fn()} onClose={vi.fn()} />);

    // Start at 2 slots → no remove buttons (min-2 guard, ALLOC-BR-22).
    expect(screen.queryAllByRole('button', { name: /remove société/i })).toHaveLength(0);

    // Add a third slot → now removable.
    await user.click(screen.getByRole('button', { name: /add société/i }));
    const removeButtons = screen.getAllByRole('button', { name: /remove société/i });
    expect(removeButtons).toHaveLength(3);

    // Remove one → back to 2 slots and no remove buttons.
    await user.click(removeButtons[0]);
    expect(screen.queryAllByRole('button', { name: /remove société/i })).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/allocation/__tests__/SplitModal.test.tsx`
Expected: FAIL — no "Remove société" buttons exist.

- [ ] **Step 3: Implement the remove control**

In `src/components/allocation/SplitModal.tsx`, add a `removeSlot` handler next to `addSlot`:

```typescript
  const removeSlot = (idx: number) =>
    setSlots((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));
```

Add a trailing actions column to the slot table. In the `<thead>` row, after the last `<th>`, add:

```tsx
            <th className="px-2 py-1 border" aria-hidden="true"></th>
```

In the `<tbody>` `slots.map(...)` row, after the last `<td>` (the percentage/preview cells), add:

```tsx
              <td className="px-2 py-1 border text-center">
                {slots.length > 2 && (
                  <button
                    type="button"
                    aria-label={`Remove société ${idx + 1}`}
                    onClick={() => removeSlot(idx)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </td>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/allocation/__tests__/SplitModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/allocation/SplitModal.tsx src/components/allocation/__tests__/SplitModal.test.tsx
git commit -m "feat(allocation): allow removing a slot in the split dialog (min 2)"
```

---

## Task 8: TC popup pre-fill + edit-mode cancel + unsaved-changes warning

**Files:**
- Modify: `src/components/allocation/TCPopup.tsx`
- Modify: `src/pages/AllocationPage.tsx` (add `tcEditMode` state; cancel behavior per mode)
- Test: `src/components/allocation/__tests__/TCPopup.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/allocation/__tests__/TCPopup.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TCPopup } from '../TCPopup';
import type { AllocationRow } from '../../../types';

function tcRow(over: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1', engineerId: 'e', percentage: 100, days: 209, fte: 1, keuro: 0,
    societe: 'Oyak Horse', costType: 'TC', isDirty: false,
    plNumber: 'PL-1', plName: 'P', metier: 'H-DESIGN', ownerN2: 'Z',
    juCode: 'JU-1', juDescription: '', fmmDescription: '', organType: '', energy: '',
    allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
    totalFte: 1, fteByYear: { '2025': 0.5, '2026': 0.5 },
    keByYear: { '2025': 100, '2026': 200 }, ...over,
  };
}

describe('TCPopup', () => {
  it('pre-fills yearly K€ from the row when values already exist', () => {
    render(<TCPopup open row={tcRow()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect((screen.getByLabelText('K€ 2025') as HTMLInputElement).value).toBe('100');
    expect((screen.getByLabelText('K€ 2026') as HTMLInputElement).value).toBe('200');
  });

  it('warns before cancelling when values were changed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TCPopup open row={tcRow({ keByYear: { '2025': 0, '2026': 0 } })} onConfirm={vi.fn()} onCancel={onCancel} />);

    await user.type(screen.getByLabelText('K€ 2025'), '5');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    // A confirmation appears; onCancel not called yet.
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText(/leave without saving/i)).toBeInTheDocument();

    // Confirm discard → onCancel fires.
    await user.click(screen.getByRole('button', { name: /discard/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels immediately when nothing was changed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TCPopup open row={tcRow()} onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/allocation/__tests__/TCPopup.test.tsx`
Expected: FAIL — values initialize to 0, and Cancel calls `onCancel` directly with no warning.

- [ ] **Step 3: Rewrite `TCPopup` to pre-fill and guard cancel**

Replace the body of `src/components/allocation/TCPopup.tsx` with:

```tsx
import { useState } from 'react';
import type { AllocationRow } from '../../types';
import { distributeTcKeByYear } from '../../lib/allocationCalc';
import { Modal } from '../shared/Modal';

interface TCPopupProps {
  open: boolean;
  row: AllocationRow;
  onConfirm: (keByYear: Record<string, number>) => void;
  onCancel: () => void;
}

export function TCPopup({ open, row, onConfirm, onCancel }: TCPopupProps) {
  const years = Object.keys(row.fteByYear).sort();
  const initial = () => Object.fromEntries(years.map((y) => [y, row.keByYear[y] ?? 0]));
  const [totalKe, setTotalKe] = useState(0);
  const [yearlyKe, setYearlyKe] = useState<Record<string, number>>(initial);
  const [touched, setTouched] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  // Reset derived state when the popup (re)opens for a row (render-time pattern).
  const [lastResetKey, setLastResetKey] = useState<string | null>(null);
  const resetKey = open ? `open:${row.id}` : null;
  if (open && resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setTotalKe(0);
    setYearlyKe(initial());
    setTouched(false);
    setConfirmingClose(false);
  }

  const handleTotalChange = (value: number) => {
    setTotalKe(value);
    setYearlyKe(distributeTcKeByYear(value, row.fteByYear));
    setTouched(true);
  };

  const handleYearChange = (year: string, value: number) => {
    setYearlyKe((prev) => ({ ...prev, [year]: value }));
    setTouched(true);
  };

  const requestCancel = () => {
    if (touched) setConfirmingClose(true);
    else onCancel();
  };

  const runningTotal = Object.values(yearlyKe).reduce((a, b) => a + b, 0);
  const canConfirm = !!row.societe;

  return (
    <Modal open={open} title={`TC K€ — ${row.juCode} / ${row.plName}`} onClose={requestCancel}>
      {!row.societe && (
        <p className="text-red-600 text-sm mb-3">
          Societe is required before setting TC K€ (ALLOC-BR-13).
        </p>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="tc-total-ke">
          Total K€
        </label>
        <input
          id="tc-total-ke"
          aria-label="Total K€"
          type="number"
          min={0}
          value={totalKe || ''}
          onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
          className="border rounded px-2 py-1 text-sm w-32"
        />
        <span className="ml-2 text-xs text-gray-500">Pre-fills yearly values by FTE share</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {years.map((year) => (
          <label key={year} className="flex flex-col text-sm gap-1">
            <span>K€ {year}</span>
            <input
              aria-label={`K€ ${year}`}
              type="number"
              min={0}
              value={yearlyKe[year] ?? 0}
              onChange={(e) => handleYearChange(year, parseFloat(e.target.value) || 0)}
              className="border rounded px-2 py-1 text-sm w-28"
            />
          </label>
        ))}
      </div>

      <p className="text-sm text-gray-600 mb-4">{`Running total: ${runningTotal.toFixed(0)} K€`}</p>

      {confirmingClose ? (
        <div className="border-t pt-3">
          <p className="text-sm text-amber-700 mb-3">
            You will leave without saving the entered K€. Discard changes?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmingClose(false)}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Keep editing
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Discard
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <button
            onClick={requestCancel}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!canConfirm}
            onClick={() => onConfirm(yearlyKe)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 4: Add `tcEditMode` to `AllocationPage` so cancel of an edit does not revert cost type**

In `src/pages/AllocationPage.tsx`, add the state and update the TC handlers:

```typescript
  const [tcTarget, setTcTarget] = useState<AllocationRow | null>(null);
  const [tcEditMode, setTcEditMode] = useState<'create' | 'edit'>('create');

  const handleTcConfirm = (keByYear: Record<string, number>) => {
    if (tcTarget) updateRow(tcTarget.id, { keByYear });
    setTcTarget(null);
  };

  const handleTcCancel = () => {
    if (tcTarget && tcEditMode === 'create') {
      // First-time TC: revert costType to its value before the change.
      const original = allocations.flatMap((a) => a.splits).find((r) => r.id === tcTarget.id);
      if (original) updateRow(tcTarget.id, { costType: original.costType, isDirty: false });
    }
    setTcTarget(null);
  };
```

(The `handleChangeCostType` from Task 4 already calls `setTcEditMode('create')` before opening the popup for the TC path. The edit path is wired in Task 9.)

- [ ] **Step 5: Run tests**

Run: `npm test -- src/components/allocation/__tests__/TCPopup.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/allocation/TCPopup.tsx src/pages/AllocationPage.tsx src/components/allocation/__tests__/TCPopup.test.tsx
git commit -m "feat(allocation): TC popup pre-fill + unsaved-changes warning"
```

---

## Task 9: Edit TC K€ from the grid without re-selecting TC

**Files:**
- Modify: `src/components/allocation/AllocationGrid.tsx` (new `onEditTcKe` prop + K€ edit affordance)
- Modify: `src/pages/AllocationPage.tsx` (wire `onEditTcKe` → open popup in edit mode)
- Test: `src/pages/__tests__/AllocationPage.tcEdit.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/__tests__/AllocationPage.tcEdit.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — edit TC K€ from grid', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('opens the TC popup pre-filled when editing an existing TC row', async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // alloc-3-a is TC with keByYear {2025:255, 2026:595}.
    const row = screen.getByLabelText('Société for alloc-3-a').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /edit k€/i }));

    expect((screen.getByLabelText('K€ 2025') as HTMLInputElement).value).toBe('255');
    expect((screen.getByLabelText('K€ 2026') as HTMLInputElement).value).toBe('595');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/__tests__/AllocationPage.tcEdit.test.tsx`
Expected: FAIL — no "Edit K€" button exists.

- [ ] **Step 3a: Add `onEditTcKe` to the grid**

In `src/components/allocation/AllocationGrid.tsx`, add to `AllocationGridProps`:

```typescript
  onEditTcKe: (rowId: string) => void;
```

Add `onEditTcKe` to the destructured props in the component signature. Then, in the K€ cells block (the `canViewKeuro && activeYears.map(...)` `<td>`), render an edit affordance for TC rows. Replace that block with:

```tsx
              {canViewKeuro &&
                activeYears.map((y) => (
                  <td
                    key={`ke-${y}`}
                    className={`px-2 py-1 border text-right ${row.isDirty ? 'text-amber-600' : ''}`}
                  >
                    {(row.keByYear[y] ?? 0).toFixed(0)}
                  </td>
                ))}
              {canViewKeuro && canEdit && (
                <td className="px-2 py-1 border text-center">
                  {row.costType === 'TC' && (
                    <button
                      type="button"
                      aria-label={`Edit K€ for ${row.id}`}
                      onClick={() => onEditTcKe(row.id)}
                      className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100"
                    >
                      Edit K€
                    </button>
                  )}
                </td>
              )}
```

Add the matching header cell in `<thead>`, right after the K€ year headers block:

```tsx
                  {canViewKeuro && canEdit && <th className="px-2 py-1 border">K€</th>}
```

- [ ] **Step 3b: Wire the handler in `AllocationPage`**

In `src/pages/AllocationPage.tsx`, add a handler and pass it to the grid:

```typescript
  const handleEditTcKe = (rowId: string) => {
    setTcEditMode('edit');
    setTcTarget(displayRows.find((r) => r.id === rowId) ?? null);
  };
```

Add the prop to the `<AllocationGrid ... />` usage:

```tsx
          onEditTcKe={handleEditTcKe}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/__tests__/AllocationPage.tcEdit.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/allocation/AllocationGrid.tsx src/pages/AllocationPage.tsx src/pages/__tests__/AllocationPage.tcEdit.test.tsx
git commit -m "feat(allocation): edit TC K€ from grid without re-selecting TC"
```

---

## Task 10: Unresolved highlight on first render

**Files:**
- Modify: `src/components/allocation/AllocationGrid.tsx`
- Test: `src/pages/__tests__/AllocationPage.highlight.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/pages/__tests__/AllocationPage.highlight.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — unresolved rows flagged on first render', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('marks a freshly loaded Unassigned row without any edit', () => {
    render(<AllocationPage />);
    // No fixture row is Unassigned by default; assert the marker class is wired by
    // checking an FTE Unassigned row exists once seeded. Instead, assert the row that
    // is Unassigned on load carries the unresolved marker via its row element.
    const select = screen.getByLabelText('Société for alloc-unassigned');
    const row = select.closest('tr')!;
    expect(row.className).toMatch(/bg-red-50/);
  });
});
```

> The default fixtures assign a societe to every row, so this task adds one Unassigned FTE row to `src/fixtures/allocations.ts` (id `alloc-unassigned`, `societe: null`, `costType: 'FTE'`) to make the first-render warning observable and to match the reviewer's scenario ("Unassigned + FTE should be marked from the start"). Add it under a new or existing `lineId`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/__tests__/AllocationPage.highlight.test.tsx`
Expected: FAIL — no `alloc-unassigned` row and/or no `bg-red-50` on the row.

- [ ] **Step 3a: Seed an Unassigned FTE row**

In `src/fixtures/allocations.ts`, add to the `line-1` `splits` array a second row:

```typescript
      makeRow({
        id: 'alloc-unassigned',
        plNumber: 'PL-001',
        plName: 'Renault R5 EV Platform',
        metier: 'H-SOFTWARE',
        ownerN2: 'Zone-EMEA',
        juCode: 'JU-S-002',
        juDescription: 'Embedded SW Module',
        societe: null,
        costType: 'FTE',
      }),
```

- [ ] **Step 3b: Apply the unresolved highlight at row level on first render**

In `src/components/allocation/AllocationGrid.tsx`, import the helper:

```typescript
import { groupRowsByPl, rowIsUnresolved } from '../../lib/allocationCalc';
```

Change the `<tr>` className (currently `border-b hover:bg-blue-50 ${row.isDirty ? 'bg-amber-50' : ''}`) to compose the unresolved (warning) style independently of dirty:

```tsx
            <tr
              key={row.id}
              className={`border-b hover:bg-blue-50 ${rowIsUnresolved(row) ? 'bg-red-50' : ''} ${
                row.isDirty ? 'ring-1 ring-amber-300' : ''
              }`}
            >
```

> Rationale: `bg-red-50` is the unresolved warning (shown on first render, ALLOC-BR-06/07/13), `ring-amber-300` is the dirty indicator. They compose without masking each other. The societe `<select>` keeps its existing red-border error for TSA/TC.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/__tests__/AllocationPage.highlight.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/allocation/AllocationGrid.tsx src/fixtures/allocations.ts src/pages/__tests__/AllocationPage.highlight.test.tsx
git commit -m "fix(allocation): flag unresolved rows on first render (ALLOC-BR-07)"
```

---

## Task 11: Full regression + conformance

**Files:** none (verification only)

- [ ] **Step 1: Run the full front-end suite**

Run: `npm test`
Expected: all suites PASS, including the pre-existing `AllocationPage.test.tsx`, `allocationCalc.test.ts`, and the new tests.

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Run the SDD kit conformance suite**

Run: `pytest node_modules/great-sdd-kit/tests/ -v`
Expected: all PASS (the kit is untouched; the front mirror matches the oracle).

- [ ] **Step 4: Commit any test-fixture adjustments uncovered by regressions**

If the seeded fixture rows (`alloc-unassigned`, `originalRow`) changed counts in `AllocationPage.test.tsx` (e.g. "select all filtered" count), update those assertions to the new totals and commit:

```bash
git add -A
git commit -m "test(allocation): align existing suite with new seed rows"
```

---

## Self-review notes

- **Spec coverage:** item 1 → Task 9; item 2 → Tasks 1,2,4; item 3 → Task 8; item 4 (KO highlight) → Tasks 3,10; item 5 (KO undo) → Task 6; item 6 (KO split K€) → Task 5; item 7 (KO split delete) → Task 7. Deferred TC number-limit is intentionally absent.
- **Type consistency:** `recalcKeByRate(fteByYear, societe, costType)`, `rowIsUnresolved(row)`, `Allocation.originalRow`, grid prop `onEditTcKe`, and `tcEditMode` are used with identical signatures across tasks.
- **Ordering caveat:** Task 4 references `setTcEditMode` (introduced in Task 8). The plan flags the one-line temporary omission; implementing in numeric order keeps each task green except that single noted line. If executing strictly green-per-task, do Task 8 before Task 4, or include the `useState` for `tcEditMode` in Task 4.
