# Pre-estimation Buttons, Estimation Grouped Table & Compat-mode Gating — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the pre-estimation copy button into two contextual buttons (import legacy when unsaved, copy-from-lines when saved), regroup the estimation review table into per-assignee subtables with subtotals and a top filter bar (Allocation-style), and disable the compatibility-mode selection checkbox for Estimated/Approved lines.

**Architecture:** Extract decision/aggregation logic into pure, unit-tested helpers (`estimationPanelButtons.ts`, `estimationReviewGrouping.ts`); keep React components thin and driven by those helpers. Reuse the existing `CopyEstimationModal` by parametrizing it with a `mode` and an `onApplyLegacy` callback so the legacy path pre-loads the panel's working state instead of persisting. Add an `isSelectable` predicate prop to the shared `ProjectLineGrid`.

**Tech Stack:** React + Vite + TypeScript, Zustand stores, Vitest + React Testing Library, i18n via typed `src/i18n` dictionaries.

**Conventions:**
- Test runner: `npm test` (= `vitest run`). Single file: `npm test -- <path>`.
- After all tasks, also run `pytest node_modules/great-sdd-kit/tests/ -v` to confirm no business-rule regressions (none expected — no rule changes).
- New i18n keys MUST be added to all three of `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/es.ts` or the TS build fails.
- Commit after each task.

---

## File Structure

**Create:**
- `src/lib/estimationPanelButtons.ts` — pure decision: which copy/import button the panel shows.
- `src/lib/__tests__/estimationPanelButtons.test.ts`
- `src/lib/estimationReviewGrouping.ts` — group review rows by assignee + per-group subtotals.
- `src/lib/__tests__/estimationReviewGrouping.test.ts`

**Modify:**
- `src/components/estimation/CopyEstimationModal.tsx` — add `mode` + `onApplyLegacy` props; render a single relevant section per mode.
- `src/components/estimation/EstimationPanel.tsx:526-554,580` — two contextual buttons + legacy pre-load handler.
- `src/pages/EstimationReviewPage.tsx:221-324` — render per-assignee subtables with subtotal rows.
- `src/components/grid/ProjectLineGrid.tsx` — add optional `isSelectable` predicate prop; disable checkbox when false.
- `src/components/pev/CompatibilityGroupSection.tsx` — pass `isSelectable` disabling Estimated/Approved.
- `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/es.ts` — new keys.

**Tests touched:** new unit tests above + a component test for the panel buttons and the grouped table.

---

# CHANGE 1 — Two contextual buttons in the pre-estimation panel

### Task 1: Pure decision helper `panelCopyAction`

**Files:**
- Create: `src/lib/estimationPanelButtons.ts`
- Test: `src/lib/__tests__/estimationPanelButtons.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/estimationPanelButtons.test.ts
import { describe, it, expect } from 'vitest';
import { panelCopyAction } from '../estimationPanelButtons';
import type { Estimation } from '../../types';

const est = { lineId: 'PL-1' } as Estimation;

describe('panelCopyAction', () => {
  it('shows legacy import when unsaved and editable', () => {
    expect(panelCopyAction({ existing: null, canEdit: true, canCopy: true, locked: false }))
      .toBe('legacy');
  });

  it('shows copy-from-lines when a draft already exists', () => {
    expect(panelCopyAction({ existing: est, canEdit: true, canCopy: true, locked: false }))
      .toBe('copy');
  });

  it('shows nothing without the copy capability', () => {
    expect(panelCopyAction({ existing: null, canEdit: true, canCopy: false, locked: false }))
      .toBe('none');
    expect(panelCopyAction({ existing: est, canEdit: true, canCopy: false, locked: false }))
      .toBe('none');
  });

  it('shows nothing when the panel is locked', () => {
    expect(panelCopyAction({ existing: est, canEdit: false, canCopy: true, locked: true }))
      .toBe('none');
  });

  it('shows nothing when unsaved but not editable', () => {
    expect(panelCopyAction({ existing: null, canEdit: false, canCopy: true, locked: false }))
      .toBe('none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/estimationPanelButtons.test.ts`
Expected: FAIL — cannot find module `../estimationPanelButtons`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/estimationPanelButtons.ts
import type { Estimation } from '../types';

export type PanelCopyAction = 'legacy' | 'copy' | 'none';

/**
 * Which contextual copy/import button the pre-estimation panel shows.
 * - Unsaved (no persisted estimation) + editable → import a legacy estimation.
 * - Saved draft (persisted estimation exists) → copy from other project lines.
 * - Locked or missing the copy capability → no button.
 */
export function panelCopyAction(opts: {
  existing: Estimation | null | undefined;
  canEdit: boolean;
  canCopy: boolean;
  locked: boolean;
}): PanelCopyAction {
  const { existing, canEdit, canCopy, locked } = opts;
  if (!canCopy || locked) return 'none';
  if (existing) return 'copy';
  if (canEdit) return 'legacy';
  return 'none';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/estimationPanelButtons.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/estimationPanelButtons.ts src/lib/__tests__/estimationPanelButtons.test.ts
git commit -m "feat(estimation): add panelCopyAction decision helper"
```

---

### Task 2: Add i18n keys for the two buttons + legacy preload toast

**Files:**
- Modify: `src/i18n/types.ts` (the `panel` block), `src/i18n/en.ts:268`, `src/i18n/es.ts` (matching `panel.copyToLines`)

- [ ] **Step 1: Add keys to the typed contract**

In `src/i18n/types.ts`, inside the `panel: { ... }` object (it currently declares `copyToLines: string;` around line 283), add:

```ts
    importLegacy: string;
    copyFromLines: string;
    toastLegacyPreloaded: string;
```

- [ ] **Step 2: Add English values**

In `src/i18n/en.ts`, replace the `copyToLines` line (line 268) with:

```ts
    copyToLines: 'Copy to other lines',
    importLegacy: 'Import legacy estimation',
    copyFromLines: 'Copy from other project lines',
    toastLegacyPreloaded: 'Legacy estimation "{label}" loaded into the form — review and save',
```

- [ ] **Step 3: Add Spanish values**

In `src/i18n/es.ts`, find the `panel.copyToLines` entry and add directly after it:

```ts
    importLegacy: 'Importar estimación legacy',
    copyFromLines: 'Copiar de otras project lines',
    toastLegacyPreloaded: 'Estimación legacy "{label}" cargada en el formulario — revisá y guardá',
```

- [ ] **Step 4: Verify the build type-checks**

Run: `npm test -- src/i18n/__tests__/getT.test.ts`
Expected: PASS (no missing-key type errors; `tsc` in the test build is happy).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(i18n): add pre-estimation legacy/copy button keys"
```

---

### Task 3: Parametrize `CopyEstimationModal` with `mode` + `onApplyLegacy`

The modal currently has two tabs and always persists on confirm. We add a `mode` prop so each entry point shows only the relevant section, and an `onApplyLegacy` callback so the legacy path pre-loads the panel instead of persisting.

**Files:**
- Modify: `src/components/estimation/CopyEstimationModal.tsx`

- [ ] **Step 1: Update the Props and remove the tab state**

Replace the `Props` interface (lines 15-18) and the state/derived block (lines 28-30, 55) with a `mode`-driven version. New `Props`:

```ts
interface Props {
  sourceLine: ProjectLine;
  mode: 'copy' | 'legacy';
  /** Legacy mode only: pre-load the selected legacy estimation into the caller's working state. */
  onApplyLegacy?: (
    inductorSelections: InductorSelection[],
    customJUs: CustomJU[],
    label: string,
  ) => void;
  onClose: () => void;
}
```

Add the missing type imports at the top of the file:

```ts
import type { InductorSelection, CustomJU } from '../../types';
```

Replace the tab state (line 29) — delete `const [tab, setTab] = useState<'current' | 'legacy'>('current');`. Keep `selected` and `legacyId` state.

- [ ] **Step 2: Replace `handleConfirm` to branch on `mode` and use the callback**

```ts
  function handleConfirm() {
    if (mode === 'copy') {
      copyEstimation(sourceLine.id, selected);
      pushToast(t('copy.toastCopied', { n: selected.length }), 'success');
    } else {
      const leg = LEGACY_ESTIMATIONS.find((l) => l.id === legacyId);
      if (!leg) return;
      const { inductorSelections, customJUs } = mergeLegacyEstimation(leg.jus, INDUCTORS);
      onApplyLegacy?.(inductorSelections, customJUs, leg.label);
    }
    onClose();
  }

  const confirmDisabled = mode === 'copy' ? selected.length === 0 : !legacyId;
```

Note: `copyFromLegacy` from the store is no longer called here — the legacy path now defers to `onApplyLegacy`. Remove the now-unused `const copyFromLegacy = useDataStore((s) => s.copyFromLegacy);` line (line 23).

- [ ] **Step 3: Replace the tab strip + bodies with mode-gated sections**

Delete the tab strip block (lines 78-108). Change the two `{tab === 'current' && (...)}` / `{tab === 'legacy' && (...)}` guards to `{mode === 'copy' && (...)}` and `{mode === 'legacy' && (...)}` respectively. Update the footer confirm label (lines 67-69):

```tsx
            {mode === 'copy'
              ? t('copy.confirm', { n: selected.length })
              : t('copy.confirmLegacy')}
```

- [ ] **Step 4: Type-check via a quick test run**

Run: `npm test -- src/lib/__tests__/copyCandidates.test.ts`
Expected: PASS (the modal compiles; this test exercises shared copy logic and confirms the build is clean).

- [ ] **Step 5: Commit**

```bash
git add src/components/estimation/CopyEstimationModal.tsx
git commit -m "refactor(estimation): drive CopyEstimationModal by mode + onApplyLegacy"
```

---

### Task 4: Wire the two contextual buttons in `EstimationPanel`

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx` (imports, footer lines 526-554, modal render line 580)

- [ ] **Step 1: Import the helper and the toast key**

Add near the other lib imports (after line 25):

```ts
import { panelCopyAction } from '../../lib/estimationPanelButtons';
```

`pushToast` and `t` are already in scope (lines 63, declared via `useT()`).

- [ ] **Step 2: Compute the action and a legacy pre-load handler**

After the `canCopy` line (line 113), add:

```ts
  const copyAction = panelCopyAction({ existing, canEdit, canCopy, locked });

  const handleApplyLegacy = useCallback(
    (sel: InductorSelection[], cjus: CustomJU[], label: string) => {
      setSelections(sel);
      setCustomJUs(cjus);
      // globalOccurrences intentionally left untouched: legacy fixtures carry per-JU
      // data only; the user sets occurrence before saving. The form is now dirty.
      pushToast(t('panel.toastLegacyPreloaded', { label }), 'success');
    },
    [pushToast, t],
  );
```

(`useCallback`, `InductorSelection`, `CustomJU` are already imported — see lines 1 and 3.)

- [ ] **Step 3: Replace the footer copy button (lines 528-534) with the two contextual buttons**

```tsx
            <div>
              {copyAction === 'legacy' && (
                <Button size="sm" variant="secondary" onClick={() => setShowCopyModal(true)}>
                  <Copy size={14} /> {t('panel.importLegacy')}
                </Button>
              )}
              {copyAction === 'copy' && (
                <Button size="sm" variant="secondary" onClick={() => setShowCopyModal(true)}>
                  <Copy size={14} /> {t('panel.copyFromLines')}
                </Button>
              )}
            </div>
```

- [ ] **Step 4: Pass `mode` + `onApplyLegacy` to the modal (line 580)**

```tsx
      {showCopyModal && (
        <CopyEstimationModal
          sourceLine={line}
          mode={copyAction === 'legacy' ? 'legacy' : 'copy'}
          onApplyLegacy={handleApplyLegacy}
          onClose={() => setShowCopyModal(false)}
        />
      )}
```

- [ ] **Step 5: Write a component test for button visibility**

**Files:** Create `src/components/estimation/__tests__/EstimationPanel.buttons.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstimationPanel } from '../EstimationPanel';
import { useRoleStore } from '../../../store/roleStore';
import { useDataStore } from '../../../store/dataStore';

describe('EstimationPanel — contextual copy/import buttons', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('Engineer');
  });

  it('shows "Import legacy estimation" for an unsaved, editable line', () => {
    const line = useDataStore.getState().lines.find((l) => l.status === 'To do')!;
    render(<EstimationPanel line={line} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /import legacy estimation/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy from other project lines/i })).toBeNull();
  });

  it('shows "Copy from other project lines" once a draft exists', () => {
    const data = useDataStore.getState();
    const line = data.lines.find((l) => data.estimations[l.id])!;
    render(<EstimationPanel line={line} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /copy from other project lines/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import legacy estimation/i })).toBeNull();
  });
});
```

If no seeded line matches a precondition (e.g. no line has a persisted estimation in fixtures), seed it inside the test before render, e.g.:

```tsx
    const line = data.lines.find((l) => l.status === 'Draft') ?? data.lines[0];
    useDataStore.getState().setEstimation(line.id, {
      inductorSelections: [], customJUs: [], globalOccurrences: 1,
      totalManDays: 0, yearlyBreakdown: [],
    });
```

(Confirm the `Estimation` shape against `src/types` and `setEstimation`'s signature before seeding; adjust fields to match.)

- [ ] **Step 6: Run the test**

Run: `npm test -- src/components/estimation/__tests__/EstimationPanel.buttons.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/estimation/EstimationPanel.tsx src/components/estimation/__tests__/EstimationPanel.buttons.test.tsx
git commit -m "feat(estimation): contextual legacy-import / copy-from-lines buttons"
```

---

# CHANGE 2 — Estimation review table grouped by assignee (Allocation style)

### Task 5: Pure grouping helper `groupRowsByAssignee`

**Files:**
- Create: `src/lib/estimationReviewGrouping.ts`
- Test: `src/lib/__tests__/estimationReviewGrouping.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/estimationReviewGrouping.test.ts
import { describe, it, expect } from 'vitest';
import { groupRowsByAssignee } from '../estimationReviewGrouping';
import type { EstimationReviewGridRow } from '../estimationReviewRows';

function row(over: Partial<EstimationReviewGridRow>): EstimationReviewGridRow {
  return {
    id: 'PL', lineName: 'L', projectName: 'P', status: 'Draft',
    assignedEngineerId: 'eng-1',
    totalFte: 0, totalBh: 0, totalKm: 0,
    yearlyFte: { '2026': 0 }, yearlyBh: { '2026': 0 }, yearlyKm: { '2026': 0 },
    yearlyKEuro: { '2026': 0 },
    engineerApproval: '', cpoApproval: '',
    ...over,
  } as EstimationReviewGridRow;
}

const years = ['2026'];
const name = (id: string | null) => (id === null ? 'Unassigned' : `Name ${id}`);

describe('groupRowsByAssignee', () => {
  it('groups rows by assignee preserving first-seen order', () => {
    const rows = [
      row({ id: 'A', assignedEngineerId: 'eng-1' }),
      row({ id: 'B', assignedEngineerId: 'eng-2' }),
      row({ id: 'C', assignedEngineerId: 'eng-1' }),
    ];
    const groups = groupRowsByAssignee(rows, name, years);
    expect(groups.map((g) => g.assigneeId)).toEqual(['eng-1', 'eng-2']);
    expect(groups[0].rows.map((r) => r.id)).toEqual(['A', 'C']);
    expect(groups[0].assigneeName).toBe('Name eng-1');
  });

  it('buckets rows with no assignee under a null/Unassigned group', () => {
    const rows = [row({ id: 'A', assignedEngineerId: undefined })];
    const groups = groupRowsByAssignee(rows, name, years);
    expect(groups[0].assigneeId).toBeNull();
    expect(groups[0].assigneeName).toBe('Unassigned');
  });

  it('sums subtotals (totals + per-year) within each group', () => {
    const rows = [
      row({ assignedEngineerId: 'eng-1', totalFte: 1.5, totalBh: 10, totalKm: 100,
            yearlyFte: { '2026': 1.5 }, yearlyKEuro: { '2026': 20 } }),
      row({ assignedEngineerId: 'eng-1', totalFte: 0.5, totalBh: 5, totalKm: 50,
            yearlyFte: { '2026': 0.5 }, yearlyKEuro: { '2026': 30 } }),
    ];
    const [g] = groupRowsByAssignee(rows, name, years);
    expect(g.subtotal.totalFte).toBeCloseTo(2.0);
    expect(g.subtotal.totalBh).toBe(15);
    expect(g.subtotal.totalKm).toBe(150);
    expect(g.subtotal.yearlyFte['2026']).toBeCloseTo(2.0);
    expect(g.subtotal.yearlyKEuro['2026']).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/estimationReviewGrouping.test.ts`
Expected: FAIL — cannot find module `../estimationReviewGrouping`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/estimationReviewGrouping.ts
import type { EstimationReviewGridRow } from './estimationReviewRows';

export interface AssigneeSubtotal {
  totalFte: number;
  totalBh: number;
  totalKm: number;
  yearlyFte: Record<string, number>;
  yearlyBh: Record<string, number>;
  yearlyKm: Record<string, number>;
  yearlyKEuro: Record<string, number>;
}

export interface AssigneeGroup {
  assigneeId: string | null; // null = unassigned
  assigneeName: string;
  rows: EstimationReviewGridRow[];
  subtotal: AssigneeSubtotal;
}

const UNASSIGNED = '__unassigned__';

function emptySubtotal(years: string[]): AssigneeSubtotal {
  const zero = () => Object.fromEntries(years.map((y) => [y, 0]));
  return {
    totalFte: 0, totalBh: 0, totalKm: 0,
    yearlyFte: zero(), yearlyBh: zero(), yearlyKm: zero(), yearlyKEuro: zero(),
  };
}

export function groupRowsByAssignee(
  rows: EstimationReviewGridRow[],
  resolveName: (assigneeId: string | null) => string,
  years: string[],
): AssigneeGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, EstimationReviewGridRow[]>();
  for (const r of rows) {
    const key = r.assignedEngineerId ?? UNASSIGNED;
    if (!buckets.has(key)) { buckets.set(key, []); order.push(key); }
    buckets.get(key)!.push(r);
  }
  return order.map((key) => {
    const groupRows = buckets.get(key)!;
    const subtotal = emptySubtotal(years);
    for (const r of groupRows) {
      subtotal.totalFte += r.totalFte;
      subtotal.totalBh += r.totalBh;
      subtotal.totalKm += r.totalKm;
      for (const y of years) {
        subtotal.yearlyFte[y]   += r.yearlyFte[y]   ?? 0;
        subtotal.yearlyBh[y]    += r.yearlyBh[y]    ?? 0;
        subtotal.yearlyKm[y]    += r.yearlyKm[y]    ?? 0;
        subtotal.yearlyKEuro[y] += r.yearlyKEuro[y] ?? 0;
      }
    }
    const assigneeId = key === UNASSIGNED ? null : key;
    return { assigneeId, assigneeName: resolveName(assigneeId), rows: groupRows, subtotal };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/estimationReviewGrouping.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/estimationReviewGrouping.ts src/lib/__tests__/estimationReviewGrouping.test.ts
git commit -m "feat(estimation): add groupRowsByAssignee aggregation helper"
```

---

### Task 6: Add i18n keys for the grouped table

**Files:** `src/i18n/types.ts` (`estReview` block, starts line 94), `src/i18n/en.ts`, `src/i18n/es.ts`

- [ ] **Step 1: Add to the typed contract** — inside `estReview: { ... }` in `types.ts`:

```ts
    unassigned: string;
    subtotal: string;
    groupLineCount: string;
```

- [ ] **Step 2: English values** — inside the `estReview` object in `en.ts`:

```ts
    unassigned: 'Unassigned',
    subtotal: 'Subtotal',
    groupLineCount: '{n} line(s)',
```

- [ ] **Step 3: Spanish values** — inside the `estReview` object in `es.ts`:

```ts
    unassigned: 'Sin asignar',
    subtotal: 'Subtotal',
    groupLineCount: '{n} línea(s)',
```

- [ ] **Step 4: Verify** — Run: `npm test -- src/i18n/__tests__/getT.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(i18n): add estimation review grouping keys"
```

---

### Task 7: Render per-assignee subtables in `EstimationReviewPage`

Replace the single `<table>` (lines 221-324) with one table per assignee group, each followed by a subtotal row. Keep the filter bar (lines 147-202), the export toolbar (204-219), selection, and sorting.

**Files:**
- Modify: `src/pages/EstimationReviewPage.tsx`

- [ ] **Step 1: Import the grouping helper**

Add after the existing lib imports (after line 14):

```ts
import { groupRowsByAssignee } from '../lib/estimationReviewGrouping';
```

- [ ] **Step 2: Build groups from the sorted rows**

After the sorting line (line 122, `const { sorted, ... } = useSortable(filteredRows);`), add:

```ts
  const groups = useMemo(
    () =>
      groupRowsByAssignee(
        sorted,
        (id) => (id ? (ENGINEERS.find((e) => e.id === id)?.name ?? id) : t('estReview.unassigned')),
        cycleYears,
      ),
    [sorted, cycleYears, t],
  );
```

- [ ] **Step 3: Replace the grid block (lines 221-324) with grouped subtables**

```tsx
      {/* Grid — one subtable per assignee */}
      {filteredRows.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? t('estReview.noLinesFiltered') : t('estReview.noLines')}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.assigneeId ?? '__unassigned__'} className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm font-semibold text-slate-700">{group.assigneeName}</span>
                <span className="text-xs text-slate-400">
                  {t('estReview.groupLineCount', { n: group.rows.length })}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="w-8 px-3 py-2 text-left" />
                    <th className="cursor-pointer px-3 py-2 text-left font-medium min-w-[80px]" onClick={() => requestSort('id')}>
                      {t('estReview.colPlNumber')} {getSortIcon('id')}
                    </th>
                    <th className="cursor-pointer px-3 py-2 text-left font-medium min-w-[120px]" onClick={() => requestSort('lineName')}>
                      {t('estReview.colPlName')} {getSortIcon('lineName')}
                    </th>
                    <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('metier')}>
                      {t('estReview.colMetier')} {getSortIcon('metier')}
                    </th>
                    <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('status')}>
                      {t('estReview.colStatus')} {getSortIcon('status')}
                    </th>
                    <th className="px-3 py-2 text-left font-medium">{t('estReview.colEngineerApproval')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('estReview.colCpoApproval')}</th>
                    <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('totalFte')}>
                      {t('estReview.colTotalFte')} {getSortIcon('totalFte')}
                    </th>
                    <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('totalBh')}>
                      {t('estReview.colTotalBh')} {getSortIcon('totalBh')}
                    </th>
                    <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('totalKm')}>
                      {t('estReview.colTotalKm')} {getSortIcon('totalKm')}
                    </th>
                    {cycleYears.flatMap((y) => [
                      <th key={`fte-${y}`} className="px-3 py-2 text-right font-medium whitespace-nowrap">FTE {y}</th>,
                      <th key={`bh-${y}`}  className="px-3 py-2 text-right font-medium whitespace-nowrap">BH {y}</th>,
                      <th key={`km-${y}`}  className="px-3 py-2 text-right font-medium whitespace-nowrap">KM {y}</th>,
                      <th key={`ke-${y}`}  className="px-3 py-2 text-right font-medium whitespace-nowrap">K€ {y}</th>,
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => {
                    const isSelected = selectedIds.includes(row.id);
                    return (
                      <tr key={row.id} className={`border-t border-slate-100 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(row.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{row.id}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-slate-900">{row.lineName}</div>
                          <div className="text-xs text-slate-500">{row.projectName}</div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{row.metier ?? '—'}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                        <td className="px-3 py-2.5 text-slate-600">{row.engineerApproval}</td>
                        <td className="px-3 py-2.5 text-slate-600">{row.cpoApproval}</td>
                        <td className="px-3 py-2.5 text-right">{row.totalFte.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right">{row.totalBh.toFixed(1)}</td>
                        <td className="px-3 py-2.5 text-right">{row.totalKm.toFixed(0)}</td>
                        {cycleYears.flatMap((y) => [
                          <td key={`fte-${y}`} className="px-3 py-2.5 text-right text-slate-400">{(row.yearlyFte[y] ?? 0).toFixed(2)}</td>,
                          <td key={`bh-${y}`}  className="px-3 py-2.5 text-right text-slate-400">{(row.yearlyBh[y]  ?? 0).toFixed(1)}</td>,
                          <td key={`km-${y}`}  className="px-3 py-2.5 text-right text-slate-400">{(row.yearlyKm[y]  ?? 0).toFixed(0)}</td>,
                          <td key={`ke-${y}`}  className="px-3 py-2.5 text-right">{(row.yearlyKEuro[y] ?? 0).toFixed(1)}</td>,
                        ])}
                      </tr>
                    );
                  })}
                  {/* Subtotal row */}
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-700">
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" colSpan={6}>{t('estReview.subtotal')}</td>
                    <td className="px-3 py-2 text-right">{group.subtotal.totalFte.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{group.subtotal.totalBh.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right">{group.subtotal.totalKm.toFixed(0)}</td>
                    {cycleYears.flatMap((y) => [
                      <td key={`fte-${y}`} className="px-3 py-2 text-right">{group.subtotal.yearlyFte[y].toFixed(2)}</td>,
                      <td key={`bh-${y}`}  className="px-3 py-2 text-right">{group.subtotal.yearlyBh[y].toFixed(1)}</td>,
                      <td key={`km-${y}`}  className="px-3 py-2 text-right">{group.subtotal.yearlyKm[y].toFixed(0)}</td>,
                      <td key={`ke-${y}`}  className="px-3 py-2 text-right">{group.subtotal.yearlyKEuro[y].toFixed(1)}</td>,
                    ])}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
```

Note: the per-table header `colSpan={6}` for the subtotal label spans the checkbox-through-CPO-approval columns (checkbox + PL# + PL name + Métier + Status + Eng approval + CPO approval = the first cell is empty, then `colSpan={6}` covers the remaining 6 label columns). Verify column counts line up after editing; adjust the `colSpan` if a column is added/removed.

- [ ] **Step 4: Remove the now-unused select-all helpers if orphaned**

The old single-table select-all (`allFilteredSelected`, `toggleSelectAll`) is no longer rendered. Either keep them for a future global control or delete lines 113-119 to avoid unused-variable TS errors. If TS complains about unused `allFilteredSelected`/`toggleSelectAll`, delete those two declarations. Keep `toggleSelect`, `selectedIds`, `visibleSelectedIds`.

- [ ] **Step 5: Write a component test for grouping**

**Files:** Create `src/pages/__tests__/EstimationReviewPage.grouping.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstimationReviewPage } from '../EstimationReviewPage';
import { useRoleStore } from '../../store/roleStore';
import { ENGINEERS } from '../../fixtures/engineers';

describe('EstimationReviewPage — per-assignee subtables', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO'); // sees all assignees
  });

  it('renders a subtable header and subtotal row per assignee', () => {
    render(<EstimationReviewPage />);
    // At least one known engineer name appears as a group header
    const anyEngineer = ENGINEERS[0].name;
    expect(screen.getAllByText(anyEngineer).length).toBeGreaterThan(0);
    // Subtotal label rendered at least once
    expect(screen.getAllByText(/subtotal/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Run the test + the existing review-rows test**

Run: `npm test -- src/pages/__tests__/EstimationReviewPage.grouping.test.tsx src/lib/__tests__/estimationReviewRows.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/EstimationReviewPage.tsx src/pages/__tests__/EstimationReviewPage.grouping.test.tsx
git commit -m "feat(estimation): group estimation review into per-assignee subtables"
```

---

# CHANGE 3 — Disable compat-mode checkbox for Estimated/Approved

### Task 8: Add `isSelectable` predicate to `ProjectLineGrid`

**Files:**
- Modify: `src/components/grid/ProjectLineGrid.tsx`

- [ ] **Step 1: Add the optional prop**

In the `Props` interface (around line 12-15, alongside `selectedIds`, `onToggleSelect`, `showSelection`), add:

```ts
  /** Optional gate: when it returns false, the row's selection checkbox is disabled. Defaults to always selectable. */
  isSelectable?: (line: ProjectLine) => boolean;
```

Destructure it with a default in the component signature (line 20):

```ts
  lines, selectedIds, onToggleSelect, onRowClick, showSelection, showKEuro,
  isSelectable,
```

(Ensure `ProjectLine` is imported in this file; it almost certainly already is — confirm the import line and add the type if missing.)

- [ ] **Step 2: Disable the checkbox when not selectable**

Replace the checkbox block (lines 88-93) with:

```tsx
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={isSelectable ? !isSelectable(line) : false}
                      onChange={() => onToggleSelect(line.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
                    />
```

- [ ] **Step 3: Write a component test**

**Files:** Create `src/components/grid/__tests__/ProjectLineGrid.selectable.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectLineGrid } from '../ProjectLineGrid';
import type { ProjectLine } from '../../../types';

function makeLine(over: Partial<ProjectLine>): ProjectLine {
  return { id: 'PL-1', lineName: 'L', projectName: 'P', status: 'Draft' } as ProjectLine;
}

describe('ProjectLineGrid — isSelectable gate', () => {
  it('disables the checkbox for non-selectable rows', () => {
    const lines = [
      { ...makeLine({}), id: 'PL-1', status: 'Draft' } as ProjectLine,
      { ...makeLine({}), id: 'PL-2', status: 'Estimated' } as ProjectLine,
    ];
    render(
      <ProjectLineGrid
        lines={lines}
        selectedIds={[]}
        onToggleSelect={() => {}}
        onRowClick={() => {}}
        showSelection
        showKEuro={false}
        isSelectable={(l) => l.status !== 'Estimated' && l.status !== 'Approved'}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeEnabled();   // Draft
    expect(checkboxes[1]).toBeDisabled();  // Estimated
  });
});
```

(If `ProjectLineGrid` requires additional non-optional props or a router/i18n provider, mirror the render setup used in an existing grid/page test; add only what the component truly needs.)

- [ ] **Step 4: Run the test**

Run: `npm test -- src/components/grid/__tests__/ProjectLineGrid.selectable.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/grid/ProjectLineGrid.tsx src/components/grid/__tests__/ProjectLineGrid.selectable.test.tsx
git commit -m "feat(grid): add isSelectable gate to ProjectLineGrid checkbox"
```

---

### Task 9: Disable Estimated/Approved selection in compat mode

**Files:**
- Modify: `src/components/pev/CompatibilityGroupSection.tsx`

- [ ] **Step 1: Pass the predicate to the grid**

Update the `<ProjectLineGrid ... />` usage (lines 45-52) to add:

```tsx
        isSelectable={(line) => line.status !== 'Estimated' && line.status !== 'Approved'}
```

so it reads:

```tsx
      <ProjectLineGrid
        lines={visibleLines}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onRowClick={onRowClick}
        showSelection={showSelection}
        showKEuro={showKEuro}
        isSelectable={(line) => line.status !== 'Estimated' && line.status !== 'Approved'}
      />
```

- [ ] **Step 2: Write a component test**

**Files:** Create `src/components/pev/__tests__/CompatibilityGroupSection.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompatibilityGroupSection } from '../CompatibilityGroupSection';
import type { CompatibilityGroup } from '../../../lib/grouping';
import type { ProjectLine } from '../../../types';

const group = {
  key: 'GROUP-A',
  lines: [
    { id: 'PL-1', lineName: 'A', projectName: 'P', status: 'Draft' } as ProjectLine,
    { id: 'PL-2', lineName: 'B', projectName: 'P', status: 'Approved' } as ProjectLine,
  ],
} as CompatibilityGroup;

describe('CompatibilityGroupSection — selection gating', () => {
  it('disables selection for Approved/Estimated lines', () => {
    render(
      <CompatibilityGroupSection
        group={group}
        selectedIds={[]}
        onToggleSelect={() => {}}
        onRowClick={() => {}}
        showSelection
        showKEuro={false}
        showOwnerFilters={false}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    // The Approved line's checkbox must be disabled; the Draft one enabled.
    expect(checkboxes.some((c) => (c as HTMLInputElement).disabled)).toBe(true);
    expect(checkboxes.some((c) => !(c as HTMLInputElement).disabled)).toBe(true);
  });
});
```

(If the section's `applyUiFilters` or `GridFiltersBar` needs extra context, mirror an existing pev/grid test setup. Keep the two fixture lines distinct in status.)

- [ ] **Step 3: Run the test**

Run: `npm test -- src/components/pev/__tests__/CompatibilityGroupSection.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/pev/CompatibilityGroupSection.tsx src/components/pev/__tests__/CompatibilityGroupSection.test.tsx
git commit -m "feat(pev): disable compat-mode selection for Estimated/Approved lines"
```

---

# Final verification

### Task 10: Full test suite + business rules + manual smoke

- [ ] **Step 1: Run the full frontend suite**

Run: `npm test`
Expected: PASS (all suites, including the 5 new test files).

- [ ] **Step 2: Run the SDD business-rule suite**

Run: `pytest node_modules/great-sdd-kit/tests/ -v`
Expected: PASS (no rule changes; confirms no regression).

- [ ] **Step 3: Type/build check**

Run: `npm run build`
Expected: build succeeds with no TS errors (catches any orphaned variables from Task 7 Step 4).

- [ ] **Step 4: Manual smoke (optional but recommended)**

Run the app (`npm run dev`) and verify:
- Open an unsaved pre-estimation line → "Import legacy estimation" shows; selecting a legacy entry fills the form (dirty) and shows the preload toast; "Save draft" then works.
- A saved-draft line shows "Copy from other project lines" instead.
- Estimation Review shows one subtable per assignee with a subtotal row and the top filter bar narrows rows.
- In compatibility mode, an Estimated/Approved line's checkbox is greyed out and unclickable.

- [ ] **Step 5: Commit any final fixups**

```bash
git add -A
git commit -m "test(estimation): full-suite verification for buttons/table/compat changes"
```

---

## Self-Review (author checklist — completed)

**Spec coverage:**
- Change 1 (two contextual buttons, legacy pre-loads form) → Tasks 1–4. ✓
- Change 2 (per-assignee subtables + top filter + subtotals, Allocation-style) → Tasks 5–7. ✓ (Filter bar already exists at lines 147-202 and is preserved.)
- Change 3 (disable compat checkbox for Estimated/Approved) → Tasks 8–9. ✓

**Placeholder scan:** No TBD/TODO; all code steps contain complete code. Test-seeding caveats are explicit, not vague.

**Type consistency:** `panelCopyAction` signature consistent across Task 1 and Task 4; `groupRowsByAssignee(rows, resolveName, years)` signature consistent across Task 5 and Task 7; `AssigneeGroup.subtotal` field names match between helper and the Task 7 subtotal row; `isSelectable?: (line) => boolean` consistent across Tasks 8–9.

**Open implementation notes for the engineer (resolve while coding, not blockers):**
- Confirm the exact `Estimation` shape and `setEstimation` signature in `src/types` / `src/store/dataStore.ts` before seeding in the Task 4 test.
- Verify the Task 7 subtotal-row `colSpan` matches the final column count after the edit.
