# BR-20 Custom JU Permissions — PMO Gap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give PMO the `edit:custom-jus` permission and remove the `canEdit` guard that blocks Custom JU buttons for roles who can't edit the estimation itself (BR-20).

**Architecture:** Two-file fix — roles permission + EstimationPanel guard logic. The Custom JU section currently uses `canEdit && canEditCustomJU` for all buttons/inputs; BR-20 requires `canEditCustomJU` to be sufficient on its own (PMO can create Custom JUs but cannot edit estimation fields).

**Tech Stack:** TypeScript, React, Vitest. Test: `npm test`. Spec validation: `pytest node_modules/great-sdd-kit/tests/ -v`.

---

## Gap Summary

| Rule | Violation | Location |
|------|-----------|----------|
| **BR-20** | PMO missing `edit:custom-jus` | `src/fixtures/roles.ts:43` |
| **BR-20** | Custom JU buttons guarded by `canEdit && canEditCustomJU` instead of `canEditCustomJU` | `src/components/estimation/EstimationPanel.tsx:753,775,784,787` |

---

## File Map

**Modify:**
- `src/fixtures/roles.ts:43-55` — add `'edit:custom-jus'` to PMO
- `src/components/estimation/EstimationPanel.tsx:753,775,784,787` — replace `canEdit && canEditCustomJU` / `!canEdit || !canEditCustomJU` with `canEditCustomJU` / `!canEditCustomJU`
- `src/fixtures/__tests__/roles.test.ts` — add BR-20 test block

---

## Task 1: Write failing test for BR-20

**Files:**
- Modify: `src/fixtures/__tests__/roles.test.ts`

- [ ] **Step 1: Add BR-20 test block**

In `src/fixtures/__tests__/roles.test.ts`, append after the Workload Standard permissions block (after line 129):

```typescript
describe('Custom JU permissions (pre_estimation_specs.py — BR-20)', () => {
  it('Engineer, PMO, and Admin can create Custom JUs (BR-20)', () => {
    expect(can('Engineer', 'edit:custom-jus')).toBe(true);
    expect(can('PMO', 'edit:custom-jus')).toBe(true);
    expect(can('Admin', 'edit:custom-jus')).toBe(true);
  });

  it('RCRC and CPO cannot create Custom JUs (BR-20)', () => {
    expect(can('RCRC', 'edit:custom-jus')).toBe(false);
    expect(can('CPO', 'edit:custom-jus')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify PMO case fails**

```bash
npx vitest run src/fixtures/__tests__/roles.test.ts
```

Expected: FAIL — `can('PMO', 'edit:custom-jus')` returns false.

---

## Task 2: Add `edit:custom-jus` to PMO

**Files:**
- Modify: `src/fixtures/roles.ts:43-55`

- [ ] **Step 1: Add permission to PMO**

In `src/fixtures/roles.ts`, find the PMO block (lines 43–55) and add `'edit:custom-jus'`:

```typescript
// BEFORE:
PMO: [
  'view:pre-estimation',
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

// AFTER:
PMO: [
  'view:pre-estimation',
  'edit:custom-jus',           // BR-20: PMO can create Custom JUs
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
```

- [ ] **Step 2: Run roles test to verify it passes**

```bash
npx vitest run src/fixtures/__tests__/roles.test.ts
```

Expected: all 26 tests PASS (including the 2 new BR-20 tests).

---

## Task 3: Fix EstimationPanel Custom JU guards

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx:753,775,784,787`

The Custom JU section currently uses `canEdit && canEditCustomJU` to show buttons and `!canEdit || !canEditCustomJU` to disable inputs. BR-20 requires only `canEditCustomJU` (PMO can create Custom JUs without `edit:estimation`).

- [ ] **Step 1: Update Add JU button guard (line 753)**

```typescript
// BEFORE:
{canEdit && canEditCustomJU && (
  <Button
    size="sm"
    variant="secondary"
    onClick={() => onChange((j) => [...j, { id: `ju-${Date.now()}`, description: '', days: 1 }])}
  >
    + Add JU
  </Button>
)}

// AFTER:
{canEditCustomJU && (
  <Button
    size="sm"
    variant="secondary"
    onClick={() => onChange((j) => [...j, { id: `ju-${Date.now()}`, description: '', days: 1 }])}
  >
    + Add JU
  </Button>
)}
```

- [ ] **Step 2: Update description input disabled condition (line 775)**

```typescript
// BEFORE:
disabled={!canEdit || !canEditCustomJU}

// AFTER:
disabled={!canEditCustomJU}
```

- [ ] **Step 3: Update days input disabled condition (line 784)**

```typescript
// BEFORE:
disabled={!canEdit || !canEditCustomJU}

// AFTER:
disabled={!canEditCustomJU}
```

- [ ] **Step 4: Update Remove (trash) button guard (line 787)**

```typescript
// BEFORE:
{canEdit && canEditCustomJU && (
  <button onClick={() => onChange((j) => j.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
    <Trash2 size={13} />
  </button>
)}

// AFTER:
{canEditCustomJU && (
  <button onClick={() => onChange((j) => j.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
    <Trash2 size={13} />
  </button>
)}
```

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all 73 tests PASS (71 existing + 2 new BR-20 tests).

- [ ] **Step 6: Run SDD kit tests**

```bash
pytest node_modules/great-sdd-kit/tests/ -v
```

Expected: 263 passed.

- [ ] **Step 7: Commit**

```bash
git add src/fixtures/roles.ts src/components/estimation/EstimationPanel.tsx src/fixtures/__tests__/roles.test.ts
git commit -m "fix(roles): BR-20 — add edit:custom-jus to PMO, remove canEdit guard from Custom JU section"
```
