# HIW-174 Phase 1 — Spec, Status & Permission Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the four spec/ticket conflicts of HIW-174 in the SDD Kit source repo (release a breaking **v2.0.0**) and align the frontend to those changes, plus add the fixture foundations (JU `variable`/`fixed`, a single-cran inductor) that later phases depend on.

**Architecture:** Two repos. **(1) SDD Kit** at `/home/nujovich/great-sdd-kit` — the authoritative spec registry; edit specs + Python tests, regenerate the deterministic conformance fixtures, run `pytest`, bump to v2.0.0, tag. **(2) Frontend** at `/home/nujovich/ux_great_prototype` — bump the `great-sdd-kit` git pin to v2.0.0, then apply the matching TypeScript changes. The frontend does **not** import the kit at runtime (no `src/` references); the kit is consumed only by its own `pytest` suite, so the version bump is low-risk for the FE build.

**Tech Stack:** Python 3.12 + pytest (SDD Kit); React + Vite + TypeScript + Vitest + React Testing Library (frontend). Métiers are `H-*`; the FE already uses `H-*` and only the SDD Python spec needs the taxonomy migration.

**Decisions locked in brainstorming (see `docs/superpowers/specs/2026-06-10-hiw-174-pre-estimation-prd-alignment-design.md`):**
- Ticket wins over specs; update the specs to match.
- Status `Rejected`/`rejected` → `Modification Requested`/`modification_requested`.
- SDD `METIERS` + `WORKLOAD_STANDARDS` keys migrate to `H-*`.
- `EXCLUDED_METIERS_FROM_FILTER` gains `H-TESTING`.
- PMO can **no longer** create Custom JUs (`CUSTOM_JU_ROLES["PMO"] = False`).
- SDD changes are **breaking** per the kit's own `VERSIONING.md` → **v2.0.0**, applied on top of `master`.
- Project-line column data enrichment (SP/PC/CO/SOP, client, market, …) is **deferred to the Phase 2 (grid) plan**.

**Métier mapping (generic → H-\*)** used in Tasks 2:

| Generic (current) | H-* (target) |
|-------------------|--------------|
| Backend  | H-DESIGN |
| Frontend | H-SOFTWARE |
| Data     | H-TUNING |
| DevOps   | H-PROJECT |
| QA       | H-TESTING |
| Mobile   | H-CUSTOMER |

(This mirrors the métier already carried by the frontend JUs in `src/fixtures/inductors.ts`.)

---

# Part A — SDD Kit (`/home/nujovich/great-sdd-kit`)

> All Part A commands run from `/home/nujovich/great-sdd-kit`. Use `git -C /home/nujovich/great-sdd-kit …` if your shell sits in the frontend dir (the harness resets cwd between calls).

### Task 1: Branch from master + rename status REJECTED → MODIFICATION_REQUESTED

**Files:**
- Modify: `great_sdd/specs/pre_estimation_specs.py:21-43`
- Test: `tests/` (existing tests assert on `LineStatus.REJECTED` / `"rejected"`)

- [ ] **Step 1: Create the working branch from master**

```bash
git -C /home/nujovich/great-sdd-kit fetch origin
git -C /home/nujovich/great-sdd-kit checkout master
git -C /home/nujovich/great-sdd-kit pull --ff-only
git -C /home/nujovich/great-sdd-kit checkout -b feat/hiw-174-prd-alignment
```

Expected: on a new branch `feat/hiw-174-prd-alignment` based on latest `master`.

- [ ] **Step 2: Confirm the baseline (tests green before changes)**

Run: `cd /home/nujovich/great-sdd-kit && python -m pytest tests/ -q`
Expected: PASS (the v1.3.0 suite is green). Note the passing count.

- [ ] **Step 3: Rename the enum member in the spec**

In `great_sdd/specs/pre_estimation_specs.py`, change the `LineStatus` enum (line 26):

```python
# before
    REJECTED = "rejected"
# after
    MODIFICATION_REQUESTED = "modification_requested"
```

Then update every `LineStatus.REJECTED` reference in the same file:
- `STATUS_TRANSITIONS` (lines 34-36):

```python
    LineStatus.ESTIMATED: [LineStatus.SENT, LineStatus.MODIFICATION_REQUESTED],
    LineStatus.SENT:      [LineStatus.APPROVED, LineStatus.MODIFICATION_REQUESTED],
    LineStatus.MODIFICATION_REQUESTED:  [LineStatus.DRAFT, LineStatus.ESTIMATED],
```

- `EDITABLE_STATUSES` (line 42):

```python
EDITABLE_STATUSES = {LineStatus.TODO, LineStatus.DRAFT, LineStatus.MODIFICATION_REQUESTED}
```

- [ ] **Step 4: Find every other REJECTED/rejected reference in the kit**

Run:
```bash
cd /home/nujovich/great-sdd-kit && grep -rn "REJECTED\|\"rejected\"\|'rejected'" great_sdd/ sdd/ tests/ --include=*.py
```
Expected: a list spanning `great_sdd/modules/*.py`, `tests/test_pipeline.py`, `tests/test_estimation_review.py`, `tests/test_management_view.py`, `tests/sample_data.py`.

- [ ] **Step 5: Apply the rename across modules and tests**

Apply this exact value mapping to every hit from Step 4:
- Identifier `LineStatus.REJECTED` → `LineStatus.MODIFICATION_REQUESTED`
- String literal `"rejected"` / `'rejected'` (status values, dict keys, sample data) → `"modification_requested"`
- Any display string that literally reads `"Rejected"` as a status value → `"Modification Requested"`

Do **not** rename CPO-facing rejection *action* vocabulary that is not a line status (e.g. a `can_reject` permission flag, or an `"✗ Rejected"` CPO-approval display column in `test_estimation_review.py`) — those describe the CPO decision, not the line's status. When unsure, a string is a *status* if it is compared against `LineStatus` values or appears in a `"status"` field.

- [ ] **Step 6: Run the status-related tests to verify the rename is internally consistent**

Run: `cd /home/nujovich/great-sdd-kit && python -m pytest tests/test_pipeline.py tests/test_estimation_review.py tests/test_management_view.py -q`
Expected: PASS. (Conformance fixtures are regenerated later in Task 4 — if `tests/test_conformance.py` is included here it may report drift; that is expected and fixed in Task 4.)

- [ ] **Step 7: Commit**

```bash
git -C /home/nujovich/great-sdd-kit add great_sdd/ sdd/ tests/
git -C /home/nujovich/great-sdd-kit commit -m "feat(specs)!: rename line status Rejected -> Modification Requested (HIW-174)"
```

---

### Task 2: Migrate métier taxonomy (generic → H-*) in the spec

**Files:**
- Modify: `great_sdd/specs/pre_estimation_specs.py:76` (`METIERS`) and `:302` (`WORKLOAD_STANDARDS` keys)
- Modify: any `great_sdd/modules/*.py` that hardcodes a generic métier
- Test: `tests/test_pipeline.py` (iterates métiers / indexes `WORKLOAD_STANDARDS`)

- [ ] **Step 1: Update the METIERS list**

`great_sdd/specs/pre_estimation_specs.py` line 76:

```python
# before
METIERS = ["Backend", "Frontend", "Data", "DevOps", "QA", "Mobile"]
# after
METIERS = ["H-DESIGN", "H-SOFTWARE", "H-TUNING", "H-PROJECT", "H-TESTING", "H-CUSTOMER"]
```

- [ ] **Step 2: Re-key WORKLOAD_STANDARDS**

In the `WORKLOAD_STANDARDS` dict (starts line 302), rename the six top-level keys using the mapping in the plan header (`"Backend"` → `"H-DESIGN"`, `"Frontend"` → `"H-SOFTWARE"`, `"Data"` → `"H-TUNING"`, `"DevOps"` → `"H-PROJECT"`, `"QA"` → `"H-TESTING"`, `"Mobile"` → `"H-CUSTOMER"`). Leave each `Inductor(...)` body unchanged.

- [ ] **Step 3: Find and update generic-métier references in modules and tests**

Run:
```bash
cd /home/nujovich/great-sdd-kit && grep -rn '"Backend"\|"Frontend"\|"Data"\|"DevOps"\|"QA"\|"Mobile"' great_sdd/ tests/ --include=*.py
```
For each hit that refers to a métier or a `WORKLOAD_STANDARDS` key (e.g. `tests/test_pipeline.py` loop over `["Backend", …]` and `WORKLOAD_STANDARDS["Backend"]`), apply the header mapping. Skip hits where the word is unrelated prose (e.g. a docstring sentence) — but update any executable assertion or key access.

- [ ] **Step 4: Run the affected tests**

Run: `cd /home/nujovich/great-sdd-kit && python -m pytest tests/test_pipeline.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/nujovich/great-sdd-kit add great_sdd/ tests/
git -C /home/nujovich/great-sdd-kit commit -m "feat(specs)!: migrate metier taxonomy to H-* (HIW-174)"
```

---

### Task 3: Add H-TESTING to excluded métiers + remove PMO Custom-JU permission (BR-20)

**Files:**
- Modify: `great_sdd/specs/pre_estimation_specs.py:79` (`EXCLUDED_METIERS_FROM_FILTER`), `:142` (BR-20 text), `:148-154` (`CUSTOM_JU_ROLES`)
- Test: `tests/test_pipeline.py:818-831` (custom-JU role assertions)

- [ ] **Step 1: Add H-TESTING to the exclusion list**

`great_sdd/specs/pre_estimation_specs.py` line 79:

```python
# before
EXCLUDED_METIERS_FROM_FILTER = ["H-NP", "H-PROJECT"]
# after
EXCLUDED_METIERS_FROM_FILTER = ["H-NP", "H-PROJECT", "H-TESTING"]
```

- [ ] **Step 2: Flip PMO to False and update the BR-20 rule text**

Line 142 (BR-20 text):

```python
{"id": "BR-20", "rule": "Custom JU permissions — Engineer and Admin can create Custom JUs; PMO, RCRC, and CPO cannot"},
```

Lines 148-154 (`CUSTOM_JU_ROLES`):

```python
CUSTOM_JU_ROLES: dict[str, bool] = {
    "Admin":    True,
    "Engineer": True,
    "PMO":      False,
    "RCRC":     False,
    "CPO":      False,
}
```

- [ ] **Step 3: Update the PMO assertion in the existing test**

In `tests/test_pipeline.py` (the `test_custom_ju_roles_correct` / `can_create_custom_ju` block, around lines 818-831):

```python
# before
assert CUSTOM_JU_ROLES["PMO"] is True
...
assert can_create_custom_ju("PMO") is True
# after
assert CUSTOM_JU_ROLES["PMO"] is False
...
assert can_create_custom_ju("PMO") is False
```

If the assertion sits inside an "allowed" test, move the PMO line to the "cannot" test and update any docstring that lists PMO as allowed.

- [ ] **Step 4: Find any EXCLUDED_METIERS assertions and update if present**

Run:
```bash
cd /home/nujovich/great-sdd-kit && grep -rn "EXCLUDED_METIERS_FROM_FILTER" tests/ --include=*.py
```
For each test asserting the excluded set, add `"H-TESTING"` to the expected value.

- [ ] **Step 5: Run the affected tests**

Run: `cd /home/nujovich/great-sdd-kit && python -m pytest tests/test_pipeline.py -q`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C /home/nujovich/great-sdd-kit add great_sdd/ tests/
git -C /home/nujovich/great-sdd-kit commit -m "feat(specs)!: exclude H-TESTING from filter; PMO cannot create Custom JUs (BR-20, HIW-174)"
```

---

### Task 4: Regenerate conformance fixtures + full green suite

**Files:**
- Modify (generated): `great_sdd/conformance/fixtures/*.json`, `great_sdd/conformance/fixtures/_inventory.json`

- [ ] **Step 1: Regenerate the deterministic fixtures**

Run: `cd /home/nujovich/great-sdd-kit && python -m great_sdd.conformance.generate`
Expected: fixtures rewritten. `git -C /home/nujovich/great-sdd-kit status --short` shows modified JSON under `great_sdd/conformance/fixtures/` (status values now `modification_requested`, métier values now `H-*`, PMO custom-JU expectations now `false`). `sdd_version` still shows the current version — it is corrected in Task 5 Step 3.

- [ ] **Step 2: Verify no drift remains**

Run: `cd /home/nujovich/great-sdd-kit && python -m great_sdd.conformance.generate --check`
Expected: exit 0 (no diff vs the just-written fixtures).

- [ ] **Step 3: Run the full pytest suite + coverage gate**

Run: `cd /home/nujovich/great-sdd-kit && python -m pytest tests/ -q`
Expected: PASS (all tests, including `tests/test_conformance.py`).

- [ ] **Step 4: Commit the regenerated fixtures**

```bash
git -C /home/nujovich/great-sdd-kit add great_sdd/conformance/fixtures/
git -C /home/nujovich/great-sdd-kit commit -m "chore(conformance): regenerate fixtures for HIW-174 spec changes"
```

---

### Task 5: Bump to v2.0.0, changelog, tag, push, PR

**Files:**
- Modify: `CHANGELOG.md`; (auto) `great_sdd/__init__.py`, `pyproject.toml`, `package.json`

- [ ] **Step 1: Add a CHANGELOG entry**

Prepend a `## 2.0.0` section to `CHANGELOG.md` describing the breaking changes:

```markdown
## 2.0.0

### Breaking
- Rename line status `Rejected`/`rejected` → `Modification Requested`/`modification_requested` (HIW-174).
- Migrate métier taxonomy from generic names to `H-*` (`METIERS`, `WORKLOAD_STANDARDS` keys).
- `CUSTOM_JU_ROLES["PMO"]` is now `False` — PMO can no longer create Custom JUs (BR-20).

### Changed
- `EXCLUDED_METIERS_FROM_FILTER` now includes `H-TESTING`.
- Conformance fixtures regenerated for `sdd_version` 2.0.0.
```

- [ ] **Step 2: Run the version bump (commits + tags v2.0.0)**

Run: `cd /home/nujovich/great-sdd-kit && python3 scripts/bump_version.py major`
Expected: prints `Bumping major: 1.3.0 → 2.0.0`, updates `__init__.py`/`pyproject.toml`/`package.json`, commits `chore: bump version 1.3.0 → 2.0.0`, creates tag `v2.0.0`.

- [ ] **Step 3: Re-stamp fixtures with the new version and re-point the (local, unpushed) tag**

The bump set `__version__` to `2.0.0` only now, so the fixtures still carry the old `sdd_version`. Regenerate so they read `2.0.0`, then move the not-yet-pushed tag onto the corrected commit:

```bash
cd /home/nujovich/great-sdd-kit
python -m great_sdd.conformance.generate          # restamp sdd_version → 2.0.0
python -m great_sdd.conformance.generate --check    # exit 0
python -m pytest tests/ -q                           # all green
git add great_sdd/conformance/fixtures/
git commit -m "chore(conformance): stamp fixtures sdd_version 2.0.0"
git tag -f v2.0.0                                    # move local tag to this commit
```

Expected: `git -C /home/nujovich/great-sdd-kit show v2.0.0 --stat` lists the fixture-stamp commit.

- [ ] **Step 4: Push the branch and tag, open the PR to master**

```bash
cd /home/nujovich/great-sdd-kit
git push -u origin feat/hiw-174-prd-alignment
git push origin v2.0.0
gh pr create --base master --head feat/hiw-174-prd-alignment \
  --title "HIW-174: PRD alignment (breaking) — v2.0.0" \
  --body "Status rename, métier taxonomy → H-*, H-TESTING excluded, PMO loses Custom-JU permission (BR-20). Conformance fixtures regenerated; full pytest + coverage gate green. Breaking per VERSIONING.md → major bump."
```

Expected: branch + tag on origin; PR opened. **Checkpoint:** stop here for human review/merge before Part B consumes the new version. (If team policy tags only from merged `master`, merge the PR first, then `git tag`/push `v2.0.0` from `master`.)

---

# Part B — Frontend (`/home/nujovich/ux_great_prototype`)

> All Part B commands run from `/home/nujovich/ux_great_prototype`.

### Task 6: Bump the great-sdd-kit pin to v2.0.0

**Files:**
- Modify: `package.json` (the `great-sdd-kit` dependency)

- [ ] **Step 1: Create a frontend feature branch**

```bash
git -C /home/nujovich/ux_great_prototype checkout -b feat/hiw-174-phase-1
```

Expected: on `feat/hiw-174-phase-1` (off the current `feat/sdd-kit-integration` branch).

- [ ] **Step 2: Update the dependency pin**

In `package.json`, change:

```json
"great-sdd-kit": "git+https://github.com/nujovich/great-sdd-kit.git#v2.0.0",
```

- [ ] **Step 3: Reinstall and verify the kit's pytest still passes against v2.0.0**

```bash
cd /home/nujovich/ux_great_prototype
npm install
python -m pytest node_modules/great-sdd-kit/tests/ -q
```

Expected: `great-sdd-kit` resolves to v2.0.0; the kit's own pytest suite passes (per CLAUDE.md the project runs this suite). The frontend does not import the kit, so `npm install` should not change FE build behavior.

- [ ] **Step 4: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add package.json package-lock.json
git -C /home/nujovich/ux_great_prototype commit -m "chore(deps): bump great-sdd-kit to v2.0.0 (HIW-174)"
```

---

### Task 7: Status rename sweep across the frontend

**Files:**
- Modify: `src/types/pev.ts:792`, `docs/pev-openapi.yaml:88`
- Modify: `src/lib/stateMachine.ts:6-8,22`
- Modify: `src/components/shared/StatusBadge.tsx:11`
- Modify: `src/components/management/StatusPieChart.tsx:10`
- Modify: `src/components/grid/GridFilters.tsx:5`
- Modify: `src/pages/ManagementPage.tsx:12,44`
- Modify: `src/components/grid/ProjectLineGrid.tsx:50,68`
- Modify: `src/pages/EstimationReviewPage.tsx:51`
- Modify: `src/store/dataStore.ts:56,60`
- Modify: `src/components/estimation/EstimationPanel.tsx:46,277`
- Modify: `src/fixtures/projectLines.ts:200,211,221`
- Modify: `src/i18n/en.ts:19`, `src/i18n/es.ts:19`
- Test: `src/lib/__tests__/stateMachine.test.ts:20-39`

- [ ] **Step 1: Update the failing test first (TDD)**

In `src/lib/__tests__/stateMachine.test.ts`, replace the four `'Rejected'` occurrences (lines 20-39) with `'Modification Requested'`:

```ts
  it('Estimated → Modification Requested is allowed', () => {
    expect(canTransition('Estimated', 'Modification Requested')).toBe(true);
  });
  it('Sent → Modification Requested is allowed', () => {
    expect(canTransition('Sent', 'Modification Requested')).toBe(true);
  });
  it('Modification Requested → Draft is allowed', () => {
    expect(canTransition('Modification Requested', 'Draft')).toBe(true);
  });
  // …and in the Approved test:
    expect(canTransition('Approved', 'Modification Requested')).toBe(false);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/stateMachine.test.ts`
Expected: FAIL — the type `LineStatus` does not yet include `'Modification Requested'` and `stateMachine` still maps `'Rejected'`.

- [ ] **Step 3: Rename the status in the OpenAPI source + generated type**

`docs/pev-openapi.yaml` line 88:

```yaml
    enum: ["To do", Draft, Estimated, Sent, "Modification Requested", Approved]
```

`src/types/pev.ts` line 792:

```ts
        Status: "To do" | "Draft" | "Estimated" | "Sent" | "Modification Requested" | "Approved";
```

- [ ] **Step 4: Update the state machine**

`src/lib/stateMachine.ts`:

```ts
export const STATUS_TRANSITIONS: Record<LineStatus, LineStatus[]> = {
  'To do':     ['Draft'],
  'Draft':     ['Draft', 'Estimated'],
  'Estimated': ['Sent', 'Modification Requested'],
  'Sent':      ['Approved', 'Modification Requested'],
  'Modification Requested':  ['Draft', 'Estimated'],
  'Approved':  [],
};
```

and in `STATUS_I18N_KEYS`:

```ts
  'Modification Requested':  'modification_requested',
```

- [ ] **Step 5: Update the remaining literal usages**

Apply `'Rejected'` → `'Modification Requested'` at each of these exact sites:
- `src/components/shared/StatusBadge.tsx:11` — the `classes` map key (keep the red styling): `'Modification Requested': 'bg-red-50 text-red-700 border-red-200',`
- `src/components/management/StatusPieChart.tsx:10` — `'Modification Requested': '#ef4444',`
- `src/components/grid/GridFilters.tsx:5` — in the `STATUSES` array.
- `src/pages/ManagementPage.tsx:12` (the `STATUSES` array) and `:44` (the per-métier counter object key).
- `src/components/grid/ProjectLineGrid.tsx:50` (`line.status === 'Modification Requested' && 'bg-red-50/30'`) and `:68` (`line.status === 'Modification Requested' && line.rejectionComment`).
- `src/pages/EstimationReviewPage.tsx:51` — `.filter((l) => l.status === 'Modification Requested')`.
- `src/store/dataStore.ts:56` (`canTransition(line.status, 'Modification Requested')`) and `:60` (`status: 'Modification Requested' as LineStatus`).
- `src/components/estimation/EstimationPanel.tsx:46` (the `hasDraftedThisSession` / editable check) and `:277` (`line.status === 'Modification Requested' && line.rejectionComment`).
- `src/fixtures/projectLines.ts:200,211,221` — `status: S('Modification Requested')`.

- [ ] **Step 6: Rename the i18n status key**

`src/i18n/en.ts` line 19 block — replace the `rejected` entry with:

```ts
    modification_requested: 'Modification Requested',
```

`src/i18n/es.ts` line 19 block — replace the `rejected` entry with:

```ts
    modification_requested: 'Modificación solicitada',
```

If `src/i18n/types.ts` declares the `status` map shape with a `rejected: string` field, rename it to `modification_requested: string`. (Leave the unrelated `estReview.rejected` / `noRejected` keys untouched — those are Estimation-Review labels, not line-status values.)

- [ ] **Step 7: Run the test + typecheck + full suite**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/lib/__tests__/stateMachine.test.ts   # PASS
npx tsc -b                                               # no errors (no stray 'Rejected')
npx vitest run                                           # full suite PASS
```
Expected: all green. `tsc` failing on a leftover `'Rejected'` literal points to a missed site — fix and re-run.

- [ ] **Step 8: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add -A
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): rename line status Rejected -> Modification Requested (HIW-174)"
```

---

### Task 8: Exclude H-NP / H-TESTING / H-PROJECT from the métier filter

**Files:**
- Modify: `src/components/grid/GridFilters.tsx:6`
- Test: `src/components/grid/__tests__/GridFilters.test.tsx` (create if absent)

- [ ] **Step 1: Write the failing test**

Create `src/components/grid/__tests__/GridFilters.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GridFilters } from '../GridFilters';

describe('GridFilters métier dropdown (HIW-174 §4)', () => {
  it('excludes H-NP, H-TESTING and H-PROJECT from the métier options', () => {
    render(
      <GridFilters
        value={{ status: 'all', metier: 'all', search: '' }}
        onChange={vi.fn()}
      />,
    );
    const metierSelect = screen.getByLabelText(/métier|metier/i) as HTMLSelectElement;
    const options = Array.from(metierSelect.options).map((o) => o.value);
    expect(options).not.toContain('H-NP');
    expect(options).not.toContain('H-TESTING');
    expect(options).not.toContain('H-PROJECT');
    expect(options).toContain('H-DESIGN');
    expect(options).toContain('H-SOFTWARE');
  });
});
```

> If `GridFilters`' prop names or the métier control's accessible label differ, adjust the render props and the `getByLabelText` query to match the component's actual API before running.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/components/grid/__tests__/GridFilters.test.tsx`
Expected: FAIL — `H-TESTING` (and possibly H-NP/H-PROJECT) is still present in the options.

- [ ] **Step 3: Filter the excluded métiers**

In `src/components/grid/GridFilters.tsx`, derive the dropdown list from the full métier list minus the excluded set (mirrors SDD `EXCLUDED_METIERS_FROM_FILTER`). Replace the `METIERS` constant usage for the dropdown with:

```ts
const EXCLUDED_METIERS: Metier[] = ['H-NP', 'H-TESTING', 'H-PROJECT'];
const FILTER_METIERS: Metier[] = METIERS.filter((m) => !EXCLUDED_METIERS.includes(m));
```

and render the métier `<option>`s from `FILTER_METIERS` instead of `METIERS`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/components/grid/__tests__/GridFilters.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/components/grid/GridFilters.tsx src/components/grid/__tests__/GridFilters.test.tsx
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): exclude H-NP/H-TESTING/H-PROJECT from métier filter (HIW-174 §4)"
```

---

### Task 9: Remove PMO's Custom-JU permission

**Files:**
- Modify: `src/fixtures/roles.ts` (PMO permission array)
- Test: `src/fixtures/__tests__/roles.test.ts:131-142`

- [ ] **Step 1: Update the failing assertions first (TDD)**

In `src/fixtures/__tests__/roles.test.ts`, move the PMO custom-JU assertion to the "cannot" group and update the descriptions:

```ts
  it('Engineer and Admin can create Custom JUs (BR-20)', () => {
    expect(can('Engineer', 'edit:custom-jus')).toBe(true);
    expect(can('Admin', 'edit:custom-jus')).toBe(true);
  });

  it('PMO, RCRC and CPO cannot create Custom JUs (BR-20)', () => {
    expect(can('PMO', 'edit:custom-jus')).toBe(false);
    expect(can('RCRC', 'edit:custom-jus')).toBe(false);
    expect(can('CPO', 'edit:custom-jus')).toBe(false);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/fixtures/__tests__/roles.test.ts`
Expected: FAIL — `can('PMO', 'edit:custom-jus')` is still `true`.

- [ ] **Step 3: Remove the permission from the PMO array**

In `src/fixtures/roles.ts`, delete the `'edit:custom-jus',` line from the `PMO` permission array (leave Engineer's and Admin's intact).

- [ ] **Step 4: Run the test + full suite**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/fixtures/__tests__/roles.test.ts   # PASS
npx vitest run                                         # full suite PASS
```
Expected: green. (The `EstimationPanel` already gates the Custom-JU UI on `can('edit:custom-jus')` at `EstimationPanel.tsx:64`, so PMO is now read-only there with no further change.)

- [ ] **Step 5: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/fixtures/roles.ts src/fixtures/__tests__/roles.test.ts
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): PMO can no longer create Custom JUs (BR-20, HIW-174 §2)"
```

---

### Task 10: Fixture foundation — JU variable/fixed + single-cran inductor

**Files:**
- Modify: `src/fixtures/inductors.ts:3-8` (the `ju()` helper) and add one inductor
- Test: `src/lib/__tests__/calc.test.ts` (formula assertion) — extend
- Test: `src/fixtures/__tests__/inductors.test.ts` (create)

> This adds the data later phases need: the `variable`/`fixed` JU coefficients (Phase 3 panel + the `Total = (Variable × Occurrence) + Fixed` formula) and a single-cran inductor (Phase 3 §7 "one cran ⇒ fixed label"). It does **not** yet change the panel UI or the calculation engine — those are Phase 3.

- [ ] **Step 1: Write the failing fixture test**

Create `src/fixtures/__tests__/inductors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { INDUCTORS } from '../inductors';

describe('inductor fixtures (HIW-174 §7/§8 foundation)', () => {
  it('every JU carries numeric variable and fixed coefficients', () => {
    const jus = INDUCTORS.flatMap((i) => i.crans.flatMap((c) => c.jus));
    expect(jus.length).toBeGreaterThan(0);
    for (const ju of jus) {
      expect(typeof ju.variable).toBe('number');
      expect(typeof ju.fixed).toBe('number');
    }
  });

  it('provides at least one single-cran inductor (fixed-label case)', () => {
    const singleCran = INDUCTORS.filter((i) => i.crans.length === 1);
    expect(singleCran.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps the zero-cran inductor for the no-workload-standard case', () => {
    expect(INDUCTORS.some((i) => i.crans.length === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/fixtures/__tests__/inductors.test.ts`
Expected: FAIL — JUs lack `variable`/`fixed`, and no inductor has exactly one cran.

- [ ] **Step 3: Extend the `ju()` helper to set variable/fixed**

In `src/fixtures/inductors.ts`, replace the helper (lines 3-8) so `occurrence` doubles as the `variable` coefficient and `fixed` defaults to 0 (preserving today's calc, which uses `occurrence` as per-unit days):

```ts
const ju = (
  id: string,
  name: string,
  occurrence: number,
  metier: Metier = 'H-DESIGN',
  fixed = 0,
): JU => ({
  id, name, long_name: name,
  variable: occurrence, fixed,
  unit_type: 'man_day', occurrence,
  occurrence_locked: false, fmm: '', smm: '', dmm: '',
  generic_profile: '', custom: false, metier,
});
```

- [ ] **Step 4: Add a single-cran inductor fixture**

In `src/fixtures/inductors.ts`, add this entry to the `INDUCTORS` array (before the `ind-13` zero-cran edge case), giving a deterministic single-cran case to validate the §7 fixed-label rule:

```ts
  {
    id: 'ind-14', name: 'Security audit', category: 'General',
    crans: [
      cr('cr-14-1', 'Standard', [
        ju('ju-14-1-1', 'SEC-S01 Threat modelling', 1.5),
        ju('ju-14-1-2', 'SEC-S02 Pen-test & report', 2.0),
      ]),
    ],
  },
```

- [ ] **Step 5: Run the fixture test + full suite**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/fixtures/__tests__/inductors.test.ts   # PASS
npx tsc -b                                                 # no errors
npx vitest run                                             # full suite PASS (calc unchanged: variable === occurrence, fixed 0)
```
Expected: green. The existing `calc.test.ts` totals are unchanged because `variable === occurrence` and `fixed === 0` reproduce the prior per-JU days.

- [ ] **Step 6: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/fixtures/inductors.ts src/fixtures/__tests__/inductors.test.ts
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): JU variable/fixed coefficients + single-cran inductor fixture (HIW-174 §7/§8)"
```

---

## Done criteria for Phase 1

- SDD Kit `v2.0.0` tagged: status renamed, métiers `H-*`, `H-TESTING` excluded, PMO custom-JU off; `pytest` + conformance gate green; PR open (or merged) to `master`.
- Frontend on `feat/hiw-174-phase-1`: pin at `v2.0.0`; no `'Rejected'` literal remains (`tsc -b` clean); métier filter excludes the three métiers; PMO read-only for Custom JUs; JU fixtures carry `variable`/`fixed`; a single-cran inductor exists; `npx vitest run` fully green.

## Deferred to later phases (not in this plan)
- Project-line column data (SP/PC/CO/SOP, client, market, alliance/vehicle code, request/estimate type, engineering) → **Phase 2 (grid)** plan, alongside the columns that render them.
- Panel display of `variable`/`fixed`/`unit_type`, single-cran fixed-label rendering, "No workload standard" UI, preloaded inductors, totals relabel + chart removal → **Phase 3**.
- Group-by-compatibility, role-based filters, unsaved-changes dialog → **Phase 2**.
- Two-step save in all states, empty-draft block, pre-save summary → **Phase 4**.
- Multi-line compatibility UI, copy (compat + legacy), parent-child → **Phase 5**.
