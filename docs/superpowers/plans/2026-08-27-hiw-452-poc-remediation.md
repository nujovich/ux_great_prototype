# Framing File — POC remediation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the Framing File page parse a real framing file correctly, and realign its form to the legacy POC's layout.

**Source:** `docs/superpowers/specs/2026-08-27-hiw-452-framing-file-poc-conformance.md` — the conformance report this plan remediates. Read it first; it carries the evidence for every task below.

**Spec:** `docs/superpowers/specs/2026-08-27-hiw-452-framing-file-view-design.md` (slice 1 design)

## Authority change — read this before touching the schema

The original implementation followed **PRD §5.6** for section and field order. The conformance report established that §5.6 claims to reproduce "the legacy wp5 layout" and does not. The user has ruled that **the POC is now the authority above the PRD** for layout.

This is a deliberate divergence from the binding spec, taken with the user's explicit sign-off after the conflict was raised. Epic HIW-468 is written against the PRD, so a reviewer comparing against it will see the difference. It must stay called out in the PR body.

The ruling covers **layout only** — field order and control type. It does **not** license copying the POC's `group_2` field membership wholesale: that group lists `Market`, which the POC's own `create_gpm` derives at GPM-generation time rather than collecting during review. Adding it to the form would be a semantic error dressed as fidelity. Field membership stays as §5.6 defines it: 66 fields.

## Global Constraints

- **No customer data enters this repo.** The real framing files in `poc_great/data/` contain live project data — vehicle codes, CPO names, volumes. Reproduce their *shape* in synthetic fixtures; never copy the files in.
- Still no validation UI anywhere: no error state, no readiness indicator, no `required`.
- Save stays a partial-field operation; dirty tracking stays field-granular.
- Reference lists in `src/fixtures/framingReference.ts` are verbatim transcriptions — extend the record with new keys if a task needs one, never edit existing list contents.
- `src/lib/framing/` holds rules, `src/store/framingStore.ts` holds state, components present. No rule leaks into a component.
- Do not import `src/store/dataStore.ts` from any framing module.
- Field labels come from the schema; only section titles, buttons, toasts and messages go through i18n.
- Conventional commits, **no AI attribution, no `Co-Authored-By`**.
- **GPG signing is unavailable this session** — every `git commit` needs `--no-gpg-sign` or it times out. The user authorised unsigned commits on this branch.
- Test with `npx vitest run <path>`; `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` must all be green at each task's end. The suite stands at **659 tests across 88 files**.
- Do NOT run `pytest node_modules/great-sdd-kit/tests/` — the kit has no framing rules and validates nothing here.

---

## Task 1 — Locate the header row (conformance P1, CRITICAL)

**Files:** `src/lib/framing/parseFramingFile.ts`, `src/lib/framing/__tests__/parseFramingFile.test.ts`

Real framing sheets open with eight rows of instructions; the header row sits at index 8. `parseFramingMatrix` assumes index 0, and because that row exists with length 72 (all empty strings) the "no header row" guard does not fire. The result is roughly nine rows of empty lines with generated PL Numbers, reported to the user as a successful upload.

**Produce:** `findHeaderRow(matrix: unknown[][]): number` — exported, so it is testable alone.

Scan the first 20 rows and return the index of the first row where **at least 5 cells resolve to a known field** through `HEADER_ALIASES` or the annual-volume pattern. Return `-1` when none qualifies, and have `parseFramingMatrix` throw `FramingParseError` with the `noHeaderRow` code in that case. Five is comfortably above the noise (the instruction rows carry 0–8 non-empty cells, none of which are header names) and comfortably below a real header row's 40+ matches.

`parseFramingMatrix` then reads headers from that index and data from the rows after it.

**Tests:**
- A matrix whose header row is at index 0 still parses (every existing test must keep passing unchanged).
- A matrix with 8 leading junk rows, the header row at index 8, and data at 9 parses the data row correctly.
- A matrix whose leading rows contain prose that happens to include one or two header-like words does not false-positive.
- A matrix with no qualifying row throws `FramingParseError`, and nothing is returned.
- A matrix of only instruction rows and no headers throws rather than yielding generated-PL garbage — assert on the throw, and that is the regression this task exists for.

---

## Task 2 — Real header aliases (conformance P2, CRITICAL)

**Files:** `src/lib/framing/parseFramingFile.ts`, its test

Only 40 of a real file's 72 headers resolve. Embedded newlines are **not** the cause — `normalizeKey` collapses whitespace, so `Parent\n Prog. Line` and `Contract date (CO/APR2)\nCO` already match. These are genuine name differences.

**Add these aliases** (left: the real header, verbatim; right: the field it feeds). Keep the existing aliases — a file may use either form.

| Real header | Field |
|---|---|
| `SOP Date Powertrain` | `sopDate` |
| `Date envoi RFQ` | `rfqSendDate` |
| `Vehicle Range` | `vehicleRange` |
| `ICE Power (kW)` | `icePowerKw` |
| `ICE Torque (N.m)` | `iceTorqueNm` |
| `Vehicle MA` | `vehicleMaDate` |
| `Veh factory` | `vehicleFactory` |
| `#Protos EP (Engineering Prototypes - LEAP100)` | `protosEp` |
| `Part factory` | `partFactory` |

Three headers carry a long explanatory tail after a newline. Since `normalizeKey` collapses the newline into a space, match them by **prefix** rather than adding the full string: `3MIS (K‰)…` → `threeMis`, `Guarantee cost (€/vh…` → `guaranteeCost`, `PIMOF (K‰)…` → `pimof`, and `Request description,  - to explain content to H…` → `requestDescription`. Add a small prefix-matching step that runs after the exact-alias lookup and before the annual-volume pattern, so exact matches always win.

**Also fix the annual-volume pattern.** Real headers are `Annual volume - SOP` and `Annual volume - SOP+1` … `+6`, with a hyphen the current regex rejects. Note `Annual volume - SOP+2 ` has a trailing space in the real file — `normalizeKey` trims, so that is already handled. Make the hyphen optional so both forms work.

**Tests:** one per alias group, driving `parseFramingMatrix` with the real header spelling and asserting the value lands in the right field. Include `SOP Date Powertrain` explicitly — that miss silently emptied the SOP milestone, which the readiness rules depend on.

---

## Task 3 — Synthetic real-shape fixture (conformance P1/P2 regression guard)

**Files:** `src/lib/framing/__tests__/realShapeFixture.ts` (new), `src/lib/framing/__tests__/parseFramingFile.test.ts`

Build a fixture that reproduces a real framing file's shape without carrying its data: 8 leading instruction rows, the real 72-column header row at index 8, and 2 synthetic data rows.

The header row must use the **real** header strings, embedded newlines and all, so the fixture is a genuine guard. Take them from the conformance report's tables and from `poc_great/src/backend/demo_list.py`'s group definitions. Synthesise every data value — no vehicle code, CPO name or volume from the real file.

Export it as a `unknown[][]` matrix plus a helper that wraps it into a workbook buffer, so both `parseFramingMatrix` and `readFramingWorkbook` can be exercised against it.

**Test:** parsing this fixture yields 2 lines, with the header row correctly located, `sopDate` populated from `SOP Date Powertrain`, all 7 annual volumes populated, and at least 40 of the mapped fields non-empty. This is the test that would have caught both P1 and P2.

---

## Task 4 — Realign the form to the POC layout

**Files:** `src/lib/framing/sections.ts`, its test, `src/fixtures/framingReference.ts`, `src/types/framing.ts`

Field membership does not change; **order** does, plus one control type.

**PL Details** — reorder to the POC's `group_1` (`demo_list.py:3-7`):

`plNumber`, `projectName`, `cpo`, `cpa`, `cpoDepartment`, `parentPlNumber`, `parentRanking`, `client`, `secondaryOrgan`, `thirdOrgan`, `fourthOrgan`, `otherSpecifications`, `plName`

Note `plName` moves from second to **last**, and `projectName` from sixth to second.

**Framework** — reorder to the POC's `group_6` (`demo_list.py:37-41`): the five `#Protos` counts move **before** Part factory / Cluster / Techno Group:

`projectRanking`, `frameworkComment`, `protosPfc`, `protosVc`, `protosOrganPt`, `protosOrganUm`, `protosEp`, `partFactory`, `cluster`, `technoGroup`

The other six sections keep their current order — they already match.

**Customer becomes a dropdown.** The POC renders it as one (`1_Framing_File_Review.py:519-527`) with `demo_list.py`'s `"Customer": ["RG", "Other"]`. Add a `client` key to `RefListKey` and to `FRAMING_REFERENCE` carrying exactly `['RG', 'Other']`, and change the field's kind to `select`.

This interacts with the off-list-value handling already in `FramingField`: a parsed client outside that two-value list still renders and is preserved. Verify that with a test — real files may carry any customer string, and `resolveClient` defaults to `RG` only when the value is empty.

**Update the section-order test** to assert the new orders explicitly, field by field, so a future drift fails loudly.

---

## Task 5 — Conditional field visibility

**Files:** `src/lib/framing/sections.ts`, `src/components/framing/FramingFormSection.tsx`, tests

`demo_list.py:27` annotates Battery capacity: "Only show if 'part type' is 'battery'". We render it unconditionally.

**Produce:** an optional `showWhen?: (line: FramingLine) => boolean` on `FramingFieldDef`, applied by `FramingFormSection` when it renders its fields. Give `batteryCapacity` a predicate matching `organType` case-insensitively against `Battery`.

Keep the predicate in the schema, not in the component — the component only asks. A field with no predicate always shows.

**Tests:** the field renders when organ type is Battery, is absent otherwise, and every other field is unaffected. Also assert that a hidden field is genuinely absent from the DOM rather than merely styled away.

---

## Task 6 — Per-file management

**Files:** `src/types/framing.ts`, `src/store/framingStore.ts`, `src/components/framing/FramingUploadList.tsx` (new), `src/pages/FramingFilePage.tsx`, tests

The POC lists every uploaded file, reopens one, and deletes it behind a confirm dialog (`1_Framing_File_Review.py:58-136`). Our store is one flat `lines` array, so **a bad upload cannot be undone** — the conformance report's most consequential gap.

**Model:** add `uploads: FramingUpload[]` to the store, where `FramingUpload` is `{ id, fileName, uploadedAt, plNumbers }`. `ingestRows` records one entry per upload with the PL numbers it carried.

**Delete:** removing an upload deletes the rows whose `lastUpdatedByFile` matches it **and** which no later upload also supplied — a PL number re-supplied by a subsequent upload belongs to that later upload, so deleting the earlier one must not remove it. Deleting also clears any page-state edits for the rows it removes, and clears the page's selection when the selected row disappears.

**UI:** a compact list above the table showing file name, upload time and row count, each with a delete control. Deletion asks for confirmation first — it is destructive and unrecoverable, matching the POC's own confirm step. Gate the delete control on the upload permission (Admin/PMO), since it is the inverse of uploading.

**Tests:** the list renders one entry per upload; deleting removes only that upload's exclusive rows; a PL number re-supplied by a later upload survives deleting the earlier one; deleting clears edits and selection for removed rows; the confirm step is required; CPO sees no delete control.

---

## Task 7 — Table export, counters and the editing heading

**Files:** `src/lib/framing/framingCsv.ts` (new), `src/components/framing/FramingLineTable.tsx`, `src/pages/FramingFilePage.tsx`, tests

Three small POC affordances with no counterpart.

**CSV export** (`1_Framing_File_Review.py:402-408`): a download button over the table's **currently visible** rows — filtered and sorted as displayed, which is what makes it useful. Follow the existing repo pattern: a pure matrix builder in `src/lib/framing/framingCsv.ts` with a thin side-effecting download, mirroring `src/lib/finalReviewCsv.ts`. Columns are the table's own. This is unrelated to the GPMF export, which stays out of scope.

**Row count** (`:391`): show visible-versus-total when a filter is narrowing the set.

**Editing heading** (`:464`): above the detail form, name the line being edited by PL Number and project name.

**Tests:** the CSV matrix reflects filtering and sorting rather than the raw set; the count updates as filters change; the heading names the selected line.

---

## Sequencing

1 → 2 → 3 are the blocking parser chain and must land in that order. 4, 5, 6, 7 are independent of each other and of the parser chain.

Each task ends green on suite, typecheck, lint and build.

---

## Task 8 — Parse the date formats real files actually use (CRITICAL, found during review)

**Files:** `src/lib/framing/dates.ts` (new), `src/lib/framing/parseFramingFile.ts`, tests

The review of Tasks 1–3 ran the fixed parser against the real file and found `sopDate` comes out as **`"CW2736"`**. Real framing files express milestones as **calendar-week codes**, not ISO dates. The real data row's milestones read `CW2520`, `CW2545`, `CW2610`, `CW2635`, `CW2710`, `CW2736`.

We store them verbatim and render them in `<input type="date">`, which only accepts `yyyy-mm-dd`. So **all four milestone fields display blank** on a real file while the store holds the week code — the same failure class as the off-list select value, and it defeats the milestones that the readiness rules depend on.

PRD §5.1 already requires this: every milestone is "Parsed to date (**week-code** / dd-mm-yyyy tolerant)". It was never implemented.

**Reproduce the POC's `parse_custom_date`** (`poc_great/src/backend/framing_file_functions.py:749-822`, called from `transform_dates`). Its rules, in order:

1. Empty, or one of `n/a`, `non défini`, `not defined`, `none` (case-insensitive) → null.
2. `^W\d{4}$` — e.g. `W2431`: year `20` + first two digits, week = last two → the **Monday of that week**.
3. `^cw\d{4}$` — e.g. `cw2730`: year `20` + digits 1–2, week = digits 3–4 → Monday of that week. Case-insensitive, so `CW2736` matches.
4. A month range, `^(Jan|…|Dec)\s*-\s*(Jan|…|Dec)\s+(\d{4})$` — e.g. `Jan - Feb 2025` → the **first** month, day 1 of that year.
5. Explicit formats, tried in this order: `yyyy-mm-dd`, `dd/mm/yyyy`, `dd-mm-yyyy`, `dd/mm/yy`, `dd-mm-yy`. The POC tries these before any loose parse specifically to stop ambiguous dates flipping day and month — keep that ordering.
6. Anything else → null. Do **not** fall back to a permissive `new Date(value)`: it would silently read `03/04/2025` as March 4th, which is the bug step 5 exists to prevent.

**Output ISO `yyyy-mm-dd`**, not the POC's `dd-mm-yyyy`. Our fields feed `<input type="date">`, which requires ISO, and the seed fixture already uses it.

Apply it in the parser to every date-typed field, and note the POC's own date-column list (`framing_file_functions.py:731-742`) includes `Vehicle MA`, `SOP Date Powertrain`, `ABVC Date`, `ABPT Date` and three spellings of the contract date — confirming the aliases added in Task 2.

**Flagged assumption:** Python's `%W` (Monday-first week-of-year) and ISO-8601 weeks disagree by up to a few days around year boundaries. Reproduce "Monday of week N of year 20YY" and state the convention in a comment; if a milestone ever lands a few days off at a year boundary, this is why.

**Tests:** each of the six rules; the real values `CW2520` → `2025-…` and `CW2736` → `2027-…` in ascending order; `W2431`; `Jan - Feb 2025` → `2025-01-01`; `03/04/2025` → 3 April, not 4 March; `non défini` and `N/A` → null; and an end-to-end assertion that parsing the real-shape fixture with week-code milestones yields ISO dates an `<input type="date">` can display.
