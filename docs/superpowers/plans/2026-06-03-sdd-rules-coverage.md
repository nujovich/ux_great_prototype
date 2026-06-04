# SDD Rules Coverage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all rule gaps found between the frontend prototype and the great-sdd-kit business rules (74 rules across 6 specs).

**Architecture:** Pure-frontend fixes — no backend. Logic bugs fixed in `src/lib/`, UI gaps fixed in `src/pages/` and `src/components/`. New shared `useSortable` hook for TABLE rules. Admin page extended with inductor-delete tab, workload validation, HVT simulation, and email log view.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Zustand, Lucide React. Tests: `npm test` (vitest run). Python spec validation: `pytest node_modules/great-sdd-kit/tests/ -v`.

---

## Gap Audit (run before starting)

```bash
pytest node_modules/great-sdd-kit/tests/ -v   # should show 263 passed
npm test                                        # must pass before starting
```

## Complete Gap Map

| Rule | Violation | Location |
|------|-----------|----------|
| **BR-13** | `Math.max(globalOccurrences, 1)` prevents zero occurrence from contributing 0 | `src/lib/calc.ts:55` |
| **MGMT-BR-04** | H-NP and H-PROJECT included in Management View | `src/pages/ManagementPage.tsx:10` |
| **MGMT-BR-06** | Cycle selector shows historical cycles | `src/pages/ManagementPage.tsx` |
| **ERev-BR-07** | Rejection comments rendered in Rechazadas section | `src/pages/EstimationReviewPage.tsx` |
| **ERev-BR-10** | CPO Approve button sets Approved directly — must come from HVT only | `src/pages/EstimationReviewPage.tsx` |
| **FR-BR-03** | `byMetier` iterates all `lines`, not only `approvedLines` | `src/pages/FinalReviewPage.tsx:35` |
| **FR-BR-06/07/08** | No "Send Stage 3 to HVT" button | `src/pages/FinalReviewPage.tsx` |
| **ALLOC-BR-03** | FTE column missing (read-only from estimation) | `src/pages/AllocationPage.tsx` |
| **ALLOC-BR-04** | K€ not recalculated on dirty rows | `src/pages/AllocationPage.tsx` |
| **ALLOC-BR-05** | No dirty-row tracking | `src/pages/AllocationPage.tsx` |
| **ALLOC-BR-07** | No societe field → can't highlight FTE-without-societe | `src/pages/AllocationPage.tsx` |
| **ALLOC-BR-08** | No diversity dropdown | `src/pages/AllocationPage.tsx` |
| **ALLOC-BR-11** | No percentage-sum-to-100% validation on save | `src/pages/AllocationPage.tsx` |
| **ALLOC-BR-12** | No split undo (collapse to single row) | `src/pages/AllocationPage.tsx` |
| **ALLOC-BR-13** | No cost_type field → TC societe-mandatory rule unenforced | `src/pages/AllocationPage.tsx` |
| **ALLOC-BR-14** | No column filters | `src/pages/AllocationPage.tsx` |
| **ALLOC-BR-15** | AllocationPage doesn't filter by active cycle | `src/pages/AllocationPage.tsx` |
| **DEL-BR-01 to DEL-BR-10** | No inductor bulk-delete admin screen | `src/pages/AdminPage.tsx` |
| **WL-BR-02** | No `.xlsx` file type validation on upload | `src/pages/AdminPage.tsx` |
| **WL-BR-06** | No structural pre-validation before committing upload | `src/pages/AdminPage.tsx` |
| **TABLE-BR-01** | Tables lack column sorting and resizing | All grid tables |
| **TABLE-BR-02/03** | No explicit sort state persistence / reset described | All grid tables |
| **EMAIL-BR-03/04** | No email log display in frontend | `src/pages/AdminPage.tsx` |

---

## File Map

**Create:**
- `src/fixtures/societes.ts` — SOCIETES list + DIVERSITY_OPTIONS
- `src/fixtures/emailLog.ts` — EmailLogEntry type + mock data
- `src/lib/allocationCalc.ts` — pure K€ calc + save validation
- `src/lib/useSortable.ts` — shared sort hook for all grids
- `src/lib/__tests__/calc.test.ts` — BR-13 regression test
- `src/lib/__tests__/allocationCalc.test.ts` — ALLOC-BR-04/06/07/13 tests
- `src/lib/__tests__/useSortable.test.ts` — sort hook tests
- `src/components/admin/InductorDeleteTab.tsx` — DEL-BR rules

**Modify:**
- `src/lib/calc.ts` — BR-13 fix
- `src/types/index.ts` — add AllocationRow, keep AllocationSplit
- `src/fixtures/allocations.ts` — migrate to AllocationRow
- `src/fixtures/roles.ts` — remove approve:estimation from CPO, add simulate:hvt-approval to Admin
- `src/fixtures/__tests__/roles.test.ts` — update CPO approve test + add ERev-BR-10 test
- `src/store/dataStore.ts` — update setAllocation for AllocationRow, add simulateHvtApproval
- `src/pages/EstimationReviewPage.tsx` — ERev-BR-07/10
- `src/pages/FinalReviewPage.tsx` — FR-BR-03, FR-BR-06/07/08
- `src/pages/ManagementPage.tsx` — MGMT-BR-04/06
- `src/pages/AllocationPage.tsx` — full rebuild for ALLOC rules
- `src/pages/AdminPage.tsx` — inductor tab, workload validation, HVT sim, email log

---

## Task 1: Fix BR-13 — zero occurrence bug in calc.ts

**Files:**
- Modify: `src/lib/calc.ts:55`
- Create: `src/lib/__tests__/calc.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/calc.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calcTotalDays } from '../calc';
import type { InductorSelection, PrototypeInductor, CustomJU } from '../../types';

describe('calcTotalDays (BR-13: zero occurrence)', () => {
  it('zero globalOccurrences contributes zero to the output (BR-13)', () => {
    const selections: InductorSelection[] = [
      {
        inductorId: 'ind-1',
        selectedCranId: 'cr-1-1',
        inductorOccurrence: 1,
        juOccurrences: [],
      },
    ];
    const inductors: PrototypeInductor[] = [
      {
        id: 'ind-1',
        name: 'Test inductor',
        category: 'Test',
        crans: [
          {
            id: 'cr-1-1',
            name: 'Test cran',
            jus: [{ id: 'ju-1', name: 'JU 1', long_name: 'JU 1', occurrence: 2.0 }],
          },
        ],
      },
    ];
    const customJUs: CustomJU[] = [];

    expect(calcTotalDays(selections, inductors, customJUs, 0)).toBe(0);
  });

  it('non-zero globalOccurrences multiplies normally', () => {
    const selections: InductorSelection[] = [
      {
        inductorId: 'ind-1',
        selectedCranId: 'cr-1-1',
        inductorOccurrence: 1,
        juOccurrences: [],
      },
    ];
    const inductors: PrototypeInductor[] = [
      {
        id: 'ind-1',
        name: 'Test inductor',
        category: 'Test',
        crans: [
          {
            id: 'cr-1-1',
            name: 'Test cran',
            jus: [{ id: 'ju-1', name: 'JU 1', long_name: 'JU 1', occurrence: 2.0 }],
          },
        ],
      },
    ];
    const customJUs: CustomJU[] = [];

    expect(calcTotalDays(selections, inductors, customJUs, 3)).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/calc.test.ts
```

Expected: FAIL — `calcTotalDays(..., 0)` returns 2 (not 0) because `Math.max(0, 1)` forces minimum 1.

- [ ] **Step 3: Fix calc.ts**

In `src/lib/calc.ts`, find line 55 (the `return` statement at the bottom of `calcTotalDays`):

```typescript
// BEFORE:
return (inductorDays + customDays) * Math.max(globalOccurrences, 1);

// AFTER:
return (inductorDays + customDays) * (globalOccurrences <= 0 ? 0 : globalOccurrences);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/calc.test.ts
```

Expected: PASS (both tests green).

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/calc.ts src/lib/__tests__/calc.test.ts
git commit -m "fix(calc): BR-13 — zero globalOccurrences now contributes zero to estimation output"
```

---

## Task 2: Fix MGMT-BR-04 + MGMT-BR-06 — Management View

**Files:**
- Modify: `src/pages/ManagementPage.tsx:10` (METIERS) and the cycle selector

- [ ] **Step 1: Write the failing test**

Add a test file `src/pages/__tests__/ManagementPage.test.ts` — but since this is a pure constant change, verify via code reading first. Instead, write a unit test for the constants:

Create `src/pages/__tests__/management.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('ManagementPage — MGMT-BR-04', () => {
  it('H-NP and H-PROJECT are excluded from Management View metiers', () => {
    // These are the only allowed metiers per MGMT-BR-04
    const ALLOWED_MGMT_METIERS = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-CUSTOMER', 'H-TESTING'];
    expect(ALLOWED_MGMT_METIERS).not.toContain('H-NP');
    expect(ALLOWED_MGMT_METIERS).not.toContain('H-PROJECT');
    expect(ALLOWED_MGMT_METIERS).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it passes immediately (it's a spec test)**

```bash
npx vitest run src/pages/__tests__/management.test.ts
```

Expected: PASS (spec test, validates our intent).

- [ ] **Step 3: Fix ManagementPage.tsx**

In `src/pages/ManagementPage.tsx`, make the following changes:

```typescript
// BEFORE line 10:
const METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-PROJECT', 'H-CUSTOMER', 'H-TESTING', 'H-NP'];

// AFTER (MGMT-BR-04: H-NP and H-PROJECT excluded):
const METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-CUSTOMER', 'H-TESTING'];
```

Then in `ManagementContent`, remove the cycle selector state + FilterSelect for cycles, and replace with active-cycle-only logic:

```typescript
// REMOVE these lines:
// const [cycleId, setCycleId] = useState<string>('cyc-2026h1');

// ADD instead:
const activeCycleId = useDataStore((s) => s.cycles.find((c) => c.is_active)?.id ?? '');

// UPDATE the filtered useMemo to use activeCycleId instead of cycleId:
const filtered = useMemo(
  () =>
    lines.filter(
      (l) =>
        l.cycleId === activeCycleId &&   // MGMT-BR-06: active cycle only
        (statusFilter === 'all' || l.status === statusFilter) &&
        (metierFilter === 'all' || l.metier === metierFilter),
    ),
  [lines, activeCycleId, statusFilter, metierFilter],
);
```

Also remove the `<FilterSelect label="Cycle" ...>` block from the JSX (the one that renders cycle options). Keep only the status and metier filter selects.

Remove the import of `CYCLES` from fixtures/cycles since it's no longer needed.

- [ ] **Step 4: Run npm test to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ManagementPage.tsx src/pages/__tests__/management.test.ts
git commit -m "fix(management): MGMT-BR-04 exclude H-NP/H-PROJECT, MGMT-BR-06 active cycle only"
```

---

## Task 3: Fix ERev-BR-07 + ERev-BR-10 — Estimation Review compliance

**Files:**
- Modify: `src/fixtures/roles.ts`
- Modify: `src/fixtures/__tests__/roles.test.ts`
- Modify: `src/store/dataStore.ts`
- Modify: `src/pages/EstimationReviewPage.tsx`

### ERev-BR-10: CPO cannot approve directly — approval comes from HVT only.
### ERev-BR-07: Rejection comments not shown in the Estimation Review grid.

- [ ] **Step 1: Update roles — remove approve:estimation from CPO, add simulate:hvt-approval to Admin**

In `src/fixtures/roles.ts`:

```typescript
// ADD to the Permission union type:
| 'simulate:hvt-approval'    // Admin-only: simulate HVT sending approval back

// REMOVE 'approve:estimation' from CPO's permissions array:
CPO: [
  'view:estimation-review',
  'export:estimation-review',
  'reject:estimation',        // CPO can still reject
  // 'approve:estimation'     // REMOVED — ERev-BR-10: approval is HVT-only
  'view:final-review',
  'export:final-review',
],

// ADD 'simulate:hvt-approval' to Admin's permissions array:
Admin: [
  // ...existing permissions...
  'simulate:hvt-approval',    // Admin can simulate HVT approval in prototype
],
```

- [ ] **Step 2: Update roles test**

In `src/fixtures/__tests__/roles.test.ts`, find the CPO approve test (around line 39) and update:

```typescript
// REPLACE:
it('only CPO can reject/approve (prototype simulates HVT)', () => {
  expect(can('CPO', 'reject:estimation')).toBe(true);
});

// WITH:
it('CPO can reject estimations', () => {
  expect(can('CPO', 'reject:estimation')).toBe(true);
});

it('CPO cannot approve directly — approval comes via HVT only (ERev-BR-10)', () => {
  expect(can('CPO', 'approve:estimation')).toBe(false);
});

it('only Admin can simulate HVT approval in prototype (ERev-BR-10)', () => {
  expect(can('Admin', 'simulate:hvt-approval')).toBe(true);
  expect(can('PMO', 'simulate:hvt-approval')).toBe(false);
  expect(can('CPO', 'simulate:hvt-approval')).toBe(false);
});
```

- [ ] **Step 3: Add simulateHvtApproval to dataStore**

In `src/store/dataStore.ts`, add to the interface and implementation:

```typescript
// ADD to DataState interface:
simulateHvtApproval: (lineIds: string[]) => void;

// ADD to the create() implementation:
simulateHvtApproval: (lineIds) =>
  set((s) => ({
    lines: s.lines.map((l) =>
      lineIds.includes(l.id) && l.status === 'Sent'
        ? { ...l, status: 'Approved' as LineStatus, lastUpdatedAt: new Date().toISOString() }
        : l,
    ),
  })),
```

- [ ] **Step 4: Fix EstimationReviewPage**

In `src/pages/EstimationReviewPage.tsx`:

**ERev-BR-10**: Remove the CPO Approve button and the CPO approval section. Replace with a note:

```typescript
// REMOVE the entire CPO panel section:
// {can('reject:estimation') && groups.sent.length > 0 && (
//   <Section title={t('estReview.cpoPanel')} ... renderActions={(l) => (
//     <div>
//       <Button onClick={() => setLineStatus(l.id, 'Approved')}>Approve</Button>
//       <Button onClick={() => setRejectTarget(l)}>Reject</Button>
//     </div>
//   )} />
// )}
```

Replace it with a "sent" section that shows CPO can only reject from GREAT:

```typescript
{can('reject:estimation') && groups.sent.length > 0 && (
  <Section
    title={t('estReview.cpoPanel')}
    description={t('estReview.cpoPanelDesc')}
    emptyText={t('estReview.noSent')}
    lines={groups.sent}
    renderActions={(l) => (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="danger"
          onClick={() => setRejectTarget(l)}
        >
          <XCircle size={14} /> {t('estReview.reject')}
        </Button>
      </div>
    )}
  />
)}
```

**ERev-BR-07**: In the Rechazadas `<Section>`, remove the `renderActions` that shows the rejection comment text — comments should not be shown per spec:

```typescript
// BEFORE:
<Section
  title={t('estReview.rejected')}
  ...
  lines={groups.rejected}
  emptyText={t('estReview.noRejected')}
  renderActions={(l) => (
    <div className="flex items-start gap-2 text-xs text-red-700 max-w-md">
      <MessageSquare size={14} className="mt-0.5 shrink-0" />
      <span>{l.rejectionComment}</span>
    </div>
  )}
/>

// AFTER (ERev-BR-07: rejection comments not shown in this grid):
<Section
  title={t('estReview.rejected')}
  description={t('estReview.rejectedDesc')}
  lines={groups.rejected}
  emptyText={t('estReview.noRejected')}
/>
```

Also remove `MessageSquare` from the lucide import if it's no longer used elsewhere on this page.

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/fixtures/__tests__/roles.test.ts
npm test
```

Expected: all tests pass including the 3 new role tests.

- [ ] **Step 6: Commit**

```bash
git add src/fixtures/roles.ts src/fixtures/__tests__/roles.test.ts src/store/dataStore.ts src/pages/EstimationReviewPage.tsx
git commit -m "fix(estimation-review): ERev-BR-07 hide rejection comments, ERev-BR-10 remove direct CPO approve"
```

---

## Task 4: Fix FR-BR-03 + add Stage 3 Send (FR-BR-06/07/08)

**Files:**
- Modify: `src/pages/FinalReviewPage.tsx`
- Modify: `src/pages/AdminPage.tsx` (add HVT simulation tab)

### FR-BR-03: Summary must show only Approved lines.
### FR-BR-06/07/08: Send Stage 3 button — non-blocking, re-sendable, sends entire active cycle.

- [ ] **Step 1: Fix FR-BR-03 in FinalReviewPage**

In `src/pages/FinalReviewPage.tsx`, find the `byMetier` useMemo (around line 35):

```typescript
// BEFORE:
const byMetier = useMemo(() => {
  const map = new Map<Metier, { count: number; days: number; kEuro: number }>();
  lines.forEach((l) => {    // BUG: uses all lines
    if (l.estimatedDays == null) return;
    ...
  });
  ...
}, [lines]);

// AFTER (FR-BR-03: Approved lines only):
const byMetier = useMemo(() => {
  const map = new Map<Metier, { count: number; days: number; kEuro: number }>();
  approvedLines.forEach((l) => {    // FIX: use only approved lines
    if (l.estimatedDays == null) return;
    const cur = map.get(l.metier) ?? { count: 0, days: 0, kEuro: 0 };
    cur.count += 1;
    cur.days += l.estimatedDays;
    cur.kEuro += l.estimatedKEuro ?? 0;
    map.set(l.metier, cur);
  });
  return [...map.entries()].sort((a, b) => b[1].kEuro - a[1].kEuro);
}, [approvedLines]);  // dependency is approvedLines, not lines
```

- [ ] **Step 2: Add Stage 3 Send button (FR-BR-06/07/08)**

In `src/pages/FinalReviewPage.tsx`, add the following imports and functionality:

```typescript
// ADD imports:
import { Send } from 'lucide-react';
import { Button } from '../components/shared/Button';
import { useUIStore } from '../store/uiStore';
```

In `FinalReviewContent`, add:

```typescript
const can = useRoleStore((s) => s.can);
const pushToast = useUIStore((s) => s.pushToast);

function handleSendStage3() {
  // FR-BR-06: non-blocking — sends even if allocation is incomplete
  // FR-BR-07: re-sendable — each send transmits current state
  // FR-BR-08: sends entire active cycle (approvedLines)
  pushToast(
    `Stage 3 enviado al HVT — ${approvedLines.length} línea(s) aprobadas del ciclo ${activeCycleId}`,
    'success',
  );
}
```

In the JSX header, alongside the existing CSV export button:

```typescript
{can('export:final-review') && (
  <Button variant="secondary" onClick={() => exportToCsv(approvedLines, `final-review-${activeCycleId}.csv`)}>
    <Download size={14} /> {t('finalReview.exportCsv')}
  </Button>
)}
{can('send:stage3') && (
  <Button variant="primary" onClick={handleSendStage3}>
    <Send size={14} /> {t('finalReview.sendStage3')}
  </Button>
)}
```

Add translation key `finalReview.sendStage3` to both `src/i18n/en.ts` and `src/i18n/es.ts`:

```typescript
// en.ts — add to finalReview section:
'finalReview.sendStage3': 'Send Stage 3 to HVT',

// es.ts — add to finalReview section:
'finalReview.sendStage3': 'Enviar Stage 3 al HVT',
```

- [ ] **Step 3: Add HVT Simulation to AdminPage (complement to ERev-BR-10 fix)**

In `src/pages/AdminPage.tsx`, add a new `'hvt'` tab for Admin only:

```typescript
// ADD to allTabs array:
{ key: 'hvt', label: t('admin.tabHvt'), requiresAdmin: true },
```

Add translation keys:
```typescript
// en.ts:
'admin.tabHvt': 'HVT Simulation',
'admin.hvtDesc': 'Simulate HVT processing Sent → Approved (prototype only — ERev-BR-10)',
'admin.hvtApproveAll': 'Approve all Sent',
'admin.hvtNoSent': 'No lines in Sent status',

// es.ts:
'admin.tabHvt': 'Simulación HVT',
'admin.hvtDesc': 'Simular procesamiento HVT Sent → Approved (solo prototipo — ERev-BR-10)',
'admin.hvtApproveAll': 'Aprobar todas las Sent',
'admin.hvtNoSent': 'No hay líneas en estado Sent',
```

Add the `HvtSimulationTab` component at the bottom of `src/pages/AdminPage.tsx`:

```typescript
function HvtSimulationTab() {
  const lines = useDataStore((s) => s.lines);
  const simulateHvtApproval = useDataStore((s) => s.simulateHvtApproval);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  const sentLines = lines.filter((l) => l.status === 'Sent');

  function handleApproveAll() {
    const ids = sentLines.map((l) => l.id);
    simulateHvtApproval(ids);
    pushToast(`HVT simulado: ${ids.length} línea(s) → Approved`, 'success');
  }

  if (sentLines.length === 0) {
    return <EmptyState title={t('admin.hvtNoSent')} />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm text-amber-800">{t('admin.hvtDesc')}</p>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleApproveAll}>
          <CheckCircle2 size={14} /> {t('admin.hvtApproveAll')} ({sentLines.length})
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Line</th>
              <th className="px-3 py-2 text-left font-medium">Métier</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sentLines.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-3 py-2.5 font-medium">{l.lineName}</td>
                <td className="px-3 py-2.5">{l.metier}</td>
                <td className="px-3 py-2.5"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Add `import { CheckCircle2 } from 'lucide-react'` to AdminPage imports (if not already there).

Add the tab render in AdminContent:
```typescript
{tab === 'hvt' && <HvtSimulationTab />}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/FinalReviewPage.tsx src/pages/AdminPage.tsx src/i18n/en.ts src/i18n/es.ts
git commit -m "fix(final-review): FR-BR-03 approved-only summary; feat: FR-BR-06/07/08 Stage 3 send + ERev-BR-10 HVT simulation"
```

---

## Task 5: AllocationRow type + fixtures + store update

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/fixtures/societes.ts`
- Modify: `src/fixtures/allocations.ts`
- Modify: `src/store/dataStore.ts`

### Prerequisite for all ALLOC rules. Extends AllocationSplit with societe/costType/diversity/FTE/K€/isDirty.

- [ ] **Step 1: Create societes fixture**

Create `src/fixtures/societes.ts`:

```typescript
export const SOCIETES = [
  'Horse Spain S.L.-Valladolid',
  'Renault SAS-Paris',
  'Renault Technology Romania-Bucharest',
  'RNBV-Amsterdam',
  'Renault Korea-Busan',
] as const;

export type Societe = typeof SOCIETES[number];

export const DIVERSITY_OPTIONS = [
  'Standard',
  'Diversity Enhanced',
  'International',
] as const;
```

- [ ] **Step 2: Add AllocationRow to types/index.ts**

In `src/types/index.ts`, after the existing `AllocationSplit` interface (around line 171):

```typescript
// KEEP existing AllocationSplit (used by SplitModal internals)
export interface AllocationSplit {
  engineerId: string;
  percentage: number;
  days: number;
}

// NEW: full allocation row with all ALLOC spec fields
export interface AllocationRow extends AllocationSplit {
  id: string;                   // unique row ID within the allocation
  fte: number;                  // read-only: days / 209 (ALLOC-BR-03)
  societe: string | null;       // ALLOC-BR-07: FTE without societe is warned
  costType: CostType;           // ALLOC-BR-06/13: TSA/TC without societe blocks save
  diversity: string | null;     // ALLOC-BR-08: non-blocking
  keuro: number;                // ALLOC-BR-04: recalculated on save
  isDirty: boolean;             // ALLOC-BR-05: tracks unsaved changes
}

// CHANGE Allocation to use AllocationRow
export interface Allocation {
  lineId: string;
  splits: AllocationRow[];      // was AllocationSplit[]
}
```

- [ ] **Step 3: Migrate allocations fixture**

Replace `src/fixtures/allocations.ts` with:

```typescript
import type { Allocation } from '../types';

const FTE_DIVISOR = 209;

function makeRow(
  id: string,
  engineerId: string,
  percentage: number,
  days: number,
  societe: string | null = null,
  costType: 'FTE' | 'TSA' | 'TC' = 'FTE',
): Allocation['splits'][0] {
  return {
    id,
    engineerId,
    percentage,
    days,
    fte: Math.round((days / FTE_DIVISOR) * 100) / 100,
    societe,
    costType,
    diversity: null,
    keuro: 0,    // recalculated on first save
    isDirty: false,
  };
}

export const ALLOCATIONS: Allocation[] = [
  {
    lineId: 'PL-024',
    splits: [makeRow('row-024-1', 'eng-2', 100, 10, 'Renault SAS-Paris', 'FTE')],
  },
  {
    lineId: 'PL-025',
    splits: [
      makeRow('row-025-1', 'eng-3', 60, 21, 'Horse Spain S.L.-Valladolid', 'TSA'),
      makeRow('row-025-2', 'eng-4', 40, 14, null, 'FTE'),
    ],
  },
  {
    lineId: 'PL-026',
    splits: [makeRow('row-026-1', 'eng-7', 100, 12, 'RNBV-Amsterdam', 'TC')],
  },
];
```

- [ ] **Step 4: Update dataStore**

In `src/store/dataStore.ts`, the `setAllocation` and `bulkAssign` functions need updates:

```typescript
// setAllocation signature stays the same (splits: AllocationRow[])
// Update bulkAssign to only update societe, never costType (ALLOC-BR-09/10):
bulkAssign: (lineIds, engineerId) =>
  set((s) => ({
    allocations: s.allocations.map((a) => {
      if (!lineIds.includes(a.lineId)) return a;
      return {
        ...a,
        splits: a.splits.map((sp) => ({
          ...sp,
          societe: engineerId,   // engineerId field reused as societeId for bulk-assign (ALLOC-BR-09)
          isDirty: true,         // mark dirty (ALLOC-BR-05)
          // costType intentionally not changed (ALLOC-BR-10)
        })),
      };
    }),
  })),
```

Note: `bulkAssign` in the store currently sets `engineerId`. For the allocation page, we'll add a separate `bulkAssignSociete` action:

```typescript
// ADD to DataState interface:
bulkAssignSociete: (lineIds: string[], societe: string) => void;

// ADD implementation:
bulkAssignSociete: (lineIds, societe) =>
  set((s) => ({
    allocations: s.allocations.map((a) => {
      if (!lineIds.includes(a.lineId)) return a;
      return {
        ...a,
        splits: a.splits.map((sp) => ({
          ...sp,
          societe,          // overwrite societe (ALLOC-BR-09)
          isDirty: true,    // ALLOC-BR-05
          // costType unchanged (ALLOC-BR-10)
        })),
      };
    }),
  })),

// ADD saveDirtyAllocations:
saveDirtyAllocations: (lineId: string, splits: AllocationRow[]) =>
  set((s) => {
    const exists = s.allocations.find((a) => a.lineId === lineId);
    const cleaned = splits.map((sp) => ({ ...sp, isDirty: false }));
    if (exists) {
      return { allocations: s.allocations.map((a) => (a.lineId === lineId ? { ...a, splits: cleaned } : a)) };
    }
    return { allocations: [...s.allocations, { lineId, splits: cleaned }] };
  }),
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all tests pass (type changes might break compilation — fix any TypeScript errors before committing).

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/fixtures/societes.ts src/fixtures/allocations.ts src/store/dataStore.ts
git commit -m "feat(allocation): add AllocationRow type with societe/costType/diversity/FTE/K€/isDirty fields"
```

---

## Task 6: AllocationCalc — pure calculation functions

**Files:**
- Create: `src/lib/allocationCalc.ts`
- Create: `src/lib/__tests__/allocationCalc.test.ts`

### Covers ALLOC-BR-04 (K€ recalc), ALLOC-BR-06/13 (TSA/TC save validation), ALLOC-BR-07 (FTE warning).

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/allocationCalc.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  calcRowKeuro,
  validateAllocationSave,
  rowNeedsWarning,
} from '../allocationCalc';
import type { AllocationRow } from '../../types';

function row(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1',
    engineerId: 'eng-1',
    percentage: 100,
    days: 209,
    fte: 1.0,
    societe: null,
    costType: 'FTE',
    diversity: null,
    keuro: 0,
    isDirty: false,
    ...overrides,
  };
}

describe('calcRowKeuro (ALLOC-BR-04)', () => {
  it('K€ = FTE × rate', () => {
    expect(calcRowKeuro(209, 0.85)).toBeCloseTo(0.85);
  });

  it('zero days gives zero K€', () => {
    expect(calcRowKeuro(0, 0.85)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calcRowKeuro(100, 0.85)).toBeCloseTo(0.41);
  });
});

describe('validateAllocationSave (ALLOC-BR-06/13)', () => {
  it('TSA without societe blocks save', () => {
    const result = validateAllocationSave([row({ costType: 'TSA', societe: null })]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('TSA');
  });

  it('TC without societe blocks save (ALLOC-BR-13)', () => {
    const result = validateAllocationSave([row({ costType: 'TC', societe: null })]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('TC');
  });

  it('FTE without societe does NOT block save (ALLOC-BR-07)', () => {
    const result = validateAllocationSave([row({ costType: 'FTE', societe: null })]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('TSA with societe is valid', () => {
    const result = validateAllocationSave([row({ costType: 'TSA', societe: 'Renault SAS-Paris' })]);
    expect(result.valid).toBe(true);
  });

  it('empty rows array is valid', () => {
    expect(validateAllocationSave([]).valid).toBe(true);
  });
});

describe('rowNeedsWarning (ALLOC-BR-07)', () => {
  it('FTE row with fte > 0 and no societe triggers warning', () => {
    expect(rowNeedsWarning(row({ costType: 'FTE', fte: 1.0, societe: null }))).toBe(true);
  });

  it('FTE row with societe does not trigger warning', () => {
    expect(rowNeedsWarning(row({ costType: 'FTE', fte: 1.0, societe: 'Renault SAS-Paris' }))).toBe(false);
  });

  it('zero FTE does not trigger warning', () => {
    expect(rowNeedsWarning(row({ costType: 'FTE', fte: 0, societe: null }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/allocationCalc.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create allocationCalc.ts**

Create `src/lib/allocationCalc.ts`:

```typescript
import type { AllocationRow } from '../types';

const FTE_DIVISOR = 209;

export function calcRowKeuro(days: number, metierRate: number): number {
  if (days <= 0 || metierRate <= 0) return 0;
  return Math.round((days / FTE_DIVISOR) * metierRate * 100) / 100;
}

export function calcRowFte(days: number): number {
  return days > 0 ? Math.round((days / FTE_DIVISOR) * 100) / 100 : 0;
}

export function validateAllocationSave(rows: AllocationRow[]): { valid: boolean; errors: string[] } {
  const errors = rows
    .filter((r) => (r.costType === 'TSA' || r.costType === 'TC') && !r.societe)
    .map((r) => `Row ${r.id}: ${r.costType} requires a societe (ALLOC-BR-06/ALLOC-BR-13)`);
  return { valid: errors.length === 0, errors };
}

export function rowNeedsWarning(row: AllocationRow): boolean {
  return row.costType === 'FTE' && row.fte > 0 && !row.societe;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/allocationCalc.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/allocationCalc.ts src/lib/__tests__/allocationCalc.test.ts
git commit -m "feat(allocation): add allocationCalc with K€ formula, save validation, and warning logic"
```

---

## Task 7: Rebuild AllocationPage (ALLOC-BR-03/04/05/07/08/13/14/15)

**Files:**
- Modify: `src/pages/AllocationPage.tsx` — complete rewrite
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`

This task replaces the current `AllocationPage` with a proper inline-editing grid.

- [ ] **Step 1: Add translation keys**

In `src/i18n/en.ts`, add to the alloc section:

```typescript
'alloc.colFte': 'FTE',
'alloc.colSociete': 'Société',
'alloc.colCostType': 'Cost Type',
'alloc.colDiversity': 'Diversity',
'alloc.colKeuro': 'K€',
'alloc.unsaved': 'Unsaved',
'alloc.saveAll': 'Save',
'alloc.bulkSociete': 'Bulk assign société',
'alloc.bulkSocieteApply': 'Apply to selected',
'alloc.saveFailed': 'Save blocked: {n} row(s) missing société (ALLOC-BR-06/13)',
'alloc.saveSuccess': 'Allocation saved — {n} row(s) updated',
'alloc.filterMetier': 'Filter Métier',
'alloc.noCycle': 'No active cycle',
```

In `src/i18n/es.ts`, mirror in Spanish:

```typescript
'alloc.colFte': 'FTE',
'alloc.colSociete': 'Société',
'alloc.colCostType': 'Tipo de Costo',
'alloc.colDiversity': 'Diversidad',
'alloc.colKeuro': 'K€',
'alloc.unsaved': 'Sin guardar',
'alloc.saveAll': 'Guardar',
'alloc.bulkSociete': 'Asignar société en masa',
'alloc.bulkSocieteApply': 'Aplicar a seleccionadas',
'alloc.saveFailed': 'Guardado bloqueado: {n} fila(s) sin société (ALLOC-BR-06/13)',
'alloc.saveSuccess': 'Asignación guardada — {n} fila(s) actualizadas',
'alloc.filterMetier': 'Filtrar Métier',
'alloc.noCycle': 'Sin ciclo activo',
```

- [ ] **Step 2: Rewrite AllocationPage**

Replace the entire content of `src/pages/AllocationPage.tsx` with:

```typescript
import { useMemo, useState } from 'react';
import { Save, Users } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';
import { Modal } from '../components/shared/Modal';
import { formatKEuro } from '../lib/format';
import { validateAllocationSave, calcRowKeuro, calcRowFte, rowNeedsWarning } from '../lib/allocationCalc';
import { K_EURO_RATES } from '../fixtures/cycles';
import { SOCIETES, DIVERSITY_OPTIONS } from '../fixtures/societes';
import { useT } from '../i18n/useT';
import type { AllocationRow, Metier } from '../types';

export function AllocationPage() {
  return (
    <RoleGate permission="view:allocation">
      <AllocationContent />
    </RoleGate>
  );
}

function AllocationContent() {
  const lines = useDataStore((s) => s.lines);
  const allocations = useDataStore((s) => s.allocations);
  const cycles = useDataStore((s) => s.cycles);
  const saveDirtyAllocations = useDataStore((s) => s.saveDirtyAllocations);
  const bulkAssignSociete = useDataStore((s) => s.bulkAssignSociete);
  const can = useRoleStore((s) => s.can);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  // ALLOC-BR-15: active cycle only
  const activeCycleId = cycles.find((c) => c.is_active)?.id;

  // ALLOC-BR-01: only Approved lines from active cycle
  const allocatableLines = useMemo(
    () => lines.filter((l) => l.status === 'Approved' && l.cycleId === activeCycleId),
    [lines, activeCycleId],
  );

  // ALLOC-BR-14: filter by métier
  const [metierFilter, setMetierFilter] = useState<Metier | 'all'>('all');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [bulkSociete, setBulkSociete] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Local editable state (ALLOC-BR-05: dirty-row tracking)
  const [localRows, setLocalRows] = useState<Record<string, AllocationRow[]>>(() => {
    const init: Record<string, AllocationRow[]> = {};
    allocatableLines.forEach((l) => {
      const alloc = allocations.find((a) => a.lineId === l.id);
      init[l.id] = alloc?.splits ?? [];
    });
    return init;
  });

  const filteredLines = useMemo(
    () => allocatableLines.filter((l) => metierFilter === 'all' || l.metier === metierFilter),
    [allocatableLines, metierFilter],
  );

  const allMetiers = useMemo(
    () => [...new Set(allocatableLines.map((l) => l.metier))] as Metier[],
    [allocatableLines],
  );

  function getRateForMetier(metier: Metier): number {
    return K_EURO_RATES.find((r) => r.metier === metier)?.rate ?? 0;
  }

  function updateRow(lineId: string, rowId: string, patch: Partial<AllocationRow>) {
    setLocalRows((prev) => ({
      ...prev,
      [lineId]: (prev[lineId] ?? []).map((r) =>
        r.id === rowId
          ? {
              ...r,
              ...patch,
              isDirty: true,    // ALLOC-BR-05
            }
          : r,
      ),
    }));
  }

  function handleSave(lineId: string) {
    const rows = localRows[lineId] ?? [];
    const rate = getRateForMetier(lines.find((l) => l.id === lineId)!.metier);

    // ALLOC-BR-11: percentages must sum to 100%
    if (rows.length > 0) {
      const totalPct = rows.reduce((acc, r) => acc + r.percentage, 0);
      if (totalPct !== 100) {
        pushToast(`Split percentages must sum to 100% — currently ${totalPct}% (ALLOC-BR-11)`, 'error');
        return;
      }
    }

    // ALLOC-BR-04: recalculate K€ for dirty rows only
    const withKeuro = rows.map((r) =>
      r.isDirty ? { ...r, keuro: calcRowKeuro(r.days, rate) } : r,
    );

    const validation = validateAllocationSave(withKeuro);
    if (!validation.valid) {
      pushToast(t('alloc.saveFailed', { n: String(validation.errors.length) }), 'error');
      return;
    }

    const dirtyCount = withKeuro.filter((r) => r.isDirty).length;
    saveDirtyAllocations(lineId, withKeuro);
    setLocalRows((prev) => ({ ...prev, [lineId]: withKeuro.map((r) => ({ ...r, isDirty: false })) }));
    pushToast(t('alloc.saveSuccess', { n: String(dirtyCount) }), 'success');
  }

  // ALLOC-BR-12: split undo — collapses to single row restoring 100% (full delete of split)
  function handleUndoSplit(lineId: string) {
    setLocalRows((prev) => {
      const rows = prev[lineId] ?? [];
      if (rows.length <= 1) return prev;
      // Restore to single row: keep first row, set percentage=100, mark dirty
      const first = { ...rows[0], percentage: 100, isDirty: true };
      return { ...prev, [lineId]: [first] };
    });
  }

  function handleBulkAssign() {
    if (!bulkSociete) return;
    // ALLOC-BR-09: bulk assign overwrites societe on selected rows
    // ALLOC-BR-10: never changes costType
    setLocalRows((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((lineId) => {
        updated[lineId] = updated[lineId].map((r) =>
          selectedRowIds.includes(r.id)
            ? { ...r, societe: bulkSociete, isDirty: true }
            : r,
        );
      });
      return updated;
    });
    setSelectedRowIds([]);
    setBulkSociete('');
    setShowBulkModal(false);
    pushToast(`Société asignada a ${selectedRowIds.length} fila(s)`, 'success');
  }

  if (!activeCycleId) {
    return <EmptyState title={t('alloc.noCycle')} />;
  }

  if (allocatableLines.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">{t('alloc.title')}</h1>
        <EmptyState title={t('alloc.noLines')} description={t('alloc.noLinesDesc')} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('alloc.title')}</h1>
          <p className="text-sm text-slate-600">{t('alloc.subtitle')}</p>
        </div>
        {can('edit:allocation') && selectedRowIds.length > 0 && (
          <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
            <Users size={14} /> {t('alloc.bulkSociete')} ({selectedRowIds.length})
          </Button>
        )}
      </div>

      {/* ALLOC-BR-14: filters — persist across in-page actions */}
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500">{t('alloc.filterMetier')}</label>
          <select
            value={metierFilter}
            onChange={(e) => setMetierFilter(e.target.value as Metier | 'all')}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="all">All</option>
            {allMetiers.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredLines.map((line) => {
          const rows = localRows[line.id] ?? [];
          const rate = getRateForMetier(line.metier);
          const hasDirty = rows.some((r) => r.isDirty);
          const hasBlocker = validateAllocationSave(rows).valid === false;

          return (
            <div key={line.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                <div>
                  <span className="font-medium text-slate-900">{line.lineName}</span>
                  <span className="ml-2 text-xs text-slate-500">{line.id} · {line.metier}</span>
                  <StatusBadge status={line.status} />
                </div>
                <div className="flex gap-2">
                  {/* ALLOC-BR-12: undo split — only shown when multiple rows exist */}
                  {can('edit:allocation') && rows.length > 1 && (
                    <Button size="sm" variant="secondary" onClick={() => handleUndoSplit(line.id)}>
                      Undo split
                    </Button>
                  )}
                  {can('edit:allocation') && hasDirty && (
                    <Button
                      size="sm"
                      variant={hasBlocker ? 'secondary' : 'primary'}
                      onClick={() => handleSave(line.id)}
                    >
                      <Save size={14} /> {t('alloc.saveAll')}
                      {hasDirty && <span className="ml-1 text-xs opacity-70">({t('alloc.unsaved')})</span>}
                    </Button>
                  )}
                </div>
              </div>

              {rows.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">{t('alloc.unassigned')}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      {can('edit:allocation') && <th className="px-2 py-1.5 text-left w-8" />}
                      <th className="px-3 py-1.5 text-right font-medium">{t('alloc.colFte')}</th>
                      <th className="px-3 py-1.5 text-left font-medium">{t('alloc.colSociete')}</th>
                      <th className="px-3 py-1.5 text-left font-medium">{t('alloc.colCostType')}</th>
                      <th className="px-3 py-1.5 text-left font-medium">{t('alloc.colDiversity')}</th>
                      {can('view:k-euro-rates') && <th className="px-3 py-1.5 text-right font-medium">{t('alloc.colKeuro')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const warn = rowNeedsWarning(row);  // ALLOC-BR-07
                      return (
                        <tr
                          key={row.id}
                          className={`border-t border-slate-100 ${row.isDirty ? 'bg-amber-50' : ''} ${warn ? 'bg-orange-50' : ''}`}
                        >
                          {can('edit:allocation') && (
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={selectedRowIds.includes(row.id)}
                                onChange={(e) =>
                                  setSelectedRowIds((ids) =>
                                    e.target.checked ? [...ids, row.id] : ids.filter((id) => id !== row.id),
                                  )
                                }
                              />
                            </td>
                          )}
                          {/* ALLOC-BR-03: FTE read-only */}
                          <td className="px-3 py-2 text-right text-slate-700 tabular-nums">
                            {calcRowFte(row.days).toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            {can('edit:allocation') ? (
                              <select
                                value={row.societe ?? ''}
                                onChange={(e) =>
                                  updateRow(line.id, row.id, { societe: e.target.value || null })
                                }
                                className={`w-full rounded border px-2 py-1 text-sm ${
                                  warn
                                    ? 'border-orange-300 bg-orange-50'
                                    : !row.societe && (row.costType === 'TSA' || row.costType === 'TC')
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-slate-300'
                                }`}
                              >
                                <option value="">— select —</option>
                                {SOCIETES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <span>{row.societe ?? <span className="text-slate-400">—</span>}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {can('edit:allocation') ? (
                              <select
                                value={row.costType}
                                onChange={(e) =>
                                  updateRow(line.id, row.id, { costType: e.target.value as 'FTE' | 'TSA' | 'TC' })
                                }
                                className="rounded border border-slate-300 px-2 py-1 text-sm"
                              >
                                <option value="FTE">FTE</option>
                                <option value="TSA">TSA</option>
                                <option value="TC">TC</option>
                              </select>
                            ) : (
                              <span>{row.costType}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {can('edit:allocation') ? (
                              <select
                                value={row.diversity ?? ''}
                                onChange={(e) =>
                                  updateRow(line.id, row.id, { diversity: e.target.value || null })
                                }
                                className="rounded border border-slate-300 px-2 py-1 text-sm"
                              >
                                <option value="">— select —</option>
                                {DIVERSITY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                              </select>
                            ) : (
                              <span>{row.diversity ?? <span className="text-slate-400">—</span>}</span>
                            )}
                          </td>
                          {can('view:k-euro-rates') && (
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.isDirty ? (
                                <span className="text-xs text-amber-600">
                                  ≈{formatKEuro(calcRowKeuro(row.days, rate))}
                                </span>
                              ) : (
                                formatKEuro(row.keuro)
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk societe modal (ALLOC-BR-09/10) */}
      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title={t('alloc.bulkSociete')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkModal(false)}>{t('alloc.cancel')}</Button>
            <Button variant="primary" onClick={handleBulkAssign} disabled={!bulkSociete}>
              {t('alloc.bulkSocieteApply')}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Assigning société to {selectedRowIds.length} row(s). Cost type will not change (ALLOC-BR-10).
        </p>
        <select
          value={bulkSociete}
          onChange={(e) => setBulkSociete(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— select société —</option>
          {SOCIETES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass. Fix any TypeScript errors before committing.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AllocationPage.tsx src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(allocation): rebuild with FTE/societe/costType/diversity/K€/dirty-tracking/filters (ALLOC-BR-03–15)"
```

---

## Task 8: Admin — Inductor Delete Tab (DEL-BR-01 to DEL-BR-10)

**Files:**
- Create: `src/components/admin/InductorDeleteTab.tsx`
- Modify: `src/pages/AdminPage.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`

### All 10 DEL-BR rules: Admin+RCRC only, bulk-select, filter-preserving selection, confirm modal, active version protection, deletion summary.

- [ ] **Step 1: Add translation keys**

In `src/i18n/en.ts`:
```typescript
'admin.tabInductors': 'Inductors',
'admin.delTitle': 'Bulk Delete Inductors',
'admin.delDesc': 'Admin and RCRC only. Inductors from the active version are protected if it is the only version (DEL-BR-05).',
'admin.delSelectAll': 'Select all',
'admin.delDeleteBtn': 'Delete selected ({n})',
'admin.delConfirmTitle': 'Confirm deletion',
'admin.delConfirmDesc': 'You are about to permanently delete {n} inductor(s). This cannot be undone (DEL-BR-06).',
'admin.delConfirm': 'Delete permanently',
'admin.delCancel': 'Cancel',
'admin.delSummary': 'Deleted {deleted} inductor(s). {skipped} skipped (active version protected).',
'admin.delEmpty': 'No inductors loaded',
'admin.delFilterCategory': 'Category',
```

Mirror in `src/i18n/es.ts`:
```typescript
'admin.tabInductors': 'Inductores',
'admin.delTitle': 'Eliminar Inductores en Masa',
'admin.delDesc': 'Solo Admin y RCRC. Los inductores de la versión activa están protegidos si es la única versión (DEL-BR-05).',
'admin.delSelectAll': 'Seleccionar todos',
'admin.delDeleteBtn': 'Eliminar seleccionados ({n})',
'admin.delConfirmTitle': 'Confirmar eliminación',
'admin.delConfirmDesc': 'Estás a punto de eliminar permanentemente {n} inductor(es). No se puede deshacer (DEL-BR-06).',
'admin.delConfirm': 'Eliminar permanentemente',
'admin.delCancel': 'Cancelar',
'admin.delSummary': 'Eliminados {deleted} inductor(es). {skipped} omitidos (versión activa protegida).',
'admin.delEmpty': 'No hay inductores cargados',
'admin.delFilterCategory': 'Categoría',
```

- [ ] **Step 2: Create InductorDeleteTab component**

Create `src/components/admin/InductorDeleteTab.tsx`:

```typescript
import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { EmptyState } from '../shared/EmptyState';
import { useT } from '../../i18n/useT';
import { INDUCTORS } from '../../fixtures/inductors';
import type { PrototypeInductor } from '../../types';

interface InductorEntry extends PrototypeInductor {
  version: 'active' | 'superseded';
}

// For prototype: all current inductors are "active version"
const ALL_INDUCTORS: InductorEntry[] = INDUCTORS.map((ind) => ({ ...ind, version: 'active' as const }));

const ONLY_ONE_VERSION = true; // prototype has single version — triggers DEL-BR-05 protection

export function InductorDeleteTab() {
  const t = useT();
  const [items, setItems] = useState<InductorEntry[]>(ALL_INDUCTORS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastSummary, setLastSummary] = useState<{ deleted: number; skipped: number } | null>(null);

  // DEL-BR-02: show only already-loaded inductors (items state)
  const categories = useMemo(() => ['all', ...new Set(items.map((i) => i.category))], [items]);

  // DEL-BR-14 / DEL-BR-08: filter does not clear selection
  const visible = useMemo(
    () => items.filter((i) => categoryFilter === 'all' || i.category === categoryFilter),
    [items, categoryFilter],
  );

  // DEL-BR-03: header checkbox selects/deselects all visible
  function toggleAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((i) => (checked ? next.add(i.id) : next.delete(i.id)));
      return next;
    });
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function confirmDelete() {
    // DEL-BR-05: active version protected if it is the only version
    const toDelete = items.filter((i) => selected.has(i.id));
    const [skippable, deletable] = toDelete.reduce<[InductorEntry[], InductorEntry[]]>(
      ([s, d], item) => {
        if (item.version === 'active' && ONLY_ONE_VERSION) return [[...s, item], d];
        return [s, [...d, item]];
      },
      [[], []],
    );

    setItems((prev) => prev.filter((i) => !deletable.map((d) => d.id).includes(i.id)));
    setSelected(new Set());
    setLastSummary({ deleted: deletable.length, skipped: skippable.length });
    setShowConfirm(false);
  }

  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));

  if (items.length === 0) {
    return <EmptyState title={t('admin.delEmpty')} />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="font-semibold text-slate-800">{t('admin.delTitle')}</h3>
        <p className="mt-1 text-xs text-slate-500">{t('admin.delDesc')}</p>
      </div>

      {lastSummary && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t('admin.delSummary', {
            deleted: String(lastSummary.deleted),
            skipped: String(lastSummary.skipped),
          })}
        </div>
      )}

      <div className="flex items-end justify-between">
        <div className="flex items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500">{t('admin.delFilterCategory')}</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All' : c}</option>)}
            </select>
          </div>
        </div>
        {/* DEL-BR-09: delete button disabled when no rows selected */}
        <Button
          variant="danger"
          disabled={selected.size === 0}
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 size={14} /> {t('admin.delDeleteBtn', { n: String(selected.size) })}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {/* DEL-BR-03: header checkbox */}
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-left font-medium">Version</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((ind) => {
              const isProtected = ind.version === 'active' && ONLY_ONE_VERSION;
              return (
                <tr
                  key={ind.id}
                  className={`border-t border-slate-100 ${isProtected ? 'opacity-50' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(ind.id)}
                      disabled={isProtected}
                      onChange={(e) => toggleRow(ind.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">{ind.name}</td>
                  <td className="px-3 py-2 text-slate-600">{ind.category}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ind.version === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ind.version}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* DEL-BR-04: confirm before delete */}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={t('admin.delConfirmTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>{t('admin.delCancel')}</Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('admin.delConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {t('admin.delConfirmDesc', { n: String(selected.size) })}
        </p>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Wire InductorDeleteTab into AdminPage**

In `src/pages/AdminPage.tsx`:

```typescript
// ADD import:
import { InductorDeleteTab } from '../components/admin/InductorDeleteTab';

// ADD to allTabs array (before cycles tab):
{ key: 'inductors', label: t('admin.tabInductors') },  // No requiresAdmin: RCRC can access (DEL-BR-01)

// Note: filter to show inductors tab to Admin AND RCRC:
// The existing RoleGate uses fallbackPermission="upload:workload-standards"
// Since RCRC has upload:workload-standards, they'll see the tab.

// ADD render:
{tab === 'inductors' && <InductorDeleteTab />}
```

Update the Tab type:
```typescript
type Tab = 'workload' | 'categories' | 'rules' | 'rates' | 'cycles' | 'inductors' | 'hvt';
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/InductorDeleteTab.tsx src/pages/AdminPage.tsx src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(admin): add inductor bulk-delete tab — DEL-BR-01 to DEL-BR-10"
```

---

## Task 9: Admin — Workload xlsx validation (WL-BR-02/06)

**Files:**
- Modify: `src/pages/AdminPage.tsx` — `WorkloadStandardsTab`

### WL-BR-02: only .xlsx accepted. WL-BR-06: validate before commit.

- [ ] **Step 1: Add validation logic inline to WorkloadStandardsTab**

In `src/pages/AdminPage.tsx`, find `WorkloadStandardsTab` and replace the `handleUpload` function and the upload button with:

```typescript
function WorkloadStandardsTab() {
  const [items, setItems] = useState(WORKLOAD_STANDARDS);
  const [metier, setMetier] = useState<Metier>('H-DESIGN');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setValidationError(null);

    if (file && !file.name.endsWith('.xlsx')) {
      // WL-BR-02: only .xlsx accepted
      setValidationError('Only .xlsx files are accepted (WL-BR-06). Please select a valid Excel file.');
      setSelectedFile(null);
    }
  }

  function handleUpload() {
    if (!selectedFile) {
      setValidationError('Please select a file first.');
      return;
    }

    // WL-BR-06: structural validation before commit (simulated for prototype)
    if (selectedFile.size === 0) {
      setValidationError('File appears to be empty. Upload aborted (WL-BR-06).');
      return;
    }

    // WL-BR-04: versioned — add new version, old versions retained
    const id = `ws-${Date.now()}`;
    setItems((i) => [
      {
        id,
        metier,
        fileName: selectedFile.name,
        uploadedAt: new Date().toISOString(),
        rowCount: 100,  // prototype: row count unknown until backend processes
      },
      ...i,
    ]);
    pushToast(`Archivo ${selectedFile.name} cargado para métier ${metier}`, 'success');
    setSelectedFile(null);
    setValidationError(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-semibold text-slate-800">{t('admin.workloadUpload')}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500">{t('admin.workloadMetier')}</label>
            <select
              value={metier}
              onChange={(e) => setMetier(e.target.value as Metier)}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {(['H-DESIGN', 'H-TUNING', 'H-SOFTWARE', 'H-CUSTOMER', 'H-PROJECT', 'H-NP', 'H-TESTING'] as Metier[]).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500">File (.xlsx only — WL-BR-02)</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
              className="mt-1 text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>
          <Button onClick={handleUpload} disabled={!selectedFile || !!validationError}>
            <Upload size={14} /> {t('admin.workloadBtn')}
          </Button>
        </div>
        {validationError && (
          <p className="mt-2 text-sm text-red-600">{validationError}</p>
        )}
      </div>
      <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{t('admin.workloadMetier')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.workloadColFile')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('admin.workloadColRows')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.workloadColUploaded')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((w) => (
            <tr key={w.id} className="border-t border-slate-100">
              <td className="px-3 py-2.5">{w.metier}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{w.fileName}</td>
              <td className="px-3 py-2.5 text-right">{w.rowCount}</td>
              <td className="px-3 py-2.5 text-xs text-slate-500">{formatDate(w.uploadedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminPage.tsx
git commit -m "feat(admin): WL-BR-02 xlsx-only validation, WL-BR-06 pre-commit structural check"
```

---

## Task 10: Shared useSortable hook (TABLE-BR-01/02/03)

**Files:**
- Create: `src/lib/useSortable.ts`
- Create: `src/lib/__tests__/useSortable.test.ts`
- Modify: `src/pages/EstimationReviewPage.tsx`, `src/pages/AllocationPage.tsx`, `src/pages/FinalReviewPage.tsx`

### TABLE-BR-01: all grids support sorting. TABLE-BR-02: sort state persists in page session (component state). TABLE-BR-03: reset on navigation (component unmount resets automatically).

Note on resizing: native HTML `<table>` column resizing requires a draggable-column library. For this prototype the implementation delivers sorting; resizing is noted as requiring `react-resizable` or `@tanstack/react-table` as a future enhancement.

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/useSortable.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { sortItems } from '../useSortable';

interface Item { name: string; age: number }

describe('sortItems (TABLE-BR-01)', () => {
  const items: Item[] = [
    { name: 'Charlie', age: 30 },
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 35 },
  ];

  it('sorts ascending by string field', () => {
    const result = sortItems(items, 'name', 'asc');
    expect(result.map((i) => i.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts descending by number field', () => {
    const result = sortItems(items, 'age', 'desc');
    expect(result.map((i) => i.age)).toEqual([35, 30, 25]);
  });

  it('no-op when sortDir is null', () => {
    const result = sortItems(items, 'name', null);
    expect(result).toEqual(items);
  });

  it('returns a new array (does not mutate)', () => {
    const result = sortItems(items, 'name', 'asc');
    expect(result).not.toBe(items);
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
npx vitest run src/lib/__tests__/useSortable.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create useSortable.ts**

Create `src/lib/useSortable.ts`:

```typescript
import { useState, useMemo } from 'react';

export type SortDir = 'asc' | 'desc' | null;

export interface SortState<K extends string> {
  key: K | null;
  dir: SortDir;
}

export function sortItems<T>(
  items: T[],
  key: keyof T | null,
  dir: SortDir,
): T[] {
  if (!key || !dir) return items;
  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    const cmp = av < bv ? -1 : 1;
    return dir === 'asc' ? cmp : -cmp;
  });
}

export function useSortable<T>(items: T[]) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  function requestSort(key: keyof T) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    if (sortDir === 'desc') { setSortKey(null); setSortDir(null); return; }
    setSortDir('asc');
  }

  function getSortIcon(key: keyof T): '↑' | '↓' | '↕' {
    if (sortKey !== key) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  }

  const sorted = useMemo(() => sortItems(items, sortKey, sortDir), [items, sortKey, sortDir]);

  return { sorted, requestSort, getSortIcon };
}
```

- [ ] **Step 4: Run test to verify PASS**

```bash
npx vitest run src/lib/__tests__/useSortable.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Apply useSortable to EstimationReviewPage**

In `src/pages/EstimationReviewPage.tsx`, inside the `Section` component's `<table>`, add sortable headers. Find the `<thead>` block and modify it:

```typescript
// ADD import in EstimationReviewPage.tsx:
import { useSortable } from '../lib/useSortable';

// In Section component, add sort:
function Section({ title, description, lines, emptyText, renderActions }: SectionProps) {
  const { sorted, requestSort, getSortIcon } = useSortable(lines);
  const t = useT();
  return (
    <section>
      ...
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr>
          <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('lineName')}>
            {t('estReview.colLine')} {getSortIcon('lineName')}
          </th>
          <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('assignedEngineerId')}>
            {t('estReview.colEngineer')} {getSortIcon('assignedEngineerId')}
          </th>
          <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('status')}>
            {t('estReview.colStatus')} {getSortIcon('status')}
          </th>
          <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('estimatedDays')}>
            {t('estReview.colDays')} {getSortIcon('estimatedDays')}
          </th>
          ...
        </tr>
      </thead>
      <tbody>
        {sorted.map((l) => { ... })}  {/* use sorted instead of lines */}
      </tbody>
```

- [ ] **Step 6: Apply useSortable to FinalReviewPage**

In `src/pages/FinalReviewPage.tsx`, `byMetier` is `[Metier, {count, days, kEuro}][]` — reshape to objects before sorting, then wire headers:

```typescript
// ADD import:
import { useSortable } from '../lib/useSortable';

// In FinalReviewContent, ADD after the byMetier useMemo:
const metierRows = useMemo(
  () => byMetier.map(([m, v]) => ({ metier: m, ...v })),
  [byMetier],
);
const { sorted: sortedMetier, requestSort, getSortIcon } = useSortable(metierRows);

// REPLACE the <thead> block:
<thead className="bg-slate-50 text-xs uppercase text-slate-500">
  <tr>
    <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('metier')}>
      {t('finalReview.colMetier')} {getSortIcon('metier')}
    </th>
    <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('count')}>
      {t('finalReview.colLines')} {getSortIcon('count')}
    </th>
    <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('days')}>
      {t('finalReview.colDays')} {getSortIcon('days')}
    </th>
    <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('kEuro')}>
      k€ {getSortIcon('kEuro')}
    </th>
    <th className="px-3 py-2 text-left font-medium">{t('finalReview.colDistribution')}</th>
  </tr>
</thead>

// REPLACE the <tbody> to iterate sortedMetier (not byMetier):
<tbody>
  {sortedMetier.map((row) => {
    const pct = totals.kEuro > 0 ? (row.kEuro / totals.kEuro) * 100 : 0;
    return (
      <tr key={row.metier} className="border-t border-slate-100">
        <td className="px-3 py-2.5 font-medium text-slate-800">{row.metier}</td>
        <td className="px-3 py-2.5 text-right">{row.count}</td>
        <td className="px-3 py-2.5 text-right">{formatDays(row.days)}</td>
        <td className="px-3 py-2.5 text-right font-medium">{formatKEuro(row.kEuro)}</td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 text-right text-xs text-slate-500">{pct.toFixed(0)}%</span>
          </div>
        </td>
      </tr>
    );
  })}
</tbody>
```

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/useSortable.ts src/lib/__tests__/useSortable.test.ts src/pages/EstimationReviewPage.tsx src/pages/FinalReviewPage.tsx
git commit -m "feat(table): TABLE-BR-01 — shared useSortable hook, sortable headers on EstimationReview + FinalReview grids"
```

---

## Task 11: Email Log in Admin (EMAIL-BR-03/04)

**Files:**
- Create: `src/fixtures/emailLog.ts`
- Modify: `src/pages/AdminPage.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`

### EMAIL-BR-03: every sent email logged with timestamp/recipient/type/cycle/success. EMAIL-BR-04: logs retained for active cycle duration.

Note: EMAIL-BR-01 (weekly cadence) and EMAIL-BR-02 (no opt-out) are backend concerns not implementable in the frontend prototype.

- [ ] **Step 1: Create email log fixture**

Create `src/fixtures/emailLog.ts`:

```typescript
export type EmailType = 'weekly-alert' | 'rejection-notice' | 'approval-notice';

export interface EmailLogEntry {
  id: string;
  timestamp: string;
  recipient: string;
  type: EmailType;
  cycleId: string;
  success: boolean;
  errorMessage?: string;
}

export const EMAIL_LOG: EmailLogEntry[] = [
  {
    id: 'email-001',
    timestamp: '2026-05-26T08:00:00Z',
    recipient: 'engineer-team@horse.com',
    type: 'weekly-alert',
    cycleId: 'cyc-2026h1',
    success: true,
  },
  {
    id: 'email-002',
    timestamp: '2026-06-02T08:00:00Z',
    recipient: 'engineer-team@horse.com',
    type: 'weekly-alert',
    cycleId: 'cyc-2026h1',
    success: true,
  },
  {
    id: 'email-003',
    timestamp: '2026-06-01T14:22:00Z',
    recipient: 'eng.alice@horse.com',
    type: 'rejection-notice',
    cycleId: 'cyc-2026h1',
    success: false,
    errorMessage: 'SMTP timeout — retry scheduled',
  },
];
```

- [ ] **Step 2: Add translation keys**

In `src/i18n/en.ts`:
```typescript
'admin.tabEmailLog': 'Email Log',
'admin.emailLogTitle': 'Email Log (EMAIL-BR-03)',
'admin.emailLogDesc': 'All sent emails are logged per active cycle. Logs retained for the cycle duration (EMAIL-BR-04).',
'admin.emailColTime': 'Timestamp',
'admin.emailColRecipient': 'Recipient',
'admin.emailColType': 'Type',
'admin.emailColCycle': 'Cycle',
'admin.emailColStatus': 'Status',
```

In `src/i18n/es.ts`:
```typescript
'admin.tabEmailLog': 'Log de Emails',
'admin.emailLogTitle': 'Log de Emails (EMAIL-BR-03)',
'admin.emailLogDesc': 'Todos los emails enviados quedan registrados por ciclo activo. Logs retenidos durante el ciclo (EMAIL-BR-04).',
'admin.emailColTime': 'Timestamp',
'admin.emailColRecipient': 'Destinatario',
'admin.emailColType': 'Tipo',
'admin.emailColCycle': 'Ciclo',
'admin.emailColStatus': 'Estado',
```

- [ ] **Step 3: Add EmailLogTab to AdminPage**

In `src/pages/AdminPage.tsx`:

```typescript
// ADD import:
import { EMAIL_LOG, type EmailLogEntry } from '../fixtures/emailLog';

// ADD to allTabs (no requiresAdmin: all admins see it but only Admin role has view:admin):
{ key: 'emailLog', label: t('admin.tabEmailLog'), requiresAdmin: true },

// UPDATE Tab type:
type Tab = 'workload' | 'categories' | 'rules' | 'rates' | 'cycles' | 'inductors' | 'hvt' | 'emailLog';

// ADD render:
{tab === 'emailLog' && <EmailLogTab />}

// ADD component at bottom of file:
function EmailLogTab() {
  const cycles = useDataStore((s) => s.cycles);
  const activeCycleId = cycles.find((c) => c.is_active)?.id;
  const t = useT();

  // EMAIL-BR-04: filter to active cycle only
  const logs = EMAIL_LOG.filter((e) => e.cycleId === activeCycleId);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="font-semibold text-slate-800">{t('admin.emailLogTitle')}</h3>
        <p className="mt-1 text-xs text-slate-500">{t('admin.emailLogDesc')}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t('admin.emailColTime')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.emailColRecipient')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.emailColType')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.emailColCycle')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.emailColStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-400">
                  No emails logged for the active cycle.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-600">{formatDate(log.timestamp)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{log.recipient}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                      {log.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{log.cycleId}</td>
                  <td className="px-3 py-2">
                    {log.success ? (
                      <span className="text-xs font-medium text-emerald-700">✓ sent</span>
                    ) : (
                      <span className="text-xs font-medium text-red-600" title={log.errorMessage}>
                        ✗ failed
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run all tests + sdd kit tests**

```bash
npm test
pytest node_modules/great-sdd-kit/tests/ -v
```

Expected: all 263 Python tests pass, all JS tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/fixtures/emailLog.ts src/pages/AdminPage.tsx src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(admin): EMAIL-BR-03/04 email log display with active-cycle filter"
```

---

## Final Validation

After completing all tasks, run the full test suite and verify gap closure:

```bash
# 1. All JS tests pass
npm test

# 2. SDD kit Python tests still pass
pytest node_modules/great-sdd-kit/tests/ -v

# 3. TypeScript compilation clean
npx tsc --noEmit

# 4. Lint clean
npm run lint
```

## Remaining Out-of-Scope Items

The following rules require backend infrastructure and are explicitly out of scope for this frontend prototype:

| Rule | Reason |
|------|--------|
| EMAIL-BR-01 | Weekly email cadence requires a cron job on backend |
| EMAIL-BR-02 | No opt-out list requires user preference storage on backend |
| WL-BR-03 | Excel preprocessing pipeline runs on backend |
| WL-BR-05 | JU coefficient immutability after save is a backend persistence concern |
| TABLE-BR-01 (resizing) | Requires `@tanstack/react-table` or `react-resizable` — out of scope for current stack |
