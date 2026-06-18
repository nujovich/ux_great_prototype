# HIW-176 — Allocation retest remediation (design)

**Date:** 2026-06-17
**Source:** HIW-176 retest comments (Mario Gomez Lopez 2026-06-16, Enrique Monereo 2026-06-17)
**Scope:** Allocation view of the GREAT UX prototype (React/Vite/TypeScript front).
**Out of scope:** Limiting/validating the numeric inputs in the TC popup (explicitly deferred by the user).

---

## Background

The Allocation view assigns approved Job Units to societes and cost types. The retest
confirmed the structural rework (title, grid, columns, filters, diversity removal, split
popup) but flagged 4 GAP items and 4 KO items. Three GAPs are applied; one GAP is deferred.
All KOs are applied.

Business rules live in the SDD kit
(`node_modules/great-sdd-kit/great_sdd/specs/allocation_specs.py`) and are exercised by the
conformance fixtures (`.../conformance/fixtures/allocation.json`). This change does **not**
modify the kit — it mirrors the kit's rate tables into a front-end fixture so K€ can be
recalculated on screen.

---

## Item-by-item design

### 1. Edit TC K€ without re-clicking TC, showing the previous amount (GAP — apply)

**Current:** `TCPopup` only opens when `costType` changes to `TC`
([AllocationPage.tsx:67-72](../../../src/pages/AllocationPage.tsx#L67-L72)). Its `yearlyKe`
state starts empty.

**Change:**
- In `AllocationGrid`, for a row already set to `TC`, make the K€ cell open the existing
  `TCPopup` (an explicit "Edit K€" affordance on the K€ cell of TC rows). New callback
  `onEditTcKe(rowId)` wired up to a new `setTcTarget(row)` path in `AllocationPage` that does
  **not** alter `costType`.
- `TCPopup` initializes `yearlyKe` from `row.keByYear` when present, so previously entered
  values are shown for editing.
- Confirm path reuses `handleTcConfirm`.

**Note:** the existing `handleTcCancel` reverts `costType` for the *first-time TC* flow. The
edit-existing flow must not revert anything on cancel (the row was already TC). The popup must
know which flow it is in; we track this with a small flag in `AllocationPage` (e.g.
`tcEditMode: 'create' | 'edit'`) so cancel behaves correctly per flow.

### 2. Recalc K€ when switching to FTE/TSA via a fixture rule (GAP — apply)

**Decision (user):** mirror the kit's rate tables into a front-end fixture.

**Change:**
- New fixture `src/fixtures/societeRates.ts` replicating the kit values verbatim:
  - `FTE_RATES` keyed by societe-site → `{ year: rate }` (§11.1, kit lines 90-99).
  - `TSA_RATES` keyed by societe → `{ year: rate }` (§11.2, kit lines 102-106).
  - Include all years present in the kit (2024–2027) even though the grid currently shows
    `ACTIVE_YEARS = ['2025','2026']`; the recalc reads only the years in `row.fteByYear`.
- New pure function in `allocationCalc.ts`:
  `recalcKeByRate(fteByYear, societe, costType): Record<string, number>`
  - `FTE` → `K€_year = round(fte_year × FTE_RATES[societe][year] ?? 0, 2)`
  - `TSA` → `K€_year = round(fte_year × TSA_RATES[societe][year] ?? 0, 2)`
  - `TC`  → not handled here (manual popup).
  - Unknown societe / missing year → rate `0` → K€ `0` (mirrors kit `.get(..., 0)`).
  - Societe `null` (Unassigned) → all years `0` (blank K€ until a societe is assigned).
- `handleChangeCostType`: when the new cost type is `FTE` or `TSA`, set
  `keByYear = recalcKeByRate(row.fteByYear, row.societe, costType)` in the same `updateRow`
  patch. (TC keeps the popup flow.)
- `handleChangeSociete`: if the row is `FTE`/`TSA`, also recompute `keByYear` for the new
  societe so the displayed K€ stays consistent with the rate table.

**Rationale:** matches Enrique's "se recalculan los K€ de acuerdo a las reglas del backend de
societe". The values are byte-faithful to the conformance oracle, so the front recalc agrees
with `calculate_fte_ke` / `calculate_tsa_ke`.

### 3. Warn before leaving the TC popup without saving (GAP — apply)

**Current:** clicking outside / Cancel discards entered values silently.

**Change:**
- `TCPopup` tracks whether the user has entered/changed any value (`isTouched`).
- On Cancel or backdrop click, if `isTouched`, show a confirm step
  ("You will leave without saving the entered K€. Discard changes?"). Confirm → proceed with
  the existing cancel behavior; dismiss → stay in the popup.
- If nothing was touched, close immediately (no nag).

### 4. Apply the "unresolved" highlight on first render (KO — fix)

**Current:** unassigned highlight depends on edits. The red border is only on the societe
`<select>` and only when `!societe && costType !== 'FTE'`
([AllocationGrid.tsx:124-126]); the row-level amber is `isDirty`-driven, so a freshly loaded
unassigned row is not flagged.

**Change:**
- Add a pure helper `rowIsUnresolved(row)` = `row.societe == null` (societe Unassigned),
  independent of `isDirty` and of cost type. This is the warning per ALLOC-BR-07 (FTE without
  societe is a non-blocking warning) and the blocking condition per ALLOC-BR-06/13 for
  TSA/TC.
- Render the unresolved highlight from initial load, decoupled from the dirty (amber) style:
  - **dirty** → amber (unchanged meaning: "pending save").
  - **unresolved** → warning style applied on first render regardless of dirty.
- A row can be both dirty and unresolved; styles compose without one masking the other.

### 5. Fix Undo (KO — fix)

**Current:** `handleUndoSplit` ([AllocationPage.tsx:116-132]) computes `firstChildIdx`
against the pre-filter array, then slices the **post-filter** array with that index —
off-by-N when children are not at the array head, so the restored parent can land in the wrong
position (or children may not all be removed as the user perceives).

**Approach:** reproduce with a failing test first (systematic-debugging), then fix the index
math so the original parent is reinserted at the position the first child occupied and **all**
rows with that `splitParentId` are removed. Confirm FTE invariant after undo.

### 6. Fix Split K€ (KO — fix)

**Current:** split children get `keByYear` reset to `0`
([AllocationPage.tsx:103](../../../src/pages/AllocationPage.tsx#L103)).

**Change:** compute child K€ proportionally, consistent with item 2's rate rule:
- After splitting FTE proportionally (existing `splitFteProportional`), set each child's
  `keByYear = recalcKeByRate(childFteByYear[i], slot.societe, childCostType)`.
- For TC children (cost type carried from parent), K€ follows the FTE proportion of the
  parent's total via the existing `distributeTcKeByYear` against the child FTE.
- Preserve the ALLOC-BR-23 invariant: per year, the sum of child FTE equals the parent FTE.

### 7. Delete a slot in the Split dialog (KO — fix)

**Current:** `SplitModal` has "Add société" but no remove control.

**Change:**
- Add a per-slot remove button.
- Disable/hide remove when only 2 slots remain (ALLOC-BR-22: minimum 2 societes).
- Live preview and the 100%-sum validation (ALLOC-BR-11) recompute after a removal.

---

## Affected files

| File | Change |
| --- | --- |
| `src/fixtures/societeRates.ts` *(new)* | Mirror of kit `FTE_RATES` / `TSA_RATES`. |
| `src/lib/allocationCalc.ts` | New `recalcKeByRate`, `rowIsUnresolved`; reuse in split. |
| `src/components/allocation/TCPopup.tsx` | Pre-fill from `keByYear`; unsaved-changes warning. |
| `src/components/allocation/SplitModal.tsx` | Per-slot remove (respect min 2). |
| `src/components/allocation/AllocationGrid.tsx` | Edit-K€ affordance on TC rows; unresolved highlight on first render. |
| `src/pages/AllocationPage.tsx` | Recalc on cost-type/societe change; TC edit vs create flow; undo fix; split K€ fix. |

---

## Testing strategy (Strict TDD)

- Unit tests (Vitest) authored test-first for each pure function and each behavior:
  - `recalcKeByRate`: FTE/TSA happy path against mirrored rates, unknown societe → 0,
    Unassigned → 0, year not in table → 0.
  - `rowIsUnresolved`: Unassigned vs assigned across cost types.
  - Split K€ proportionality + ALLOC-BR-23 invariant.
  - Undo: failing test reproducing the position/removal bug, then green after fix.
- Component tests for TCPopup pre-fill + unsaved-changes warning, SplitModal slot removal
  (min-2 guard), grid edit-K€ trigger, and first-render unresolved highlight.
- Conformance regression: `pytest node_modules/great-sdd-kit/tests/ -v` must stay green
  (the kit is untouched; the mirror must match the oracle values).

---

## Risks / open points

- **Rate-table naming mismatch:** the front `SOCIETES` fixture and the kit `FTE_RATES` /
  `TSA_RATES` keys do not fully overlap (e.g. TSA rates use `CHENNAI GESC H`, not in
  `SOCIETES`). This is acceptable: unmatched societes resolve to rate `0`, same as the kit's
  `.get(..., 0)`. We mirror the kit verbatim rather than reconciling names in this change.
- **Mirror drift:** the front fixture duplicates kit data. Add a code comment pointing to the
  kit source (`§11.1/§11.2`, `allocation_specs.py`) so future kit-rate changes are mirrored
  deliberately. No automated sync in this change (YAGNI).
