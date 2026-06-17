# Design — Pre-estimation contextual buttons, Estimation grouped table, Compatibility-mode checkbox gating

Date: 2026-06-16
Status: Approved (design)

## Context

Three UX changes requested over the pre-estimation form and the estimation
review view of the GREAT prototype (React/Vite/TypeScript).

Current state verified in code:

- The per-line pre-estimation panel (`src/components/estimation/EstimationPanel.tsx`)
  exposes a single footer button "Copy to other lines"
  (`EstimationPanel.tsx:529-533`), visible only when `existing && canCopy`. It
  opens `CopyEstimationModal`, a modal with two tabs: "Current Cycle" (copy from
  compatible lines) and "Legacy" (import a historical estimation via
  `copyFromLegacy()`).
- The estimation review view (`src/pages/EstimationReviewPage.tsx`) is a single
  flat sortable table.
- Compatibility mode is a page-level toggle in
  `src/pages/PreEstimationPage.tsx:91-100`; when on, lines are grouped via
  `CompatibilityGroupSection` and each line carries a selection checkbox feeding
  a bulk-estimate action.
- The Allocation view (`src/pages/AllocationPage.tsx`,
  `src/components/allocation/AllocationFilters.tsx`,
  `src/components/allocation/AllocationGrid.tsx`) renders a top filter bar
  (search + dropdowns) and one `<table>` per group (no accordion, always
  expanded). This is the reference pattern for change #2.

## Change 1 — Two contextual buttons in the pre-estimation panel

Replace the single "Copy to other lines" button with two mutually-exclusive
buttons driven by the panel save state.

| Panel state | Button shown | Behaviour |
|---|---|---|
| Unsaved (`!existing`) | **Import legacy estimation** | Opens the legacy picker (today's "Legacy" tab). On selection, **pre-loads the working form** (inductor selections, custom JUs, occurrences) so the panel becomes `dirty`; the user reviews and then saves a draft. It does NOT persist on its own. |
| Saved draft (`existing`) | **Copy from other project lines** | Opens the current-cycle picker (today's "Current Cycle" tab) to copy from compatible lines. Keeps current apply behaviour. |

Rules:

- Both buttons require the `copy:estimation` capability (`canCopy`) and are
  hidden when the panel is `locked` (status Estimated / Sent / Approved).
- The legacy path changes from "apply/persist immediately" to "pre-load the
  working state". The pre-load must reuse the same field mapping
  `copyFromLegacy()` uses today, but write into the panel's local working state
  instead of persisting an Estimation record.
- `CopyEstimationModal`'s two tabs split into two entry points: legacy reachable
  while unsaved, copy-from-lines reachable only with an existing draft. The
  modal component may keep a single tab visible per entry point, or be split
  into two focused pickers — implementation detail for the plan.

### Definitions

- "Unsaved" = no persisted `existing` Estimation record (status "To do").
- "Saved draft" = an `existing` record exists.

## Change 2 — Estimation review table grouped like Allocation

Redesign `EstimationReviewPage.tsx` from a flat table to the Allocation pattern:

- **Top filter bar**: search (PL number / name) plus dropdowns (Métier, Status),
  mirroring `AllocationFilters`.
- **One subtable per Assignee/Owner**: each subtable has a header (assignee name
  + line count), the assignee's project lines as rows, and a **per-group
  subtotal** row (Total FTE / BH / KM / K€ and per-year columns), following the
  Final Review subtotal pattern.
- Always expanded (no accordion), like Allocation.
- Preserve the existing per-row selection checkbox and column sorting within
  each subtable.
- Lines with no assignee group under an explicit "Unassigned" subtable.

Existing columns (PL number, PL name, Métier, Status, approvals, totals, per-year
breakdown) are retained as the row columns inside each subtable.

## Change 3 — Compatibility-mode checkbox gating for Estimated/Approved

In compatibility mode (`PreEstimationPage.tsx` → `CompatibilityGroupSection`),
disable the per-line selection checkbox for lines whose status is **Estimated**
or **Approved**, so they cannot be included in a new bulk-estimate. Other lines
in the group remain selectable. Disabled checkboxes should be visually distinct
(disabled state) and excluded from select-all / bulk operations.

## Out of scope

- No change to estimation business rules, JU formulas, or the SDD kit.
- No change to copy-from-lines apply semantics (only legacy switches to pre-load).
- No change to the Final Review or Allocation views themselves.

## Testing

- Pre-estimation panel: button visibility by state (unsaved vs draft vs locked),
  legacy pre-load marks the form dirty without persisting, copy-from-lines still
  applies.
- Estimation table: grouping by assignee produces one subtable per owner +
  Unassigned, subtotals aggregate correctly, filters narrow rows, sorting works
  within groups.
- Compatibility mode: Estimated/Approved checkboxes disabled and excluded from
  bulk selection; other statuses unaffected.
- `pytest node_modules/great-sdd-kit/tests/ -v` stays green (no rule changes
  expected, but verify).
