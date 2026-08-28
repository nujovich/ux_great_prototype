# HIW-452 — Framing File: conformance against the legacy POC

**Date:** 2026-08-27
**Compared:** `feat/hiw-452-framing-file` @ `5a94309` against `/home/nujovich/poc_great`
**POC references:** `src/frontend/pages/1_Framing_File_Review.py` (834 lines), `src/backend/framing_file_functions.py`, `src/backend/demo_list.py`, and the real framing files in `data/`

Two independent checks were run: the parser against **real** framing files, and the page against the POC's UI. The parser check is where the serious findings are.

---

## Part 1 — Parser vs a real framing file

The design spec recorded, as open item 3, that no real framing `.xlsx` existed in either repo, so the header map was built from the ~35 column names the PRD happens to quote. **That was wrong** — `poc_great/data/` holds several, including `01.- GWF2504 Framing File PWTD 20250305 v3 with 4 digits.xlsx` and `GWF2504 Framing 20250227.xlsx`.

Running our own `HEADER_ALIASES` and `normalizeKey` against that file gives the results below.

### P1 — CRITICAL: the header row is not row 0, so the parser produces silent garbage

Real framing sheets open with eight rows of instructions to the person filling the file:

```
row 0:  72 cells, 0 non-empty
row 1:  72 cells, 1 non-empty
row 2:  "For a proper estimation, all fields are mandatory." …
row 3:  "If any field is not relevant … use N/A (Not applicable)" …
…
row 7:  "HORSE IF NEW PL", "NEW", "NEW" …
row 8:  ← THE ACTUAL HEADER ROW, 72 non-empty cells
row 9:  first data row
```

`parseFramingMatrix` takes `matrix[0]` as the header row (`src/lib/framing/parseFramingFile.ts`). Against a real file that row is 72 empty strings, so:

- no column maps to any field;
- the guard `if (!headerRow || headerRow.length === 0)` does **not** fire, because the row has length 72 — it is populated with empty strings, not absent;
- rows 1–9 are then treated as data. They are not blank, so the blank-row skip does not drop them;
- the result is ~9 rows of `EMPTY_FRAMING_LINE`, each handed a freshly generated PL Number, each classified RFI (because `expected_eco_output` is empty);
- **no error is raised.** The user sees a successful upload and nine meaningless lines.

The POC solves this with a dedicated `clean_shifted_headers_from_dict` (imported at `framing_file_functions.py:16`, applied at `:112`) — the problem is well known on that side.

**Fix:** locate the header row rather than assuming index 0. The sound heuristic, given the file shape, is the first row whose cells match a threshold of known header aliases (say ≥ 5), scanning the first ~20 rows, and aborting with `FramingParseError` when none qualifies. That also hardens against the two-row and shifted variants the POC's helper name implies exist.

### P2 — CRITICAL: 32 of the file's 72 headers do not match our map

Only **40 of 72** columns resolve. The unmatched ones, verbatim (`\n` marks embedded newlines inside the header cell):

| Real header | Field it should reach | Why it misses |
|---|---|---|
| `SOP Date Powertrain` | `sopDate` | We map `Start of Production (SOP)`, which this file does not contain — **the SOP milestone is silently empty** |
| `Annual volume - SOP` … `- SOP+6` | the 7 volume fields | Our regex expects no hyphen |
| `Date envoi RFQ` | `rfqSendDate` | The real column is in **French** |
| `Vehicle \nRange` | `vehicleRange` | We map `Range` |
| `ICE\nPower (kW)` | `icePowerKw` | We map `ICE Power kW` — parentheses and unit differ |
| `ICE\nTorque\n(N.m)` | `iceTorqueNm` | Same |
| `Vehicle MA` | `vehicleMaDate` | We map `Vehicle MA date` |
| `Veh factory` | `vehicleFactory` | We map `Vehicle Factory` |
| `#Protos EP (Engineering Prototypes - LEAP100)` | `protosEp` | We map the short form |
| `3MIS (K‰)\nif different of AnnualQ…` | `threeMis` | Long form with an explanatory tail |
| `Guarantee cost (€/vh\nif different…` | `guaranteeCost` | Same |
| `PIMOF (K‰)\nif different…` | `pimof` | Same |
| `Request description,\n - to explain content to H…` | `requestDescription` | Same |

Embedded `\r\n` inside header cells is *not* the problem — `normalizeKey` collapses whitespace, so `Parent\n Prog. Line`, `EXPECTED \nECO OUTPUT` and `Contract date (CO/APR2)\nCO` all match correctly. The misses are genuine name differences.

Unmatched columns with no field at all (descriptive, and the PRD says such columns are not persisted — no action needed): `Creation process`, `GPS NAME`, `Partner`, `% Partner`, `ABVC Date`, `ABPT Date`, `Framework - Technical Definition`, `Framework - Prototype`, `Framework - DIPM`, `Framework - Tuning + EMS`, `LP exitante dans PGM`. `Market` and `Parent ranking` are also present in the file but correctly ignored — both are derived on our side.

### P3 — IMPORTANT: three of the four readiness-gating fields are not in the file

`partFactory`, `cluster` and `technoGroup` appear nowhere in this framing file. PRD §6 requires all three non-empty for a line to be "ready", and §5.1 (FF-05) says they are copied verbatim to `project_line` at Generate.

Either they arrive in a different file version, or they are expected to be filled by hand during review. **This needs an answer from Enrique before Generate is built**, because as things stand no line parsed from this file could ever pass the readiness gate.

Also never supplied by the file: `cpoDepartment`, `cvcNumber`, `activityType`, `ownerN2`. The last two matter:

- **`activityType`** is the second component of the PL Name for M/B/GM rankings. Absent, every such name silently falls back to the default `MBTP`.
- **`ownerN2`** is the Métier column the table is required to show (HIW-460 AC#2). Absent, that column renders empty for every row.

Neither is editable in the form, because §5.6 does not list them among the 66 fields — so today there is no way to supply either.

### P4 — What the parser got right

The worksheet rule is validated against reality. Both real files carry a decoy: `01.- Framing File from Customer.xlsx` has sheets `GWF2501 Batch2` **and** `GWF2501old`; the other has `GWF2504` and `GWF2501old`. Our `^GWF.*` match excluding `*old` picks the correct sheet in both cases, out of 15–20 sheets each.

---

## Part 2 — Page vs the POC's UI

Classified by who owns the decision, which matters more than the raw difference.

### Deliberate, and mandated by the PRD — no action

| POC behaviour | Ours | Authority |
|---|---|---|
| "Configure PL Number" form to choose a starting code (default `IF01`) | Deterministic seed, no user input | §5.4: "There is **no user-provided starting code** and **no mass overwrite**" |
| PL Name is an editable text field the user can override | Derived, read-only | §5.6 marks `pl_name` "Derived, read-only" |
| `Parent ranking` is an editable dropdown (`MBTP`/`CPU`/`MBTP / PU`) | Read-only, derived from the parent line | §4.2 and §5.5 refuse the POC field explicitly |
| Part type / Fuel dropdowns hold French values | English | §5.2 translates at upload |
| Static CPO/CPA name lists | Fixture standing in for a directory lookup | §4.2 requires Graph API |

### PRD defects — the PRD claims POC fidelity it does not have

`sections.ts` says the 8 sections match "the legacy wp5 layout", which is what §5.6 claims. Against `demo_list.py` that is not true, and **we followed the PRD**, so these are spec defects to raise rather than code to change unilaterally:

- **PL Details field order.** POC (`demo_list.py:3-7`): PL Number, project name, CPO, CPA, CPO Department, Parent Prog. Line, parent ranking, Customer, organs, Other Specifications, **PL Name last**. PRD §5.6 and ours: PL Number, **PL Name second**, Customer, Parent Prog. Line, Parent ranking, Project name sixth, … Same 13 fields, different order.
- **Framework field order.** POC (`demo_list.py:37-41`) puts the five `#Protos` counts **before** Part factory / Cluster / Techno Group. PRD §5.6 and ours put them after.
- **`Market` in the Customer Request section.** POC `group_2` includes it; PRD §5.6 explicitly says "`market` is **not** a field in this form". We follow the PRD.
- **`vehicle factory` and `Veh factory` are two separate POC fields** (`group_3`); the PRD collapses them to one.

### Genuine gaps — POC does it, the PRD does not forbid it, we do not do it

- **No file-level management.** The POC lists every previously uploaded file, reopens one, and deletes it behind a confirm dialog (`1_Framing_File_Review.py:58-136`). Our store is one flat accumulated `lines` array, so a bad upload cannot be isolated or undone. The PRD's §4.1 "files accumulate" is compatible with either model, but the ability to undo a bad upload is genuinely lost. **The most consequential gap of the three.**
- **No per-PL comment thread.** The POC keeps timestamped comments against a PL Number (`:584-660`). No counterpart, and §1–§16 do not mention it.
- **No sign-off action.** The POC's "✅ Approve changes" writes a distinct `PMO Check` / `CPO Check` flag (`:714-769`, `framing_file_functions.py:478-503`) — a workflow acknowledgement separate from saving edits. Our Save has no such counterpart, and the PRD does not describe one. Worth asking whether it was dropped intentionally.
- **No CSV export of the table** (`:402-408`). Distinct from the GPMF export, which is out of scope by design.
- **No conditional field visibility.** `demo_list.py:27` notes Battery capacity should show "Only if part type is battery". We render it unconditionally.
- **Minor:** the POC shows a row/column count summary and an "Editing PL Number X / Project Name Y" heading above the form; we show neither.

### Undocumented divergence

- **Customer is a dropdown in the POC** (`1_Framing_File_Review.py:519-527`, default `RG`, off-list values preserved); ours is free text. The PRD's §5.6 does not mark it as a dropdown and §4.2's enumerated reference lists omit it, so following the PRD was defensible — but it is not among the three departures the design spec documents, so it reads as an oversight. Either add the dropdown or record the choice.

### Not a gap

The POC's AgGrid single-select grid versus our plain table plus `useSortable` is a Streamlit/React idiom difference. Both deliver per-column filter and sort, which is what ADR-011 asks for.

---

## What to do

**Before this page can parse a real file at all** — P1 and P2 are blocking. Neither is large: a header-row locator, and roughly a dozen aliases added to one map. Both belong in `parseFramingFile.ts`, and the real files in `poc_great/data/` should become test fixtures so this cannot regress.

**Before Generate is built** — P3 needs a product answer on where `partFactory` / `cluster` / `technoGroup` come from, and on whether `activityType` and `ownerN2` should be editable.

**For Enrique** — the four PRD-versus-POC discrepancies in Part 2, since the PRD states a fidelity it does not have, and the three genuine gaps, particularly the loss of per-file management.

**Note on the design spec's open item 3.** It reads "No real framing `.xlsx` exists in either repo". That was true of the two repos it named and false of the POC checkout, which was never searched. The header map was built on quoted PRD names as a result, and P2 is the direct consequence.
