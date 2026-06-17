# HIW-177 — Final Review aligned with POC

**Date:** 2026-06-17
**Ticket:** HIW-177 — Final Review aligned with PRD (retest round)
**Branch:** `feat/hiw-177-final-review-poc-alignment` (from `main` @ `6fa2288`)

## Background

The HIW-177 retest (comments by Mario Gomez Lopez and Enrique Monereo, 2026-06-17)
raised two KOs and waived one gap:

- **KO #1 — table needs a rework.** The current detailed table must be replaced by the
  simplified POC look: a hierarchical tree-grid with a single name column and a reduced
  set of metric columns.
- **KO #2 — Send Stage 3 to HVT is clickable by all roles.** Only PMO and Admin should be
  able to trigger it. **Already satisfied in `main` — see "Already satisfied (verified)".**
- **Waived gap (comment 44733) — "Obviamos el gap de la descarga".** The CSV/XLSX export
  structure mismatch is no longer a requirement. Per Nadia Ujovich (comment 44734) the
  download button is disabled ("queda inhabilitado").

The reference image in comment 44731 ("esto es lo que desarrollamos en la poc") is the
**target visual**, not the current app state. The current app has no tabs — it already
renders a vertical per-PL accordion with a PL search bar.

## Current state (verified)

- Page: `src/pages/FinalReviewPage.tsx` (role-gated `view:final-review`).
- Per-PL accordion: `src/components/finalReview/PLAccordion.tsx`.
- Table: `src/components/finalReview/PLGroupedTable.tsx` — custom HTML table, no grid
  library. Renders Métier → Société → Cost Type → Job Unit rows with ~15 columns
  (Métier, Owner N2, Société, Cost Type, FMM Description, JU Description, JU Code,
  Total FTE/K€/BH/KM, and per-year FTE/K€/BH/KM).
- Aggregation: `src/lib/finalReviewAggregation.ts` — `buildPlTree` already produces
  `PlNode → MetierNode → SocieteNode → CostTypeNode → rows`, each level carrying a
  `Subtotal` (totalFte, totalKe, fteByYear, keByYear, …).
- PL search: `filterPlTree` in the same file, wired into the page.
- Downloads: global CSV button in the page toolbar (`exportFinalReviewCsv`,
  `src/lib/finalReviewCsv.ts`); per-PL XLSX button inside each accordion header
  (`exportPlToXlsx`, `src/lib/finalReviewXlsx.ts`).
- Send Stage 3: `handleSendHvt()` in the page, button gated by `can('send:hvt')`.

## Already satisfied (verified)

These two scope items required **no change** — verified against `main` @ `6fa2288`:

- **Send Stage 3 → PMO/Admin only (KO #2).** `send:stage3` is granted only to PMO and Admin
  in `src/fixtures/roles.ts` (lines 50, 67). The button in `FinalReviewPage.tsx:97` renders
  conditionally on `can('send:stage3')`, so it is absent for Engineer/RCRC/CPO. No
  column-reordering logic exists anywhere under `src/` (the ticket's root cause described an
  older reorderable-column prototype; this implementation is an accordion). A regression
  guard already exists — `src/fixtures/__tests__/roles.test.ts:106-112` ("only Admin and PMO
  can send Stage 3") — and passes. Most likely the retester exercised a build that predated
  today's regression fixes (PR #7).
- **Scroll + search (no tabs).** The page already renders all PLs stacked as vertical
  accordions with a PL search bar (`filterPlTree`). There are no tabs. Nothing to change.

## Scope

In scope (single iteration):

1. **Table rework** to the POC tree-grid (includes the reduced column set).
2. **Disable both download controls** (global CSV + per-PL XLSX).

Out of scope: real HVT transmission/payload (prototype note §8), export structure fixes
(waived), Job-Unit-level detail, Send Stage 3 role restriction (already satisfied), scroll +
search (already satisfied).

## Design

### 1. Table rework — tree-grid (`PLGroupedTable.tsx` rewrite)

- A single **Name** column with indentation + an expand/collapse chevron per parent row,
  replicating the POC.
- **Hierarchy:** Métier → Société → **Cost Type (leaf)**. Job-Unit rows are dropped; the
  leaf row is the Cost Type level (its `Subtotal`). Confirmed: the POC leaf `..._FTE` is a
  cost-type row, and the reduced columns carry no JU-level detail.
- **Columns:** `Name` · `Total FTE` · `Total K€` · `FTE 20xx` · `K€ 20xx` (one FTE and one
  K€ column per calendar year in the cycle). Dropped: Owner N2, FMM Description,
  JU Description, JU Code, BH, KM.
- **Data:** reuse `buildPlTree` unchanged. Each row renders the `Subtotal` of its level.
  No new aggregation logic.
- **K€ columns** remain gated by `can('view:k-euro-rates')` (existing behavior preserved).
- **Counts** in parentheses per parent row, like the POC (e.g. "H-SOFTWARE (6)") — child
  count of the node.
- **Default expand state:** métiers collapsed by default (user expands). Confirmed.

Chosen approach: rewrite the component in place. No generic reusable TreeTable component
(YAGNI for the prototype). The accordion + search shell is kept.

### 2. Disable downloads

- Global CSV button and per-PL XLSX button rendered `disabled` (visible, greyed) with a
  `title` indicating the export is parked. The export libraries
  (`finalReviewCsv.ts` / `finalReviewXlsx.ts`) are left intact — only the buttons are
  disabled, so the feature can be re-enabled later without rework.

### 3. Tests (Strict TDD active)

- Vitest + React Testing Library:
  - Tree-grid renders the Métier → Société → Cost Type levels, the reduced column set, and
    collapse/expand behavior; métiers collapsed by default.
  - K€ columns hidden when `view:k-euro-rates` is denied.
  - Both download buttons render disabled.
- Run `npm test` (Vitest). The frontend change does not touch the Python SDD kit rules.
- The `send:stage3` role guard already exists and passes
  (`src/fixtures/__tests__/roles.test.ts:106-112`); no new test needed for KO #2.

## Risks

- Existing `PLGroupedTable.test.tsx` asserts the old detailed columns — it must be
  rewritten alongside the component, not left to fail silently.
- The child-count semantics in the POC ("(6)") are inferred as child-node count; confirm
  against the POC if it diverges.
