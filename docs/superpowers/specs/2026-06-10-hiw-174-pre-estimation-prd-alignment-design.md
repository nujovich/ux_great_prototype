# HIW-174 — Pre-Estimation View aligned with PRD

**Date:** 2026-06-10
**Ticket:** [HIW-174](https://capitoleconsulting.atlassian.net/browse/HIW-174) — GREAT [Horse Indus WP5]
**Status:** Design approved, pending spec review

## Summary

Align the React/Vite/TypeScript UX prototype of the **Pre-Estimation View (PEV)** with the
GREAT/WP5 PRD (sections 3–14), as captured in HIW-174. The ticket lists ~20 findings across
role permissions, the project line grid, compatibility grouping, multi-line selection, Job Unit
configuration, estimation calculation, save flow, copy behaviour, parent-child relationships and
several cosmetic adjustments.

## Decisions made during brainstorming

1. **Source of truth on conflict — the ticket wins, and we update the SDD specs.**
   HIW-174 reflects the latest PRD. Where it contradicts the SDD Kit specs
   (`node_modules/great-sdd-kit/great_sdd/specs/pre_estimation_specs.py`), we implement the
   ticket **and** update the specs + their pytest tests so the spec registry stays the coherent
   source of truth. `pytest node_modules/great-sdd-kit/tests/ -v` must pass after spec edits.
2. **Scope — the whole ticket, one spec organized in dependency-ordered phases.**
3. **Implementation approach — bottom-up by layers** (data/specs → grid → panel → save flow →
   advanced flows). Each phase leaves tests green before the next.
4. **Métier taxonomy — unify everything on `H-*`** (H-DESIGN, H-TUNING, H-SOFTWARE, H-CUSTOMER…).
   Migrate the spec's generic `METIERS` and `WORKLOAD_STANDARDS` keys to `H-*`.
5. **Empty Draft — blocked.** `Save as Draft` is disabled unless there is ≥1 inductor with a
   selected cran or ≥1 Custom JU. Zero occurrence is still allowed (BR-13).
6. **Cran dropdown — no empty after selection.** Once a cran is chosen, the dropdown no longer
   offers `--- select ---`; an explicit **Clear selection** action exists to undo.

## Conflicts ticket ↔ SDD specs (resolved per decision #1)

| Topic | HIW-174 | Current SDD spec | Resolution |
|-------|---------|------------------|------------|
| PMO + Custom JUs | PMO read-only, cannot add Custom JUs (§2) | `BR-20` / `CUSTOM_JU_ROLES["PMO"] = True` (added in commit `ccb713a`) | Set PMO → `False`; revert the permission at rule level |
| Métier filter exclusions | Exclude H-NP, H-TESTING, H-PROJECT | `EXCLUDED_METIERS_FROM_FILTER = ["H-NP", "H-PROJECT"]` | Add `"H-TESTING"` |
| Rejection state name | `Modification Requested` (= "To do") | `LineStatus.REJECTED = "rejected"` | Rename to `MODIFICATION_REQUESTED` / `"modification_requested"` |
| Métier taxonomy | H-* (H-DESIGN, H-TUNING…) | Generic (Backend/Frontend/Data…) | Migrate spec to H-* |

---

## Phase 1 — Foundation: data model + SDD specs

### Frontend types & fixtures
- Enrich the **grid list-item model** to expose all PRD columns. `ProjectLineDetail` in
  [src/types/pev.ts](src/types/pev.ts) already declares `organ_type, energy, project_ranking,
  injection_system, alliance_code, vehicle_code, market, standard_emissions, client,
  request_type, engineering, estimate_type`; surface them on the list item used by the grid.
- Add milestone-date fields **SP, PC, CO, SOP** to the line type and fixtures (do not exist yet).
- Populate inductor/JU fixtures with `variable`, `fixed`, `unit_type`, `occurrence_lock`
  (present in the Python spec model; missing in the TS fixtures).
- Create a **single-cran inductor fixture** (does not exist today; blocks testing §7).
- Add fixtures with populated compatibility combos (`organType/energy/projectRanking/
  injectionSystem`), including `null` cases, to validate group-by and multi-line selection.

### SDD spec changes (source of truth)
- `EXCLUDED_METIERS_FROM_FILTER` → `["H-NP", "H-TESTING", "H-PROJECT"]`.
- `METIERS` and `WORKLOAD_STANDARDS` keys → `H-*` taxonomy.
- `LineStatus.REJECTED` → `MODIFICATION_REQUESTED` (value `"modification_requested"`); update
  `STATUS_TRANSITIONS`, `EDITABLE_STATUSES`, and the frontend `stateMachine.ts` + `StatusBadge`.
- `CUSTOM_JU_ROLES["PMO"]` → `False` (BR-20).
- Run `pytest node_modules/great-sdd-kit/tests/ -v`; fix tests referencing changed values.

---

## Phase 2 — Project line grid & filters

- **Columns** per PRD: Status, Request Type, PL Number, PL Name, Client, Métier / Owner N2,
  Organ Type, Project Ranking, Market, Alliance Code, Vehicle Code, Energy, SP, PC, CO, SOP,
  Engineering, Estimate Type, Injection System, Assignee. Many columns → horizontal scroll with
  pinned key columns; exact column UX defined during implementation.
- **Compact rows**: remove the auxiliary subtitle line from each project line row.
- **Role-based filters**: PMO/Admin/RCRC → Assignee, Métier, Status. Engineer → only their
  assigned lines, no Assignee/Métier filter controls.
- **Métier filter** excludes H-NP, H-TESTING, H-PROJECT.
- **Group by compatibility** groups by `Organ Type + Energy + Project Ranking + Injection System`
  (not by métier). Each group is its own sub-table with a header identifying the combination;
  filters remain available where applicable.
- **Unsaved changes dialog**: switching line with pending edits shows
  "You have unsaved changes. Leave without saving?" with **Cancel** / **Discard**.

---

## Phase 3 — Estimation panel & Job Units

### Standard JU fields (§8)
- Display per JU: `JU Short Name, JU Description, Variable, Fixed, Unit Type, Occurrence,
  Occurrence Lock` (lock button). `Unit Type` read-only (Man Day / Bench Hours / Kilometres /
  K Euros) — determines whether the result is FTE, BH or KM.
- Make the formula visible and verifiable: `Total = (Variable × Occurrence) + Fixed`
  (matches `calculate_ju_total` in the spec).

### Custom JU (§8.5)
- Minimal form: `Name, Variable, Fixed, Occurrence` (today only Days/Occurrence). Unit Type and
  FMM deferred to a future iteration.

### Inductors & crans (§7)
- Single-cran inductor → fixed label, no dropdown. Multiple crans → dropdown.
- JUs load/update after cran selection. No store persistence until `Save as Draft`.
- Cran dropdown: no `--- select ---` after selection; explicit **Clear selection** action.

### Panel loading states (§6)
- **"No workload standard found for this combination"** when no inductors match the combination.
  Non-blocking: estimate via Custom JUs only; save buttons enable once ≥1 valid Custom JU exists
  (BR-11).
- **Inductors preloaded** on open (additional comment) instead of an empty add-inductors list.

### Right-side totals (additional comment)
- Show **Total ETPs, Total Bench Hours, Total KMs, Total K€**.
- **Remove** the "yearly distribution" chart from the right panel.

---

## Phase 4 — Save flow & pre-save summary

- **Two-step save in every editing session**, including `Draft` and `Modification Requested`:
  `Save as Draft` first, then `Save as Definitive`. `Promote to definitive` disabled until
  `Save as Draft` was clicked in the current session (BR-02/BR-15). Closes the §3 gap where
  Modification Requested could be promoted directly.
- **Empty Draft blocked** (decision #5): `Save as Draft` disabled unless ≥1 inductor with cran or
  ≥1 Custom JU. Zero occurrence allowed (BR-13).
- **Pre-save summary panel** after `Save as Draft` (distinct from the right panel):
  Total FTE, Total BH, Total KM + **annual breakdown** by FTE/BH/KM, **one per line** for
  multi-line save, **no K€**.

---

## Phase 5 — Advanced flows + cosmetics

### Multi-line selection / compatibility (§5)
- Multi-select only when lines share `Organ Type + Energy + Project Ranking + Injection System`.
  `null+null` compatible; `null+value` incompatible (BR-06/BR-07 — logic exists in
  `src/lib/compatibility.ts`; wire up the **block + error** in the UI and expose the columns to
  validate it).
- Saving multiple compatible lines applies the same inductor/cran/occurrence config, but each
  line computes its monthly/yearly distribution using **its own dates**.
- Show the **names of all selected lines** when opening the multi-line editor (additional comment).

### Copy Estimation (§10)
- Respect compatibility + assignment: the target list shows only compatible lines available to the
  current user (today `CopyEstimationModal` filters by métier/cycle/status — switch to the
  compatibility rule).
- **Copy from Legacy Cycle**: second tab in the modal (`Current cycle` / `Legacy cycle`) per §12.2:
  same JU unchanged → copy as-is; coefficients changed → apply current coefficients and recalculate
  occurrence; orphaned JU → copy as Custom JU; new JU under historical inductor → add with
  occurrence 0; new inductor absent from historical estimation → not auto-added.

### Parent-child line relationships
- Display related lines alongside project line data + alert/banner if HVT attributes change. The
  spec already provides `LineRelationship`, `get_related_line_ids`, `check_hvt_attribute_changed`;
  the frontend is missing.

### Roles / permissions (§2)
- PMO **read-only** over estimation content; no Custom JUs (aligned with the BR-20 change).
  Engineer performs estimation. Assignment is read-only (comes from HVT, BR-10).

### Cosmetics
- Rename prototypes → **proto1, proto2, proto3, proto4**.

---

## Testing strategy

- **SDD specs:** `pytest node_modules/great-sdd-kit/tests/ -v` green after every spec edit.
- **Frontend:** Vitest + React Testing Library per the typescript-unit-testing skill (ITX 80).
  - Unit: compatibility (`null` cases), JU formula `(Variable × Occurrence) + Fixed`, FTE divisor,
    draft-gate, empty-draft block, role permission matrix (PMO read-only).
  - Component: grid columns/filters by role, group-by-compatibility sub-tables, unsaved-changes
    dialog, no-workload-standard state, single-cran label vs dropdown, pre-save summary (no K€),
    copy modal compatibility filtering + legacy tab, parent-child banner.

## Out of scope (deferred to future iterations)

- Custom JU `Unit Type` and `FMM` fields (only the minimal formula-validating form now).
- Prototype category names/count (pending PRE-01).

## Open items to confirm with Product (non-blocking)

- "Not estimated" display label: the prototype already uses `To do` as the status value; confirm no
  stray "Not estimated" label remains and standardize on `To do`.
- Whether `Rejected` is also acceptable as a UX label anywhere, or `Modification Requested`
  everywhere (this design assumes the latter).
