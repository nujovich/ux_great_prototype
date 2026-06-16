# HIW-178 — Management View Access Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Management View a read-only dashboard accessible to PMO, Admin **and RCRC**, while CPO and Engineer remain without access — aligning the frontend with the Management View PRD (sections 1, 2, 10) and SDD Kit v2.2.1 (`MANAGEMENT_ACCESS[RCRC] = True`, `MGMT-BR-01`).

**Architecture:** The prototype gates each view via a per-role permission matrix in `src/fixtures/roles.ts` (`ROLE_PERMISSIONS`). A `view:management` permission drives BOTH the sidebar visibility (`visibleNavFor`) and the in-page `RoleGate`. HIW-178 has TWO code gaps: (1) the `RCRC` role list omits `view:management`; (2) the "blank for PMO/Admin" symptom IS real — `ManagementPage` built its (Métier × Status) matrix from `filtered`, which included every active-cycle line, but the matrix only initialized the 5 allowed métiers (MGMT-BR-04). An `H-PROJECT`/`H-NP` line in the active cycle dereferenced an undefined bucket and threw, blanking the page. Fixed by excluding `H-NP`/`H-PROJECT` from `filtered`.

> **Execution note (2026-06-16):** The render test in Task 3 reproduced the PMO/Admin blank as a real runtime crash (`Cannot read properties of undefined (reading 'To do')` at `ManagementPage.tsx:47`) — contrary to the original assumption below that it was not reproducible. The fix landed in Task 3 alongside the access test; Task 4 confirmed it live for Engineer (gated), RCRC and PMO (render).

**Tech Stack:** React 19, Vite, TypeScript, react-router-dom v7, Zustand, Vitest + React Testing Library. SDD Kit consumed via `github:nujovich/great-sdd-kit#v2.2.1` (already bumped).

**Pre-context for the engineer (read before starting):**
- Roles: `'Engineer' | 'PMO' | 'Admin' | 'RCRC' | 'CPO'` (`src/types`, `src/fixtures/roles.ts:3`).
- Permission matrix: `ROLE_PERMISSIONS` in `src/fixtures/roles.ts:27-91`. RCRC block is lines 73-83.
- Access check: `useRoleStore().can(permission)` (`src/store/roleStore.ts`) → `ROLE_PERMISSIONS[role].includes(permission)`.
- Nav visibility: `visibleNavFor(role)` in `src/lib/permissions.ts:24-26`, filtering `NAV_ITEMS` (`src/lib/permissions.ts:15-22`) where Management is `{ key:'management', path:'/management', permission:'view:management' }`.
- Page gate: `src/pages/ManagementPage.tsx:14-20` wraps content in `<RoleGate permission="view:management">`.
- `RoleGate` (`src/components/shared/RoleGate.tsx`) renders an amber "no access" box when `!can(permission)`.
- Existing role spec test: `src/fixtures/__tests__/roles.test.ts:82-96` (currently encodes the OLD spec: RCRC=false).
- Test command: `npm test` (vitest run). Single file: `npx vitest run <path>`.

---

### Task 1: Flip the Management access spec test to require RCRC

**Files:**
- Test: `src/fixtures/__tests__/roles.test.ts:82-96`

- [ ] **Step 1: Update the failing test to the new spec**

Replace the `describe('Management View permissions ...')` block so it asserts RCRC **can** view Management and the describe text reflects the new rule:

```ts
describe('Management View permissions (management_view_specs.py — MGMT-BR-01, v2.2.1)', () => {
  it('Admin, PMO and RCRC can view Management', () => {
    expect(can('Admin', 'view:management')).toBe(true);
    expect(can('PMO', 'view:management')).toBe(true);
    expect(can('RCRC', 'view:management')).toBe(true);
  });
  it('RCRC can view Management (spec: MANAGEMENT_ACCESS[RCRC]=True)', () => {
    expect(can('RCRC', 'view:management')).toBe(true);
  });
  it('CPO cannot view Management (spec: MANAGEMENT_ACCESS[CPO]=False)', () => {
    expect(can('CPO', 'view:management')).toBe(false);
  });
  it('Engineer cannot view Management', () => {
    expect(can('Engineer', 'view:management')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/fixtures/__tests__/roles.test.ts`
Expected: FAIL — `can('RCRC', 'view:management')` returns `false` (expected `true`).

- [ ] **Step 3: Grant RCRC the permission**

In `src/fixtures/roles.ts`, add `'view:management'` to the RCRC permission list (lines 73-83). The RCRC block becomes:

```ts
  RCRC: [
    'view:pre-estimation',
    'view:estimation-review',
    'export:estimation-review',
    'view:allocation',
    'edit:allocation',
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    'upload:workload-standards',
    'view:management',
  ],
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/fixtures/__tests__/roles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/fixtures/roles.ts src/fixtures/__tests__/roles.test.ts
git commit -m "feat(management): grant RCRC view:management access (HIW-178)"
```

---

### Task 2: Assert RCRC sees Management in the sidebar nav

**Files:**
- Test: `src/lib/__tests__/permissions.test.ts` (create if it does not exist; otherwise add the test to the existing file)

- [ ] **Step 1: Write the failing test**

If `src/lib/__tests__/permissions.test.ts` does not exist, create it:

```ts
import { describe, it, expect } from 'vitest';
import { visibleNavFor } from '../permissions';

describe('visibleNavFor — Management visibility (HIW-178)', () => {
  const hasManagement = (role: Parameters<typeof visibleNavFor>[0]) =>
    visibleNavFor(role).some((n) => n.key === 'management');

  it('PMO, Admin and RCRC see Management in the nav', () => {
    expect(hasManagement('PMO')).toBe(true);
    expect(hasManagement('Admin')).toBe(true);
    expect(hasManagement('RCRC')).toBe(true);
  });

  it('CPO and Engineer do not see Management in the nav', () => {
    expect(hasManagement('CPO')).toBe(false);
    expect(hasManagement('Engineer')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/lib/__tests__/permissions.test.ts`
Expected: PASS (Task 1 already granted the permission, which `visibleNavFor` reads). If RCRC fails here, Task 1 was not applied correctly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/permissions.test.ts
git commit -m "test(management): RCRC sees Management nav item (HIW-178)"
```

---

### Task 3: Render test — RCRC and PMO get content, CPO/Engineer get the access gate

**Files:**
- Test: `src/pages/__tests__/management.access.test.tsx` (create)
- Reference (do not modify): `src/pages/ManagementPage.tsx`, `src/store/roleStore.ts`, `src/components/shared/RoleGate.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/__tests__/management.access.test.tsx`. It sets the role via `useRoleStore` before rendering and checks that allowed roles render the dashboard title while denied roles render the `RoleGate` fallback. Use the page's i18n title key `mgmt.title` and the RoleGate title key `roleGate.title` via their rendered text; query by role-agnostic markers instead.

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ManagementPage } from '../ManagementPage';
import { useRoleStore } from '../../store/roleStore';
import type { Role } from '../../types';

function renderAs(role: Role) {
  useRoleStore.getState().setRole(role);
  return render(<ManagementPage />);
}

describe('ManagementPage access (HIW-178)', () => {
  beforeEach(() => cleanup());

  it.each(['Admin', 'PMO', 'RCRC'] as Role[])('renders the dashboard for %s', (role) => {
    renderAs(role);
    // The status matrix table header "Métier" only renders when access is granted.
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it.each(['CPO', 'Engineer'] as Role[])('blocks %s with the access gate', (role) => {
    renderAs(role);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/pages/__tests__/management.access.test.tsx`
Expected: PASS. If `Admin`/`PMO`/`RCRC` cannot find a `table`, confirm the active cycle has lines (it does: `cyc-2026h1` has 26 lines in `src/fixtures/projectLines.ts`). If `CPO`/`Engineer` find a table, Task 1's deny list is wrong.

- [ ] **Step 3: Commit**

```bash
git add src/pages/__tests__/management.access.test.tsx
git commit -m "test(management): access matrix render test for all roles (HIW-178)"
```

---

### Task 4: Reproduce and confirm the PMO/Admin "blank" symptom is resolved (verification, no code)

The ticket reports the page rendering blank for PMO/Admin. In the current codebase this is NOT reproducible (PMO/Admin already hold `view:management`; the active cycle has 26 lines with allowed métiers). This task confirms that in the running app and documents the result. **If the page genuinely renders blank, STOP and investigate before assuming this plan is complete** — capture the actual cause (browser console error, empty data store, missing i18n keys `mgmt.title`/`mgmt.subtitle`/`mgmt.pieTitle`) and add a remediation task.

**Files:** none (manual verification).

- [ ] **Step 1: Start the app**

Run: `npm run dev`
Expected: Vite dev server starts; open the printed local URL.

- [ ] **Step 2: Verify each role via the in-app role switcher**

For each role, switch the role (role switcher in the layout) and navigate to `/management`:
- **PMO:** "Management" appears in the sidebar; page shows title, filters, status pie chart, and the (Métier × Status) matrix populated from the active cycle.
- **Admin:** same as PMO.
- **RCRC:** "Management" now appears in the sidebar; page renders the same dashboard (read-only).
- **CPO:** "Management" is NOT in the sidebar; visiting `/management` directly shows the amber access-gate box.
- **Engineer:** same as CPO.

- [ ] **Step 3: Confirm read-only (MGMT-BR-08)**

On the Management page (as PMO/Admin/RCRC) confirm there are no data-entry controls — only the Status and Métier filter selects. Expected: no save/edit/send buttons. No code change; this is a confirmation that the page already satisfies the read-only rule.

- [ ] **Step 4: Record the outcome**

If everything renders as expected, note in the PR description that the PMO/Admin blank symptom was not reproducible on `#v2.2.1` and the fix scope was the RCRC grant. If a blank is observed, add tasks here describing the concrete fix.

---

### Task 5: Full test suite + typecheck gate

**Files:** none.

- [ ] **Step 1: Run the full frontend test suite**

Run: `npm test`
Expected: PASS (all suites, including the three added/updated in Tasks 1-3).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean (no new errors in HIW-178 scope).

- [ ] **Step 3: Validate the SDD Kit contract still holds**

Run: `python -m pytest node_modules/great-sdd-kit/tests/ -q`
Expected: `342 passed` — confirms the installed kit (v2.2.1) carries `MANAGEMENT_ACCESS[RCRC]=True` that the frontend now mirrors.

- [ ] **Step 4: Final commit (if any uncommitted changes remain)**

```bash
git status
# commit anything outstanding with a conventional message
```

---

## Out of scope (kit already done)

The SDD Kit change for HIW-178 is already shipped: `great-sdd-kit` **v2.2.1** (branch `release/v2.2.1` + tag `v2.2.1`) sets `MANAGEMENT_ACCESS[RCRC] = True` and reworded `MGMT-BR-01`; the prototype's `package.json` already pins `#v2.2.1`. No further kit work is required for this plan.

## Follow-ups (not blocking this plan)

- **Kit `master` integration:** v2.2.1 was cut on `release/v2.2.1` off `release/v2.2.0`. `master` still has `MANAGEMENT_ACCESS[RCRC]=False`. Open a PR to merge `release/v2.2.1` into `master` so the next release base is current. (Mirrors how v2.2.0 reached master via PR #2.)

## Self-Review

- **Spec coverage:** RCRC read-only access → Tasks 1-3. PMO/Admin accessible (not blank) → Task 4. CPO/Engineer no access → Tasks 1-3 (deny assertions) + Task 4. Read-only (MGMT-BR-08) → Task 4 Step 3. Kit alignment → Task 5 Step 3.
- **Placeholder scan:** none — all steps carry concrete code/commands.
- **Type consistency:** `view:management` is an existing member of the `Permission` union (`src/fixtures/roles.ts:23`); `visibleNavFor`/`NAV_ITEMS` keys (`management`) and `Role` values match the codebase.
