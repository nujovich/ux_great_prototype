# HIW-174 Pre-Estimation — GAP/KO Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the 17 retest findings (3 GAP + 14 KO) from Mario Gomez Lopez's 2026-06-15 comment on HIW-174, aligning the Pre-Estimation prototype with the PRD.

**Architecture:** React/Vite/TS prototype with Zustand stores (`dataStore`, `roleStore`, `uiStore`), pure logic in `src/lib/*`, i18n maps in `src/i18n/{en,es}.ts`, in-memory fixtures in `src/fixtures/*`. Changes are surgical: i18n strings, role-gating logic, state-machine guards, save-gate logic, fixture enrichment, and small markup additions. Pure logic gets TDD (Vitest); markup/i18n gets a lighter test or visual check.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Vitest + happy-dom, Tailwind.

**Test command:** `npm run test` (Vitest, tests co-located in `src/**/__tests__/*.test.ts(x)`).

**SDD validation:** After code changes, run `pytest node_modules/great-sdd-kit/tests/ -v` per project CLAUDE.md.

---

## Finding → Task map

| # | Finding | Task |
|---|---------|------|
| K1 | "Not estimated" should be "To do" | Task 1 |
| K13 | Admin/PMO "Not estimated" wraps to two lines | Task 1 |
| K10 | ETP → FTE everywhere (reviewer wrote "EFT" — confirmed typo; SDD kit canonical unit is FTE) | Task 2 |
| K14 | Remove "Calculated in Allocation" hint | Task 3 |
| G1 | Remove "Show all columns" button | Task 4 |
| K7 | Add headers to CUSTOM JUS section | Task 5 |
| K2 | Disable checkboxes for PMO | Task 6 |
| K8 | Engineer cannot do Bulk | Task 6 |
| K3 | Bulk selection persists across roles | Task 7 |
| K4 | Bulk can re-draft approved/sent lines (partial — see Blocked) | Task 8 |
| K5 | Cannot estimate inductor w/ empty workload + Custom JU | Task 9 |
| K6 | Single-cran inductor shows "Select a cran" warning | Task 10 |
| K9 | Save-draft summary cut off with many lines | Task 11 |
| G2 | Formula `Total=(Var×Occ)+Fixed` not verifiable (no Fixed values) | Task 12 |
| K11 | KM and K€ units not shown | Task 12 |
| G3 | Copy does not carry prototype estimation (comments → see note) | Task 13 |
| K4 (flow) | Bulk flow "missing requirements" | **Blocked — needs product decision** |
| K12 | Legacy cycle import per PRD | **Blocked — pending @Enrique Monereo** |

---

## Task 1: Status label "To do" + no-wrap badge (K1, K13)

**Files:**
- Modify: `src/i18n/en.ts:15`
- Modify: `src/i18n/es.ts` (the `status.to_do` entry)
- Modify: `src/components/shared/StatusBadge.tsx:18-22`

- [ ] **Step 1: Change the English status label**

In `src/i18n/en.ts:15`:

```ts
    to_do: 'To do',
```

- [ ] **Step 2: Change the Spanish status label**

In `src/i18n/es.ts`, find the `status.to_do` entry (currently the Spanish equivalent of "Not estimated") and set it to:

```ts
    to_do: 'To do',
```

(Keep it `'To do'` — the PRD status name is canonical English; if the rest of `es.ts` localizes statuses, match that convention, e.g. `'Por hacer'`. Confirm against neighboring `status.*` entries in `es.ts`.)

- [ ] **Step 3: Prevent the badge from wrapping (K13)**

In `src/components/shared/StatusBadge.tsx`, add `whitespace-nowrap` to the badge classes:

```tsx
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        classes[status],
      )}
```

- [ ] **Step 4: Verify build + visual**

Run: `npm run test`
Expected: PASS (no test references the literal "Not estimated"; if one does, update it to "To do").
Then visually confirm the grid as Admin/PMO shows "To do" on one line.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/en.ts src/i18n/es.ts src/components/shared/StatusBadge.tsx
git commit -m "fix(pev): rename status To do and prevent badge wrap (HIW-174 K1/K13)"
```

---

## Task 2: ETP → FTE (K10)

**Decision (confirmed 2026-06-16):** The reviewer wrote "EFT", but **EFT appears nowhere in the SDD kit** and is not a domain acronym — it is a typo. The SDD kit's canonical unit is **FTE** (`FTE = man_days / 209`, see `node_modules/great-sdd-kit/great_sdd/specs/pre_estimation_specs.py`), and ETP is merely its French/Spanish synonym. Estimation Review already uses `Total FTE`. So unify Pre-Estimation on **FTE** — this resolves K10 and the existing internal ETP-vs-FTE inconsistency.

**Files:**
- Modify: `src/lib/format.ts:16-19`
- Modify: `src/i18n/en.ts:285`
- Modify: `src/i18n/es.ts` (the `panel.totalEtp` entry)
- Test: `src/lib/__tests__/format.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test for the FTE formatter unit suffix**

Create/extend `src/lib/__tests__/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatFTE } from '../format';

describe('formatFTE', () => {
  it('uses the FTE unit suffix (HIW-174 K10)', () => {
    expect(formatFTE(3)).toBe('3.0 FTE');
  });
  it('renders em dash for null', () => {
    expect(formatFTE(null)).toBe('—');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- format`
Expected: FAIL — receives `'3.0 ETP'`.

- [ ] **Step 3: Change the suffix in the formatter**

In `src/lib/format.ts:18`:

```ts
  return `${v.toFixed(1)} FTE`;
```

- [ ] **Step 4: Change the totals label (en + es)**

In `src/i18n/en.ts:285`:

```ts
    totalEtp: 'Total FTEs',
```

In `src/i18n/es.ts`, set the `panel.totalEtp` entry to `'Total FTEs'`.

(Leave the i18n KEY name `totalEtp` as-is to avoid touching every call site; only the value changes.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- format`
Expected: PASS

- [ ] **Step 6: Sweep for any remaining "ETP" literal**

Run: `rg -n "ETP" src/`
Expected: no remaining hits in shipped strings. Fix any stragglers to use `FTE`. With Pre-Estimation now on `FTE`, the prototype matches Estimation Review's `Total FTE` — no inconsistency remains.

- [ ] **Step 7: Commit**

```bash
git add src/lib/format.ts src/lib/__tests__/format.test.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "fix(pev): unify estimation unit on FTE (HIW-174 K10)"
```

---

## Task 3: Remove "Calculated in Allocation" hint (K14)

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx:514-518`
- Modify: `src/i18n/en.ts:288` and `src/i18n/es.ts` (remove `panel.keuroHint` value) — optional cleanup

- [ ] **Step 1: Remove the hint paragraph in the K€ totals box**

In `src/components/estimation/EstimationPanel.tsx`, delete the `<p>` line at 517 so the K€ box becomes:

```tsx
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalKeuro')}</div>
                <div className="text-lg font-bold text-slate-900">{formatKEuro(totals.keuro)}</div>
              </div>
```

- [ ] **Step 2: (Optional) drop the now-unused i18n key**

Only if no other file references `panel.keuroHint` (`rg -n "keuroHint" src/`), remove `keuroHint` from both `en.ts:288` and `es.ts` and from `src/i18n/types.ts` if typed there. If still referenced, leave it.

> **NOTE:** The pre-save summary modal has a separate hint `panel.summaryNoKeuro` ("K€ is calculated in Allocation."). The finding named the panel hint; leave the summary hint unless product says otherwise.

- [ ] **Step 3: Verify**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/estimation/EstimationPanel.tsx src/i18n/en.ts src/i18n/es.ts
git commit -m "fix(pev): remove 'Calculated in Allocation' K€ hint (HIW-174 K14)"
```

---

## Task 4: Remove "Show all columns" button (G1)

The finding: the doc's "Show all" refers to switching out of Compatible mode, not a column toggle. All PRD columns are confirmed present, so the grid should always render the full column set.

**Files:**
- Modify: `src/lib/grid` → `src/components/grid/gridColumns.ts:42-44`
- Modify: `src/pages/PreEstimationPage.tsx` (remove state, button, prop threading)
- Modify: `src/components/grid/ProjectLineGrid.tsx` (remove `showAllColumns` prop)
- Modify: `src/components/pev/CompatibilityGroupSection.tsx` (remove `showAllColumns` prop)
- Modify: `src/i18n/en.ts:49` and `src/i18n/es.ts` (remove `showAllColumns`)

- [ ] **Step 1: Make the grid always return all columns**

In `src/components/grid/gridColumns.ts`, change `getGridColumns` to ignore the flag (keep signature optional to limit churn):

```ts
export function getGridColumns(): GridColumn[] {
  return COLUMNS;
}
```

- [ ] **Step 2: Update ProjectLineGrid**

In `src/components/grid/ProjectLineGrid.tsx`: remove `showAllColumns` from `Props` (line 17), from the destructure (line 21), and call `getGridColumns()` (line 24).

- [ ] **Step 3: Update CompatibilityGroupSection**

In `src/components/pev/CompatibilityGroupSection.tsx`: remove the `showAllColumns` prop and stop forwarding it to `ProjectLineGrid`. (Read the file first; mirror the same removal pattern as Step 2.)

- [ ] **Step 4: Update PreEstimationPage**

In `src/pages/PreEstimationPage.tsx`:
- Remove `const [showAllColumns, setShowAllColumns] = useState(false);` (line 43).
- Remove the entire `<Button variant={showAllColumns ? …}>` block (lines 93-99).
- Remove `showAllColumns={showAllColumns}` from both `<CompatibilityGroupSection>` (line 138) and `<ProjectLineGrid>` (line 160).

Resulting header action row keeps only the Compatible-mode button:

```tsx
        <div className="flex items-center gap-2">
          <Button
            variant={compatibleMode ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setCompatibleMode((v) => !v)}
          >
            <LayoutGrid size={14} />
            {t('preEst.compatibleMode')}
          </Button>
        </div>
```

- [ ] **Step 5: Remove the i18n key**

Remove `showAllColumns: 'Show all columns',` from `en.ts:49` and the equivalent in `es.ts`, and from `src/i18n/types.ts` if declared there.

- [ ] **Step 6: Verify TypeScript + tests**

Run: `npm run test`
Expected: PASS. Fix any grid test that passed `showAllColumns` or called `getGridColumns(true)`.

- [ ] **Step 7: Commit**

```bash
git add src/components/grid/gridColumns.ts src/components/grid/ProjectLineGrid.tsx src/components/pev/CompatibilityGroupSection.tsx src/pages/PreEstimationPage.tsx src/i18n/en.ts src/i18n/es.ts src/i18n/types.ts
git commit -m "fix(pev): remove Show-all-columns toggle, always show full grid (HIW-174 G1)"
```

---

## Task 5: Column headers for CUSTOM JUS (K7)

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx:940-963` (`CustomJUSection`)

- [ ] **Step 1: Add a header row above the custom-JU input rows**

In `CustomJUSection`, inside the `customJUs.length === 0 ? … : (` branch, add a header line above the `.map`. The widths must match the input columns (name flex-1, var/fixed/occ `w-14`, total `w-14`):

```tsx
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="flex-1">{t('panel.customName')}</span>
            <span className="w-14 text-right">{t('panel.colVar')}</span>
            <span className="w-14 text-right">{t('panel.colFixed')}</span>
            <span className="w-14 text-right">{t('panel.colOcc')}</span>
            <span className="w-14 text-right">{t('panel.colDays')}</span>
            <span className="w-[13px]" />
          </div>
          {customJUs.map((ju, idx) => (
```

(The trailing `w-[13px]` spacer aligns with the `Trash2` delete button column.)

- [ ] **Step 2: Verify visually + tests**

Run: `npm run test`
Expected: PASS. Open the panel as Engineer, add a Custom JU, confirm headers Name / Var. / Fixed / Occ. / Days appear.

- [ ] **Step 3: Commit**

```bash
git add src/components/estimation/EstimationPanel.tsx
git commit -m "fix(pev): add column headers to Custom JUs section (HIW-174 K7)"
```

---

## Task 6: Role-correct bulk selection — PMO off, Engineer on (K2, K8)

Root cause: `showSelection = role !== 'RCRC'` exposes checkboxes to PMO (who can't estimate), and `onBulkEstimate={role !== 'Engineer' ? … : undefined}` disables bulk for the one role that estimates most. Both should be gated by the estimation permission.

**Files:**
- Modify: `src/pages/PreEstimationPage.tsx:66, 116`

- [ ] **Step 1: Gate selection by edit permission**

In `src/pages/PreEstimationPage.tsx:66`:

```tsx
  const showSelection = can('edit:estimation');
```

This yields `true` for Engineer and Admin, `false` for PMO, RCRC, CPO — matching "PMO same view as RCRC" (K2).

- [ ] **Step 2: Enable bulk estimate for estimators (incl. Engineer)**

In `src/pages/PreEstimationPage.tsx:116`:

```tsx
          onBulkEstimate={can('edit:estimation') ? handleBulkEstimate : undefined}
```

- [ ] **Step 3: Verify**

Run: `npm run test`
Expected: PASS. Then manually: as PMO no checkboxes appear; as Engineer, select 2+ compatible lines → "Bulk estimate" is actionable.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PreEstimationPage.tsx
git commit -m "fix(pev): gate bulk selection by edit permission (HIW-174 K2/K8)"
```

---

## Task 7: Clear selection on role change (K3)

Root cause: `selectedLineIds` in `uiStore` is never reset when the role switches.

**Files:**
- Modify: `src/store/roleStore.ts`
- Test: `src/store/__tests__/roleStore.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/roleStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useRoleStore } from '../roleStore';
import { useUIStore } from '../uiStore';

describe('roleStore.setRole', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedLineIds: [], estimationPanelLineId: null });
  });

  it('clears line selection and closes the panel when role changes (HIW-174 K3)', () => {
    useUIStore.getState().toggleSelect('PL-1');
    useUIStore.getState().openEstimationPanel('PL-1');

    useRoleStore.getState().setRole('PMO');

    expect(useUIStore.getState().selectedLineIds).toEqual([]);
    expect(useUIStore.getState().estimationPanelLineId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- roleStore`
Expected: FAIL — `selectedLineIds` still `['PL-1']`.

- [ ] **Step 3: Reset UI selection inside setRole**

In `src/store/roleStore.ts`, import the UI store and reset it in `setRole`:

```ts
import { useUIStore } from './uiStore';
```

```ts
  setRole: (r) => {
    set({
      currentRole: r,
      activeEngineerId: r === 'Engineer' ? ACTIVE_ENGINEER_ID : null,
    });
    useUIStore.getState().clearSelection();
    useUIStore.getState().openEstimationPanel(null);
  },
```

(`uiStore` does not import `roleStore`, so there is no import cycle.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- roleStore`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/roleStore.ts src/store/__tests__/roleStore.test.ts
git commit -m "fix(pev): clear selection and panel on role change (HIW-174 K3)"
```

---

## Task 8: Bulk must not regress locked lines (K4 — concrete part)

Root cause: `bulkSetEstimation` forces every target line to `Draft` without consulting the state machine, so an `Estimated`/`Sent`/`Approved` line can be dragged back to Draft. The state machine already forbids those transitions (`STATUS_TRANSITIONS`); bulk must honor it.

**Files:**
- Modify: `src/store/dataStore.ts:72-88` (`bulkSetEstimation`)
- Test: `src/store/__tests__/dataStore.bulk.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/dataStore.bulk.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDataStore } from '../dataStore';

const base = {
  inductorSelections: [],
  customJUs: [],
  globalOccurrences: 1,
  yearlyBreakdown: [],
  totalDays: 5,
  totalKEuro: 0,
  status: 'Draft' as const,
  draftedAt: '2026-06-16T00:00:00.000Z',
};

describe('bulkSetEstimation', () => {
  beforeEach(() => {
    // Force a known mix of statuses on two lines.
    const lines = useDataStore.getState().lines;
    const draftable = lines[0];
    const approved = lines.find((l) => l.id !== draftable.id)!;
    useDataStore.setState({
      lines: useDataStore.getState().lines.map((l) =>
        l.id === draftable.id ? { ...l, status: 'To do' }
        : l.id === approved.id ? { ...l, status: 'Approved' }
        : l,
      ),
    });
    (globalThis as any).__draftable = draftable.id;
    (globalThis as any).__approved = approved.id;
  });

  it('skips lines whose status cannot transition to Draft (HIW-174 K4)', () => {
    const draftable = (globalThis as any).__draftable as string;
    const approved = (globalThis as any).__approved as string;

    useDataStore.getState().bulkSetEstimation([draftable, approved], base);

    const lines = useDataStore.getState().lines;
    expect(lines.find((l) => l.id === draftable)!.status).toBe('Draft');
    expect(lines.find((l) => l.id === approved)!.status).toBe('Approved');
    expect(useDataStore.getState().estimations[approved]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- dataStore.bulk`
Expected: FAIL — the approved line is reset to `Draft`.

- [ ] **Step 3: Guard bulkSetEstimation with the state machine**

In `src/store/dataStore.ts`, replace `bulkSetEstimation` body so only transition-valid lines are written:

```ts
  bulkSetEstimation: (lineIds, base) =>
    set((s) => {
      const eligible = lineIds.filter((id) => {
        const line = s.lines.find((l) => l.id === id);
        return line ? canTransition(line.status, 'Draft') : false;
      });
      const built = buildBulkEstimations(eligible, base);
      const estimations = { ...s.estimations, ...built };
      const lines = s.lines.map((l) =>
        built[l.id]
          ? {
              ...l,
              status: 'Draft' as LineStatus,
              estimatedDays: base.totalDays,
              estimatedKEuro: base.totalKEuro,
              lastUpdatedAt: new Date().toISOString(),
            }
          : l,
      );
      return { estimations, lines };
    }),
```

(`canTransition` is already imported at `dataStore.ts:6`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- dataStore.bulk`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/dataStore.ts src/store/__tests__/dataStore.bulk.test.ts
git commit -m "fix(pev): bulk estimate honors state machine, skips locked lines (HIW-174 K4)"
```

> **BLOCKED (rest of K4):** The reviewer flagged "the bulk flow is not correct … possible missing requirements." Beyond not regressing locked lines, the intended bulk UX (which statuses are eligible, how mixed-status selections are surfaced, whether the user is warned about skipped lines) is undefined. Do NOT invent it — raise as a product question before building further.

---

## Task 9: Allow definitive estimate with Custom-JU-only / empty workload standard (K5)

Root cause: `hasMinimumForDefinitive` requires a selected cran with JU occurrences, so a line whose only content is a Custom JU (e.g. an inductor with an empty workload standard) can be saved as Draft but never promoted.

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx:326-328`
- Test: `src/lib/__tests__/saveGate.test.ts` (extend) — see note

- [ ] **Step 1: Extract the definitive-gate into a testable helper**

In `src/lib/saveGate.ts`, add a sibling to `canSaveDraft`:

```ts
/**
 * Promote-to-definitive gate (HIW-174 §9 / K5): allowed when globalOccurrence > 0 AND there
 * is at least one cran-backed selection with JU occurrences OR at least one named Custom JU.
 * The Custom-JU branch lets an inductor with an empty workload standard still be estimated.
 */
export function canPromoteDefinitive(
  selections: InductorSelection[],
  customJUs: CustomJU[],
  globalOccurrences: number,
): boolean {
  if (globalOccurrences <= 0) return false;
  const hasCranJUs = selections.some((s) => s.selectedCranId !== null && s.juOccurrences.length > 0);
  const hasNamedCustom = customJUs.some((c) => c.name.trim().length > 0);
  return hasCranJUs || hasNamedCustom;
}
```

- [ ] **Step 2: Write the failing test**

Extend `src/lib/__tests__/saveGate.test.ts` (create if absent):

```ts
import { describe, it, expect } from 'vitest';
import { canPromoteDefinitive } from '../saveGate';

describe('canPromoteDefinitive', () => {
  it('allows a Custom-JU-only estimation (HIW-174 K5)', () => {
    expect(
      canPromoteDefinitive([], [{ id: 'c1', name: 'Bench setup', variable: 1, fixed: 0, occurrence: 2 }], 1),
    ).toBe(true);
  });
  it('blocks when nothing is configured', () => {
    expect(canPromoteDefinitive([], [], 1)).toBe(false);
  });
  it('blocks when globalOccurrence is 0', () => {
    expect(canPromoteDefinitive([], [{ id: 'c1', name: 'x', variable: 1, fixed: 0, occurrence: 1 }], 0)).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- saveGate`
Expected: FAIL — `canPromoteDefinitive` not exported.

- [ ] **Step 4: Wire the helper into the panel**

In `src/components/estimation/EstimationPanel.tsx`, import it (line 25 region):

```ts
import { canSaveDraft, canPromoteDefinitive } from '../../lib/saveGate';
```

Replace lines 326-328:

```tsx
  const hasMinimumForDefinitive = canPromoteDefinitive(selections, customJUs, globalOccurrences);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- saveGate`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/saveGate.ts src/lib/__tests__/saveGate.test.ts src/components/estimation/EstimationPanel.tsx
git commit -m "fix(pev): allow definitive estimate with custom-JU-only line (HIW-174 K5)"
```

---

## Task 10: Single-cran inductor must not show "Select a cran" warning (K6)

Root cause: inductors added via "Load Inductors" (`addInductors`) start with `selectedCranId: null`. A single-cran inductor then renders a fixed cran label (no dropdown) yet still trips the `!sel.selectedCranId` branch → the amber "⚠ Select a cran to load Job Units" warning, with no control to act on it. `preloadSelections` already auto-selects single crans; `addInductors` should do the same.

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx:121-130` (`addInductors`)
- Test: `src/lib/__tests__/cranSelection.test.ts` (extend) — gate logic is already covered by `buildCranSelection`; add an `addInductors`-shape test in a panel-helper module if desired. Minimal path below tests `buildCranSelection` use.

- [ ] **Step 1: Auto-select the only cran when adding a single-cran inductor**

In `src/components/estimation/EstimationPanel.tsx`, update `addInductors` to seed single-cran selections via `buildCranSelection` (already imported at line 12):

```tsx
  const addInductors = useCallback((ids: string[]) => {
    setSelections((prev) => {
      const existingIds = prev.map((s) => s.inductorId);
      const toAdd: InductorSelection[] = ids
        .filter((id) => !existingIds.includes(id))
        .map((id) => {
          const inductor = INDUCTORS.find((i) => i.id === id);
          if (inductor && inductor.crans.length === 1) {
            return { inductorId: id, ...buildCranSelection(inductor, inductor.crans[0].id) };
          }
          return { inductorId: id, selectedCranId: null, inductorOccurrence: 1, juOccurrences: [] };
        });
      const toKeep = prev.filter((s) => ids.includes(s.inductorId));
      return [...toKeep, ...toAdd];
    });
  }, []);
```

- [ ] **Step 2: Defensive UI guard for the warning**

In `InductorTreeView` (around line 743-751), only show the amber "select a cran" warning when a dropdown is actually offered. Update the `else if` condition:

```tsx
            ) : (!sel.selectedCranId && shouldShowCranDropdown(availableCrans.length)) ? (
              <div className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-[10px] text-amber-700">
                {t('panel.selectCranWarning')}
              </div>
            ) : null}
```

(`shouldShowCranDropdown` is already imported at line 9.)

- [ ] **Step 3: Verify**

Run: `npm run test`
Expected: PASS. Manually: add a single-cran inductor via "Load Inductors" → no warning, JUs load immediately.

- [ ] **Step 4: Commit**

```bash
git add src/components/estimation/EstimationPanel.tsx
git commit -m "fix(pev): auto-select single cran on add, suppress stray warning (HIW-174 K6)"
```

---

## Task 11: Scrollable pre-save summary for many lines (K9)

Root cause: `PreSaveSummaryModal` renders one breakdown table per line with no height cap; with >8 lines the dialog overflows the viewport.

**Files:**
- Modify: `src/components/estimation/PreSaveSummaryModal.tsx:68-80`

- [ ] **Step 1: Wrap the per-line breakdown list in a scroll container**

In `src/components/estimation/PreSaveSummaryModal.tsx`, wrap the multi-line branch:

```tsx
      {lines && lines.length > 1 ? (
        <div className="mt-2 max-h-[50vh] overflow-y-auto pr-1">
          {lines.map((l) => {
            const rows = annualBreakdown(totals, l.spDate, l.durationMonths);
            return (
              <div key={l.id} className="mb-4">
                <h4 className="mb-1 text-xs font-semibold text-slate-700">{l.lineName}</h4>
                {renderBreakdownTable(rows)}
              </div>
            );
          })}
        </div>
      ) : (
        renderBreakdownTable(annualBreakdown(totals, spDate, durationMonths))
      )}
```

- [ ] **Step 2: Verify**

Run: `npm run test`
Expected: PASS. Manually: bulk-select 9+ compatible lines, Save draft → summary scrolls instead of clipping.

- [ ] **Step 3: Commit**

```bash
git add src/components/estimation/PreSaveSummaryModal.tsx
git commit -m "fix(pev): scrollable pre-save summary for bulk saves (HIW-174 K9)"
```

---

## Task 12: Fixture enrichment — Fixed values + KM/K€ unit JUs (G2, K11)

Root cause: no fixture JU carries a non-zero `fixed` (so `(Var×Occ)+Fixed` can't be visually validated — G2), and no fixture JU uses `kilometres`/`kiloeuros` unit types (so KM/K€ units never render — K11). Also `formatJuTotal` defaults `kiloeuros` to a days format.

**Files:**
- Read first: `src/fixtures/inductors.ts` (and `src/fixtures/crans.ts` / `src/fixtures/jobUnits.ts` if JUs live there)
- Modify: the fixture file(s) that define cran JUs
- Modify: `src/components/estimation/EstimationPanel.tsx:32-38` (`formatJuTotal`)

- [ ] **Step 1: Add the kiloeuros case to formatJuTotal**

In `src/components/estimation/EstimationPanel.tsx`, extend `formatJuTotal` (uses `formatKEuro`, already imported at line 8):

```tsx
function formatJuTotal(unit: string | undefined, value: number): string {
  switch (unit) {
    case 'bench_hours': return formatBenchHours(value);
    case 'kilometres': return formatKm(value);
    case 'kiloeuros': return formatKEuro(value);
    default: return formatDays(value);
  }
}
```

- [ ] **Step 2: Enrich fixtures**

Open `src/fixtures/inductors.ts` (read the JU shape first). For at least one existing cran's JU list:
- Set a non-zero `fixed` on one Man-Day JU (e.g. `variable: 2, fixed: 3, occurrence: 2` → total `7.0 d`, demonstrating `(2×2)+3`).
- Add one JU with `unit_type: 'kilometres'` (e.g. `variable: 10, fixed: 0`).
- Add one JU with `unit_type: 'kiloeuros'` (e.g. `variable: 1.5, fixed: 0`).

Keep ids unique and follow the existing JU object literal shape exactly (match neighboring entries' fields: `id`, `name`, `long_name`, `variable`, `fixed`, `occurrence`, `unit_type`).

- [ ] **Step 3: Verify calc + render**

Run: `npm run test`
Expected: PASS. Fix any fixture-count assertions in `src/fixtures/__tests__/*` that now see extra JUs.
Then manually open a line containing the enriched cran: the JU table shows `MD`, `BH`, `km`, `k€` units and the Fixed column is non-zero so the formula is verifiable.

- [ ] **Step 4: Run SDD kit validation (fixtures feed rule checks)**

Run: `pytest node_modules/great-sdd-kit/tests/ -v`
Expected: PASS. If a rule asserts on JU totals, reconcile the new values.

- [ ] **Step 5: Commit**

```bash
git add src/fixtures/inductors.ts src/components/estimation/EstimationPanel.tsx
git commit -m "fix(pev): add Fixed + KM/K€ unit JUs to validate formula and units (HIW-174 G2/K11)"
```

---

## Task 13: Copy carries prototype estimation (G3)

Root cause: `copyEstimation` copies the `Estimation` record (which includes `comments` via spread) but NOT the prototype estimation, which lives in a separate `prototypeEstimations` map.

**Files:**
- Modify: `src/store/dataStore.ts:89-108` (`copyEstimation`)
- Test: `src/store/__tests__/dataStore.copy.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/dataStore.copy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { useDataStore } from '../dataStore';

describe('copyEstimation', () => {
  it('copies the prototype estimation to targets (HIW-174 G3)', () => {
    const lines = useDataStore.getState().lines;
    const source = lines[0].id;
    const target = lines[1].id;

    useDataStore.getState().setEstimation(source, {
      lineId: source, inductorSelections: [], customJUs: [], globalOccurrences: 1,
      yearlyBreakdown: [], totalDays: 4, totalKEuro: 0, status: 'Draft',
    });
    useDataStore.getState().setPrototypeEstimation(source, {
      lineId: source, quantities: { proto1: 3 }, comment: 'from source',
    } as any);

    useDataStore.getState().copyEstimation(source, [target]);

    expect(useDataStore.getState().prototypeEstimations[target]?.quantities).toEqual({ proto1: 3 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- dataStore.copy`
Expected: FAIL — `prototypeEstimations[target]` is undefined.

- [ ] **Step 3: Copy the prototype estimation alongside the estimation**

In `src/store/dataStore.ts` `copyEstimation`, also clone the source's prototype estimation into each target:

```ts
  copyEstimation: (sourceId, targetIds) => {
    const src = get().estimations[sourceId];
    const srcLine = get().lines.find((l) => l.id === sourceId);
    if (!src || !srcLine) return;
    const srcProto = get().prototypeEstimations[sourceId];
    set((s) => {
      const updated = { ...s.estimations };
      const updatedProto = { ...s.prototypeEstimations };
      const updatedLines = s.lines.map((l) => {
        if (!targetIds.includes(l.id)) return l;
        updated[l.id] = { ...src, lineId: l.id, status: 'Draft' as LineStatus };
        if (srcProto) updatedProto[l.id] = { ...srcProto, lineId: l.id };
        return {
          ...l,
          status: 'Draft' as LineStatus,
          estimatedDays: src.totalDays,
          estimatedKEuro: src.totalKEuro,
          lastUpdatedAt: new Date().toISOString(),
        };
      });
      return { estimations: updated, lines: updatedLines, prototypeEstimations: updatedProto };
    });
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- dataStore.copy`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/dataStore.ts src/store/__tests__/dataStore.copy.test.ts
git commit -m "fix(pev): copy prototype estimation to target lines (HIW-174 G3)"
```

> **NOTE on comments (G3):** `copyEstimation` already spreads `...src`, so the source's `comments` are carried to targets today. The finding lists comments as not-copied — confirm the desired behavior with product: carrying governance comments across lines is questionable. If product wants comments excluded, add `comments: []` to the copied record; if they want them kept, no change. Do not change comment behavior without that decision.

---

## BLOCKED — needs decision before implementation

### K4 (bulk flow design)
Concrete safety fix is Task 8. The broader "bulk flow is not correct / possible missing requirements" needs a product definition of eligible statuses, mixed-selection handling, and skip-warnings. **Action:** raise as a question; do not invent the flow.

### K12 (legacy cycle import)
Reviewer: "the legacy cycle import does not work as the PRD indicates, but I'm not sure those calculations should be considered for the prototype → @Enrique Monereo". **Action:** wait for @Enrique Monereo to confirm whether the PRD's legacy recalculation rules (same JU unchanged → as-is; changed coefficients → recalc occurrence; orphaned JU → Custom JU; new JU under historical inductor → occurrence 0; new inductor absent → not added) are in prototype scope. Current code (`mergeLegacyEstimation` / `copyFromLegacy`) does a straight merge. No task until scoped.

---

## Self-Review

- **Spec coverage:** All 17 findings mapped (table above). 15 have concrete tasks; K4-flow and K12 are explicitly Blocked with rationale.
- **Type consistency:** New helper `canPromoteDefinitive(selections, customJUs, globalOccurrences)` used identically in Task 9 panel wiring. `bulkSetEstimation` signature unchanged (Task 8). `copyEstimation` signature unchanged (Task 13). `getGridColumns()` made arg-less (Task 4) — all call sites updated in the same task.
- **Placeholder scan:** Fixture exact values (Task 12) and `es.ts` exact strings (Tasks 1,2,4) require reading those files at execution time; each step says to mirror the neighboring shape — concrete enough, no invented APIs.
- **Cross-cutting:** Task 1 ("To do" is shorter) + `whitespace-nowrap` jointly resolve K13.
- **K10 resolved (no longer a question):** Researched the SDD kit — canonical unit is **FTE**, "EFT" is a reviewer typo, "ETP" is a localized synonym. Task 2 unifies on FTE, matching the existing `estReview.colTotalFte: 'Total FTE'`. The earlier FTE-vs-EFT open question is closed.
