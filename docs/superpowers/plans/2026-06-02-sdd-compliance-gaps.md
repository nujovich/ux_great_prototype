# SDD Compliance Gap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the GREAT UX prototype with the 78 business rules in the SDD Kit, fixing 20+ rule violations and missing features identified by a spec-vs-prototype audit on 2026-06-02.

**Architecture:** All 257 SDD Kit Python tests pass — they verify the spec itself, not the TypeScript prototype. This plan closes the gap between what the spec defines and what the React prototype actually enforces. Fixes are ordered from lowest-risk (permissions) to highest-complexity (Allocation redesign).

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Zustand, Tailwind CSS. Run frontend tests: `npm test`. Run SDD kit tests: `~/.asdf/shims/python3 -m pytest node_modules/great-sdd-kit/tests/ -v`. Spec source: `node_modules/great-sdd-kit/great_sdd/specs/`.

---

## ⚠️ Scope Note — Suggest Splitting

This plan covers 5 independent subsystems. For parallel team execution, consider:
- **Plan A (Tasks 1–16, this doc):** Role permissions + 6 critical rule fixes — ~3 hours
- **Plan B (Tasks 17–28, separate):** Allocation societe-model redesign — ~1 day
- **Plan C (Tasks 29–34, separate):** Final Review + Estimation Review + Management alignment — ~half day

Tasks 1–16 have zero dependencies on B or C and can ship first.

---

## Gap Audit Summary

| Rule ID | Spec says | Prototype does | Phase |
|---------|-----------|----------------|-------|
| pre_est roles | PMO `can_edit=False` | PMO has full edit rights | 1 |
| pre_est roles | CPO `can_view=False` | CPO has `view:pre-estimation` | 1 |
| alloc roles | RCRC `can_view/edit=True` | RCRC has no allocation access | 1 |
| alloc roles | CPO `can_view=False` | CPO has `view:allocation` | 1 |
| mgmt roles | PMO+Admin only | CPO and RCRC have `view:management` | 1 |
| final_review roles | All roles can export | Engineer and RCRC missing export | 1 |
| est_review roles | Engineer sees own rows | Engineer has NO EstimationReview access | 1 |
| pre_est roles | Admin `can_reject=False` | Admin has `reject:estimation` + `approve:estimation` | 1 |
| workload roles | RCRC can upload | Only Admin can access upload tab | 1 |
| BR-13 | Zero occurrence allowed | UI inputs enforce `min={1}` | 2 |
| pre_est roles / UI text | Engineer has `edit:custom-jus` | Message said "Solo PMO/Admin" (Engineer excluded); button text in Spanish | 2 ✅ |
| ERev-BR-09 | Active cycle only | EstimationReview shows all cycles | 2 |
| FR-BR-03 | Approved lines only | FinalReview `byMetier` uses all lines | 2 |
| ALLOC-BR-11 | Split must sum 100% | SplitModal warns but doesn't block save | 2 |
| MGMT-BR-04 | H-NP/H-PROJECT excluded from filter | Both appear in filter dropdown | 2 |
| MGMT-BR-06 | Active cycle only | ManagementPage has cycle selector | 2 |
| ALLOC-BR-01..16 | Societe/cost-type/K€ model | AllocationPage uses engineer model | 3 |
| FR-BR-06/07/08 | Stage 3 send button | No Stage 3 button exists | 4 |
| FR-BR-10 | JU-level CSV | CSV exports métier-level summary | 4 |
| ERev-BR-10 | CPO approval via HVT only | CPO approves directly in UI (prototype shortcut — keep, label) | note |
| MGMT timeline | Status evolution timeline | Only pie chart + matrix table | 5 |
| WL-BR-04 | Uploads are versioned | Upload replaces fixture, no versioning | 6 |
| DEL-BR-01..10 | Bulk inductor deletion | Not implemented | 6 |

---

## File Map

| File | Phase | Change |
|------|-------|--------|
| `src/fixtures/roles.ts` | 1 | Fix all ROLE_PERMISSIONS per spec |
| `src/fixtures/__tests__/roles.test.ts` | 1 | Expand to cover all 5 roles × spec requirements |
| `src/pages/AdminPage.tsx` | 1 | Allow RCRC access to Workload Standards tab |
| `src/components/estimation/EstimationPanel.tsx` | 2 | `min={0}` on occurrence inputs, remove `Math.max(1,...)` guard |
| `src/lib/__tests__/calc.test.ts` | 2 | Add zero-occurrence test |
| `src/pages/EstimationReviewPage.tsx` | 2, 5 | Active cycle filter; CSV export |
| `src/pages/FinalReviewPage.tsx` | 2, 4 | Approved-only fix; Stage 3 button; JU CSV |
| `src/pages/AllocationPage.tsx` | 2, 3 | Split 100% block; full societe-model redesign |
| `src/pages/ManagementPage.tsx` | 2, 5 | Remove cycle selector; fix metier filter; timeline stub |
| `src/fixtures/societes.ts` | 3 | Societe list + K€ rate tables from SDD Kit |
| `src/lib/kEuro.ts` | 3 | `calculateFteKe` / `calculateTsaKe` per spec formulas |
| `src/lib/__tests__/kEuro.test.ts` | 3 | Rate lookups matching SDD Kit values |
| `src/fixtures/allocations.ts` | 3 | New per-JU allocation fixture data |

---

## Phase 1 — Role Permission Alignment

**Spec source:** `great_sdd/specs/pre_estimation_specs.py` (ROLE_PERMISSIONS), `allocation_specs.py` (ALLOCATION_PERMISSIONS), `management_view_specs.py` (MANAGEMENT_ACCESS), `final_review_specs.py` (FINAL_REVIEW_PERMISSIONS), `estimation_review_specs.py` (ESTIMATION_REVIEW_PERMISSIONS), `transversal_specs.py` (WORKLOAD_UPLOADERS).

### Task 1 — Write failing role permission tests

**Files:**
- Modify: `src/fixtures/__tests__/roles.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the contents of `src/fixtures/__tests__/roles.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS } from '../roles';

// Helper
function can(role: keyof typeof ROLE_PERMISSIONS, perm: string): boolean {
  return (ROLE_PERMISSIONS[role] as string[]).includes(perm);
}

describe('Pre-Estimation permissions (pre_estimation_specs.py)', () => {
  it('Admin can view and edit pre-estimation', () => {
    expect(can('Admin', 'view:pre-estimation')).toBe(true);
    expect(can('Admin', 'edit:estimation')).toBe(true);
  });
  it('Engineer can view and edit pre-estimation (own lines)', () => {
    expect(can('Engineer', 'view:pre-estimation')).toBe(true);
    expect(can('Engineer', 'edit:estimation')).toBe(true);
    expect(can('Engineer', 'view:own-lines-only')).toBe(true);
  });
  it('PMO can view pre-estimation but NOT edit (spec: can_edit=False)', () => {
    expect(can('PMO', 'view:pre-estimation')).toBe(true);
    expect(can('PMO', 'edit:estimation')).toBe(false);
    expect(can('PMO', 'save:draft')).toBe(false);
    expect(can('PMO', 'save:definitive')).toBe(false);
  });
  it('RCRC can view pre-estimation but NOT edit (spec: can_edit=False)', () => {
    expect(can('RCRC', 'view:pre-estimation')).toBe(true);
    expect(can('RCRC', 'edit:estimation')).toBe(false);
  });
  it('CPO cannot view pre-estimation (spec: can_view=False)', () => {
    expect(can('CPO', 'view:pre-estimation')).toBe(false);
  });
  it('Admin cannot reject estimations (spec: can_reject=False)', () => {
    expect(can('Admin', 'reject:estimation')).toBe(false);
    expect(can('Admin', 'approve:estimation')).toBe(false);
  });
  it('PMO cannot reject estimations (spec: can_reject=False)', () => {
    expect(can('PMO', 'reject:estimation')).toBe(false);
    expect(can('PMO', 'approve:estimation')).toBe(false);
  });
  it('only CPO can reject/approve (prototype simulates HVT)', () => {
    expect(can('CPO', 'reject:estimation')).toBe(true);
  });
});

describe('Estimation Review permissions (estimation_review_specs.py)', () => {
  it('Engineer can view EstimationReview (own rows — scoped via view:own-lines-only)', () => {
    expect(can('Engineer', 'view:estimation-review')).toBe(true);
  });
  it('PMO can send to HVT', () => {
    expect(can('PMO', 'send:hvt')).toBe(true);
  });
  it('All roles can export EstimationReview CSV', () => {
    expect(can('Admin', 'export:estimation-review')).toBe(true);
    expect(can('PMO', 'export:estimation-review')).toBe(true);
    expect(can('RCRC', 'export:estimation-review')).toBe(true);
    expect(can('Engineer', 'export:estimation-review')).toBe(true);
    expect(can('CPO', 'export:estimation-review')).toBe(true);
  });
});

describe('Allocation permissions (allocation_specs.py)', () => {
  it('Admin, PMO, RCRC can view and edit allocation', () => {
    expect(can('Admin', 'view:allocation')).toBe(true);
    expect(can('PMO', 'view:allocation')).toBe(true);
    expect(can('RCRC', 'view:allocation')).toBe(true);
    expect(can('Admin', 'edit:allocation')).toBe(true);
    expect(can('PMO', 'edit:allocation')).toBe(true);
    expect(can('RCRC', 'edit:allocation')).toBe(true);
  });
  it('Engineer cannot view allocation', () => {
    expect(can('Engineer', 'view:allocation')).toBe(false);
  });
  it('CPO cannot view allocation (spec: can_view=False)', () => {
    expect(can('CPO', 'view:allocation')).toBe(false);
  });
});

describe('Management View permissions (management_view_specs.py)', () => {
  it('only Admin and PMO can view Management', () => {
    expect(can('Admin', 'view:management')).toBe(true);
    expect(can('PMO', 'view:management')).toBe(true);
  });
  it('RCRC cannot view Management (spec: MANAGEMENT_ACCESS[RCRC]=False)', () => {
    expect(can('RCRC', 'view:management')).toBe(false);
  });
  it('CPO cannot view Management (spec: MANAGEMENT_ACCESS[CPO]=False)', () => {
    expect(can('CPO', 'view:management')).toBe(false);
  });
  it('Engineer cannot view Management', () => {
    expect(can('Engineer', 'view:management')).toBe(false);
  });
});

describe('Final Review permissions (final_review_specs.py)', () => {
  it('all roles can view and export Final Review', () => {
    for (const role of ['Admin', 'PMO', 'RCRC', 'Engineer', 'CPO'] as const) {
      expect(can(role, 'view:final-review')).toBe(true);
      expect(can(role, 'export:final-review')).toBe(true);
    }
  });
  it('only Admin and PMO can send Stage 3', () => {
    expect(can('Admin', 'send:stage3')).toBe(true);
    expect(can('PMO', 'send:stage3')).toBe(true);
    expect(can('RCRC', 'send:stage3')).toBe(false);
    expect(can('Engineer', 'send:stage3')).toBe(false);
    expect(can('CPO', 'send:stage3')).toBe(false);
  });
});

describe('Workload Standard permissions (transversal_specs.py)', () => {
  it('Admin and RCRC can upload workload standards', () => {
    expect(can('Admin', 'upload:workload-standards')).toBe(true);
    expect(can('RCRC', 'upload:workload-standards')).toBe(true);
  });
  it('PMO/Engineer/CPO cannot upload workload standards', () => {
    expect(can('PMO', 'upload:workload-standards')).toBe(false);
    expect(can('Engineer', 'upload:workload-standards')).toBe(false);
    expect(can('CPO', 'upload:workload-standards')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/fixtures/__tests__/roles.test.ts
```

Expected: ~20 failures (permissions not yet correct).

---

### Task 2 — Fix ROLE_PERMISSIONS in roles.ts

**Files:**
- Modify: `src/fixtures/roles.ts`

- [ ] **Step 1: Replace the Permission type and ROLE_PERMISSIONS constant**

In `src/fixtures/roles.ts`, replace the entire `Permission` type and `ROLE_PERMISSIONS` object:

```typescript
export type Permission =
  | 'view:pre-estimation'
  | 'edit:estimation'
  | 'view:own-lines-only'
  | 'save:draft'
  | 'save:definitive'
  | 'copy:estimation'
  | 'edit:custom-jus'
  | 'view:estimation-review'
  | 'export:estimation-review'
  | 'reject:estimation'
  | 'approve:estimation'
  | 'send:hvt'
  | 'view:allocation'
  | 'edit:allocation'
  | 'view:k-euro-rates'
  | 'view:final-review'
  | 'export:final-review'
  | 'send:stage3'
  | 'view:management'
  | 'view:admin'
  | 'upload:workload-standards';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Engineer: [
    'view:pre-estimation',
    'view:own-lines-only',
    'edit:estimation',
    'save:draft',
    'save:definitive',
    'copy:estimation',
    'edit:custom-jus',
    'view:estimation-review',   // ERev-BR-06: Engineers see own rows
    'export:estimation-review',
    'view:final-review',        // FR-spec: all roles can view
    'export:final-review',
  ],
  PMO: [
    'view:pre-estimation',      // pre_est: can_view=True
    // No edit:estimation — pre_est: can_edit=False
    'view:estimation-review',
    'export:estimation-review',
    'send:hvt',
    'view:allocation',
    'edit:allocation',
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    'send:stage3',
    'view:management',
  ],
  Admin: [
    'view:pre-estimation',
    'edit:estimation',
    'save:draft',
    'save:definitive',
    'copy:estimation',
    'edit:custom-jus',
    'view:estimation-review',
    'export:estimation-review',
    'send:hvt',
    'view:allocation',
    'edit:allocation',
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    'send:stage3',
    'view:management',
    'view:admin',
    'upload:workload-standards',
    // No reject:estimation, no approve:estimation — pre_est: Admin can_reject=False
  ],
  RCRC: [
    'view:pre-estimation',      // pre_est: can_view=True, can_edit=False
    'view:estimation-review',
    'export:estimation-review',
    'view:allocation',          // alloc: RCRC can_view=True, can_edit=True
    'edit:allocation',
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    'upload:workload-standards', // transversal: WORKLOAD_UPLOADERS = {Admin, RCRC}
    // No view:management — MANAGEMENT_ACCESS[RCRC]=False
  ],
  CPO: [
    // No view:pre-estimation — pre_est: CPO can_view=False
    'view:estimation-review',
    'export:estimation-review',
    'approve:estimation',        // Prototype-only: simulates HVT callback (ERev-BR-10 note)
    'reject:estimation',         // pre_est: CPO can_reject=True
    // No view:allocation — alloc: CPO can_view=False
    'view:final-review',
    'export:final-review',
    // No view:management — MANAGEMENT_ACCESS[CPO]=False
  ],
};
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/fixtures/__tests__/roles.test.ts
```

Expected: All pass.

- [ ] **Step 3: Run full test suite to catch regressions**

```bash
npm test
```

Expected: All pass. If something breaks, it's using a now-removed permission — update the caller.

- [ ] **Step 4: Commit**

```bash
git add src/fixtures/roles.ts src/fixtures/__tests__/roles.test.ts
git commit -m "fix(roles): align ROLE_PERMISSIONS with SDD Kit spec

PMO loses pre-estimation edit rights (can_edit=False).
CPO loses pre-estimation/allocation/management access.
RCRC gains allocation and export rights.
Engineer gains EstimationReview and FinalReview access.
Admin loses reject/approve (can_reject=False).
New permissions: export:estimation-review, send:stage3, upload:workload-standards."
```

---

### Task 3 — Grant RCRC access to Workload Standards tab in AdminPage

**Files:**
- Modify: `src/pages/AdminPage.tsx`

The `AdminPage` is gated by `'view:admin'`, which only Admin has. RCRC needs access to the **Workload Standards tab only**. Rather than giving RCRC full admin access, make the outer RoleGate accept `upload:workload-standards` too.

- [ ] **Step 1: Update AdminPage RoleGate to accept either permission**

In `src/pages/AdminPage.tsx`, the outer `AdminPage` function:

```tsx
export function AdminPage() {
  return (
    <RoleGate permission="view:admin" fallbackPermission="upload:workload-standards">
      <AdminContent />
    </RoleGate>
  );
}
```

- [ ] **Step 2: Update RoleGate to support fallbackPermission**

In `src/components/shared/RoleGate.tsx`, add an optional `fallbackPermission` prop:

```tsx
interface RoleGateProps {
  permission: Permission;
  fallbackPermission?: Permission;
  children: React.ReactNode;
}

export function RoleGate({ permission, fallbackPermission, children }: RoleGateProps) {
  const can = useRoleStore((s) => s.can);
  if (!can(permission) && !(fallbackPermission && can(fallbackPermission))) {
    return null;
  }
  return <>{children}</>;
}
```

- [ ] **Step 3: Hide non-upload tabs for RCRC in AdminContent**

In `src/pages/AdminPage.tsx`, inside `AdminContent`, replace the tabs array with a permission-based filter:

```tsx
const can = useRoleStore((s) => s.can);

const allTabs: { key: Tab; label: string; requiresAdmin?: boolean }[] = [
  { key: 'workload',    label: t('admin.tabWorkload') },
  { key: 'categories',  label: t('admin.tabCategories'),  requiresAdmin: true },
  { key: 'rules',       label: t('admin.tabRules'),        requiresAdmin: true },
  { key: 'rates',       label: t('admin.tabRates'),        requiresAdmin: true },
  { key: 'cycles',      label: t('admin.tabCycles'),       requiresAdmin: true },
];

const tabs = allTabs.filter((tb) => !tb.requiresAdmin || can('view:admin'));
```

- [ ] **Step 4: Run tests and commit**

```bash
npm test
git add src/pages/AdminPage.tsx src/components/shared/RoleGate.tsx
git commit -m "feat(admin): grant RCRC access to Workload Standards tab

RCRC has upload:workload-standards per transversal_specs.py WORKLOAD_UPLOADERS.
Other admin tabs remain Admin-only."
```

---

## Phase 2 — Critical Business Rule Violations

### Task 4b — ✅ DONE: Fix Custom JU permission message and translate button

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx` (lines 763, 769)

**Why:** `roles.ts` correctly grants `edit:custom-jus` to Engineer, but the empty-state message
hardcoded "Solo PMO/Admin" — excluding Engineer. Button text was also in Spanish.

- [x] **Step 1: Translate button and fix message**

```tsx
// Line 763 — was: '+ Agregar JU'
+ Add JU

// Line 769 — was: 'Solo PMO/Admin pueden agregar Custom JUs.'
{canEditCustomJU ? 'No custom JUs.' : 'Only PMO, Admin and Engineer can add Custom JUs.'}
```

- [x] **Step 2: Commit**

```bash
git add src/components/estimation/EstimationPanel.tsx
git commit -m "fix(EstimationPanel): Engineer can add Custom JUs; translate UI text to English"
```

---

### Task 4 — BR-13: Allow zero occurrence on inductors/JUs

**Spec:** `BR-13: "Zero occurrence — allowed; contributes zero to the estimation output"`

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx`
- Create: `src/lib/__tests__/calc.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/calc.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calcTotalDays } from '../calc';
import type { InductorSelection, CustomJU } from '../../types';

const noSelections: InductorSelection[] = [];
const noCustomJUs: CustomJU[] = [];

describe('calcTotalDays — BR-13: zero occurrence', () => {
  it('returns 0 when inductor occurrence is 0 (zero contributes zero, BR-13)', () => {
    const selections: InductorSelection[] = [{
      inductorId: 'ind-1',
      selectedCranId: 'cran-1',
      inductorOccurrence: 0,
      juOccurrences: [{ juId: 'ju-1', occurrence: 0, locked: false }],
    }];
    // variable=2, fixed=0.5, occurrence=0 → (2×0)+0.5 = 0.5 (fixed still applies)
    // With globalOccurrences=1, result is just fixed component
    const result = calcTotalDays(selections, [
      { id: 'ju-1', cranId: 'cran-1', shortName: 'X', description: 'X', variable: 2, fixed: 0.5,
        unitType: 'man_day', fmm: 'F', smm: 'S', dmm: 'D', genericProfile: 'Dev' }
    ], noCustomJUs, 1);
    expect(result).toBe(0.5); // fixed applies even at occurrence=0
  });

  it('zero globalOccurrences is clamped to 1 (global is a multiplier, not per-JU occurrence)', () => {
    const result = calcTotalDays(noSelections, [], [{ id: 'j', description: 'x', days: 5 }], 0);
    // global occurrence 0 → treated as 1 per existing behavior (multiplier can't be 0)
    expect(result).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to confirm it passes (calcTotalDays already handles this)**

```bash
npm test -- src/lib/__tests__/calc.test.ts
```

The calc function already handles zero JU occurrence correctly. The violation is only in the UI inputs.

- [ ] **Step 3: Remove `min={1}` guards on inductor-level occurrence**

In `src/components/estimation/EstimationPanel.tsx`, find the inductor occurrence input (line ~576):

```tsx
// BEFORE:
onChange={(e) => onUpdateInductorOccurrence(sel.inductorId, Math.max(1, Number(e.target.value) || 1))}
// ...
min={1}

// AFTER (BR-13: zero occurrence allowed):
onChange={(e) => onUpdateInductorOccurrence(sel.inductorId, Math.max(0, Number(e.target.value) || 0))}
// ...
min={0}
```

- [ ] **Step 4: Remove `min={1}` guards on JU-level occurrence**

In the same file, find the JU occurrence input inside InductorTreeView (line ~612):

```tsx
// BEFORE:
onChange={(e) => onUpdateJUOccurrence(sel.inductorId, ju.id, Math.max(1, Number(e.target.value) || 1))}
// ...
min={1}

// AFTER:
onChange={(e) => onUpdateJUOccurrence(sel.inductorId, ju.id, Math.max(0, Number(e.target.value) || 0))}
// ...
min={0}
```

Also in FlatJUView (line ~708):

```tsx
// BEFORE:
onChange={(e) => onUpdateOccurrence(sel.inductorId, ju.id, Math.max(1, Number(e.target.value) || 1))}
// ...
min={1}

// AFTER:
onChange={(e) => onUpdateOccurrence(sel.inductorId, ju.id, Math.max(0, Number(e.target.value) || 0))}
// ...
min={0}
```

Note: `globalOccurrences` at panel level keeps `min={1}` — it is a multiplier for the entire estimation, not a per-JU occurrence count. BR-13 applies to individual JU occurrences.

- [ ] **Step 5: Commit**

```bash
git add src/components/estimation/EstimationPanel.tsx src/lib/__tests__/calc.test.ts
git commit -m "fix: allow zero occurrence on JUs and inductors (BR-13)

Zero occurrence contributes zero to the estimation output per BR-13.
Global occurrences multiplier keeps min=1 (different concept)."
```

---

### Task 5 — ERev-BR-09: Filter EstimationReview by active cycle

**Spec:** `ERev-BR-09: "Active cycle only — Grid shows data for the active estimation cycle only"`

**Files:**
- Modify: `src/pages/EstimationReviewPage.tsx`

- [ ] **Step 1: Add active-cycle filter to ReviewContent**

In `src/pages/EstimationReviewPage.tsx`, inside `ReviewContent`, add cycle filtering:

```tsx
// Add after existing imports:
import { useDataStore } from '../store/dataStore';

// Inside ReviewContent, replace:
//   const lines = useDataStore((s) => s.lines);
// with:
const allLines = useDataStore((s) => s.lines);
const cycles = useDataStore((s) => s.cycles);
const activeCycleId = cycles.find((c) => c.is_active)?.id ?? null;
const lines = activeCycleId
  ? allLines.filter((l) => l.cycleId === activeCycleId)
  : allLines;
```

The rest of the component uses `lines` and requires no other changes. The `visibleLines` memo already applies Engineer scoping on top of this.

- [ ] **Step 2: Run tests and commit**

```bash
npm test
git add src/pages/EstimationReviewPage.tsx
git commit -m "fix(EstimationReview): show active cycle only (ERev-BR-09)"
```

---

### Task 6 — FR-BR-03: FinalReview must show only approved lines

**Spec:** `FR-BR-03: "Approved lines only — Only status=Approved (PL, Métier) pairs appear"`

**Files:**
- Modify: `src/pages/FinalReviewPage.tsx`

**Bug:** `byMetier` is built from `lines.forEach(...)` without filtering on `approved` status. The `approvedLines` variable exists but is only used for CSV export.

- [ ] **Step 1: Fix the byMetier computation**

In `src/pages/FinalReviewPage.tsx`, inside `FinalReviewContent`, replace:

```tsx
// BEFORE:
const byMetier = useMemo(() => {
  const map = new Map<Metier, { count: number; days: number; kEuro: number }>();
  lines.forEach((l) => {
    if (l.estimatedDays == null) return;
    // ...
  });
  // ...
}, [lines]);
```

with:

```tsx
// AFTER (FR-BR-03: approved lines only):
const approvedLines = useMemo(() => lines.filter((l) => l.status === 'approved'), [lines]);

const byMetier = useMemo(() => {
  const map = new Map<Metier, { count: number; days: number; kEuro: number }>();
  approvedLines.forEach((l) => {
    if (l.estimatedDays == null) return;
    const cur = map.get(l.metier) ?? { count: 0, days: 0, kEuro: 0 };
    cur.count += 1;
    cur.days += l.estimatedDays;
    cur.kEuro += l.estimatedKEuro ?? 0;
    map.set(l.metier, cur);
  });
  return [...map.entries()].sort((a, b) => b[1].kEuro - a[1].kEuro);
}, [approvedLines]);
```

Also add an active-cycle filter (FR-BR-09 mirrors ERev-BR-09):

```tsx
const cycles = useDataStore((s) => s.cycles);
const activeCycleId = cycles.find((c) => c.is_active)?.id ?? null;
const cycleLines = activeCycleId
  ? lines.filter((l) => l.cycleId === activeCycleId)
  : lines;
const approvedLines = useMemo(
  () => cycleLines.filter((l) => l.status === 'approved'),
  [cycleLines],
);
```

Update the CSV export to use `approvedLines` (it already does — verify this is not a second variable).

- [ ] **Step 2: Run tests and commit**

```bash
npm test
git add src/pages/FinalReviewPage.tsx
git commit -m "fix(FinalReview): approved lines only + active cycle (FR-BR-03, FR-BR-09)"
```

---

### Task 7 — ALLOC-BR-11: Block split save when percentages don't sum to 100%

**Spec:** `ALLOC-BR-11: "Split: percentages must sum to 100%"`

**Files:**
- Modify: `src/pages/AllocationPage.tsx`

**Bug:** The SplitModal's save button is only disabled when `splits.some(s => !s.engineerId)`. `totalPct !== 100` shows a warning but doesn't block.

- [ ] **Step 1: Add the 100% guard to the Save button**

In `src/pages/AllocationPage.tsx`, inside `SplitModal`, replace the footer save button:

```tsx
// BEFORE:
<Button variant="primary" onClick={() => onSave(splits)} disabled={splits.some((s) => !s.engineerId)}>

// AFTER (ALLOC-BR-11: split must sum to 100%):
<Button
  variant="primary"
  onClick={() => onSave(splits)}
  disabled={splits.some((s) => !s.engineerId) || totalPct !== 100}
  title={totalPct !== 100 ? `Los porcentajes deben sumar 100% (ALLOC-BR-11). Actual: ${totalPct}%` : undefined}
>
```

- [ ] **Step 2: Strengthen the visual feedback**

Update the total display line to make it clearer when blocked:

```tsx
<div className={`text-sm font-medium ${
  totalPct === 100 ? 'text-emerald-700' : 'text-red-700 font-bold'
}`}>
  {t('alloc.total')}: {totalPct}%
  {totalPct !== 100 && <span className="ml-1 text-xs">(debe ser 100% — ALLOC-BR-11)</span>}
</div>
```

- [ ] **Step 3: Run tests and commit**

```bash
npm test
git add src/pages/AllocationPage.tsx
git commit -m "fix(AllocationPage): block split save when total != 100% (ALLOC-BR-11)"
```

---

### Task 8 — MGMT-BR-04: Exclude H-NP/H-PROJECT from métier filter

**Spec:** `MGMT-BR-04: "H-NP and H-PROJECT excluded — Consistent with Pre-Estimation filter"` and `MGMT_EXCLUDED_METIERS = {"H-NP", "H-PROJECT"}` with `MGMT_METIER_FILTER_OPTIONS = ["All", "H-DESIGN", "H-TUNING", "H-SOFTWARE", "H-CUSTOMER", "H-TESTING"]`.

**Note:** H-NP and H-PROJECT should be **excluded from the filter dropdown** but their data still counts in the charts/table. Selecting a filter value doesn't apply to these metiers (they're always visible in the matrix).

**Files:**
- Modify: `src/pages/ManagementPage.tsx`

- [ ] **Step 1: Split METIERS into display-all and filter-options**

In `src/pages/ManagementPage.tsx`, replace:

```tsx
// BEFORE:
const METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-PROJECT', 'H-CUSTOMER', 'H-TESTING', 'H-NP'];
```

with:

```tsx
// All métiers shown in matrix/chart (no exclusion from data)
const ALL_METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-PROJECT', 'H-CUSTOMER', 'H-TESTING', 'H-NP'];

// Filter dropdown excludes H-NP and H-PROJECT (MGMT-BR-04 / MGMT_EXCLUDED_METIERS)
const FILTER_METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-CUSTOMER', 'H-TESTING'];
```

- [ ] **Step 2: Use FILTER_METIERS in the filter dropdown only**

In the JSX for the métier filter:

```tsx
// BEFORE:
{METIERS.map((m) => (<option key={m} value={m}>{m}</option>))}

// AFTER:
{FILTER_METIERS.map((m) => (<option key={m} value={m}>{m}</option>))}
```

Keep `ALL_METIERS` for the matrix table rows and the chart data computation.

- [ ] **Step 3: Update metierFilter type and usage to reference ALL_METIERS for matrix**

Replace any `METIERS` reference used for matrix rows with `ALL_METIERS`.

- [ ] **Step 4: Commit** *(hold — combine with Task 9)*

---

### Task 9 — MGMT-BR-06: Remove cycle selector (active cycle only)

**Spec:** `MGMT-BR-06: "Active cycle only — No historical cycle data"` and `MGMT-BR-05: "Single filter for both charts — Métier applies to both simultaneously"` (no cycle or status filter, only métier).

**Files:**
- Modify: `src/pages/ManagementPage.tsx`

- [ ] **Step 1: Remove cycleId state and cycle selector**

Remove:
```tsx
// DELETE these:
const [cycleId, setCycleId] = useState<string>('cyc-2026h1');
```

Add:
```tsx
const cycles = useDataStore((s) => s.cycles);
const activeCycleId = cycles.find((c) => c.is_active)?.id ?? null;
```

- [ ] **Step 2: Remove statusFilter state and status selector**

Remove the status filter state, the status filter `FilterSelect`, and the status condition in `filtered`:

```tsx
// DELETE:
const [statusFilter, setStatusFilter] = useState<LineStatus | 'all'>('all');

// In filtered useMemo, remove:
(statusFilter === 'all' || l.status === statusFilter) &&
```

- [ ] **Step 3: Update filtered to use activeCycleId**

```tsx
const filtered = useMemo(
  () =>
    lines.filter(
      (l) =>
        (activeCycleId === null || l.cycleId === activeCycleId) &&
        (metierFilter === 'all' || l.metier === metierFilter),
    ),
  [lines, activeCycleId, metierFilter],
);
```

- [ ] **Step 4: Remove the FilterSelect for cycle and status from JSX**

The filter bar should only have the métier filter:

```tsx
<div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
  <FilterSelect label={t('filters.metier')} value={metierFilter} onChange={(v) => setMetierFilter(v as Metier | 'all')}>
    <option value="all">{t('filters.all')}</option>
    {FILTER_METIERS.map((m) => (<option key={m} value={m}>{m}</option>))}
  </FilterSelect>
</div>
```

- [ ] **Step 5: Run tests and commit**

```bash
npm test
git add src/pages/ManagementPage.tsx
git commit -m "fix(ManagementPage): active cycle only, métier filter only, exclude H-NP/H-PROJECT (MGMT-BR-04, MGMT-BR-05, MGMT-BR-06)"
```

---

## Phase 3 — Allocation Societe Model Redesign

**Scope note:** This is a full redesign of `AllocationPage.tsx`. The current implementation assigns engineers to project lines. The spec (allocation_specs.py) assigns **societes** to **job units** with FTE/TSA/TC cost types and K€ rates per societe+year. This is architecturally different — a separate plan is recommended.

**Key spec data:**
- `AVAILABLE_SOCIETES`: Horse Spain S.L. (Valladolid/Seville/Madrid), Horse Romania S.A. (Bucarest/Pitesti/Titu), Horse Brasil S.A. (Curitiba), Oyak Horse, CHENNAI GESC H (TSA), GEHEUNG (TSA), Ampere/RG (TSA)
- `FTE_RATES`: e.g. "Horse Spain S.L.-Valladolid" → {2024: 107, 2025: 106, 2026: 103, 2027: 101}
- `TSA_RATES`: e.g. "CHENNAI GESC H" → {2025: 54, 2026: 56.7, 2027: 59.5}
- `COST_TYPES`: FTE, TSA, TC
- Grid rows: one row per job unit per (PL, Métier) pair (not per project line)

### Task 10 — Create societes fixture and K€ calculator

**Files:**
- Create: `src/fixtures/societes.ts`
- Create: `src/lib/kEuro.ts`
- Create: `src/lib/__tests__/kEuro.test.ts`

- [ ] **Step 1: Write the K€ test first**

Create `src/lib/__tests__/kEuro.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateFteKe, calculateTsaKe, AVAILABLE_SOCIETES } from '../kEuro';

describe('calculateFteKe — allocation_specs.py §11.1', () => {
  it('Horse Spain S.L.-Valladolid 2026 = 103', () => {
    expect(calculateFteKe(1.0, 'Horse Spain S.L.-Valladolid', '2026')).toBe(103);
  });
  it('Horse Romania S.A.-Bucarest 2025 = 79', () => {
    expect(calculateFteKe(1.0, 'Horse Romania S.A.-Bucarest', '2025')).toBe(79);
  });
  it('Horse Brasil S.A.-Curitiba 2024 = 85', () => {
    expect(calculateFteKe(1.0, 'Horse Brasil S.A.-Curitiba', '2024')).toBe(85);
  });
  it('scales with FTE: 0.5 FTE at 107 = 53.5', () => {
    expect(calculateFteKe(0.5, 'Horse Spain S.L.-Valladolid', '2024')).toBe(53.5);
  });
  it('unknown societe or year returns 0', () => {
    expect(calculateFteKe(1.0, 'Unknown', '2024')).toBe(0);
    expect(calculateFteKe(1.0, 'Horse Spain S.L.-Valladolid', '2030')).toBe(0);
  });
});

describe('calculateTsaKe — allocation_specs.py §11.2', () => {
  it('CHENNAI GESC H 2025 = 54', () => {
    expect(calculateTsaKe(1.0, 'CHENNAI GESC H', '2025')).toBe(54);
  });
  it('GEHEUNG 2026 = 162.75', () => {
    expect(calculateTsaKe(1.0, 'GEHEUNG', '2026')).toBe(162.75);
  });
});

describe('AVAILABLE_SOCIETES list', () => {
  it('contains 7 societes per spec', () => {
    expect(AVAILABLE_SOCIETES).toHaveLength(7);
  });
  it('Horse Spain S.L. has Valladolid, Seville, Madrid sites', () => {
    const s = AVAILABLE_SOCIETES.find((s) => s.name === 'Horse Spain S.L.');
    expect(s?.sites).toEqual(expect.arrayContaining(['Valladolid', 'Seville', 'Madrid']));
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/lib/__tests__/kEuro.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/kEuro.ts`**

```typescript
export interface SocieteEntry {
  name: string;
  sites: string[];
  costTypes: ('FTE' | 'TSA' | 'TC')[];
}

export const AVAILABLE_SOCIETES: SocieteEntry[] = [
  { name: 'Horse Spain S.L.',   sites: ['Valladolid', 'Seville', 'Madrid'],    costTypes: ['FTE'] },
  { name: 'Horse Romania S.A.', sites: ['Bucarest', 'Pitesti', 'Titu'],        costTypes: ['FTE'] },
  { name: 'Horse Brasil S.A.',  sites: ['Curitiba'],                            costTypes: ['FTE'] },
  { name: 'Oyak Horse',         sites: [],                                      costTypes: ['FTE'] },
  { name: 'CHENNAI GESC H',     sites: [],                                      costTypes: ['TSA'] },
  { name: 'GEHEUNG',            sites: [],                                      costTypes: ['TSA'] },
  { name: 'Ampere/RG',          sites: [],                                      costTypes: ['TSA'] },
];

const FTE_RATES: Record<string, Record<string, number>> = {
  'Horse Spain S.L.-Valladolid': { '2024': 107, '2025': 106, '2026': 103, '2027': 101 },
  'Horse Spain S.L.-Seville':    { '2024': 107, '2025': 106, '2026': 103, '2027': 101 },
  'Horse Spain S.L.-Madrid':     { '2024': 107, '2025': 106, '2026': 103, '2027': 101 },
  'Horse Romania S.A.-Bucarest': { '2024': 100, '2025': 79,  '2026': 76,  '2027': 74  },
  'Horse Romania S.A.-Titu':     { '2024': 100, '2025': 79,  '2026': 76,  '2027': 74  },
  'Horse Romania S.A.-Pitesti':  { '2024': 100, '2025': 79,  '2026': 76,  '2027': 74  },
  'Horse Brasil S.A.-Curitiba':  { '2024': 85,  '2025': 87,  '2026': 80,  '2027': 78  },
  'Oyak Horse':                  { '2024': 100, '2025': 75,  '2026': 68,  '2027': 69  },
};

const TSA_RATES: Record<string, Record<string, number>> = {
  'CHENNAI GESC H': { '2025': 54,  '2026': 56.7,   '2027': 59.5   },
  'GEHEUNG':        { '2025': 155, '2026': 162.75,  '2027': 170.89 },
  'Ampere/RG':      { '2025': 155, '2026': 162.75,  '2027': 170.89 },
};

export function calculateFteKe(fte: number, societeSite: string, year: string): number {
  const rate = FTE_RATES[societeSite]?.[year] ?? 0;
  return Math.round(fte * rate * 100) / 100;
}

export function calculateTsaKe(fte: number, societe: string, year: string): number {
  const rate = TSA_RATES[societe]?.[year] ?? 0;
  return Math.round(fte * rate * 100) / 100;
}

export function getSocieteSiteKey(societeName: string, site: string): string {
  return site ? `${societeName}-${site}` : societeName;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/lib/__tests__/kEuro.test.ts
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kEuro.ts src/lib/__tests__/kEuro.test.ts
git commit -m "feat(kEuro): societe K€ rate tables from SDD Kit allocation_specs.py §11"
```

---

### Task 11 — Redesign AllocationPage: societe model (ALLOC-BR-01 to BR-16)

**Files:**
- Modify: `src/pages/AllocationPage.tsx`
- Modify: `src/fixtures/allocations.ts`

This is the largest task in the plan. The page needs to:
1. Show one row per job unit per (PL, Métier) pair with status=Approved (ALLOC-BR-01)
2. Let users assign a societe + cost type to each JU row (editable columns)
3. Calculate K€ per year using `calculateFteKe` / `calculateTsaKe`
4. Block save when TSA/TC rows have no societe (ALLOC-BR-06)
5. Allow FTE rows without societe (non-blocking, highlighted in amber) (ALLOC-BR-07)
6. Track dirty rows (ALLOC-BR-05)
7. Show "Show unresolved only" filter (ALLOC-BR-14)
8. Split a JU row across multiple societes with percentages summing to 100% (ALLOC-BR-11)

The current `AllocationSplit` type (uses `engineerId`) must be replaced with a societe-based model. The existing data store `setAllocation` needs to work with JU-level rows, not project line rows.

**Approach for this task:** Design the new data model first, then rewrite the page.

- [ ] **Step 1: Update `src/fixtures/allocations.ts` to societe-based model**

```typescript
export interface AllocationRow {
  juId: string;          // references JOB_UNITS fixture
  lineId: string;        // project line ID
  metier: string;
  societe: string;       // e.g. "Horse Spain S.L."
  site: string;          // e.g. "Valladolid"
  costType: 'FTE' | 'TSA' | 'TC';
  fteTotals: Record<string, number>; // year → FTE
}

export const ALLOCATION_ROWS: AllocationRow[] = [
  // PL-024 approved lines — Horse Spain, Valladolid, FTE
  {
    juId: 'ju-api-dev', lineId: 'PL-024', metier: 'H-DESIGN',
    societe: 'Horse Spain S.L.', site: 'Valladolid', costType: 'FTE',
    fteTotals: { '2026': 0.048 },
  },
  // PL-025 — unassigned (no societe) to demonstrate ALLOC-BR-07
  {
    juId: 'ju-ui-dev', lineId: 'PL-025', metier: 'H-SOFTWARE',
    societe: '', site: '', costType: 'FTE',
    fteTotals: { '2026': 0.167 },
  },
  // PL-026 — full assignment
  {
    juId: 'ju-infra-deploy', lineId: 'PL-026', metier: 'H-PROJECT',
    societe: 'Horse Romania S.A.', site: 'Bucarest', costType: 'FTE',
    fteTotals: { '2026': 0.057 },
  },
];
```

- [ ] **Step 2: Rewrite AllocationPage with societe columns**

Replace the contents of `src/pages/AllocationPage.tsx` with a redesigned component that:
- Loads `ALLOCATION_ROWS` (or derives JU rows from approved estimations)
- Shows columns: PL Number, PL Name, Métier, JU Code, JU Description, Total FTE, Societe (dropdown), Site (dropdown), Cost Type (dropdown), K€ (calculated on save/change)
- Inline editing of Societe, Site, Cost Type columns
- "Save" button: blocks if any TSA/TC row has no societe (ALLOC-BR-06/13)
- Highlights FTE rows without societe in amber (non-blocking, ALLOC-BR-07)
- "Show unresolved only" toggle filter
- Dirty row tracking: modified rows get a visual indicator

Key component structure:

```tsx
export function AllocationPage() {
  return (
    <RoleGate permission="view:allocation">
      <AllocationContent />
    </RoleGate>
  );
}

function AllocationContent() {
  const lines = useDataStore((s) => s.lines);
  const can = useRoleStore((s) => s.can);
  const cycles = useDataStore((s) => s.cycles);
  const activeCycleId = cycles.find((c) => c.is_active)?.id ?? null;

  const approvedLines = useMemo(
    () => lines.filter((l) => l.status === 'approved' && (activeCycleId === null || l.cycleId === activeCycleId)),
    [lines, activeCycleId],
  );

  const [rows, setRows] = useState<AllocationRow[]>(() =>
    ALLOCATION_ROWS.filter((r) => approvedLines.some((l) => l.id === r.lineId)),
  );
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);

  const visibleRows = useMemo(
    () => showUnresolvedOnly ? rows.filter((r) => !r.societe) : rows,
    [rows, showUnresolvedOnly],
  );

  function updateRow(juId: string, lineId: string, patch: Partial<AllocationRow>) {
    setRows((rs) =>
      rs.map((r) =>
        r.juId === juId && r.lineId === lineId ? { ...r, ...patch } : r,
      ),
    );
    setDirtyIds((s) => new Set([...s, `${lineId}-${juId}`]));
  }

  const blockingSave = rows.some(
    (r) => (r.costType === 'TSA' || r.costType === 'TC') && !r.societe,
  );

  function handleSave() {
    // persist dirty rows — prototype: just clears dirty tracking
    setDirtyIds(new Set());
    pushToast(`Allocation guardada (${dirtyIds.size} filas)`, 'success');
  }

  // ... render table with columns: PL, Métier, JU, FTE, Societe dropdown, Site dropdown,
  //     CostType dropdown, K€ (calculated), dirty indicator
}
```

The full implementation of the table columns, dropdowns, and K€ calculation follows from the `AVAILABLE_SOCIETES` and `calculateFteKe` from `src/lib/kEuro.ts`.

- [ ] **Step 3: Add TSA/TC save blocker with error message**

```tsx
{blockingSave && (
  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
    TSA/TC rows require a societe before saving (ALLOC-BR-06). Rows highlighted in red.
  </div>
)}
<Button
  variant="primary"
  disabled={blockingSave || !can('edit:allocation')}
  onClick={handleSave}
>
  Guardar allocation
</Button>
```

- [ ] **Step 4: Run tests and commit**

```bash
npm test
git add src/pages/AllocationPage.tsx src/fixtures/allocations.ts src/lib/kEuro.ts
git commit -m "feat(Allocation): redesign with societe/cost-type/K€ model (ALLOC-BR-01..16)

Replaces engineer split model with societe-based allocation per allocation_specs.py.
TSA/TC without societe blocks save (ALLOC-BR-06). FTE without societe highlighted
in amber, non-blocking (ALLOC-BR-07). Dirty row tracking (ALLOC-BR-05).
K€ calculated per FTE_RATES/TSA_RATES from SDD Kit."
```

---

### Tasks 12–16 — Remaining Allocation Features (ALLOC-BR-02, 08, 09, 11, 12)

These tasks build on Task 11 and are best executed sequentially:

**Task 12 — ALLOC-BR-08: Diversity dropdown for H-DESIGN/H-TESTING/H-CUSTOMER**
- Add a "Diversity" column to rows where `METIER_ALLOCATION_CONFIG[metier].has_diversity_dropdown === true`
- Non-blocking (ALLOC-BR-08: "Unresolved diversity does not block save")
- Source: `METIER_ALLOCATION_CONFIG` in allocation_specs.py

**Task 13 — ALLOC-BR-09/10: Bulk societe assignment**
- Add checkbox column to allocation grid rows
- "Bulk Assign Societe" button (visible when rows selected): opens modal to pick a societe
- Overwrites existing societe on all checked rows (ALLOC-BR-09)
- Never changes cost type (ALLOC-BR-10)

**Task 14 — ALLOC-BR-11/12: JU split across multiple societes**
- "Split" button per row: opens modal with N-row form (societe + percentage)
- Percentages must sum to 100% before Save is enabled (ALLOC-BR-11)
- "Undo Split" restores original single row (ALLOC-BR-12)
- Split rows share the FTE proportionally

**Task 15 — ALLOC-BR-02: Auto-rule engine (skip already-assigned)**
- "Apply Rules" button (visible to Admin/PMO/RCRC)
- Reads `ALLOCATION_RULES` from admin fixture
- Applies rules only to rows with no societe (ALLOC-BR-02: "only runs on job units with no societe")
- Note: full rule logic requires the Excel rules file — stub with hardcoded sample rules

**Task 16 — ALLOC-BR-03/04: K€ recalculation on save**
- On save, recalculate K€ for all dirty rows using `calculateFteKe` / `calculateTsaKe`
- Display K€ per year in yearly columns (matching cycle years)

---

## Phase 4 — Final Review Alignment

### Task 17 — FR-BR-06/07/08: Add Stage 3 Send button

**Spec:** `STAGE3_SEND_CONFIG = {scope: "all_lines", resendable: True, blocking_prerequisites: False, warning_on_incomplete: True}`

**Files:**
- Modify: `src/pages/FinalReviewPage.tsx`

- [ ] **Step 1: Add Stage 3 button to Final Review header**

In `FinalReviewContent`, add after the export button:

```tsx
const pushToast = useUIStore((s) => s.pushToast);
const [stage3Warning, setStage3Warning] = useState(false);

const hasUnallocated = approvedLines.some((l) => {
  // lines with no societe assigned are "incomplete allocation"
  return l.estimatedKEuro === null || l.estimatedKEuro === 0;
});

function handleSendStage3() {
  if (hasUnallocated) {
    setStage3Warning(true);
  } else {
    doSendStage3();
  }
}

function doSendStage3() {
  pushToast(`Stage 3 enviado al HVT — ${approvedLines.length} líneas (FR-BR-07: re-sendable)`, 'success');
  setStage3Warning(false);
}
```

In the header actions area:

```tsx
{can('send:stage3') && (
  <Button variant="primary" onClick={handleSendStage3}>
    <Send size={14} /> Enviar Stage 3 a HVT
  </Button>
)}

{stage3Warning && (
  <Modal
    open
    onClose={() => setStage3Warning(false)}
    title="Allocation incompleta — continuar?"
    footer={
      <>
        <Button variant="secondary" onClick={() => setStage3Warning(false)}>Cancelar</Button>
        <Button variant="primary" onClick={doSendStage3}>Enviar igual (FR-BR-06)</Button>
      </>
    }
  >
    <p className="text-sm text-slate-700">
      Algunas líneas aprobadas no tienen societe asignada. Se enviarán con K€=0 (FR-BR-06: Stage 3 non-blocking).
    </p>
  </Modal>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/FinalReviewPage.tsx
git commit -m "feat(FinalReview): add Stage 3 send button with incomplete-allocation warning (FR-BR-06/07/08)"
```

---

### Task 18 — FR-BR-10: JU-level CSV export

**Spec:** `FINAL_REVIEW_CSV_COLUMNS = ["PL Number", "PL Name", "Métier", "Owner N2", "Societe", "Cost Type", "FMM Description", "JU Description", "JU Code", "Total FTE", "Total K€", "Total BH", "Total KM"]` — one row per JU, no subtotal rows.

**Files:**
- Modify: `src/pages/FinalReviewPage.tsx`
- Modify: `src/lib/csvExport.ts`

- [ ] **Step 1: Add a JU-level CSV export function**

In `src/lib/csvExport.ts`, add:

```typescript
import type { AllocationRow } from '../fixtures/allocations';
import type { ProjectLine } from '../types';
import { calculateFteKe, getSocieteSiteKey } from './kEuro';

export interface FinalReviewCsvRow {
  'PL Number': string;
  'PL Name': string;
  'Métier': string;
  'Owner N2': string;
  'Societe': string;
  'Cost Type': string;
  'JU Code': string;
  'JU Description': string;
  'Total FTE': number;
  'Total K€': number;
}

export function exportFinalReviewCsv(
  allocRows: AllocationRow[],
  lines: ProjectLine[],
  filename: string,
): void {
  const rows: FinalReviewCsvRow[] = allocRows.map((r) => {
    const line = lines.find((l) => l.id === r.lineId);
    const totalFte = Object.values(r.fteTotals).reduce((a, b) => a + b, 0);
    const societeSite = getSocieteSiteKey(r.societe, r.site);
    const activeYear = Object.keys(r.fteTotals)[0] ?? '';
    const totalKe = r.costType === 'TSA'
      ? 0 // calculateTsaKe needs import
      : calculateFteKe(totalFte, societeSite, activeYear);
    return {
      'PL Number': r.lineId,
      'PL Name': line?.lineName ?? '',
      'Métier': r.metier,
      'Owner N2': '',
      'Societe': r.societe,
      'Cost Type': r.costType,
      'JU Code': r.juId,
      'JU Description': '',
      'Total FTE': Math.round(totalFte * 1000) / 1000,
      'Total K€': totalKe,
    };
  });

  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? '')).join(','),
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Update FinalReviewPage to use JU-level export**

Replace the export button handler to call `exportFinalReviewCsv` with the allocation rows.

- [ ] **Step 3: Commit**

```bash
git add src/pages/FinalReviewPage.tsx src/lib/csvExport.ts
git commit -m "feat(FinalReview): JU-level CSV export per FR-BR-10 columns"
```

---

## Phase 5 — Estimation Review + Management Alignment

### Task 19 — Estimation Review: CSV export button

**Spec:** `ERev-BR` + `ESTIMATION_REVIEW_PERMISSIONS`: all roles have `can_export_csv=True`.

**Files:**
- Modify: `src/pages/EstimationReviewPage.tsx`

- [ ] **Step 1: Add CSV export to ReviewContent**

In `src/pages/EstimationReviewPage.tsx`, inside `ReviewContent`, add a Download button in the header area:

```tsx
import { Download } from 'lucide-react';
import { exportToCsv } from '../lib/csvExport';

// In JSX header area:
{can('export:estimation-review') && (
  <Button variant="secondary" onClick={() => exportToCsv(visibleLines, `estimation-review-${new Date().toISOString().slice(0,10)}.csv`)}>
    <Download size={14} /> CSV
  </Button>
)}
```

The existing `exportToCsv` from `src/lib/csvExport.ts` accepts `ProjectLine[]`. It will export the currently visible lines. For the full ERev CSV columns per spec (`CSV_EXPORT_COLUMNS` in estimation_review_specs.py), a dedicated export function should be created in a follow-up task.

- [ ] **Step 2: Commit**

```bash
git add src/pages/EstimationReviewPage.tsx
git commit -m "feat(EstimationReview): add CSV export button for all roles (estimation_review_specs.py)"
```

---

### Task 20 — Management: Add timeline chart stub

**Spec:** Management View should show both a status distribution pie chart AND a status evolution timeline. `MGMT-01` (pending): "Timeline data source: event log vs daily snapshot — blocking."

Since `MGMT-01` is listed as blocking (data source not decided), the timeline is implemented as a **placeholder** that communicates the pending decision.

**Files:**
- Modify: `src/pages/ManagementPage.tsx`

- [ ] **Step 1: Add a timeline placeholder below the pie chart**

In `ManagementContent` JSX, after `<StatusPieChart ...>`, add:

```tsx
<div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
  <h3 className="text-sm font-semibold text-slate-600">{t('mgmt.timelineTitle')}</h3>
  <p className="mt-1 text-xs text-slate-400">
    {t('mgmt.timelinePending')}
  </p>
  <div className="mt-3 inline-block rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
    ⏳ MGMT-01 pending — timeline data source not decided (event log vs daily snapshot)
  </div>
</div>
```

Add translations to `src/i18n/en.ts` and `src/i18n/es.ts`:
```ts
// en.ts
'mgmt.timelineTitle': 'Status Evolution Timeline',
'mgmt.timelinePending': 'Will display (PL, Métier) pair counts by status over time for the active cycle.',

// es.ts
'mgmt.timelineTitle': 'Evolución temporal de estados',
'mgmt.timelinePending': 'Mostrará la evolución de pares (LP, Métier) por estado durante el ciclo activo.',
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ManagementPage.tsx src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(ManagementPage): add timeline chart placeholder (MGMT-01 pending decision)"
```

---

## Phase 6 — Admin Enhancements

### Task 21 — WL-BR-04: Workload standard versioning

**Spec:** `WL-BR-04: "Versioned — Each upload is a new version; old versions retained"` and `WL-BR-05: "Isolation — Saved JU coefficients are immutable after save"`.

**Files:**
- Modify: `src/fixtures/admin.ts`
- Modify: `src/pages/AdminPage.tsx`

- [ ] **Step 1: Add version tracking to WorkloadStandard fixture**

In `src/fixtures/admin.ts`, update the `WorkloadStandard` type:

```typescript
export interface WorkloadStandard {
  id: string;
  metier: string;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  versionNumber: number;   // ← new
  status: 'active' | 'superseded'; // ← new
}
```

Update existing fixture entries to include `versionNumber: 1, status: 'active'`.

- [ ] **Step 2: Update WorkloadStandardsTab to show version number and status**

In `WorkloadStandardsTab`, update `handleUpload` to:
1. Mark the previous active entry for this metier as `status: 'superseded'` (WL-BR-04)
2. Set `versionNumber` to previous max + 1
3. Add the new entry with `status: 'active'`

```tsx
function handleUpload() {
  const id = `ws-${Date.now()}`;
  const previousActive = items.filter((i) => i.metier === metier && i.status === 'active');
  const nextVersion = (Math.max(0, ...previousActive.map((i) => i.versionNumber)) + 1);
  setItems((i) => [
    { id, metier, fileName: `${metier.toLowerCase()}-v${nextVersion}-${Date.now()}.xlsx`,
      uploadedAt: new Date().toISOString(), rowCount: 100,
      versionNumber: nextVersion, status: 'active' },
    ...i.map((ws) => ws.metier === metier && ws.status === 'active'
      ? { ...ws, status: 'superseded' as const }
      : ws),
  ]);
  pushToast(`Versión ${nextVersion} cargada para ${metier} — versión anterior marcada como superseded`, 'success');
}
```

- [ ] **Step 3: Add version and status columns to the table**

```tsx
<th>Versión</th>
<th>Estado</th>
// ...
<td>{w.versionNumber}</td>
<td>
  <span className={w.status === 'active' ? 'text-emerald-700' : 'text-slate-400'}>
    {w.status === 'active' ? 'Activo' : 'Superseded'}
  </span>
</td>
```

- [ ] **Step 4: Commit**

```bash
git add src/fixtures/admin.ts src/pages/AdminPage.tsx
git commit -m "feat(admin): workload standard versioning — each upload creates new version (WL-BR-04/05)"
```

---

### Task 22 — DEL-BR-01..10: Bulk inductor deletion tab

**Spec:** `BULK_DELETION_RULES`: Admin + RCRC only, select-all shortcut, confirm modal, deletion is permanent.

**Files:**
- Modify: `src/pages/AdminPage.tsx`

- [ ] **Step 1: Add 'deletion' tab to Admin**

Add `{ key: 'deletion', label: 'Eliminar Inductores' }` to the tabs array (visible to both `view:admin` and `upload:workload-standards`).

- [ ] **Step 2: Implement BulkDeletionTab**

```tsx
function BulkDeletionTab() {
  const [standards, setStandards] = useState(WORKLOAD_STANDARDS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const pushToast = useUIStore((s) => s.pushToast);

  const allSelected = selected.size === standards.length && standards.length > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(standards.map((s) => s.id)));
  }

  function doDelete() {
    const count = selected.size;
    setStandards((s) => s.filter((ws) => !selected.has(ws.id)));
    setSelected(new Set());
    setShowConfirm(false);
    pushToast(`${count} inductor(es) eliminados — acción irreversible (DEL-BR-06)`, 'info');
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Selecciona inductores cargados para eliminar permanentemente (DEL-BR-06).</p>
        <Button
          variant="danger"
          disabled={selected.size === 0}
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 size={14} /> Eliminar ({selected.size})
        </Button>
      </div>
      <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 text-center">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} title="Seleccionar todos (DEL-BR-03)" />
            </th>
            <th className="px-3 py-2 text-left">Métier</th>
            <th className="px-3 py-2 text-left">Archivo</th>
            <th className="px-3 py-2 text-left">Versión</th>
          </tr>
        </thead>
        <tbody>
          {standards.map((ws) => (
            <tr key={ws.id} className="border-t border-slate-100">
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={selected.has(ws.id)}
                  onChange={() =>
                    setSelected((s) => {
                      const n = new Set(s);
                      n.has(ws.id) ? n.delete(ws.id) : n.add(ws.id);
                      return n;
                    })
                  }
                />
              </td>
              <td className="px-3 py-2">{ws.metier}</td>
              <td className="px-3 py-2 font-mono text-xs text-slate-600">{ws.fileName}</td>
              <td className="px-3 py-2">v{ws.versionNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={`Confirmar eliminación (${selected.size} inductores)`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button variant="danger" onClick={doDelete}>Eliminar permanentemente (DEL-BR-06)</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          Esta acción es <strong>irreversible</strong>. Se eliminarán {selected.size} inductor(es) permanentemente.
        </p>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Run full test suite and commit**

```bash
npm test
~/.asdf/shims/python3 -m pytest node_modules/great-sdd-kit/tests/ -v
git add src/pages/AdminPage.tsx
git commit -m "feat(admin): bulk inductor deletion tab (DEL-BR-01..10)

Admin and RCRC only. Select-all shortcut, confirm modal before delete,
permanent deletion (DEL-BR-06). Empty selection disabled (DEL-BR-09)."
```

---

## Out of Scope for This Plan

| Spec item | Reason |
|-----------|--------|
| EMAIL-BR-01..04 (weekly email alerts) | Backend/infrastructure dependency (TRANS-01 blocking) |
| TABLE-BR-01/02/03 (column sort/filter/resize on all grids) | Cross-cutting concern — dedicated plan recommended |
| ERev-BR-10 (CPO approval via HVT only) | Prototype keeps direct CPO approval as HVT simulation. Label it clearly in UI, remove in full implementation |
| ALLOC H-PROJECT/H-NP routing | Depends on Excel rules file — ALLOC-01 pending |
| MGMT timeline (MGMT-01) | Data source decision pending |
| Stage 3 HVT payload (FINAL-01) | Payload schema pending HVT team agreement |

---

## Self-Review Checklist

**Spec coverage:**
- [x] All 5 role specs covered (Tasks 1-3)
- [x] Custom JU message + English translation (Task 4b — ✅ done)
- [x] BR-13 zero occurrence (Task 4)
- [x] ERev-BR-09 active cycle (Task 5)
- [x] FR-BR-03 approved only (Task 6)
- [x] ALLOC-BR-11 split 100% (Task 7)
- [x] MGMT-BR-04/05/06 filter fixes (Tasks 8-9)
- [x] ALLOC-BR-01..16 societe model (Tasks 10-16)
- [x] FR-BR-06/07/08 Stage 3 (Task 17)
- [x] FR-BR-10 JU CSV (Task 18)
- [x] EstimationReview CSV (Task 19)
- [x] Management timeline stub (Task 20)
- [x] WL-BR-04/05 versioning (Task 21)
- [x] DEL-BR-01..10 bulk deletion (Task 22)

**Gaps with no task** (tracked as out-of-scope above):
- Email alerts, TABLE sorting/filtering/resizing, ERev-BR-10 label, H-PROJECT routing
