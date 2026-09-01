# HIW-452 — Framing File view (mockup)

**Date:** 2026-08-27
**Ticket:** HIW-452 — Mockup Framing File
**Branch:** `feat/hiw-452-framing-file` (from `origin/main` @ `747cb1c`)

## Background

The Framing File page is the sole entry point for project lines into WP5 (ADR-018).
No such page exists in this prototype: `rg -il framing src docs` returns nothing, and
`docs/schema.sql` carries neither `framing_file_line` nor `rfi_line`.

### Source of truth (this cost real effort to pin down)

Three candidate sources disagree. Ranked, newest first:

| Source | Date | Sections | RFI/RFQ | Verdict |
|---|---|---|---|---|
| `cap_horse_great` @ `origin/feature/framing-file-docs`, `docs/prds/framing-file-prd.md` | 2026-08-19 | 16 | Yes | **Authoritative** |
| `cap_horse_great` @ `origin/main` | 2026-08-11 | 16 | Yes | Close, superseded |
| Jira epic HIW-468 (stories HIW-453..457, subtasks HIW-458..467) | 2026-08-18/19 | — | Yes | **Authoritative**, agrees with the branch |
| Confluence "Framing File" (page 3998810119) | 2026-07-10 | 14 | **No** | **Stale — do not use** |
| `cap_horse_great` local clone @ `bf94bdf` | 2026-07-29 | 14 | No | Stale |

The Confluence page is byte-equivalent in structure to the July repo version: 14 sections,
zero occurrences of "RFI". Jira subtasks cite a **§15.1** that does not exist there. The
`feature/framing-file-docs` branch supplies §15/§16 plus **ADR-020** (RFI/RFQ split),
**ADR-021** (parent FK per métier) and **ADR-022** (partial-field PATCH save) — none of
which exist on the local clone, whose ADRs stop at 018.

This design is written against the **`feature/framing-file-docs` PRD + Jira epic HIW-468**.
Section references (§) below are to that PRD.

HIW-452 itself carries no description, no acceptance criteria and no comments; it is a
standalone task outside epic HIW-468. The PRD and the epic's FE subtasks are therefore the
only requirement source.

## Five deviations from the older Confluence PRD, called out

Anyone comparing this implementation to the Confluence page will see these as bugs. They
are not.

1. **No validation UI anywhere** (§6, §7.1, §7.2). Validation is server-side only, at
   Generate. The detail form renders no per-field error, no per-section error state and no
   readiness flag; the selection table renders no readiness indicator. The FE preview was
   retired in the 2026-08-18 restructuring. HIW-463 AC#9 and HIW-460 AC#5 require tests
   asserting these elements are *absent*.
2. **Two tabs, RFQ and RFI** (§15, ADR-020), classified at upload from
   `expected_eco_output`; the Confluence version has a single table.
3. **Save is a partial-field PATCH** (§8, ADR-022), not a full-row upsert — a concurrency
   guard, since Admin/PMO/CPO can all hold the same line open.
4. **Upload reassigns every PL Number from a Starting PL Number** (§5.4, added 2026-08-31),
   rather than keeping a file-provided code verbatim and generating only for empty cells.
   §5.4 assumed a line with no code yet leaves the cell empty. Real files write free text
   into it instead, repeated down the column — `to be open` ×52 and `to open` ×8 in
   `GWF2504 Framing 20250227.xlsx`, `XXXX` ×11 in `01.- Framing File from Customer.xlsx`,
   `New` in the GWF2509 file a reviewer uploaded. Ingest upserts on PL Number, so every row
   sharing a placeholder collapsed into one line and the upload silently dropped the rest:
   73 rows became 15. The POC never had this bug because it never trusts the column —
   `framing_file_functions.fill_xxxx_pl_numbers` renumbers every row from a code the user
   supplies on the upload form. We now do the same, with two departures from the POC:
   - The §5.4 two-family split survives. The starting code seeds its own family; the other
     continues from the global max, as `assignPlNumbers` would. Every real file seen so far
     is all-Renault, so those behave exactly like the POC's single counter.
   - A file name already uploaded is refused, because reassignment hands out fresh codes:
     a re-upload would duplicate the rows it created rather than upsert onto them. The POC
     declines to re-ingest a known file name too. The way back in is deleting the earlier
     upload.

   `assignPlNumbers` keeps §5.4's generate-only path for callers that pass no starting code,
   and `familyOf` is now the single authority on whether a string is a PL Number at all.
5. **The RFQ tab sends selected lines to Pre-Estimation, and the bulk control replaced §8.1's
   global Save** (added 2026-08-31, reviewer request). Three sub-deviations, each deliberate:
   - **§9 Generate is partly in slice 1 now.** Slice 1 was scoped to touch no `project_line`
     precisely to avoid the status-model contradiction below. This send does not resolve it
     and does not need to: `framingLineToProjectLine` only ever produces `To do`, the one
     status both models hold, and nothing here touches a transition below it. The rest of §9
     — validation as the gate (§6), Framing Change (§10), GPMF (§11) — stays out.
   - **§8.1's global Save is gone from the UI.** The bulk selection control took its place in
     the header. `framingStore.saveAll` survives with its own store test, so the capability
     is intact, but several edited lines must now be saved one at a time.
   - **Métier is no longer a table column** (HIW-460 AC#2 lists it). It stays in the CSV
     export, which now has its own column list — it is the field that decides which
     `project_id` a line lands on, so losing it from the hand-off artefact as a side effect
     of a display change was not acceptable. It is deliberately NOT added to the detail form.

   One framing line becomes ONE project line, at the métier its `ownerN2` names —
   `project_id` = `pl_number + metier`, the composition `pev.ts` documents. The PRD's real
   answer is §16.3's `metier_scope` (multi-métier), which is not in the type yet; when it
   arrives, the mapping is the single place that changes. A line already sent, or one whose
   Owner N2 names no métier, is shown unavailable rather than skipped in silence, and the
   toast counts created and skipped separately.

## Scope — slice 1 of 4

**In:** upload → parse & derive → RFI/RFQ classification → two tabs → read-only selection
table with per-column filter/sort → 8-section detail form (RFI: +1 placeholder section) →
partial-field Save.

**Out, and why:**

| Out of scope | PRD | Reason |
|---|---|---|
| Generate project lines | §9 | Writes `project_line`; forces resolving the status-model conflict below. **Partly landed 2026-08-31** — see deviation 5; the `To do` send does not trip the conflict |
| Framing Change | §10 | Depends on Generate; a 6th `project_line.status` |
| GPMF export | §11 | Decoupled from ingestion by definition |
| RFI Send | §15.5 | Target system contract undefined (FF-10) |
| Duplicate / organ-split | §16 | Case 2's exclusion mechanism is open (FF-11) |

Slice 1 touches **no** `project_line` row and **no** existing view. That is deliberate: it
sidesteps a live contradiction that Generate would force us to resolve.

### The status-model contradiction slice 1 avoids

This prototype models six statuses **including `Sent`**, with HVT as the approver:

- `src/types/pev.ts:792` — `"To do" | "Draft" | "Estimated" | "Sent" | "Modification Requested" | "Approved"`
- `src/lib/stateMachine.ts:6-7` — `Estimated → Sent → Approved`
- `src/fixtures/roles.ts:88` — `ERev-BR-10: CPO cannot approve or reject directly — approval/rejection comes from HVT only`

The PRD's §10.1 CHECK constraint allows
`('To do','Draft','Estimated','Modification Requested','Approved','Framing Change')` — **no
`Sent`** — and §10.6 routes `Estimated → CPO approval on Estimation Review → Approved`,
with HVT demoted to an output channel (ADR-018) and CPO approving in-app (ADR-015). The two
models cannot both hold. Resolving it is slice 2's first task, not this one's.

## Current state (verified)

- Page/route/nav pattern: `src/App.tsx`, `src/lib/permissions.ts` (`NAV_ITEMS`), `RoleGate`.
- Column-set-as-data pattern already established: `src/components/grid/gridColumns.ts`.
- Sorting already exists and is reusable as-is: `src/lib/useSortable.ts` (asc → desc → none,
  plus `getSortIcon`).
- `xlsx` ^0.18.5 is already a dependency, used for **export** only
  (`src/lib/finalReviewXlsx.ts`, pure matrix builder + thin side-effecting writer). No
  parse path exists.
- The only existing `type="file"` input (`src/pages/AdminPage.tsx:150`) validates the
  extension and registers metadata — it never reads file content.
- `src/lib/validation.ts` is a 14-line stub unrelated to §6.
- Reference lists are available verbatim at
  `/home/nujovich/poc_great/src/backend/demo_list.py:53` —
  `drop_down_values_framing_file_drop`.
- **SDD Kit v2.2.1 has zero framing-file coverage**: six spec modules
  (pre_estimation, estimation_review, final_review, allocation, management_view,
  transversal), no framing rules, no golden fixtures. `pytest node_modules/great-sdd-kit/tests/`
  cannot validate any of this work. Frontend Vitest tests are the only safety net.

## Design

### 1. The 66 fields are data, not JSX

§5.6 defines 8 sections totalling **66 fields** (PL Details 13, Customer Request 23,
Vehicle Description 7, Organ Description 8, Schedule Milestones 4, Framework 10,
Prototype Details 0, Additional Details 1). Hand-written that is ~1,500 lines of
unreviewable form markup.

The field set is declared as data, following `gridColumns.ts`:

```ts
// src/lib/framing/sections.ts
export type FieldKind = 'text' | 'number' | 'date' | 'select' | 'derived' | 'parentRef';

export interface FramingFieldDef {
  key: keyof FramingLine;
  kind: FieldKind;
  /** key into FRAMING_REFERENCE; required when kind === 'select' */
  refList?: RefListKey;
  /** §15.1 — expected_eco_output is read-only in both tracks */
  readOnly?: boolean;
}

export interface FramingSectionDef {
  id: string;
  labelKey: string;               // i18n, section titles only
  fields: FramingFieldDef[];
  /** §15.3 — rendered only on the RFI tab, no fields until FF-08 lands */
  rfiOnly?: boolean;
}
```

A single `FramingField` component switches on `kind`. Consequences: the field set is
reviewable against §5.6 as a table, testable without rendering, and adding a PRD field is a
one-line change. Section 7 (Prototype Details) is declared with an empty `fields` array —
the `#Protos` counts stay under Framework, faithful to the wp5 layout (§5.6.7).

### 2. Pure modules, each TDD'd

`src/lib/framing/`:

| Module | Rule | Risk |
|---|---|---|
| `plNumber.ts` | §5.4 | **Highest.** Two independent format families (`LLNN`/`NNLL`), base-26×100 counter, **numbers advance before letters** (`AA99 → AB00`, `99AA → 00AB`), max is **global across all cycles**, several empty-PL rows in one upload get consecutive codes, seeds `AA00`/`00AA`, caps at `ZZ99`/`99ZZ` |
| `plName.ts` | §5.3 | Ranking-dependent component order (M/B/GM vs Child), empty components omitted, `4X2` hidden and `4X4` appended, Vehicle Phase always last |
| `derive.ts` | §4.3, §5.2 | FR→EN maps for `organ_type` and `energy` (accents stripped, E10/E20/E26/E27/E85/E100 passthrough), `client` from Customer-over-Client → `RG`, drivetrain → `4X2`/`4X4`, drop `Suppression`/`Closure` |
| `classify.ts` | §15.1 | `expected_eco_output` empty or `N/A` → RFI; `ECO1`/`ECO2`/`ECO3` → RFQ. Once, at upload, immutable |
| `parseFramingFile.ts` | §4.2 | Sheet resolution `^GWF.*` case-insensitive **excluding names ending in `old`**; no match aborts and writes nothing; header normalization with alias map |

`parseFramingFile` splits the same way `finalReviewXlsx.ts` does: a pure function over a
2-D matrix, plus a thin reader that owns `XLSX.read`. Tests build their own workbook via
`XLSX.utils.aoa_to_sheet` — no sample file needed, and no real framing file exists in
either repo.

`validateFramingLine` is **not** written in slice 1: §6 has no UI surface here. It arrives
with Generate, where it is the gate.

### 3. Header mapping is one file

The PRD names ~35 of the ~71 columns explicitly and does not enumerate the rest. All header
strings live in one alias map inside `parseFramingFile.ts`, normalized on trim +
case-folding + collapsed whitespace, so the real framing file (when one appears) is a
single-file adjustment. Known-verbatim headers from §5.1: `PL Number`, `Request type`,
`Customer`, `Client`, `Part type`, `Project ranking`, `Alliance code`, `Vehicle code`,
`Fuel`, `Standard emissions`, `Start of Project (SP)`, `Pre-contract date (PC)`,
`Contract date (CO/APR2) CO`, `Start of Production (SOP)`, `MA Date (MA/APR3)MA`,
`Framework comment`, `Part Factory`, `Cluster`, `Techno Group`, `Owner N2`, `Activity type`.

### 4. Reference data — transcribed, not invented

§4.2 is explicit: reproduce `demo_list.py::drop_down_values_framing_file_drop` **exactly** —
"do not invent, trim, or reorder values". `src/fixtures/framingReference.ts` transcribes it
verbatim, with three documented departures:

- **`organ_type` and `energy` dropdowns render the English values**, not the POC's French
  ones. The stored value is FR→EN translated at upload (§5.2), so the dropdown must offer
  the translated image of the POC list, not its source.
- **`parent_ranking` is not a dropdown at all.** §4.2 and §5.5 explicitly refuse the POC's
  `Parent ranking` field (`MBTP`/`CPU`/`MBTP / PU`, self-derived, editable). This app's
  `parent_ranking` is read-only and derived from the *selected parent line's*
  `project_ranking`. Same name, different meaning — the redesign is confirmed and intentional.
- **`cpo` / `cpa` do not use the POC's static name lists.** §4.2 requires Microsoft Graph
  API resolution of live CPO-role holders. The prototype has no Graph API, so these are
  fixture display names flagged as a prototype substitution.

`techno_group`'s first POC value is the empty string. That is reproduced verbatim; §6 will
later reject it as not-ready, which is the POC's own behaviour.

### 5. Store

`src/store/framingStore.ts`, new — **not** an extension of `dataStore`, which already mixes
lines + allocations + estimations + cycles in 209 lines and owns `project_line`, an entity
slice 1 never touches.

`rfi_line` mirrors `framing_file_line`'s parsed columns exactly (§15.2). Its two additions —
the RFI-only section (undefined, FF-08) and the send metadata `send_status`/`sent_at`/`sent_by`
(§15.5) — are both out of slice 1, so one `FramingLine` type plus a
`FramingTrack = 'RFQ' | 'RFI'` discriminator covers both tables. A second type would be an
empty copy.

```ts
interface FramingState {
  rfqLines: FramingLine[];              // framing_file_line
  rfiLines: FramingLine[];              // rfi_line — same shape in slice 1
  edits: Record<string, Partial<FramingLine>>;        // by pl_number — page state (ADR-008)
  dirtyFields: Record<string, Set<keyof FramingLine>>; // ADR-022 — field granularity
  uploadFile(rows: RawRow[], fileName: string): UploadResult;
  editField(plNumber, field, value): void;
  saveLine(plNumber): void;             // PATCH: only dirtyFields[plNumber]
  saveAll(): void;                      // per-line payloads, never a union
}
```

Two properties the tests must pin, both straight from HIW-463:

- **AC#13** — edit field A, save, edit field B, save again: the second payload contains
  only B. Dirty state is per-field, so this falls out of the model rather than needing
  special-casing.
- **AC#12** — global Save sends each line's own changed fields, never the union across lines.

Upload upserts on `pl_number` (the prototype's stand-in for `(cycle_id, pl_number)`) so
accumulation across uploads works: the table shows the whole accumulated set, not just the
last file (§4.1).

### 6. Table

`FramingLineTable` renders read-only rows — no editable cell, no readiness indicator
(§7.1). Minimum columns per HIW-460 AC#2: PL Number, PL Name, Organ Type, Energy, Project
Ranking, Client, Métier, SP, PC, CO, SOP. Every header gets a text filter (substring, that
column) and an asc/desc sort control, reusing `useSortable`. Filter/sort is display-only and
session+route scoped (ADR-011): it survives opening and closing the detail form and resets
on navigating away — which React Router gives us for free, since unmounting the page drops
the state.

### 7. Permissions and nav

Four new permissions in `src/fixtures/roles.ts`, per §2 and §2.1:

| Permission | Admin | PMO | CPO | Engineer | RCRC |
|---|---|---|---|---|---|
| `view:framing-file` | Yes | Yes | Yes | — | — |
| `upload:framing-file` | Yes | Yes | **No** | — | — |
| `edit:framing-file` | Yes | Yes | Yes | — | — |
| `save:framing-file` | Yes | Yes | Yes | — | — |

CPO's absence of upload is a **conditional render, not a disabled control** — HIW-458 AC#2
and AC#7 require the control be absent from the DOM. `NAV_ITEMS` gains Framing File in
**first** position: it is the system's front door, ahead of Pre-Estimation.

Note this widens CPO's navigation, which today reaches only Estimation Review and Final
Review. That is what §2 mandates.

> **Known trap.** `useRoleStore((s) => s.can)` does not re-render on role switch — the
> selector returns a stable function reference, so gated UI goes stale. It bit Final Review
> (fixed in PR #12) and six files still carry it. The new page must subscribe to
> `currentRole` and derive `can` from it, or gate through `RoleGate`, which already does.
> Getting this wrong makes CPO's upload button appear after switching roles — exactly the
> boundary HIW-458 tests.

### 8. i18n

Section titles, buttons, toasts, empty states and upload errors go through `en.ts`/`es.ts`
and the `Translations` interface, under a `framing` namespace. The **66 field labels come
from the schema** as the PRD's own column names. They are proper nouns of the domain —
`PIMOF`, `CVC Number`, `HBO/RBO RFQ/CMS`, `3MIS`, `Techno Group` — and translating them
adds 126 dictionary entries for no reader benefit. Approved 2026-08-27.

## File plan

New:

```
src/types/framing.ts                          FramingLine (66 fields) + FramingTrack discriminator
src/fixtures/framingReference.ts              POC dropdown lists, verbatim
src/fixtures/framingLines.ts                  seed rows so the page is not empty pre-upload
src/lib/framing/plNumber.ts                   §5.4
src/lib/framing/plName.ts                     §5.3
src/lib/framing/derive.ts                     §4.3, §5.2
src/lib/framing/classify.ts                   §15.1
src/lib/framing/parseFramingFile.ts           §4.2
src/lib/framing/sections.ts                   §5.6 — the 8-section schema
src/store/framingStore.ts                     ADR-008 page state + ADR-022 partial save
src/lib/framing/toProjectLine.ts              §9 — framing line → project line (To do)
src/components/framing/FramingBulkBar.tsx     §9 — header bulk selection, replaced global Save
src/pages/FramingFilePage.tsx                 tabs, RoleGate, RFQ selection + send
src/components/framing/FramingFileUpload.tsx  §4.1, Admin/PMO only
src/components/framing/FramingLineTable.tsx   §7.1 + ADR-011
src/components/framing/FramingDetailForm.tsx  §7.2
src/components/framing/FramingFormSection.tsx collapsible section
src/components/framing/FramingField.tsx       kind switch
src/components/framing/ParentLineSelector.tsx §5.5
src/components/framing/SaveControls.tsx       §8.1 individual + global
```

Edited: `src/App.tsx` (route), `src/lib/permissions.ts` (nav), `src/fixtures/roles.ts`
(permissions), `src/i18n/{types,en,es}.ts`.

## Delivery — two chained PRs

Well past a 400-line budget, so it splits at the natural seam:

- **PR A** — `types/framing.ts`, both fixtures, the five pure modules, `sections.ts`, the
  store. No UI. Every module TDD'd; independently verifiable.
- **PR B** — page, tabs, upload, table, form, sections, field, parent selector, save
  controls, route, nav, permissions, i18n. Consumes A.

`chain_strategy` to be confirmed at PR time.

## Testing (Strict TDD active)

Test first, per module. Vitest + React Testing Library are already configured.

Unit — the rules that will actually break:

- `plNumber`: `AA99 → AB00`; `AZ99 → BA00`; `99AA → 00AB`; empty family seeds `AA00`/`00AA`;
  three empty-PL Renault rows in one upload get consecutive codes; `AA05` and `05AZ` are
  never compared; a file-provided value survives verbatim in any format.
- `plName`: M/B/GM vs Child component order; `4X2` hidden; `4X4` appended; Vehicle Phase
  last; empty components omitted; `MBTP` default for empty Activity type.
- `derive`: each FR→EN pair; accents stripped; E-series passthrough; `Customer` beats
  `Client`; `nan`/`None`/empty → `RG`; `Suppression` and `Closure` rows dropped.
- `classify`: empty → RFI; `N/A` → RFI; `ECO1`/`ECO2`/`ECO3` → RFQ.
- `parseFramingFile`: picks `GWF*`; skips `*old`; aborts with no match and writes nothing;
  non-`.xlsx` rejected before parsing.

Component:

- CPO → upload control **absent from the DOM** (HIW-458 AC#2/#7).
- Non-`.xlsx` selection → inline rejection, parser never invoked (AC#3/#8).
- Table exposes **no** editable control and **no** readiness indicator (HIW-460 AC#5/#8).
- Form renders **no** error indicator or readiness state for any field, valid or not
  (HIW-463 AC#9).
- `engineering`, `estimate_type`, `injection_system`, `market` render **nowhere** in the
  form; `parent_ranking` is the only derived read-only field (AC#7).
- Editing a PL Name component recomposes `pl_name` live, with no network call (AC#8).
- Parent selector excludes the row's own `pl_number`, offers an empty option, and setting
  then clearing it fills and clears Parent Ranking (AC#4/#6/#20).
- Save payload carries only this session's changed fields (AC#11/#13); global Save keeps
  per-line payloads separate (AC#12).
- `expected_eco_output` read-only on both tracks (§15.1).
- Role switch does not leave the upload control stale (the `can` subscription trap).

## Open questions and known gaps

| # | Gap | Handling |
|---|---|---|
| 1 | `Réducteur` and `Pile à combustible` are POC `Part type` values with **no FR→EN mapping** in §5.1/§5.2, which covers only Moteur thermique, Boîte de vitesse, Batterie, Moteur Electrique | Passed through untranslated. Needs a PRD answer |
| 2 | POC `Request type` is `Creation`/`Modification`/`Closure` — **no `Suppression`**, though §4.3 drops both | POC list reproduced verbatim; the drop rule matches both strings regardless |
| 3 | No real framing `.xlsx` exists in either repo; ~36 of ~71 headers are unnamed by the PRD | Single alias map, tolerant normalization, fixture workbooks in tests |
| 4 | No Graph API in the prototype for `cpo`/`cpa` (§4.2) | Fixture of CPO-role display names, flagged as substitution |
| 5 | RFI-only detail section fields undefined (FF-08) | Placeholder section, per §15.3 |
| 6 | `metier_scope` column (§16.3) is referenced by Duplicate, which is out of scope | Not added to the type in slice 1 |

## Risks

- **No conformance backstop.** The SDD Kit has no framing rules, so nothing outside this
  repo's Vitest suite verifies these 30-plus business rules. Every rule above needs its own
  test; there is no golden fixture to fall back on.
- **`plNumber` is the likeliest defect site.** Two families, mixed-radix increment, global
  scope, and intra-upload sequencing. It is written first, test-first.
- **The PRD is still `Status: Draft`** on a feature branch that has moved twice in eight
  days. It can move again mid-implementation; slice 1's exclusions (Generate, Framing
  Change, GPMF, Send, Duplicate) are also the areas still churning, which is part of why
  they are excluded.
- **Widening CPO navigation** touches a role whose gating already has a known staleness bug
  in six files. Contained by routing all gating through `RoleGate`.
