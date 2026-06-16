# HIW-176 — Allocation View: PRD Alignment Design

**Date:** 2026-06-15
**Ticket:** HIW-176 — Allocation aligned with PRD
**Status:** Approved

---

## Context

The current Allocation view (`AllocationPage.tsx`) was built against an earlier version of the PRD and has significant gaps vs. the documented Allocation behaviour in the GREAT/WP5 spec. This design aligns the prototype with the current PRD, as specified in HIW-176.

SDD Kit has been updated in advance of this work: 8 new business rules (ALLOC-BR-18 through ALLOC-BR-25) were added, ALLOC-BR-08 updated (diversity removed), ALLOC-BR-14 clarified, and test count updated to 341/341 passing.

---

## Architecture

### Component decomposition

```
src/pages/AllocationPage.tsx              route wrapper + state orchestration
src/components/allocation/
  AllocationFilters.tsx                   6-filter bar with persistence
  AllocationGrid.tsx                      flat sorted table, 18 columns
  TCPopup.tsx                             K€ distribution modal for TC rows
  SplitModal.tsx                          split allocation modal with live preview
```

The existing shared `Modal` component is reused by `TCPopup` and `SplitModal`. The existing `allocationCalc.ts` utilities are extended, not replaced.

### Data flow

- All allocation state lives in the Zustand `dataStore` (unchanged).
- `AllocationPage` owns filter state and passes filtered rows + callbacks down.
- `AllocationGrid` is a pure presentational component: receives rows, column defs, and event handlers.
- `TCPopup` and `SplitModal` receive the target row and dispatch store actions on confirm.

---

## Block 1 — Cleanup (prerequisite)

### Page subtitle
Change subtitle copy from `"Assignment of approved lines to engineers. Supports split among multiple engineers."` to `"Assignment of approved job units to societes and cost types."` (ALLOC-BR-18).

### Remove Diversity dropdown
- Remove `Diversity` column from `AllocationPage.tsx` table.
- Remove `DIVERSITY_OPTIONS` export from `fixtures/societes.ts` (or keep but unexported).
- Remove any `diversity` field from `AllocationRow` renders.

### Type expansion
Extend `AllocationRow` interface in `src/types/index.ts` with all PRD-required fields:

| Field | Type | Notes |
|---|---|---|
| `metier` | string | read-only |
| `ownerN2` | string | read-only |
| `plNumber` | string | read-only |
| `plName` | string | read-only |
| `organType` | string | read-only |
| `energy` | string | read-only |
| `allianceCode` | string | read-only |
| `vehicleCode` | string | read-only |
| `standardEmissions` | string | read-only |
| `market` | string | read-only |
| `fmmDescription` | string | read-only |
| `juDescription` | string | read-only |
| `juCode` | string | read-only |
| `totalFte` | number | read-only, from approved estimation |
| `fteByYear` | Record<string, number> | read-only, key = "2024", "2025", etc. |
| `keByYear` | Record<string, number> | calculated on save; TC via popup |

Update `fixtures/allocations.ts` with representative values for all new fields.

---

## Block 2 — Unified Grid (ALLOC-BR-19)

### Layout
Replace the card-per-PL layout with a single `<AllocationGrid />` component rendering one `<table>`.

- **No tabs** per PL or per Métier.
- **No row expansion.**
- **Sort order** (immutable, applied on load): `PL Number ASC → Métier ASC → Owner N2 ASC → JU Code ASC`.

### Columns (18 + checkbox)

| Column | Editable | Notes |
|---|---|---|
| ☐ | — | Checkbox for bulk/split selection; editors only |
| Métier | No | |
| Owner N2 | No | |
| PL Number | No | |
| PL Name | No | |
| Société | Yes | `<select>` for editors |
| Cost Type | Yes | `<select>` FTE / TSA / TC for editors |
| Organ Type | No | |
| Energy | No | |
| Alliance Code | No | |
| Vehicle Code | No | |
| Standard Emissions | No | |
| Market | No | |
| FMM Description | No | |
| JU Description | No | |
| JU Code | No | |
| Total FTE | No | From approved estimation |
| FTE `20XX` | No | One column per active year |
| K€ `20XX` | No | Calculated; amber when dirty; TC via popup |

Table has horizontal scroll. First 4 columns (Métier, Owner N2, PL Number, PL Name) are not sticky at prototype scale — simple overflow-x: auto on the container is sufficient.

---

## Block 3 — Filter Bar (ALLOC-BR-14)

### Filters

| Filter | Type | Options |
|---|---|---|
| PL Number / Name | Free-text search | Matches on either field |
| Métier | Dropdown | All + each distinct Métier present |
| Owner N2 | Dropdown | All + each distinct Owner N2 present |
| Société | Dropdown | All / Unassigned / each Société |
| Cost Type | Dropdown | All / FTE / TSA / TC |
| Show unresolved only | Toggle | Rows where Société is empty or Cost Type is empty |

### Persistence
Filter state is kept in `AllocationPage` local state (not the store). It is:
- **Preserved** after: inline cell save, bulk société assignment, TC popup confirm, split confirm, undo split.
- **Reset** only when the user navigates away from `/allocation` (component unmount).

---

## Block 4 — TC Popup (ALLOC-BR-20, BR-21, BR-13)

### Trigger
When an editor changes `Cost Type` to `TC` for a row, `TCPopup` opens immediately (before the change is committed to the store).

### Popup content
1. Row identifier (JU Code + PL Name) in the header.
2. One numeric input per active year (e.g., K€ 2024, K€ 2025, K€ 2026).
3. Pre-filled values: proportional to that year's FTE share of `totalFte`.
4. Each year is independently overridable.
5. Running total K€ shown below the inputs, updates on each keystroke.
6. Confirm / Cancel buttons.

### Validation
- A `TC` row without a Société blocks save (ALLOC-BR-13). If Société is empty when TC popup confirms, show inline error and keep the popup open.

### On confirm
`keByYear` values are written to local row state. The `Cost Type = TC` change and the K€ values are persisted together on the next grid-level Save.

### On cancel
The `Cost Type` change is reverted; the dropdown returns to its previous value.

---

## Block 5 — Split Allocation (ALLOC-BR-11, BR-12, BR-22, BR-23, BR-24)

### Trigger
Each row has a "Split" action button (editors only). Clicking opens `SplitModal`.

### Modal content
1. Row identifier in header.
2. "Add société" button; starts with 2 société slots (minimum), can add more.
3. Per slot: Société `<select>` + Percentage `<input type="number">`.
4. Live preview table: for each slot, FTE per year and K€ per year computed in real time as percentages change (ALLOC-BR-24).
5. Running percentage total shown; highlights red if ≠ 100%.
6. Confirm button disabled until percentages sum to exactly 100% (ALLOC-BR-11).

### On confirm
- Original row is replaced by N child rows in the grid, each with proportional `fteByYear` and `keByYear` values.
- Sum of child FTEs equals original `totalFte` (ALLOC-BR-23).
- Child rows are marked as split children (for Undo grouping).

### Undo split
- Each child row has an "Undo" action.
- Undoing collapses all children back to the original single row, restoring original values (ALLOC-BR-12).
- FTE total is restored exactly.

---

## Block 6 — Bulk Selection Enhancement (ALLOC-BR-09, BR-10, BR-25)

### Check all
- A "Check all" checkbox in the column header selects all rows currently visible after applying the active filters (ALLOC-BR-25).
- Selecting individual rows via cell checkboxes works as before.

### Bulk société assignment
- Existing bulk société modal is reused (no structural change).
- The "Apply to selected" action replaces Société on all selected rows.
- Cost Type is NOT changed by bulk assignment (ALLOC-BR-10).
- Filter state is preserved after bulk apply.

---

## Out of scope

- Pagination / virtualization (not needed at prototype scale).
- Column pinning / freeze (horizontal scroll is sufficient).
- Engineer assignment per row (not in HIW-176).
- Days / percentage column display (derived data, not in PRD columns list).
- Backend integration (prototype only).

---

## Testing

Each new component should have a unit test covering:
- `AllocationFilters`: filter state updates, "Show unresolved only" toggle logic.
- `AllocationGrid`: correct sort order, column render, checkbox state.
- `TCPopup`: proportional pre-fill, running total, cancel reverts change, confirm blocked without société.
- `SplitModal`: min 2 societes, percentage sum validation, live preview, FTE invariant.
- `allocationCalc.ts` extensions: `distributeTcKe`, `splitFteProportional`.

Existing `allocationCalc.test.ts` tests remain unchanged.
