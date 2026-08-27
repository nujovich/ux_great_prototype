# Framing File view (slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Framing File page in the prototype — upload a framing `.xlsx`, parse and derive it, classify each row RFI/RFQ, review it in a read-only table plus an 8-section detail form, and persist edits with a partial-field Save.

**Architecture:** Business rules live in pure, individually tested modules under `src/lib/framing/`. The 66 form fields are declared as a data schema (`sections.ts`) rendered by one generic field component, following the existing `gridColumns.ts` pattern. A new `framingStore` holds persisted rows plus page-state edits with field-granular dirty tracking; `project_line` is never touched.

**Tech Stack:** React 19, TypeScript, Vite, Zustand 5, Tailwind 3, `xlsx` ^0.18.5 (SheetJS), Vitest 2 + React Testing Library, `lucide-react` icons.

**Spec:** `docs/superpowers/specs/2026-08-27-hiw-452-framing-file-view-design.md`

## Global Constraints

- **Source of truth** is `cap_horse_great` @ `origin/feature/framing-file-docs` → `docs/prds/framing-file-prd.md` (16 sections) plus Jira epic HIW-468. The Confluence page (id 3998810119) is **stale** — never reconcile against it.
- **No validation UI anywhere.** No per-field error, no per-section error state, no readiness flag, no readiness column. §6 is server-side at Generate, which is out of scope. Tests must assert these elements are **absent** (HIW-460 AC#5, HIW-463 AC#9).
- **Save is a partial-field PATCH** (ADR-022): only fields edited in the current session are submitted, per line. Never a full-row payload, never a union across lines.
- **Edits live in page state until explicit Save** (ADR-008). No persistence on field edit, no network call on form open.
- **`expectedEcoOutput` is read-only** in both tracks (§15.1). Classification is fixed at upload.
- **Reference lists are transcribed verbatim** from `/home/nujovich/poc_great/src/backend/demo_list.py:53` (`drop_down_values_framing_file_drop`) — do not invent, trim or reorder values (§4.2).
- **`project_line` is never written** in slice 1. Do not import `dataStore` from any framing module.
- **Field labels come from the schema** using the PRD's own column names. Only section titles, buttons, toasts, empty states and upload errors go through i18n.
- **Canonical organ strings:** `"Electric Engine"` — never `"Electrical Engine"` (a legacy typo).
- **Role gating:** upload is absent from the DOM for CPO — conditional render, never `disabled`.
- **Never subscribe to `useRoleStore((s) => s.can)`** — that selector returns a stable reference and does not re-render on role switch. Gate through `RoleGate`, or select `currentRole` and derive.
- Test command: `npx vitest run <path>` for one file, `npm test` for the suite. Type check: `npm run typecheck`.
- Commit style: conventional commits, no AI attribution, no `Co-Authored-By`.

## Prerequisites (do these once, before Task 1)

- **`npm install` in this worktree.** A fresh git worktree has no `node_modules`, so
  `npx vitest` and `npm run typecheck` fail until it is installed.
- **`vitest.config.ts` declares no `setupFiles`**, so every component test must
  `import '@testing-library/jest-dom';` itself — the plan's test code already does. With
  `globals: true`, React Testing Library's auto-cleanup is active; no manual `cleanup()`
  is needed.
- **Do not run `pytest node_modules/great-sdd-kit/tests/`** as a gate for this work. The SDD
  Kit has zero framing-file rules, so it validates nothing here and its result is not
  evidence about this feature. Vitest is the only safety net.

---

## File Structure

**PR A — data and logic (no UI)**

| File | Responsibility |
|---|---|
| `src/types/framing.ts` | `FramingLine` (66 form fields + provenance), `FramingTrack`, `RefListKey` |
| `src/fixtures/framingReference.ts` | POC dropdown lists, verbatim; `FRAMING_REFERENCE` record |
| `src/lib/framing/plNumber.ts` | §5.4 — family detection, ordinal codec, assignment |
| `src/lib/framing/plName.ts` | §5.3 — ranking-dependent composition |
| `src/lib/framing/derive.ts` | §4.3/§5.2 — FR→EN maps, client default, drivetrain, drop rule |
| `src/lib/framing/classify.ts` | §15.1 — RFI/RFQ from `expectedEcoOutput` |
| `src/lib/framing/parseFramingFile.ts` | §4.2 — sheet selection, header aliases, row mapping |
| `src/lib/framing/sections.ts` | §5.6 — the 8-section (+1 RFI) field schema |
| `src/fixtures/framingLines.ts` | Seed rows so the page is populated pre-upload |
| `src/store/framingStore.ts` | Persisted rows + page-state edits + field dirty map |

**PR B — UI**

| File | Responsibility |
|---|---|
| `src/components/framing/FramingField.tsx` | One field, switching on `kind` |
| `src/components/framing/FramingFormSection.tsx` | One collapsible section |
| `src/components/framing/ParentLineSelector.tsx` | §5.5 selector, excludes own PL |
| `src/components/framing/FramingDetailForm.tsx` | Assembles sections for a track |
| `src/components/framing/FramingLineTable.tsx` | §7.1 read-only table + filter/sort |
| `src/components/framing/FramingFileUpload.tsx` | §4.1 upload control, Admin/PMO only |
| `src/components/framing/SaveControls.tsx` | §8.1 individual + global Save |
| `src/pages/FramingFilePage.tsx` | Tabs, `RoleGate`, wiring |

Modified: `src/fixtures/roles.ts`, `src/lib/permissions.ts`, `src/App.tsx`, `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`.

**Task dependency graph.** Task 1 gates everything. Tasks 3–7 are mutually independent and parallelisable. Task 8 needs 1 + 2. Task 10 needs 1, 3, 6, 7. PR B tasks are sequential from 11.

```
1 ──┬── 2 ──┬── 8 ──┐
    ├── 3 ──┤       │
    ├── 4 ──┤       ├── 10 ── 11 ── 12 ── 13 ── 14 ── 15 ── 16 ── 17 ── 18
    ├── 5 ──┤       │
    ├── 6 ──┤       │
    └── 7 ──┘       │
```

---

# PR A — data and logic

### Task 1: `FramingLine` type

**Files:**
- Create: `src/types/framing.ts`
- Test: `src/types/__tests__/framing.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `FramingTrack = 'RFQ' | 'RFI'`; `interface FramingLine` with the exact 66 form-field names plus `id`, `track`, `ownerN2`, `activityType`, `createdByFile`, `lastUpdatedByFile`; `RefListKey`; `EMPTY_FRAMING_LINE: FramingLine`; `FRAMING_FORM_FIELD_COUNT = 66`.

Note two non-form fields the PRD requires but §5.6 does not list: `activityType` (a PL Name component, §5.3) and `ownerN2` (the `metier` source in §5.1 and a required table column per HIW-460 AC#2).

- [ ] **Step 1: Write the failing test**

```ts
// src/types/__tests__/framing.test.ts
import { describe, it, expect } from 'vitest';
import { EMPTY_FRAMING_LINE, FRAMING_FORM_FIELD_COUNT } from '../framing';

describe('FramingLine', () => {
  it('declares the 66 form fields from PRD §5.6', () => {
    expect(FRAMING_FORM_FIELD_COUNT).toBe(66);
  });

  it('seeds every form field as empty or null', () => {
    expect(EMPTY_FRAMING_LINE.plNumber).toBe('');
    expect(EMPTY_FRAMING_LINE.annualVolumeSop).toBeNull();
    expect(EMPTY_FRAMING_LINE.protosPfc).toBeNull();
    expect(EMPTY_FRAMING_LINE.track).toBe('RFQ');
  });

  it('carries the seven annual-volume fields of §5.6.2', () => {
    const keys = Object.keys(EMPTY_FRAMING_LINE).filter((k) => k.startsWith('annualVolumeSop'));
    expect(keys).toHaveLength(7);
  });

  it('carries activityType and ownerN2, needed by §5.3 and the §7.1 table', () => {
    expect(EMPTY_FRAMING_LINE).toHaveProperty('activityType');
    expect(EMPTY_FRAMING_LINE).toHaveProperty('ownerN2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/framing.test.ts`
Expected: FAIL — `Failed to resolve import "../framing"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/types/framing.ts
/**
 * Framing File types — PRD §5.6 (cap_horse_great@origin/feature/framing-file-docs).
 * Field names are camelCase per this repo's convention; the PRD uses snake_case DB names.
 */

export type FramingTrack = 'RFQ' | 'RFI';

/** Keys into FRAMING_REFERENCE (src/fixtures/framingReference.ts). */
export type RefListKey =
  | 'whyThisRequest'
  | 'cpoDepartment'
  | 'projectRanking'
  | 'activityType'
  | 'requestType'
  | 'hboRboRfqCms'
  | 'currentEcoMilestone'
  | 'expectedEcoOutput'
  | 'vehicleRange'
  | 'organType'
  | 'allianceCode'
  | 'drivetrain'
  | 'standardEmissions'
  | 'energy'
  | 'technoGroup'
  | 'cmo'
  | 'eeArchitecture'
  | 'countryCluster'
  | 'cpo'
  | 'cpa';

export interface FramingLine {
  // ── identity & provenance (not form fields) ──────────────
  id: string;
  /** §15.1 — fixed at upload, never changes afterwards. */
  track: FramingTrack;
  /** §5.1 — `metier` (owner) source; required table column (HIW-460 AC#2). */
  ownerN2: string;
  /** §5.3 — PL Name component for M/B/GM rankings; defaults to 'MBTP' when empty. */
  activityType: string;
  createdByFile: string;
  lastUpdatedByFile: string;

  // ── §5.6.1 PL Details (13) ───────────────────────────────
  plNumber: string;
  /** Derived, read-only — §5.3. */
  plName: string;
  client: string;
  parentPlNumber: string;
  /** Derived, read-only — §5.5. */
  parentRanking: string;
  projectName: string;
  cpo: string;
  cpa: string;
  cpoDepartment: string;
  secondaryOrgan: string;
  thirdOrgan: string;
  fourthOrgan: string;
  otherSpecifications: string;

  // ── §5.6.2 Customer Request (23) ─────────────────────────
  requestType: string;
  requestDescription: string;
  requesterComment: string;
  whyThisRequest: string;
  requester: string;
  currentEcoMilestone: string;
  /** §15.1 — read-only in both tracks; drives classification. */
  expectedEcoOutput: string;
  requestDate: string;
  hboLeader: string;
  rfqSendDate: string;
  hboRboRfqCms: string;
  countryCluster: string;
  annualVolumeSop: number | null;
  annualVolumeSopPlus1: number | null;
  annualVolumeSopPlus2: number | null;
  annualVolumeSopPlus3: number | null;
  annualVolumeSopPlus4: number | null;
  annualVolumeSopPlus5: number | null;
  annualVolumeSopPlus6: number | null;
  vehicleMaDate: string;
  guaranteeCost: string;
  pimof: string;
  threeMis: string;

  // ── §5.6.3 Vehicle Description (7) ───────────────────────
  vehicleCode: string;
  vehicleBody: string;
  vehiclePhase: string;
  vehicleRange: string;
  cmo: string;
  drivetrain: string;
  vehicleFactory: string;

  // ── §5.6.4 Organ Description (8) ─────────────────────────
  organType: string;
  allianceCode: string;
  energy: string;
  standardEmissions: string;
  icePowerKw: number | null;
  iceTorqueNm: number | null;
  batteryCapacity: number | null;
  eeArchitecture: string;

  // ── §5.6.5 Schedule Milestones (4) ───────────────────────
  spDate: string;
  pcDate: string;
  coDate: string;
  sopDate: string;

  // ── §5.6.6 Framework (10) ────────────────────────────────
  projectRanking: string;
  frameworkComment: string;
  partFactory: string;
  cluster: string;
  technoGroup: string;
  protosPfc: number | null;
  protosVc: number | null;
  protosOrganPt: number | null;
  protosOrganUm: number | null;
  protosEp: number | null;

  // ── §5.6.8 Additional Details (1) ────────────────────────
  cvcNumber: string;
}

/** PRD §5.6: 13 + 23 + 7 + 8 + 4 + 10 + 0 + 1. */
export const FRAMING_FORM_FIELD_COUNT = 66;

export const EMPTY_FRAMING_LINE: FramingLine = {
  id: '',
  track: 'RFQ',
  ownerN2: '',
  activityType: '',
  createdByFile: '',
  lastUpdatedByFile: '',

  plNumber: '', plName: '', client: '', parentPlNumber: '', parentRanking: '',
  projectName: '', cpo: '', cpa: '', cpoDepartment: '', secondaryOrgan: '',
  thirdOrgan: '', fourthOrgan: '', otherSpecifications: '',

  requestType: '', requestDescription: '', requesterComment: '', whyThisRequest: '',
  requester: '', currentEcoMilestone: '', expectedEcoOutput: '', requestDate: '',
  hboLeader: '', rfqSendDate: '', hboRboRfqCms: '', countryCluster: '',
  annualVolumeSop: null, annualVolumeSopPlus1: null, annualVolumeSopPlus2: null,
  annualVolumeSopPlus3: null, annualVolumeSopPlus4: null, annualVolumeSopPlus5: null,
  annualVolumeSopPlus6: null,
  vehicleMaDate: '', guaranteeCost: '', pimof: '', threeMis: '',

  vehicleCode: '', vehicleBody: '', vehiclePhase: '', vehicleRange: '', cmo: '',
  drivetrain: '', vehicleFactory: '',

  organType: '', allianceCode: '', energy: '', standardEmissions: '',
  icePowerKw: null, iceTorqueNm: null, batteryCapacity: null, eeArchitecture: '',

  spDate: '', pcDate: '', coDate: '', sopDate: '',

  projectRanking: '', frameworkComment: '', partFactory: '', cluster: '', technoGroup: '',
  protosPfc: null, protosVc: null, protosOrganPt: null, protosOrganUm: null, protosEp: null,

  cvcNumber: '',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/framing.test.ts && npm run typecheck`
Expected: 4 tests PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/types/framing.ts src/types/__tests__/framing.test.ts
git commit -m "feat(framing): FramingLine type with the 66 PRD form fields"
```

---

### Task 2: Reference lists, transcribed from the POC

**Files:**
- Create: `src/fixtures/framingReference.ts`
- Test: `src/fixtures/__tests__/framingReference.test.ts`

**Interfaces:**
- Consumes: `RefListKey` from Task 1.
- Produces: `FRAMING_REFERENCE: Record<RefListKey, readonly string[]>`.

Transcribe `/home/nujovich/poc_great/src/backend/demo_list.py:53` verbatim — same values, same order (§4.2). Three documented departures, each carrying an inline comment:
- `organType` and `energy` hold the **English** values (the stored value is FR→EN translated at upload), not the POC's French source strings.
- `parentRanking` is **not** a list — §5.5 derives it from the parent line.
- `cpo`/`cpa` are prototype fixtures standing in for Graph API resolution; §4.2 forbids reusing the POC's static names.

- [ ] **Step 1: Write the failing test**

```ts
// src/fixtures/__tests__/framingReference.test.ts
import { describe, it, expect } from 'vitest';
import { FRAMING_REFERENCE } from '../framingReference';

describe('FRAMING_REFERENCE (PRD §4.2 — verbatim from demo_list.py)', () => {
  it('reproduces Project ranking exactly and in order', () => {
    expect(FRAMING_REFERENCE.projectRanking).toEqual(
      ['GM', 'M', 'B', 'C133W', 'C93W', 'C72W', 'C36W'],
    );
  });

  it('reproduces CPO Department exactly', () => {
    expect(FRAMING_REFERENCE.cpoDepartment).toEqual(['H-Project', 'H-R&AE', 'H-NP', 'H-TAS']);
  });

  it('reproduces Expected ECO Output exactly — it drives §15.1 classification', () => {
    expect(FRAMING_REFERENCE.expectedEcoOutput).toEqual(['ECO1', 'ECO2', 'ECO3', 'N/A']);
  });

  it('keeps the empty first value of Techno Group', () => {
    expect(FRAMING_REFERENCE.technoGroup[0]).toBe('');
    expect(FRAMING_REFERENCE.technoGroup).toHaveLength(6);
  });

  it('reproduces Request type exactly — no Suppression, per the POC', () => {
    expect(FRAMING_REFERENCE.requestType).toEqual(['Creation', 'Modification', 'Closure']);
  });

  it('offers organType and energy in English, not the POC French source', () => {
    expect(FRAMING_REFERENCE.organType).toContain('Gearbox');
    expect(FRAMING_REFERENCE.organType).toContain('Electric Engine');
    expect(FRAMING_REFERENCE.organType).not.toContain('Electrical Engine');
    expect(FRAMING_REFERENCE.organType).not.toContain('Boîte de vitesse');
    expect(FRAMING_REFERENCE.energy).toContain('Hybrid - Gasoline');
    expect(FRAMING_REFERENCE.energy).not.toContain('Hybride - Essence');
  });

  it('carries the long POC lists at full length', () => {
    expect(FRAMING_REFERENCE.allianceCode.length).toBeGreaterThan(90);
    expect(FRAMING_REFERENCE.standardEmissions.length).toBeGreaterThan(60);
    expect(FRAMING_REFERENCE.countryCluster).toHaveLength(24);
    expect(FRAMING_REFERENCE.vehicleRange).toHaveLength(18);
    expect(FRAMING_REFERENCE.cmo).toHaveLength(19);
    expect(FRAMING_REFERENCE.eeArchitecture).toHaveLength(17);
    expect(FRAMING_REFERENCE.whyThisRequest).toHaveLength(9);
    expect(FRAMING_REFERENCE.activityType).toHaveLength(9);
  });

  it('offers 4X2 and 4X4 for drivetrain', () => {
    expect(FRAMING_REFERENCE.drivetrain).toEqual(['4X2', '4X4']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/fixtures/__tests__/framingReference.test.ts`
Expected: FAIL — cannot resolve `../framingReference`.

- [ ] **Step 3: Write minimal implementation**

Read the POC source before writing, so the long lists are transcribed rather than recalled:

```bash
npx --yes . 2>/dev/null; rg -n 'drop_down_values_framing_file_drop' -A 120 /home/nujovich/poc_great/src/backend/demo_list.py
```

Then create `src/fixtures/framingReference.ts`:

```ts
import type { RefListKey } from '../types/framing';

/**
 * Framing File reference data — PRD §4.2.
 *
 * Transcribed VERBATIM from the legacy wp5 POC
 * (/home/nujovich/poc_great/src/backend/demo_list.py:53,
 * `drop_down_values_framing_file_drop`). Do not invent, trim or reorder values.
 *
 * Three deliberate departures, each mandated by §4.2/§5.5:
 *  - `organType`/`energy` hold the ENGLISH values: the stored value is FR→EN
 *    translated at upload (§5.2), so the dropdown offers the translated image
 *    of the POC list, not its French source.
 *  - The POC's `Parent ranking` list (MBTP/CPU/'MBTP / PU') is NOT reproduced —
 *    §5.5 derives `parentRanking` from the selected parent line's ranking.
 *  - The POC's static `CPO`/`CPA` name lists are NOT reproduced — §4.2 requires
 *    Microsoft Graph API resolution of live CPO-role holders. The prototype has
 *    no Graph API, so the two lists below are a flagged substitution.
 */
export const FRAMING_REFERENCE: Record<RefListKey, readonly string[]> = {
  whyThisRequest: [
    'Regulation', 'New business, new countries', 'Partner',
    'Electrification', 'New vh on existing market', 'Profitability',
    'CAF WW', 'Media risk', 'New vehicle plant',
  ],
  cpoDepartment: ['H-Project', 'H-R&AE', 'H-NP', 'H-TAS'],
  projectRanking: ['GM', 'M', 'B', 'C133W', 'C93W', 'C72W', 'C36W'],
  activityType: [
    'CPU', 'MBTP', 'MBPU', 'I4I', 'R&AE', 'New Business',
    'AFS - Service Development Project', 'AFS - Parts & Accessories',
    'AFS - Process, SW & Organization',
  ],
  requestType: ['Creation', 'Modification', 'Closure'],
  hboRboRfqCms: ['RFQ', 'RFQ answer Update', 'CMS', 'N/A'],
  currentEcoMilestone: ['ECO0 / MGMT / LEGISLATION', 'ECO1', 'ECO2', 'N/A'],
  expectedEcoOutput: ['ECO1', 'ECO2', 'ECO3', 'N/A'],
  vehicleRange: [
    'A-B', 'ALPINE', 'C', 'D-E', 'EDISON', 'EV', 'Global Access', 'HGR', 'LCV1', 'LCV2',
    'LCV3', 'LCV4', 'RSC', 'Avtovaz', 'NISSAN', '-', 'MOBILIZE', 'SANSOBJ',
  ],
  // English image of the POC "Part type" list (§5.2 FR→EN). Réducteur and
  // Pile à combustible have no PRD mapping — passed through untranslated.
  organType: [
    'Thermal Engine', 'Gearbox', 'Battery', 'Electric Engine',
    'Réducteur', 'Pile à combustible',
  ],
  allianceCode: [
    /* transcribe all ~100 values from demo_list.py:92-104, in order */
  ],
  drivetrain: ['4X2', '4X4'],
  standardEmissions: [
    /* transcribe all ~70 values from demo_list.py:108-115, in order */
  ],
  // English image of the POC "Fuel" list (§5.2); E-series and N/A pass through.
  energy: [
    'Gasoline', 'E10', 'E100 (FLEX FL)', 'LPG', 'Diesel', 'Electric',
    'Hybrid - Gasoline', 'Hybrid - Diesel', 'E27', 'E26', 'E85', 'Hydrogen',
    'E20', 'N/A',
  ],
  technoGroup: ['', 'Diesel PWT', 'Gasoline PWT', 'PHEV PWT', 'HEV PWT', 'GM/M Transmission'],
  cmo: [
    /* transcribe all 19 values from demo_list.py:123-127, in order */
  ],
  eeArchitecture: [
    /* transcribe all 17 values from demo_list.py:128-131, in order */
  ],
  countryCluster: [
    /* transcribe all 24 values from demo_list.py:132-147, in order */
  ],
  // Prototype substitution for Graph API CPO-role resolution (§4.2).
  cpo: ['B. Hernandez', 'C. Canteli', 'D. Ceola', 'F. Istrate', 'I. Petcu'],
  cpa: ['K. Shway', 'G. Diaz', 'B. Popescu', 'M. Pruna', 'P. Zan'],
};
```

The five `/* transcribe … */` markers are the only place in this plan where content is
deferred to the executor, and deliberately so: those lists are 100+, 70, 19, 17 and 24
literal strings that MUST be copied byte-for-byte from the POC rather than retyped from a
plan. Read the source, paste the values, keep the order. The Step-1 length assertions are
what catch a partial paste.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/fixtures/__tests__/framingReference.test.ts && npm run typecheck`
Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/fixtures/framingReference.ts src/fixtures/__tests__/framingReference.test.ts
git commit -m "feat(framing): reference lists transcribed from the wp5 POC"
```

---

### Task 3: PL Number assignment (§5.4) — highest risk

**Files:**
- Create: `src/lib/framing/plNumber.ts`
- Test: `src/lib/framing/__tests__/plNumber.test.ts`

**Interfaces:**
- Consumes: nothing (operates on plain strings and a minimal row shape).
- Produces: `PlNumberFamily = 'LLNN' | 'NNLL'`; `isRenaultClient(client?: string | null): boolean`; `familyFor(client?: string | null): PlNumberFamily`; `decode(code: string, family: PlNumberFamily): number | null`; `encode(ordinal: number, family: PlNumberFamily): string`; `FAMILY_CAPACITY = 67600`; `assignPlNumbers<T extends { plNumber: string; client: string }>(rows: T[], existingCodes: readonly string[]): T[]`.

The insight that makes this tractable: **both families share one ordinal encoding**, `ordinal = (l1 * 26 + l2) * 100 + nn`. Numbers occupy the low digits, so `+1` advances numbers first and rolls letters only at `..99` — exactly §5.4's rule for both layouts. Only the string layout differs (`LLNN` vs `NNLL`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/framing/__tests__/plNumber.test.ts
import { describe, it, expect } from 'vitest';
import {
  isRenaultClient, familyFor, decode, encode, FAMILY_CAPACITY, assignPlNumbers,
} from '../plNumber';

describe('client → family (§5.4)', () => {
  it.each(['RG', 'Renault', 'Renault Group', 'renault sas', 'RENAULT', '', '   '])(
    'treats %j as the Renault LLNN family', (client) => {
      expect(isRenaultClient(client)).toBe(true);
      expect(familyFor(client)).toBe('LLNN');
    });

  it.each(['Nissan', 'Dacia', 'Mitsubishi'])('treats %j as the NNLL family', (client) => {
    expect(isRenaultClient(client)).toBe(false);
    expect(familyFor(client)).toBe('NNLL');
  });

  it('treats null and undefined as Renault (empty defaults to RG, §5.2)', () => {
    expect(familyFor(null)).toBe('LLNN');
    expect(familyFor(undefined)).toBe('LLNN');
  });
});

describe('ordinal codec', () => {
  it('maps the family seeds to ordinal 0', () => {
    expect(decode('AA00', 'LLNN')).toBe(0);
    expect(decode('00AA', 'NNLL')).toBe(0);
    expect(encode(0, 'LLNN')).toBe('AA00');
    expect(encode(0, 'NNLL')).toBe('00AA');
  });

  it('advances numbers before letters — LLNN', () => {
    expect(encode(decode('AA99', 'LLNN')! + 1, 'LLNN')).toBe('AB00');
    expect(encode(decode('AZ99', 'LLNN')! + 1, 'LLNN')).toBe('BA00');
    expect(encode(decode('AA00', 'LLNN')! + 1, 'LLNN')).toBe('AA01');
  });

  it('advances numbers before letters — NNLL', () => {
    expect(encode(decode('99AA', 'NNLL')! + 1, 'NNLL')).toBe('00AB');
    expect(encode(decode('00AA', 'NNLL')! + 1, 'NNLL')).toBe('01AA');
    expect(encode(decode('99AB', 'NNLL')! + 1, 'NNLL')).toBe('00AC');
  });

  it('caps each family at 26 × 26 × 100 combinations', () => {
    expect(FAMILY_CAPACITY).toBe(67600);
    expect(encode(FAMILY_CAPACITY - 1, 'LLNN')).toBe('ZZ99');
    expect(encode(FAMILY_CAPACITY - 1, 'NNLL')).toBe('99ZZ');
    expect(() => encode(FAMILY_CAPACITY, 'LLNN')).toThrow(/exhausted/i);
  });

  it('rejects codes of the other family, so the two never compare', () => {
    expect(decode('05AZ', 'LLNN')).toBeNull();
    expect(decode('AA05', 'NNLL')).toBeNull();
    expect(decode('PL-016', 'LLNN')).toBeNull();
    expect(decode('AAA0', 'LLNN')).toBeNull();
  });

  it('decodes lowercase letters case-insensitively', () => {
    expect(decode('aa01', 'LLNN')).toBe(1);
  });
});

describe('assignPlNumbers (§5.4)', () => {
  it('keeps a file-provided value verbatim, in any format', () => {
    const rows = [{ plNumber: 'PL-016/xyz', client: 'RG' }];
    expect(assignPlNumbers(rows, [])[0].plNumber).toBe('PL-016/xyz');
  });

  it('seeds AA00 when the Renault family is empty', () => {
    const rows = [{ plNumber: '', client: 'RG' }];
    expect(assignPlNumbers(rows, [])[0].plNumber).toBe('AA00');
  });

  it('seeds 00AA when the non-Renault family is empty', () => {
    const rows = [{ plNumber: '', client: 'Nissan' }];
    expect(assignPlNumbers(rows, [])[0].plNumber).toBe('00AA');
  });

  it('generates global-max + 1 for its own family only', () => {
    const rows = [{ plNumber: '', client: 'RG' }, { plNumber: '', client: 'Nissan' }];
    const out = assignPlNumbers(rows, ['AA07', '13AC', 'PL-016']);
    expect(out[0].plNumber).toBe('AA08');
    expect(out[1].plNumber).toBe('14AC');
  });

  it('assigns consecutive codes to several empty rows of one family', () => {
    const rows = [
      { plNumber: '', client: 'RG' },
      { plNumber: '', client: 'Renault Group' },
      { plNumber: '', client: '' },
    ];
    const out = assignPlNumbers(rows, ['AA98']);
    expect(out.map((r) => r.plNumber)).toEqual(['AA99', 'AB00', 'AB01']);
  });

  it('interleaves the two families without cross-contamination', () => {
    const rows = [
      { plNumber: '', client: 'RG' },
      { plNumber: '', client: 'Nissan' },
      { plNumber: '', client: 'RG' },
      { plNumber: 'KEEP-ME', client: 'Nissan' },
      { plNumber: '', client: 'Dacia' },
    ];
    const out = assignPlNumbers(rows, ['AB00', '00AA']);
    expect(out.map((r) => r.plNumber)).toEqual(['AB01', '01AA', 'AB02', 'KEEP-ME', '02AA']);
  });

  it('ignores unparseable existing codes when computing the max', () => {
    const rows = [{ plNumber: '', client: 'RG' }];
    expect(assignPlNumbers(rows, ['nonsense', '', 'PL-1'])[0].plNumber).toBe('AA00');
  });

  it('does not mutate the input rows', () => {
    const rows = [{ plNumber: '', client: 'RG' }];
    assignPlNumbers(rows, []);
    expect(rows[0].plNumber).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/framing/__tests__/plNumber.test.ts`
Expected: FAIL — cannot resolve `../plNumber`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/framing/plNumber.ts
/**
 * PL Number assignment — PRD §5.4.
 *
 * A file-provided PL number is kept verbatim. An empty one is generated from the
 * GLOBAL highest existing code of the row's client format family (all cycles, not
 * just the active one), incremented by one.
 *
 * Both families share one ordinal encoding:
 *
 *     ordinal = (l1 * 26 + l2) * 100 + nn
 *
 * Numbers occupy the low digits, so `+1` advances numbers first and rolls letters
 * only at `..99` — §5.4's rule for both layouts. Only the string layout differs.
 */

export type PlNumberFamily = 'LLNN' | 'NNLL';

/** 26 × 26 × 100 — ZZ99 / 99ZZ are the last valid values. */
export const FAMILY_CAPACITY = 26 * 26 * 100;

const LLNN_RE = /^([A-Za-z])([A-Za-z])(\d)(\d)$/;
const NNLL_RE = /^(\d)(\d)([A-Za-z])([A-Za-z])$/;

/** §5.4 — RG / Renault / Renault Group / contains "renault" / empty all mean Renault. */
export function isRenaultClient(client?: string | null): boolean {
  const c = (client ?? '').trim();
  if (c === '') return true;
  return /renault/i.test(c) || /^rg$/i.test(c);
}

export function familyFor(client?: string | null): PlNumberFamily {
  return isRenaultClient(client) ? 'LLNN' : 'NNLL';
}

function letterOrdinal(a: string, b: string): number {
  const l1 = a.toUpperCase().charCodeAt(0) - 65;
  const l2 = b.toUpperCase().charCodeAt(0) - 65;
  return l1 * 26 + l2;
}

/** Returns the ordinal of `code` within `family`, or null when it is not a member. */
export function decode(code: string, family: PlNumberFamily): number | null {
  const raw = (code ?? '').trim();
  if (family === 'LLNN') {
    const m = LLNN_RE.exec(raw);
    if (!m) return null;
    return letterOrdinal(m[1], m[2]) * 100 + Number(`${m[3]}${m[4]}`);
  }
  const m = NNLL_RE.exec(raw);
  if (!m) return null;
  return letterOrdinal(m[3], m[4]) * 100 + Number(`${m[1]}${m[2]}`);
}

export function encode(ordinal: number, family: PlNumberFamily): string {
  if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= FAMILY_CAPACITY) {
    throw new Error(
      `PL Number family ${family} exhausted: ordinal ${ordinal} is outside 0..${FAMILY_CAPACITY - 1}`,
    );
  }
  const nn = String(ordinal % 100).padStart(2, '0');
  const letters = Math.floor(ordinal / 100);
  const l1 = String.fromCharCode(65 + Math.floor(letters / 26));
  const l2 = String.fromCharCode(65 + (letters % 26));
  return family === 'LLNN' ? `${l1}${l2}${nn}` : `${nn}${l1}${l2}`;
}

/** Highest ordinal of `family` among `codes`, or null when the family is empty. */
function maxOrdinal(codes: readonly string[], family: PlNumberFamily): number | null {
  let max: number | null = null;
  for (const code of codes) {
    const ord = decode(code, family);
    if (ord !== null && (max === null || ord > max)) max = ord;
  }
  return max;
}

/**
 * §5.4 — returns a new array where every row with an empty `plNumber` carries a
 * freshly generated code. Rows within one call never collide: each family's
 * counter advances per assignment (`max + 1`, `max + 2`, …).
 */
export function assignPlNumbers<T extends { plNumber: string; client: string }>(
  rows: T[],
  existingCodes: readonly string[],
): T[] {
  const next: Record<PlNumberFamily, number> = {
    LLNN: (maxOrdinal(existingCodes, 'LLNN') ?? -1) + 1,
    NNLL: (maxOrdinal(existingCodes, 'NNLL') ?? -1) + 1,
  };

  return rows.map((row) => {
    if ((row.plNumber ?? '').trim() !== '') return { ...row };
    const family = familyFor(row.client);
    const plNumber = encode(next[family], family);
    next[family] += 1;
    return { ...row, plNumber };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/framing/__tests__/plNumber.test.ts && npm run typecheck`
Expected: all PASS (24 assertions across 16 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/framing/plNumber.ts src/lib/framing/__tests__/plNumber.test.ts
git commit -m "feat(framing): PL Number assignment per PRD 5.4"
```

---

### Task 4: PL Name composition (§5.3)

**Files:**
- Create: `src/lib/framing/plName.ts`
- Test: `src/lib/framing/__tests__/plName.test.ts`

**Interfaces:**
- Consumes: `FramingLine` from Task 1.
- Produces: `PL_NAME_SEPARATOR = ' '`; `composePlName(row: PlNameSource): string`, where `PlNameSource = Pick<FramingLine, 'plNumber' | 'activityType' | 'allianceCode' | 'secondaryOrgan' | 'thirdOrgan' | 'fourthOrgan' | 'standardEmissions' | 'vehicleCode' | 'otherSpecifications' | 'drivetrain' | 'vehiclePhase' | 'projectRanking'>`.

**Known ambiguity, decided here:** §5.3 writes the components separated by `·`, which is documentation notation, not necessarily the join character; the legacy `create_gpm` (`functionalities.py:157-174`) is authoritative and unread. This task joins with a **single space** and exports `PL_NAME_SEPARATOR` so the decision changes in one place. Flag it for confirmation.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/framing/__tests__/plName.test.ts
import { describe, it, expect } from 'vitest';
import { composePlName } from '../plName';

const base = {
  plNumber: 'AA01', activityType: '', allianceCode: 'HR10DDTG2',
  secondaryOrgan: 'SO', thirdOrgan: 'TO', fourthOrgan: 'FO',
  standardEmissions: 'E06C', vehicleCode: 'X67', otherSpecifications: 'SPEC',
  drivetrain: '4X2', vehiclePhase: 'PH1', projectRanking: 'M',
};

describe('composePlName (§5.3)', () => {
  it('orders M/B/GM components with Activity type second and Vehicle code after emissions', () => {
    expect(composePlName({ ...base, projectRanking: 'M', activityType: 'CPU' })).toBe(
      'AA01 CPU HR10DDTG2 SO TO FO E06C X67 SPEC PH1',
    );
  });

  it.each(['M', 'B', 'GM'])('uses the M/B/GM order for ranking %s', (projectRanking) => {
    const name = composePlName({ ...base, projectRanking, activityType: 'CPU' });
    expect(name.startsWith('AA01 CPU HR10DDTG2')).toBe(true);
  });

  it('defaults Activity type to MBTP when empty, for M/B/GM only', () => {
    expect(composePlName({ ...base, projectRanking: 'B', activityType: '' })).toContain('AA01 MBTP');
    expect(composePlName({ ...base, projectRanking: 'B', activityType: '   ' })).toContain('AA01 MBTP');
  });

  it('orders Child components with Vehicle code second and no Activity type', () => {
    expect(composePlName({ ...base, projectRanking: 'C93W', activityType: 'CPU' })).toBe(
      'AA01 X67 HR10DDTG2 SO TO FO E06C SPEC PH1',
    );
  });

  it.each(['C133W', 'C93W', 'C72W', 'C36W', 'anything else'])(
    'uses the Child order for ranking %s', (projectRanking) => {
      expect(composePlName({ ...base, projectRanking })).not.toContain('MBTP');
    });

  it('hides 4X2 and appends 4X4 just before Vehicle Phase', () => {
    expect(composePlName({ ...base, drivetrain: '4X2' })).not.toContain('4X2');
    expect(composePlName({ ...base, drivetrain: '4X4' })).toContain('SPEC 4X4 PH1');
    expect(composePlName({ ...base, drivetrain: '4x4' })).toContain('4X4');
  });

  it('omits empty components without leaving double separators', () => {
    const name = composePlName({
      ...base, projectRanking: 'C36W', secondaryOrgan: '', thirdOrgan: '   ',
      fourthOrgan: '', otherSpecifications: '', drivetrain: '', vehiclePhase: '',
    });
    expect(name).toBe('AA01 X67 HR10DDTG2 E06C');
    expect(name).not.toMatch(/\s{2}/);
  });

  it('keeps Vehicle Phase last whenever present', () => {
    const name = composePlName({ ...base, drivetrain: '4X4', vehiclePhase: 'PH2' });
    expect(name.endsWith('PH2')).toBe(true);
  });

  it('matches ranking case-insensitively', () => {
    expect(composePlName({ ...base, projectRanking: 'm', activityType: 'CPU' })).toContain('AA01 CPU');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/framing/__tests__/plName.test.ts`
Expected: FAIL — cannot resolve `../plName`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/framing/plName.ts
import type { FramingLine } from '../../types/framing';

export type PlNameSource = Pick<
  FramingLine,
  | 'plNumber' | 'activityType' | 'allianceCode' | 'secondaryOrgan' | 'thirdOrgan'
  | 'fourthOrgan' | 'standardEmissions' | 'vehicleCode' | 'otherSpecifications'
  | 'drivetrain' | 'vehiclePhase' | 'projectRanking'
>;

/**
 * §5.3 writes components separated by `·`, which is documentation notation. The
 * authoritative join character lives in the legacy `create_gpm`
 * (functionalities.py:157-174) and is unconfirmed — see the plan's open items.
 */
export const PL_NAME_SEPARATOR = ' ';

const MBGM_RANKINGS = new Set(['M', 'B', 'GM']);
const DEFAULT_ACTIVITY_TYPE = 'MBTP';

function clean(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/** §5.3 — ranking-dependent composition. 4X2 is valid but hidden; only 4X4 appears. */
export function composePlName(row: PlNameSource): string {
  const ranking = clean(row.projectRanking).toUpperCase();
  const fourWheel = clean(row.drivetrain).toUpperCase() === '4X4' ? '4X4' : '';

  const components = MBGM_RANKINGS.has(ranking)
    ? [
        row.plNumber,
        clean(row.activityType) || DEFAULT_ACTIVITY_TYPE,
        row.allianceCode, row.secondaryOrgan, row.thirdOrgan, row.fourthOrgan,
        row.standardEmissions, row.vehicleCode, row.otherSpecifications,
        fourWheel, row.vehiclePhase,
      ]
    : [
        row.plNumber, row.vehicleCode, row.allianceCode,
        row.secondaryOrgan, row.thirdOrgan, row.fourthOrgan,
        row.standardEmissions, row.otherSpecifications,
        fourWheel, row.vehiclePhase,
      ];

  return components.map(clean).filter((c) => c !== '').join(PL_NAME_SEPARATOR);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/framing/__tests__/plName.test.ts && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/framing/plName.ts src/lib/framing/__tests__/plName.test.ts
git commit -m "feat(framing): PL Name composition per PRD 5.3"
```

---

### Task 5: Upload-time derivation (§4.3, §5.2)

**Files:**
- Create: `src/lib/framing/derive.ts`
- Test: `src/lib/framing/__tests__/derive.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `stripAccents(s: string): string`; `normalizeKey(s: string): string`; `ORGAN_TYPE_FR_EN` and `ENERGY_FR_EN` as `Record<string, string>`; `translateOrganType(raw?: string | null): string`; `translateEnergy(raw?: string | null): string`; `resolveClient(customer?: string | null, client?: string | null): string`; `normalizeDrivetrain(raw?: string | null): string`; `isDroppedRequestType(raw?: string | null): boolean`; `DEFAULT_CLIENT = 'RG'`.

Only these run at upload. `engineering`, `estimateType`, `injectionSystem` and `market` are Generate/GPMF concerns (§4.3) and must **not** appear in this module.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/framing/__tests__/derive.test.ts
import { describe, it, expect } from 'vitest';
import {
  stripAccents, normalizeKey, translateOrganType, translateEnergy,
  resolveClient, normalizeDrivetrain, isDroppedRequestType, DEFAULT_CLIENT,
} from '../derive';

describe('normalization helpers', () => {
  it('strips accents', () => {
    expect(stripAccents('Boîte de vitesse')).toBe('Boite de vitesse');
    expect(stripAccents('Électrique')).toBe('Electrique');
    expect(stripAccents('Hydrogène')).toBe('Hydrogene');
  });

  it('folds case, trims, and collapses inner whitespace', () => {
    expect(normalizeKey('  Moteur   THERMIQUE ')).toBe('moteur thermique');
  });
});

describe('translateOrganType (§5.2, at upload)', () => {
  it.each([
    ['Moteur thermique', 'Thermal Engine'],
    ['Boîte de vitesse', 'Gearbox'],
    ['Batterie', 'Battery'],
    ['Moteur Electrique', 'Electric Engine'],
    ['moteur électrique', 'Electric Engine'],
    ['  BOITE DE VITESSE  ', 'Gearbox'],
  ])('translates %j to %j', (raw, expected) => {
    expect(translateOrganType(raw)).toBe(expected);
  });

  it('passes already-English values through unchanged', () => {
    expect(translateOrganType('Gearbox')).toBe('Gearbox');
    expect(translateOrganType('Electric Engine')).toBe('Electric Engine');
  });

  it('passes the two unmapped POC values through untranslated (spec gap 1)', () => {
    expect(translateOrganType('Réducteur')).toBe('Réducteur');
    expect(translateOrganType('Pile à combustible')).toBe('Pile à combustible');
  });

  it('never emits the legacy Electrical Engine typo', () => {
    expect(translateOrganType('Moteur Electrique')).not.toBe('Electrical Engine');
  });

  it('returns empty string for empty input', () => {
    expect(translateOrganType('')).toBe('');
    expect(translateOrganType(null)).toBe('');
  });
});

describe('translateEnergy (§5.2, at upload)', () => {
  it.each([
    ['Essence', 'Gasoline'],
    ['Diesel', 'Diesel'],
    ['Électrique', 'Electric'],
    ['Electrique', 'Electric'],
    ['Hybride - Essence', 'Hybrid - Gasoline'],
    ['Hybride - Diesel', 'Hybrid - Diesel'],
    ['GPL', 'LPG'],
    ['Hydrogène', 'Hydrogen'],
  ])('translates %j to %j', (raw, expected) => {
    expect(translateEnergy(raw)).toBe(expected);
  });

  it.each(['E10', 'E20', 'E26', 'E27', 'E85', 'E100 (FLEX FL)', 'N/A'])(
    'passes %j through unchanged', (raw) => {
      expect(translateEnergy(raw)).toBe(raw);
    });
});

describe('resolveClient (§5.2)', () => {
  it('prefers Customer over Client', () => {
    expect(resolveClient('Nissan', 'Dacia')).toBe('Nissan');
  });

  it('falls back to Client when Customer is blank', () => {
    expect(resolveClient('   ', 'Dacia')).toBe('Dacia');
  });

  it.each(['', '   ', 'nan', 'NaN', 'None', 'none'])(
    'defaults %j to RG', (customer) => {
      expect(resolveClient(customer, '')).toBe(DEFAULT_CLIENT);
    });

  it('defaults null and undefined to RG', () => {
    expect(resolveClient(null, null)).toBe('RG');
    expect(resolveClient(undefined, undefined)).toBe('RG');
  });

  it('trims the resolved value', () => {
    expect(resolveClient('  Nissan  ', '')).toBe('Nissan');
  });
});

describe('normalizeDrivetrain (§4.3)', () => {
  it.each([['4x2', '4X2'], ['4X2', '4X2'], ['4x4', '4X4'], ['  4X4 ', '4X4']])(
    'normalizes %j to %j', (raw, expected) => {
      expect(normalizeDrivetrain(raw)).toBe(expected);
    });

  it('returns empty string for anything else', () => {
    expect(normalizeDrivetrain('AWD')).toBe('');
    expect(normalizeDrivetrain('')).toBe('');
  });
});

describe('isDroppedRequestType (§4.3)', () => {
  it.each(['Suppression', 'suppression', 'Closure', '  CLOSURE '])(
    'drops %j', (raw) => {
      expect(isDroppedRequestType(raw)).toBe(true);
    });

  it.each(['Creation', 'Modification', '', 'Closed'])('keeps %j', (raw) => {
    expect(isDroppedRequestType(raw)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/framing/__tests__/derive.test.ts`
Expected: FAIL — cannot resolve `../derive`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/framing/derive.ts
/**
 * Upload-time derivation — PRD §4.3 and §5.2.
 *
 * ONLY the transforms that run at upload live here. `engineering`,
 * `estimateType`, `injectionSystem` and `market` are computed at Generate and at
 * GPMF export (§4.3) and must never be added to this module.
 */

export const DEFAULT_CLIENT = 'RG';

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Lookup key: accents stripped, trimmed, lower-cased, inner whitespace collapsed. */
export function normalizeKey(value: string): string {
  return stripAccents(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

/** §5.1/§5.2 — Part type → organ_type. Accents stripped; unmapped values pass through. */
export const ORGAN_TYPE_FR_EN: Record<string, string> = {
  'moteur thermique': 'Thermal Engine',
  'boite de vitesse': 'Gearbox',
  batterie: 'Battery',
  'moteur electrique': 'Electric Engine',
  // 'Réducteur' and 'Pile à combustible' are POC Part type values with no PRD
  // mapping — passed through untranslated. See the plan's open items.
};

/** §5.2 — Fuel → energy. E10/E20/E26/E27/E85/E100 and N/A pass through. */
export const ENERGY_FR_EN: Record<string, string> = {
  essence: 'Gasoline',
  diesel: 'Diesel',
  electrique: 'Electric',
  'hybride - essence': 'Hybrid - Gasoline',
  'hybride - diesel': 'Hybrid - Diesel',
  gpl: 'LPG',
  hydrogene: 'Hydrogen',
};

function translate(map: Record<string, string>, raw?: string | null): string {
  const value = (raw ?? '').trim();
  if (value === '') return '';
  return map[normalizeKey(value)] ?? value;
}

export function translateOrganType(raw?: string | null): string {
  return translate(ORGAN_TYPE_FR_EN, raw);
}

export function translateEnergy(raw?: string | null): string {
  return translate(ENERGY_FR_EN, raw);
}

const NULLISH_TOKENS = new Set(['', 'nan', 'none']);

function meaningful(raw?: string | null): string {
  const value = (raw ?? '').trim();
  return NULLISH_TOKENS.has(value.toLowerCase()) ? '' : value;
}

/** §5.2 — Customer takes priority over Client; empty / nan / None default to RG. */
export function resolveClient(customer?: string | null, client?: string | null): string {
  return meaningful(customer) || meaningful(client) || DEFAULT_CLIENT;
}

/** §4.3 — normalizes to 4X2 / 4X4; anything else is empty. */
export function normalizeDrivetrain(raw?: string | null): string {
  const value = (raw ?? '').trim().toUpperCase();
  return value === '4X2' || value === '4X4' ? value : '';
}

/** §4.3 — Suppression and Closure rows are dropped before persistence. */
const DROPPED_REQUEST_TYPES = new Set(['suppression', 'closure']);

export function isDroppedRequestType(raw?: string | null): boolean {
  return DROPPED_REQUEST_TYPES.has((raw ?? '').trim().toLowerCase());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/framing/__tests__/derive.test.ts && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/framing/derive.ts src/lib/framing/__tests__/derive.test.ts
git commit -m "feat(framing): upload-time derivation per PRD 4.3 and 5.2"
```

---

### Task 6: RFI/RFQ classification (§15.1)

**Files:**
- Create: `src/lib/framing/classify.ts`
- Test: `src/lib/framing/__tests__/classify.test.ts`

**Interfaces:**
- Consumes: `FramingTrack` from Task 1.
- Produces: `classifyLine(expectedEcoOutput?: string | null): FramingTrack`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/framing/__tests__/classify.test.ts
import { describe, it, expect } from 'vitest';
import { classifyLine } from '../classify';

describe('classifyLine (§15.1, ADR-020)', () => {
  it.each(['', '   ', 'N/A', 'n/a', ' N/A '])('classifies %j as RFI', (value) => {
    expect(classifyLine(value)).toBe('RFI');
  });

  it('classifies null and undefined as RFI', () => {
    expect(classifyLine(null)).toBe('RFI');
    expect(classifyLine(undefined)).toBe('RFI');
  });

  it.each(['ECO1', 'ECO2', 'ECO3', ' eco2 '])('classifies %j as RFQ', (value) => {
    expect(classifyLine(value)).toBe('RFQ');
  });

  it('classifies any other non-empty value as RFQ', () => {
    expect(classifyLine('ECO4')).toBe('RFQ');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/framing/__tests__/classify.test.ts`
Expected: FAIL — cannot resolve `../classify`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/framing/classify.ts
import type { FramingTrack } from '../../types/framing';

/**
 * §15.1 (ADR-020) — a parsed line is RFI when `expected_eco_output` is empty or
 * `N/A`; any real value classifies it RFQ. Classification happens once, at
 * upload, and never changes: re-uploading the file is the only way to reclassify.
 */
export function classifyLine(expectedEcoOutput?: string | null): FramingTrack {
  const value = (expectedEcoOutput ?? '').trim();
  if (value === '' || value.toUpperCase() === 'N/A') return 'RFI';
  return 'RFQ';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/framing/__tests__/classify.test.ts && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/framing/classify.ts src/lib/framing/__tests__/classify.test.ts
git commit -m "feat(framing): RFI/RFQ classification per PRD 15.1"
```

---


### Task 7: Framing file parsing (§4.2)

**Files:**
- Create: `src/lib/framing/parseFramingFile.ts`
- Test: `src/lib/framing/__tests__/parseFramingFile.test.ts`

**Interfaces:**
- Consumes: `FramingLine`, `EMPTY_FRAMING_LINE` (Task 1); `assignPlNumbers` (Task 3); `composePlName` (Task 4); `translateOrganType`, `translateEnergy`, `resolveClient`, `normalizeDrivetrain`, `isDroppedRequestType`, `normalizeKey` (Task 5); `classifyLine` (Task 6).
- Produces: `HEADER_ALIASES: Record<string, keyof FramingLine>`; `FramingParseError extends Error`; `selectFramingSheet(sheetNames: string[]): string | null`; `parseFramingMatrix(matrix: unknown[][], fileName: string, existingCodes: readonly string[]): FramingLine[]`; `readFramingWorkbook(buffer: ArrayBuffer): { sheetName: string; matrix: unknown[][] }`; `isXlsxFileName(name: string): boolean`.

Split exactly as `finalReviewXlsx.ts` does: `parseFramingMatrix` is pure over a 2-D matrix and carries all the rules; `readFramingWorkbook` is the only function that touches SheetJS. Tests build their own workbook — no sample file exists in any repo.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/framing/__tests__/parseFramingFile.test.ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  selectFramingSheet, parseFramingMatrix, readFramingWorkbook,
  isXlsxFileName, FramingParseError,
} from '../parseFramingFile';

const HEADERS = [
  'PL Number', 'Request type', 'Customer', 'Client', 'Part type', 'Fuel',
  'Project ranking', 'Alliance code', 'Vehicle code', 'Standard emissions',
  'Activity type', 'Owner N2', '4X2 / 4X4', 'Vehicle Phase', 'Secondary Organ',
  'EXPECTED ECO OUTPUT', 'Start of Project (SP)', 'Techno Group',
];

function row(over: Record<string, unknown> = {}): unknown[] {
  const base: Record<string, unknown> = {
    'PL Number': '', 'Request type': 'Creation', Customer: 'RG', Client: '',
    'Part type': 'Boîte de vitesse', Fuel: 'Essence', 'Project ranking': 'M',
    'Alliance code': 'HR10DDTG2', 'Vehicle code': 'X67', 'Standard emissions': 'E06C',
    'Activity type': 'CPU', 'Owner N2': 'H-DESIGN', '4X2 / 4X4': '4x4',
    'Vehicle Phase': 'PH1', 'Secondary Organ': 'SO', 'EXPECTED ECO OUTPUT': 'ECO2',
    'Start of Project (SP)': '2027-01-15', 'Techno Group': 'Diesel PWT',
  };
  return HEADERS.map((h) => (h in over ? over[h] : base[h]));
}

const matrix = (...rows: unknown[][]) => [HEADERS, ...rows];

describe('isXlsxFileName (§4.1)', () => {
  it.each(['a.xlsx', 'A.XLSX', 'framing file.xlsx'])('accepts %j', (n) => {
    expect(isXlsxFileName(n)).toBe(true);
  });
  it.each(['a.csv', 'a.xls', 'a.xlsm', 'a', 'a.xlsx.txt'])('rejects %j', (n) => {
    expect(isXlsxFileName(n)).toBe(false);
  });
});

describe('selectFramingSheet (§4.2)', () => {
  it('picks the first GWF-prefixed sheet', () => {
    expect(selectFramingSheet(['Data ref', 'GWF 2026', 'Notes'])).toBe('GWF 2026');
  });
  it('matches the GWF prefix case-insensitively', () => {
    expect(selectFramingSheet(['gwf_main'])).toBe('gwf_main');
  });
  it('excludes sheets whose name ends in old', () => {
    expect(selectFramingSheet(['GWF_old', 'GWFOLD', 'GWF new'])).toBe('GWF new');
  });
  it('returns null when only *old sheets match', () => {
    expect(selectFramingSheet(['GWF_old', 'GWF 2025 OLD'])).toBeNull();
  });
  it('returns null when nothing matches', () => {
    expect(selectFramingSheet(['Data ref', 'Sheet1'])).toBeNull();
  });
});

describe('parseFramingMatrix (§4.3)', () => {
  it('translates organ type and energy at upload', () => {
    const [line] = parseFramingMatrix(matrix(row()), 'f.xlsx', []);
    expect(line.organType).toBe('Gearbox');
    expect(line.energy).toBe('Gasoline');
  });

  it('drops Suppression and Closure rows', () => {
    const out = parseFramingMatrix(
      matrix(
        row({ 'Request type': 'Creation', 'PL Number': 'K1' }),
        row({ 'Request type': 'Suppression' }),
        row({ 'Request type': 'Closure' }),
      ),
      'f.xlsx', [],
    );
    expect(out).toHaveLength(1);
    expect(out[0].plNumber).toBe('K1');
  });

  it('resolves client with Customer priority and RG default', () => {
    const [a] = parseFramingMatrix(matrix(row({ Customer: 'Nissan', Client: 'Dacia' })), 'f.xlsx', []);
    expect(a.client).toBe('Nissan');
    const [b] = parseFramingMatrix(matrix(row({ Customer: '', Client: '' })), 'f.xlsx', []);
    expect(b.client).toBe('RG');
  });

  it('normalizes the drivetrain value', () => {
    const [line] = parseFramingMatrix(matrix(row({ '4X2 / 4X4': '4x4' })), 'f.xlsx', []);
    expect(line.drivetrain).toBe('4X4');
  });

  it('generates PL numbers for empty rows and composes PL Name from the result', () => {
    const [line] = parseFramingMatrix(matrix(row({ 'PL Number': '' })), 'f.xlsx', ['AA04']);
    expect(line.plNumber).toBe('AA05');
    expect(line.plName).toBe('AA05 CPU HR10DDTG2 SO E06C X67 4X4 PH1');
  });

  it('classifies each row RFI or RFQ', () => {
    const out = parseFramingMatrix(
      matrix(
        row({ 'EXPECTED ECO OUTPUT': 'ECO2', 'PL Number': 'Q1' }),
        row({ 'EXPECTED ECO OUTPUT': 'N/A', 'PL Number': 'I1' }),
        row({ 'EXPECTED ECO OUTPUT': '', 'PL Number': 'I2' }),
      ),
      'f.xlsx', [],
    );
    expect(out.map((l) => l.track)).toEqual(['RFQ', 'RFI', 'RFI']);
  });

  it('records the upload filename as provenance', () => {
    const [line] = parseFramingMatrix(matrix(row()), 'framing-aug.xlsx', []);
    expect(line.createdByFile).toBe('framing-aug.xlsx');
    expect(line.lastUpdatedByFile).toBe('framing-aug.xlsx');
  });

  it('normalizes headers tolerantly — case, spacing and accents', () => {
    const shifted = [['  pl   NUMBER ', 'REQUEST TYPE'], ['Z9', 'Creation']];
    const [line] = parseFramingMatrix(shifted, 'f.xlsx', []);
    expect(line.plNumber).toBe('Z9');
    expect(line.requestType).toBe('Creation');
  });

  it('ignores unknown columns instead of failing', () => {
    const withJunk = [['PL Number', 'Totally Unknown'], ['Z9', 'whatever']];
    expect(() => parseFramingMatrix(withJunk, 'f.xlsx', [])).not.toThrow();
  });

  it('skips fully blank rows', () => {
    const out = parseFramingMatrix([HEADERS, row(), HEADERS.map(() => '')], 'f.xlsx', []);
    expect(out).toHaveLength(1);
  });

  it('throws when the matrix has no header row', () => {
    expect(() => parseFramingMatrix([], 'f.xlsx', [])).toThrow(FramingParseError);
  });

  it('does not compute Generate-time fields', () => {
    const [line] = parseFramingMatrix(matrix(row()), 'f.xlsx', []);
    expect(line).not.toHaveProperty('engineering');
    expect(line).not.toHaveProperty('estimateType');
    expect(line).not.toHaveProperty('injectionSystem');
    expect(line).not.toHaveProperty('market');
  });

  it('assigns a unique id per parsed line', () => {
    const out = parseFramingMatrix(matrix(row({ 'PL Number': 'A' }), row({ 'PL Number': 'B' })), 'f.xlsx', []);
    expect(new Set(out.map((l) => l.id)).size).toBe(2);
  });
});

describe('readFramingWorkbook (§4.2)', () => {
  function workbook(sheets: Record<string, unknown[][]>): ArrayBuffer {
    const wb = XLSX.utils.book_new();
    for (const [name, aoa] of Object.entries(sheets)) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
    }
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  }

  it('reads the GWF sheet and returns its matrix', () => {
    const buf = workbook({ 'Data ref': [['x']], 'GWF 26': matrix(row()) });
    const { sheetName, matrix: out } = readFramingWorkbook(buf);
    expect(sheetName).toBe('GWF 26');
    expect(out[0]).toContain('PL Number');
  });

  it('throws FramingParseError when no GWF sheet exists', () => {
    const buf = workbook({ 'Data ref': [['x']], GWF_old: matrix(row()) });
    expect(() => readFramingWorkbook(buf)).toThrow(FramingParseError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/framing/__tests__/parseFramingFile.test.ts`
Expected: FAIL — cannot resolve `../parseFramingFile`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/framing/parseFramingFile.ts
import * as XLSX from 'xlsx';
import { EMPTY_FRAMING_LINE, type FramingLine } from '../../types/framing';
import { assignPlNumbers } from './plNumber';
import { composePlName } from './plName';
import { classifyLine } from './classify';
import {
  isDroppedRequestType, normalizeDrivetrain, normalizeKey,
  resolveClient, translateEnergy, translateOrganType,
} from './derive';

export class FramingParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FramingParseError';
  }
}

/** §4.1 — one .xlsx per upload; any other extension is rejected before parsing. */
export function isXlsxFileName(name: string): boolean {
  return /\.xlsx$/i.test((name ?? '').trim());
}

/** §4.2 — first `^GWF.*` sheet, excluding any name ending in `old`. */
export function selectFramingSheet(sheetNames: string[]): string | null {
  return (
    sheetNames.find((raw) => {
      const name = (raw ?? '').trim();
      return /^GWF/i.test(name) && !/old$/i.test(name);
    }) ?? null
  );
}

/**
 * Framing header → FramingLine field. Keys are normalizeKey()-folded, so callers
 * get case-, accent- and whitespace-insensitive matching for free.
 *
 * The PRD names ~35 of the file's ~71 columns; the rest are descriptive and
 * unpersisted. When a real framing file appears, this map is the single place to
 * adjust — nothing else in the parser knows a header string.
 */
const RAW_HEADER_MAP: Record<string, keyof FramingLine> = {
  'PL Number': 'plNumber',
  'Request type': 'requestType',
  'Request description': 'requestDescription',
  'Requester comment': 'requesterComment',
  'Why this Request': 'whyThisRequest',
  Requester: 'requester',
  'CURRENT ECO MILESTONE': 'currentEcoMilestone',
  'EXPECTED ECO OUTPUT': 'expectedEcoOutput',
  'Request date': 'requestDate',
  'HBO Leader': 'hboLeader',
  'RFQ send date': 'rfqSendDate',
  'HBO / RBO RFQ/CMS': 'hboRboRfqCms',
  'Country Cluster': 'countryCluster',
  'Vehicle MA date': 'vehicleMaDate',
  'Guarantee cost': 'guaranteeCost',
  PIMOF: 'pimof',
  '3MIS': 'threeMis',
  'Project Name': 'projectName',
  CPO: 'cpo',
  CPA: 'cpa',
  'CPO Department': 'cpoDepartment',
  'Secondary Organ': 'secondaryOrgan',
  '3rd Organ': 'thirdOrgan',
  '4th Organ': 'fourthOrgan',
  'Other Specifications': 'otherSpecifications',
  'Parent Prog. Line': 'parentPlNumber',
  'Vehicle code': 'vehicleCode',
  'Vehicle Body': 'vehicleBody',
  'Vehicle Phase': 'vehiclePhase',
  Range: 'vehicleRange',
  CMO: 'cmo',
  '4X2 / 4X4': 'drivetrain',
  'Vehicle Factory': 'vehicleFactory',
  'Alliance code': 'allianceCode',
  'Standard emissions': 'standardEmissions',
  'ICE Power kW': 'icePowerKw',
  'ICE Torque Nm': 'iceTorqueNm',
  'Battery capacity': 'batteryCapacity',
  'EE Architecture': 'eeArchitecture',
  'Start of Project (SP)': 'spDate',
  'Pre-contract date (PC)': 'pcDate',
  'Contract date (CO/APR2) CO': 'coDate',
  'Start of Production (SOP)': 'sopDate',
  'MA Date (MA/APR3)MA': 'sopDate',
  'Project ranking': 'projectRanking',
  'Framework comment': 'frameworkComment',
  'Part Factory': 'partFactory',
  Cluster: 'cluster',
  'Techno Group': 'technoGroup',
  '#Protos PFC': 'protosPfc',
  '#Protos VC': 'protosVc',
  '#Protos Organ PT': 'protosOrganPt',
  '#Protos Organ UM': 'protosOrganUm',
  '#Protos EP': 'protosEp',
  'CVC Number': 'cvcNumber',
  'Owner N2': 'ownerN2',
  'Activity type': 'activityType',
  // Sources consumed by derivation rather than stored directly.
  'Part type': 'organType',
  Fuel: 'energy',
};

export const HEADER_ALIASES: Record<string, keyof FramingLine> = Object.fromEntries(
  Object.entries(RAW_HEADER_MAP).map(([header, field]) => [normalizeKey(header), field]),
);

const NUMERIC_FIELDS = new Set<keyof FramingLine>([
  'annualVolumeSop', 'annualVolumeSopPlus1', 'annualVolumeSopPlus2',
  'annualVolumeSopPlus3', 'annualVolumeSopPlus4', 'annualVolumeSopPlus5',
  'annualVolumeSopPlus6', 'icePowerKw', 'iceTorqueNm', 'batteryCapacity',
  'protosPfc', 'protosVc', 'protosOrganPt', 'protosOrganUm', 'protosEp',
]);

const ANNUAL_VOLUME_FIELDS: (keyof FramingLine)[] = [
  'annualVolumeSop', 'annualVolumeSopPlus1', 'annualVolumeSopPlus2',
  'annualVolumeSopPlus3', 'annualVolumeSopPlus4', 'annualVolumeSopPlus5',
  'annualVolumeSopPlus6',
];

/** `Annual volume SOP`, `Annual volume SOP+1` … `+6` map positionally (§5.6.2). */
function annualVolumeField(header: string): keyof FramingLine | null {
  const m = /^annual volume sop(?:\s*\+\s*(\d))?$/.exec(normalizeKey(header));
  if (!m) return null;
  const offset = m[1] ? Number(m[1]) : 0;
  return offset <= 6 ? ANNUAL_VOLUME_FIELDS[offset] : null;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toNumber(value: unknown): number | null {
  const text = toText(value);
  if (text === '') return null;
  const n = Number(text.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * §4.3 — pure parse-and-normalize over a 2-D matrix (row 0 = headers).
 * Runs ONLY the upload-time transforms; `engineering`, `estimateType`,
 * `injectionSystem` and `market` belong to Generate and GPMF export.
 */
export function parseFramingMatrix(
  matrix: unknown[][],
  fileName: string,
  existingCodes: readonly string[],
): FramingLine[] {
  const headerRow = matrix[0];
  if (!headerRow || headerRow.length === 0) {
    throw new FramingParseError('Framing sheet has no header row');
  }

  const columns = headerRow.map((raw) => {
    const header = toText(raw);
    return { header, field: HEADER_ALIASES[normalizeKey(header)] ?? annualVolumeField(header) };
  });

  const staged = matrix.slice(1).flatMap((cells, index) => {
    if (!cells || cells.every((c) => toText(c) === '')) return [];

    const line: FramingLine = { ...EMPTY_FRAMING_LINE };
    let rawCustomer = '';
    let rawClient = '';

    columns.forEach(({ header, field }, col) => {
      const cell = cells[col];
      const normalized = normalizeKey(header);
      if (normalized === 'customer') rawCustomer = toText(cell);
      if (normalized === 'client') rawClient = toText(cell);
      if (!field) return;
      if (NUMERIC_FIELDS.has(field)) {
        (line as Record<string, unknown>)[field] = toNumber(cell);
      } else {
        (line as Record<string, unknown>)[field] = toText(cell);
      }
    });

    // §4.3 — drop before anything else is derived.
    if (isDroppedRequestType(line.requestType)) return [];

    line.id = `ffl-${index}-${Math.random().toString(36).slice(2, 9)}`;
    line.organType = translateOrganType(line.organType);
    line.energy = translateEnergy(line.energy);
    line.client = resolveClient(rawCustomer, rawClient);
    line.drivetrain = normalizeDrivetrain(line.drivetrain);
    line.track = classifyLine(line.expectedEcoOutput);
    line.createdByFile = fileName;
    line.lastUpdatedByFile = fileName;
    return [line];
  });

  // §5.4 then §5.3 — PL Name needs the resolved PL Number.
  return assignPlNumbers(staged, existingCodes).map((line) => ({
    ...line,
    plName: composePlName(line),
  }));
}

/** §4.2 — the only function here that touches SheetJS. */
export function readFramingWorkbook(buffer: ArrayBuffer): {
  sheetName: string;
  matrix: unknown[][];
} {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = selectFramingSheet(wb.SheetNames);
  if (!sheetName) {
    throw new FramingParseError(
      'No GWF* worksheet found (sheets ending in "old" are excluded)',
    );
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: '',
  });
  return { sheetName, matrix };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/framing/__tests__/parseFramingFile.test.ts && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/framing/parseFramingFile.ts src/lib/framing/__tests__/parseFramingFile.test.ts
git commit -m "feat(framing): xlsx parse, sheet selection and header mapping per PRD 4.2"
```

---

### Task 8: The 8-section field schema (§5.6)

**Files:**
- Create: `src/lib/framing/sections.ts`
- Test: `src/lib/framing/__tests__/sections.test.ts`

**Interfaces:**
- Consumes: `FramingLine`, `RefListKey` (Task 1); `FRAMING_REFERENCE` (Task 2).
- Produces: `FieldKind = 'text' | 'number' | 'date' | 'select' | 'derived' | 'parentRef'`; `FramingFieldDef`; `FramingSectionDef`; `FRAMING_SECTIONS: FramingSectionDef[]`; `sectionsForTrack(track: FramingTrack): FramingSectionDef[]`; `allFieldDefs(): FramingFieldDef[]`; `PL_NAME_COMPONENT_FIELDS: Set<keyof FramingLine>`.

`label` on each field is the PRD's own column name — the schema is the label source, not i18n (Global Constraints). Section titles use `labelKey`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/framing/__tests__/sections.test.ts
import { describe, it, expect } from 'vitest';
import { FRAMING_SECTIONS, sectionsForTrack, allFieldDefs, PL_NAME_COMPONENT_FIELDS } from '../sections';
import { FRAMING_REFERENCE } from '../../../fixtures/framingReference';
import { EMPTY_FRAMING_LINE, FRAMING_FORM_FIELD_COUNT } from '../../../types/framing';

describe('FRAMING_SECTIONS (§5.6)', () => {
  it('declares the 8 RFQ sections in PRD order', () => {
    expect(FRAMING_SECTIONS.filter((s) => !s.rfiOnly).map((s) => s.id)).toEqual([
      'plDetails', 'customerRequest', 'vehicleDescription', 'organDescription',
      'scheduleMilestones', 'framework', 'prototypeDetails', 'additionalDetails',
    ]);
  });

  it('totals 66 fields across the RFQ sections', () => {
    const total = FRAMING_SECTIONS.filter((s) => !s.rfiOnly)
      .reduce((n, s) => n + s.fields.length, 0);
    expect(total).toBe(FRAMING_FORM_FIELD_COUNT);
  });

  it('matches the PRD per-section counts', () => {
    const counts = Object.fromEntries(FRAMING_SECTIONS.map((s) => [s.id, s.fields.length]));
    expect(counts).toMatchObject({
      plDetails: 13, customerRequest: 23, vehicleDescription: 7,
      organDescription: 8, scheduleMilestones: 4, framework: 10,
      prototypeDetails: 0, additionalDetails: 1,
    });
  });

  it('keeps Prototype Details empty — the #Protos counts live under Framework', () => {
    const proto = FRAMING_SECTIONS.find((s) => s.id === 'prototypeDetails')!;
    expect(proto.fields).toEqual([]);
    const framework = FRAMING_SECTIONS.find((s) => s.id === 'framework')!;
    expect(framework.fields.map((f) => f.key)).toContain('protosPfc');
    expect(framework.fields.map((f) => f.key)).toContain('protosEp');
  });

  it('references only real FramingLine keys', () => {
    for (const f of allFieldDefs()) {
      expect(EMPTY_FRAMING_LINE).toHaveProperty(f.key);
    }
  });

  it('never repeats a field across sections', () => {
    const keys = allFieldDefs().map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every field a PRD-named label', () => {
    for (const f of allFieldDefs()) expect(f.label.trim()).not.toBe('');
  });

  it('points every select at an existing reference list', () => {
    for (const f of allFieldDefs()) {
      if (f.kind !== 'select') continue;
      expect(f.refList).toBeDefined();
      expect(FRAMING_REFERENCE[f.refList!]).toBeDefined();
    }
  });

  it('marks only plName and parentRanking as derived (§5.6)', () => {
    const derived = allFieldDefs().filter((f) => f.kind === 'derived').map((f) => f.key);
    expect(derived.sort()).toEqual(['parentRanking', 'plName']);
  });

  it('marks expectedEcoOutput read-only (§15.1)', () => {
    const f = allFieldDefs().find((x) => x.key === 'expectedEcoOutput')!;
    expect(f.readOnly).toBe(true);
  });

  it('excludes the Generate-time fields entirely (HIW-463 AC#7)', () => {
    const keys = allFieldDefs().map((f) => String(f.key));
    for (const forbidden of ['engineering', 'estimateType', 'injectionSystem', 'market']) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('uses parentRef for Parent Prog. Line (§5.5)', () => {
    const f = allFieldDefs().find((x) => x.key === 'parentPlNumber')!;
    expect(f.kind).toBe('parentRef');
  });

  it('types the four milestones as dates', () => {
    const milestones = FRAMING_SECTIONS.find((s) => s.id === 'scheduleMilestones')!;
    expect(milestones.fields.map((f) => f.key)).toEqual(['spDate', 'pcDate', 'coDate', 'sopDate']);
    expect(milestones.fields.every((f) => f.kind === 'date')).toBe(true);
  });

  it('types the seven annual volumes as numbers', () => {
    const volumes = allFieldDefs().filter((f) => String(f.key).startsWith('annualVolumeSop'));
    expect(volumes).toHaveLength(7);
    expect(volumes.every((f) => f.kind === 'number')).toBe(true);
  });
});

describe('sectionsForTrack (§15.3)', () => {
  it('gives RFQ the 8 sections', () => {
    expect(sectionsForTrack('RFQ')).toHaveLength(8);
  });

  it('gives RFI a 9th placeholder section with no fields (FF-08)', () => {
    const rfi = sectionsForTrack('RFI');
    expect(rfi).toHaveLength(9);
    expect(rfi[8].rfiOnly).toBe(true);
    expect(rfi[8].fields).toEqual([]);
  });
});

describe('PL_NAME_COMPONENT_FIELDS (§5.3)', () => {
  it('lists every field that triggers a live PL Name recompose', () => {
    expect([...PL_NAME_COMPONENT_FIELDS].sort()).toEqual([
      'activityType', 'allianceCode', 'drivetrain', 'fourthOrgan',
      'otherSpecifications', 'plNumber', 'projectRanking', 'secondaryOrgan',
      'standardEmissions', 'thirdOrgan', 'vehicleCode', 'vehiclePhase',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/framing/__tests__/sections.test.ts`
Expected: FAIL — cannot resolve `../sections`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/framing/sections.ts
import type { FramingLine, FramingTrack, RefListKey } from '../../types/framing';

export type FieldKind = 'text' | 'number' | 'date' | 'select' | 'derived' | 'parentRef';

export interface FramingFieldDef {
  key: keyof FramingLine;
  /** The PRD's own column name. Labels come from the schema, not i18n. */
  label: string;
  kind: FieldKind;
  /** Required when kind === 'select'; keys into FRAMING_REFERENCE. */
  refList?: RefListKey;
  /** §15.1 — expectedEcoOutput is read-only in both tracks. */
  readOnly?: boolean;
}

export interface FramingSectionDef {
  id: string;
  /** i18n key — section titles are translated; field labels are not. */
  labelKey: string;
  fields: FramingFieldDef[];
  /** §15.3 — rendered only on the RFI tab. */
  rfiOnly?: boolean;
}

const t = (key: keyof FramingLine, label: string): FramingFieldDef => ({ key, label, kind: 'text' });
const n = (key: keyof FramingLine, label: string): FramingFieldDef => ({ key, label, kind: 'number' });
const d = (key: keyof FramingLine, label: string): FramingFieldDef => ({ key, label, kind: 'date' });
const s = (key: keyof FramingLine, label: string, refList: RefListKey): FramingFieldDef =>
  ({ key, label, kind: 'select', refList });
const derived = (key: keyof FramingLine, label: string): FramingFieldDef =>
  ({ key, label, kind: 'derived' });

/** PRD §5.6 — the wp5 layout, section order and field order preserved. */
export const FRAMING_SECTIONS: FramingSectionDef[] = [
  {
    id: 'plDetails',
    labelKey: 'framing.section.plDetails',
    fields: [
      t('plNumber', 'PL Number'),
      derived('plName', 'PL Name'),
      t('client', 'Customer'),
      { key: 'parentPlNumber', label: 'Parent Prog. Line', kind: 'parentRef' },
      derived('parentRanking', 'Parent Ranking'),
      t('projectName', 'Project Name'),
      s('cpo', 'CPO', 'cpo'),
      s('cpa', 'CPA', 'cpa'),
      s('cpoDepartment', 'CPO Department', 'cpoDepartment'),
      t('secondaryOrgan', 'Secondary Organ'),
      t('thirdOrgan', '3rd Organ'),
      t('fourthOrgan', '4th Organ'),
      t('otherSpecifications', 'Other Specifications'),
    ],
  },
  {
    id: 'customerRequest',
    labelKey: 'framing.section.customerRequest',
    fields: [
      s('requestType', 'Request type', 'requestType'),
      t('requestDescription', 'Request description'),
      t('requesterComment', 'Requester comment'),
      s('whyThisRequest', 'Why this Request', 'whyThisRequest'),
      t('requester', 'Requester'),
      s('currentEcoMilestone', 'Current ECO Milestone', 'currentEcoMilestone'),
      // §15.1 — drives RFI/RFQ classification, fixed at upload.
      { key: 'expectedEcoOutput', label: 'Expected ECO Output', kind: 'select',
        refList: 'expectedEcoOutput', readOnly: true },
      d('requestDate', 'Request date'),
      t('hboLeader', 'HBO Leader'),
      d('rfqSendDate', 'RFQ send date'),
      s('hboRboRfqCms', 'HBO / RBO RFQ/CMS', 'hboRboRfqCms'),
      s('countryCluster', 'Country Cluster', 'countryCluster'),
      n('annualVolumeSop', 'Annual volume SOP'),
      n('annualVolumeSopPlus1', 'Annual volume SOP+1'),
      n('annualVolumeSopPlus2', 'Annual volume SOP+2'),
      n('annualVolumeSopPlus3', 'Annual volume SOP+3'),
      n('annualVolumeSopPlus4', 'Annual volume SOP+4'),
      n('annualVolumeSopPlus5', 'Annual volume SOP+5'),
      n('annualVolumeSopPlus6', 'Annual volume SOP+6'),
      d('vehicleMaDate', 'Vehicle MA date'),
      t('guaranteeCost', 'Guarantee cost'),
      t('pimof', 'PIMOF'),
      t('threeMis', '3MIS'),
    ],
  },
  {
    id: 'vehicleDescription',
    labelKey: 'framing.section.vehicleDescription',
    fields: [
      t('vehicleCode', 'Vehicle code'),
      t('vehicleBody', 'Vehicle Body'),
      t('vehiclePhase', 'Vehicle Phase'),
      s('vehicleRange', 'Range', 'vehicleRange'),
      s('cmo', 'CMO', 'cmo'),
      s('drivetrain', '4X2 / 4X4', 'drivetrain'),
      t('vehicleFactory', 'Vehicle Factory'),
    ],
  },
  {
    id: 'organDescription',
    labelKey: 'framing.section.organDescription',
    fields: [
      s('organType', 'Part type', 'organType'),
      s('allianceCode', 'Alliance code', 'allianceCode'),
      s('energy', 'Fuel', 'energy'),
      s('standardEmissions', 'Standard emissions', 'standardEmissions'),
      n('icePowerKw', 'ICE Power kW'),
      n('iceTorqueNm', 'ICE Torque Nm'),
      n('batteryCapacity', 'Battery capacity'),
      s('eeArchitecture', 'EE Architecture', 'eeArchitecture'),
    ],
  },
  {
    id: 'scheduleMilestones',
    labelKey: 'framing.section.scheduleMilestones',
    fields: [
      d('spDate', 'Start of Project (SP)'),
      d('pcDate', 'Pre-contract date (PC)'),
      d('coDate', 'Contract date (CO/APR2)'),
      d('sopDate', 'Start of Production (SOP)'),
    ],
  },
  {
    id: 'framework',
    labelKey: 'framing.section.framework',
    fields: [
      s('projectRanking', 'Project ranking', 'projectRanking'),
      t('frameworkComment', 'Framework comment'),
      t('partFactory', 'Part Factory'),
      t('cluster', 'Cluster'),
      s('technoGroup', 'Techno Group', 'technoGroup'),
      n('protosPfc', '#Protos PFC'),
      n('protosVc', '#Protos VC'),
      n('protosOrganPt', '#Protos Organ PT'),
      n('protosOrganUm', '#Protos Organ UM'),
      n('protosEp', '#Protos EP'),
    ],
  },
  {
    // §5.6.7 — empty by design; the #Protos counts stay under Framework,
    // faithful to the wp5 layout.
    id: 'prototypeDetails',
    labelKey: 'framing.section.prototypeDetails',
    fields: [],
  },
  {
    id: 'additionalDetails',
    labelKey: 'framing.section.additionalDetails',
    fields: [t('cvcNumber', 'CVC Number')],
  },
  {
    // §15.3 — RFI-only section; its fields are undefined (FF-08).
    id: 'rfiDetails',
    labelKey: 'framing.section.rfiDetails',
    fields: [],
    rfiOnly: true,
  },
];

/** §15.3 — RFQ gets the 8 shared sections; RFI gets those plus its own. */
export function sectionsForTrack(track: FramingTrack): FramingSectionDef[] {
  return FRAMING_SECTIONS.filter((section) => !section.rfiOnly || track === 'RFI');
}

export function allFieldDefs(): FramingFieldDef[] {
  return FRAMING_SECTIONS.flatMap((section) => section.fields);
}

/** §5.3 — editing any of these recomposes PL Name live. */
export const PL_NAME_COMPONENT_FIELDS = new Set<keyof FramingLine>([
  'plNumber', 'activityType', 'allianceCode', 'secondaryOrgan', 'thirdOrgan',
  'fourthOrgan', 'standardEmissions', 'vehicleCode', 'otherSpecifications',
  'drivetrain', 'vehiclePhase', 'projectRanking',
]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/framing/__tests__/sections.test.ts && npm run typecheck`
Expected: all PASS. The count assertions are the guard against a mistyped section.

- [ ] **Step 5: Commit**

```bash
git add src/lib/framing/sections.ts src/lib/framing/__tests__/sections.test.ts
git commit -m "feat(framing): 8-section field schema per PRD 5.6"
```

---

### Task 9: Seed fixture

**Files:**
- Create: `src/fixtures/framingLines.ts`
- Test: `src/fixtures/__tests__/framingLines.test.ts`

**Interfaces:**
- Consumes: `FramingLine`, `EMPTY_FRAMING_LINE` (Task 1); `composePlName` (Task 4); `classifyLine` (Task 6).
- Produces: `FRAMING_LINES: FramingLine[]` — at least 4 RFQ and 2 RFI rows so both tabs are populated before any upload.

- [ ] **Step 1: Write the failing test**

```ts
// src/fixtures/__tests__/framingLines.test.ts
import { describe, it, expect } from 'vitest';
import { FRAMING_LINES } from '../framingLines';
import { classifyLine } from '../../lib/framing/classify';
import { composePlName } from '../../lib/framing/plName';

describe('FRAMING_LINES seed', () => {
  it('populates both tabs', () => {
    expect(FRAMING_LINES.filter((l) => l.track === 'RFQ').length).toBeGreaterThanOrEqual(4);
    expect(FRAMING_LINES.filter((l) => l.track === 'RFI').length).toBeGreaterThanOrEqual(2);
  });

  it('uses unique PL numbers and ids', () => {
    expect(new Set(FRAMING_LINES.map((l) => l.plNumber)).size).toBe(FRAMING_LINES.length);
    expect(new Set(FRAMING_LINES.map((l) => l.id)).size).toBe(FRAMING_LINES.length);
  });

  it('keeps track consistent with expectedEcoOutput (§15.1)', () => {
    for (const line of FRAMING_LINES) {
      expect(line.track).toBe(classifyLine(line.expectedEcoOutput));
    }
  });

  it('carries a PL Name consistent with §5.3', () => {
    for (const line of FRAMING_LINES) {
      expect(line.plName).toBe(composePlName(line));
    }
  });

  it('includes at least one row of each PL Number family, for §5.4 exercise', () => {
    expect(FRAMING_LINES.some((l) => /^[A-Z]{2}\d{2}$/.test(l.plNumber))).toBe(true);
    expect(FRAMING_LINES.some((l) => /^\d{2}[A-Z]{2}$/.test(l.plNumber))).toBe(true);
  });

  it('includes a parent link so §5.5 is exercised', () => {
    const child = FRAMING_LINES.find((l) => l.parentPlNumber !== '');
    expect(child).toBeDefined();
    expect(FRAMING_LINES.some((l) => l.plNumber === child!.parentPlNumber)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/fixtures/__tests__/framingLines.test.ts`
Expected: FAIL — cannot resolve `../framingLines`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/fixtures/framingLines.ts
import { EMPTY_FRAMING_LINE, type FramingLine } from '../types/framing';
import { composePlName } from '../lib/framing/plName';
import { classifyLine } from '../lib/framing/classify';

const SEED_FILE = 'framing-2026-08.xlsx';

/** Fills provenance, then derives `track` and `plName` so the seed cannot drift. */
function line(id: string, over: Partial<FramingLine>): FramingLine {
  const base: FramingLine = {
    ...EMPTY_FRAMING_LINE,
    id,
    createdByFile: SEED_FILE,
    lastUpdatedByFile: SEED_FILE,
    ...over,
  };
  return { ...base, track: classifyLine(base.expectedEcoOutput), plName: composePlName(base) };
}

export const FRAMING_LINES: FramingLine[] = [
  line('ffl-seed-1', {
    plNumber: 'AA00', client: 'RG', ownerN2: 'H-DESIGN', activityType: 'MBTP',
    projectRanking: 'M', organType: 'Gearbox', energy: 'Diesel',
    allianceCode: 'HR10DDTG2', vehicleCode: 'X67', standardEmissions: 'E06C',
    secondaryOrgan: 'SO1', drivetrain: '4X2', vehiclePhase: 'PH1',
    expectedEcoOutput: 'ECO2', technoGroup: 'Diesel PWT', partFactory: 'BARI (Getrag)',
    cluster: 'CL-01', frameworkComment: 'Baseline gearbox request',
    projectName: 'X67 Gearbox uplift', cpo: 'B. Hernandez', cpa: 'K. Shway',
    cpoDepartment: 'H-Project', requestType: 'Creation', whyThisRequest: 'Regulation',
    currentEcoMilestone: 'ECO1', countryCluster: 'CE01B - Europe Western & German Speaking',
    vehicleRange: 'C', cmo: 'CMF-B', eeArchitecture: 'C1A',
    spDate: '2027-01-11', pcDate: '2027-03-01', coDate: '2027-06-01', sopDate: '2028-09-01',
    annualVolumeSop: 12000, annualVolumeSopPlus1: 18000,
    protosPfc: 3, protosVc: 2, cvcNumber: '2608',
  }),
  line('ffl-seed-2', {
    plNumber: 'AA01', client: 'RG', ownerN2: 'H-SOFTWARE', activityType: 'CPU',
    projectRanking: 'C93W', organType: 'Battery', energy: 'Electric',
    allianceCode: 'AR18DEG2', vehicleCode: 'X82', standardEmissions: 'E07R',
    secondaryOrgan: 'SO2', drivetrain: '4X4', vehiclePhase: 'PH2',
    expectedEcoOutput: 'ECO1', technoGroup: 'PHEV PWT', partFactory: 'Magna Nanchang',
    cluster: 'CL-02', frameworkComment: 'Child line, battery SW',
    parentPlNumber: 'AA00', parentRanking: 'M',
    projectName: 'X82 battery SW', requestType: 'Modification',
    spDate: '2027-02-01', coDate: '2027-07-01', sopDate: '2028-11-01',
  }),
  line('ffl-seed-3', {
    plNumber: '00AA', client: 'Nissan', ownerN2: 'H-TUNING', activityType: 'MBPU',
    projectRanking: 'B', organType: 'Thermal Engine', energy: 'Gasoline',
    allianceCode: 'HR12DDTG1', vehicleCode: 'JX16', standardEmissions: 'E06R',
    drivetrain: '4X2', expectedEcoOutput: 'ECO3', technoGroup: 'Gasoline PWT',
    partFactory: 'Shizuoka', cluster: 'CL-03', frameworkComment: 'Nissan tuning scope',
    projectName: 'JX16 tuning', requestType: 'Creation',
    spDate: '2027-04-01', pcDate: '2027-05-15', coDate: '2027-09-01', sopDate: '2029-01-01',
  }),
  line('ffl-seed-4', {
    plNumber: '01AA', client: 'Dacia', ownerN2: 'H-CUSTOMER', activityType: 'I4I',
    projectRanking: 'GM', organType: 'Electric Engine', energy: 'Hybrid - Gasoline',
    allianceCode: 'HR16DEG2', vehicleCode: 'DX15', standardEmissions: 'E05A',
    drivetrain: '4X4', expectedEcoOutput: 'ECO2', technoGroup: 'HEV PWT',
    partFactory: 'Cordoba', cluster: 'CL-04', frameworkComment: 'Hybrid e-engine',
    projectName: 'DX15 hybrid', requestType: 'Creation',
    spDate: '2027-06-01', pcDate: '2027-08-01', coDate: '2027-11-01', sopDate: '2029-03-01',
  }),
  // §15.1 — empty and N/A both classify RFI.
  line('ffl-seed-5', {
    plNumber: 'AA02', client: 'RG', ownerN2: 'H-DESIGN', activityType: 'R&AE',
    projectRanking: 'M', organType: 'Gearbox', energy: 'Diesel',
    allianceCode: 'M920DDVG2', vehicleCode: 'X67', standardEmissions: 'E06C',
    expectedEcoOutput: 'N/A', requestType: 'Creation',
    projectName: 'Feasibility study — gearbox', frameworkComment: 'RFI only',
  }),
  line('ffl-seed-6', {
    plNumber: '02AA', client: 'Mitsubishi', ownerN2: 'H-SOFTWARE', activityType: 'New Business',
    projectRanking: 'C36W', organType: 'Battery', energy: 'Electric',
    allianceCode: 'BT1AE1', vehicleCode: 'TX26', standardEmissions: 'ELC1',
    expectedEcoOutput: '', requestType: 'Modification',
    projectName: 'Battery info request', frameworkComment: '',
  }),
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/fixtures/__tests__/framingLines.test.ts && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/fixtures/framingLines.ts src/fixtures/__tests__/framingLines.test.ts
git commit -m "feat(framing): seed fixture covering both tracks and both PL families"
```

---

### Task 10: `framingStore` — page state and partial-field Save

**Files:**
- Create: `src/store/framingStore.ts`
- Test: `src/store/__tests__/framingStore.test.ts`

**Interfaces:**
- Consumes: `FramingLine`, `FramingTrack` (Task 1); `FRAMING_LINES` (Task 9); `composePlName` (Task 4); `PL_NAME_COMPONENT_FIELDS` (Task 8); `readFramingWorkbook`, `parseFramingMatrix`, `isXlsxFileName`, `FramingParseError` (Task 7).
- Produces: `useFramingStore` with state `{ lines, edits, dirtyFields, lastUpload }` and actions `ingestRows`, `editField`, `resetLine`, `saveLine`, `saveAll`; plus pure selectors exported for testing — `effectiveLine(state, plNumber)`, `dirtyPlNumbers(state)`, `parentOptions(state, plNumber)`, `buildSavePayload(state, plNumber)`, `linesForTrack(state, track)`.

The two properties this must guarantee, straight from HIW-463 AC#12/#13: a save payload carries **only this session's changed fields for that one line**, and a second save after a second edit carries only the second field.

`parentRanking` is never stored as an edit — it is derived from the chosen parent (§5.5) and recomputed by `effectiveLine`.

- [ ] **Step 1: Write the failing test**

```ts
// src/store/__tests__/framingStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  useFramingStore, effectiveLine, dirtyPlNumbers, parentOptions,
  buildSavePayload, linesForTrack,
} from '../framingStore';

const reset = () => useFramingStore.setState(useFramingStore.getInitialState(), true);

describe('framingStore', () => {
  beforeEach(reset);

  it('seeds from the fixture with no edits and nothing dirty', () => {
    const s = useFramingStore.getState();
    expect(s.lines.length).toBeGreaterThan(0);
    expect(s.edits).toEqual({});
    expect(dirtyPlNumbers(s)).toEqual([]);
  });

  it('splits lines by track (§15)', () => {
    const s = useFramingStore.getState();
    expect(linesForTrack(s, 'RFQ').every((l) => l.track === 'RFQ')).toBe(true);
    expect(linesForTrack(s, 'RFI').every((l) => l.track === 'RFI')).toBe(true);
  });

  it('holds edits in page state without touching the persisted row (ADR-008)', () => {
    useFramingStore.getState().editField('AA00', 'cluster', 'CL-99');
    const s = useFramingStore.getState();
    expect(s.lines.find((l) => l.plNumber === 'AA00')!.cluster).toBe('CL-01');
    expect(effectiveLine(s, 'AA00')!.cluster).toBe('CL-99');
    expect(dirtyPlNumbers(s)).toEqual(['AA00']);
  });

  it('recomposes PL Name live when a component field changes (§5.3)', () => {
    useFramingStore.getState().editField('AA00', 'vehicleCode', 'ZZ99');
    const line = effectiveLine(useFramingStore.getState(), 'AA00')!;
    expect(line.plName).toContain('ZZ99');
    expect(line.plName).not.toContain('X67');
  });

  it('derives parentRanking from the selected parent and clears it (§5.5)', () => {
    const store = useFramingStore.getState();
    store.editField('00AA', 'parentPlNumber', 'AA00');
    expect(effectiveLine(useFramingStore.getState(), '00AA')!.parentRanking).toBe('M');

    useFramingStore.getState().editField('00AA', 'parentPlNumber', '');
    expect(effectiveLine(useFramingStore.getState(), '00AA')!.parentRanking).toBe('');
  });

  it('excludes the row own PL number from parent options (§5.5)', () => {
    const options = parentOptions(useFramingStore.getState(), 'AA00');
    expect(options).not.toContain('AA00');
    expect(options).toContain('AA01');
  });

  it('builds a payload of only the edited fields (ADR-022)', () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA00', 'partFactory', 'ZF');
    const payload = buildSavePayload(useFramingStore.getState(), 'AA00');
    expect(Object.keys(payload).sort()).toEqual(['cluster', 'partFactory', 'plNumber']);
  });

  it('carries only field B on the second save — HIW-463 AC#13', () => {
    useFramingStore.getState().editField('AA00', 'cluster', 'CL-99');
    useFramingStore.getState().saveLine('AA00');
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual([]);

    useFramingStore.getState().editField('AA00', 'partFactory', 'ZF');
    const payload = buildSavePayload(useFramingStore.getState(), 'AA00');
    expect(Object.keys(payload).sort()).toEqual(['partFactory', 'plNumber']);
    expect(payload).not.toHaveProperty('cluster');
  });

  it('persists the saved fields and leaves the rest at their stored value', () => {
    useFramingStore.getState().editField('AA00', 'cluster', 'CL-99');
    useFramingStore.getState().saveLine('AA00');
    const line = useFramingStore.getState().lines.find((l) => l.plNumber === 'AA00')!;
    expect(line.cluster).toBe('CL-99');
    expect(line.partFactory).toBe('BARI (Getrag)');
  });

  it('keeps per-line payloads separate on global save — HIW-463 AC#12', () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-A');
    store.editField('AA01', 'partFactory', 'ZF');
    const s = useFramingStore.getState();
    expect(Object.keys(buildSavePayload(s, 'AA00')).sort()).toEqual(['cluster', 'plNumber']);
    expect(Object.keys(buildSavePayload(s, 'AA01')).sort()).toEqual(['partFactory', 'plNumber']);

    useFramingStore.getState().saveAll();
    const after = useFramingStore.getState();
    expect(dirtyPlNumbers(after)).toEqual([]);
    expect(after.lines.find((l) => l.plNumber === 'AA00')!.cluster).toBe('CL-A');
    expect(after.lines.find((l) => l.plNumber === 'AA01')!.partFactory).toBe('ZF');
  });

  it('persists derived parentRanking on save (§5.5)', () => {
    useFramingStore.getState().editField('00AA', 'parentPlNumber', 'AA00');
    useFramingStore.getState().saveLine('00AA');
    const line = useFramingStore.getState().lines.find((l) => l.plNumber === '00AA')!;
    expect(line.parentPlNumber).toBe('AA00');
    expect(line.parentRanking).toBe('M');
  });

  it('saves rows regardless of completeness — Save is lenient (§8.1)', () => {
    useFramingStore.getState().editField('AA00', 'frameworkComment', '');
    useFramingStore.getState().saveLine('AA00');
    expect(useFramingStore.getState().lines.find((l) => l.plNumber === 'AA00')!.frameworkComment).toBe('');
  });

  it('drops an edit that returns a field to its stored value', () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA00', 'cluster', 'CL-01');
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual([]);
  });

  it('resetLine discards that line edits only', () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    useFramingStore.getState().resetLine('AA00');
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual(['AA01']);
  });

  it('accumulates uploads, upserting on pl_number (§4.1)', () => {
    const before = useFramingStore.getState().lines.length;
    const existing = useFramingStore.getState().lines[0];
    useFramingStore.getState().ingestRows(
      [
        { ...existing, cluster: 'FROM-UPLOAD', lastUpdatedByFile: 'second.xlsx' },
        { ...existing, id: 'new-1', plNumber: 'ZZ98', cluster: 'BRAND-NEW' },
      ],
      'second.xlsx',
    );
    const after = useFramingStore.getState();
    expect(after.lines).toHaveLength(before + 1);
    expect(after.lines.find((l) => l.plNumber === existing.plNumber)!.cluster).toBe('FROM-UPLOAD');
    expect(after.lastUpload?.fileName).toBe('second.xlsx');
  });

  it('never writes project_line — no dataStore import', async () => {
    const src = await import('fs/promises').then((fs) =>
      fs.readFile('src/store/framingStore.ts', 'utf8'));
    expect(src).not.toContain('dataStore');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/framingStore.test.ts`
Expected: FAIL — cannot resolve `../framingStore`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/store/framingStore.ts
import { create } from 'zustand';
import type { FramingLine, FramingTrack } from '../types/framing';
import { FRAMING_LINES } from '../fixtures/framingLines';
import { composePlName } from '../lib/framing/plName';
import { PL_NAME_COMPONENT_FIELDS } from '../lib/framing/sections';

export type FramingFieldKey = keyof FramingLine;
export type FramingEdits = Partial<Record<FramingFieldKey, unknown>>;

export interface UploadSummary {
  fileName: string;
  rfqCount: number;
  rfiCount: number;
}

export interface FramingState {
  /** Persisted rows — the prototype's framing_file_line + rfi_line. */
  lines: FramingLine[];
  /** ADR-008 — page state, keyed by pl_number. Not persisted until Save. */
  edits: Record<string, FramingEdits>;
  /** ADR-022 — field-granular dirty tracking, so a Save payload carries exactly the changes. */
  dirtyFields: Record<string, FramingFieldKey[]>;
  lastUpload: UploadSummary | null;

  ingestRows(rows: FramingLine[], fileName: string): UploadSummary;
  editField(plNumber: string, field: FramingFieldKey, value: unknown): void;
  resetLine(plNumber: string): void;
  saveLine(plNumber: string): void;
  saveAll(): void;
}

/** Fields the user never edits directly — recomputed by effectiveLine. */
const DERIVED_FIELDS = new Set<FramingFieldKey>(['plName', 'parentRanking']);

function findStored(lines: FramingLine[], plNumber: string): FramingLine | undefined {
  return lines.find((l) => l.plNumber === plNumber);
}

/** §5.5 — parentRanking is the selected parent's raw project_ranking, empty with no parent. */
function deriveParentRanking(lines: FramingLine[], parentPlNumber: string): string {
  const parent = (parentPlNumber ?? '').trim();
  if (parent === '') return '';
  return findStored(lines, parent)?.projectRanking ?? '';
}

/** The row as the form shows it: stored values + page-state edits + derived fields. */
export function effectiveLine(
  state: Pick<FramingState, 'lines' | 'edits'>,
  plNumber: string,
): FramingLine | undefined {
  const stored = findStored(state.lines, plNumber);
  if (!stored) return undefined;
  const merged = { ...stored, ...(state.edits[plNumber] ?? {}) } as FramingLine;
  return {
    ...merged,
    parentRanking: deriveParentRanking(state.lines, merged.parentPlNumber),
    plName: composePlName(merged),
  };
}

export function dirtyPlNumbers(state: Pick<FramingState, 'dirtyFields'>): string[] {
  return Object.keys(state.dirtyFields)
    .filter((pl) => (state.dirtyFields[pl] ?? []).length > 0)
    .sort();
}

/** §5.5 — the active cycle's PL numbers, excluding the row's own. */
export function parentOptions(
  state: Pick<FramingState, 'lines'>,
  plNumber: string,
): string[] {
  return state.lines.map((l) => l.plNumber).filter((pl) => pl !== plNumber);
}

/**
 * ADR-022 — only this session's changed fields for this one line, plus `plNumber`
 * to address the row. Never the full row, never a union across lines.
 */
export function buildSavePayload(
  state: Pick<FramingState, 'lines' | 'edits' | 'dirtyFields'>,
  plNumber: string,
): Record<string, unknown> {
  const changed = state.dirtyFields[plNumber] ?? [];
  const merged = effectiveLine(state, plNumber);
  if (!merged || changed.length === 0) return {};

  const payload: Record<string, unknown> = { plNumber };
  for (const field of changed) {
    payload[field as string] = merged[field];
  }
  // §5.5/§8.1 — parentRanking rides along only when the parent itself was submitted.
  if (changed.includes('parentPlNumber')) payload.parentRanking = merged.parentRanking;
  return payload;
}

export function linesForTrack(
  state: Pick<FramingState, 'lines'>,
  track: FramingTrack,
): FramingLine[] {
  return state.lines.filter((l) => l.track === track);
}

const initialState = {
  lines: structuredClone(FRAMING_LINES),
  edits: {} as Record<string, FramingEdits>,
  dirtyFields: {} as Record<string, FramingFieldKey[]>,
  lastUpload: null as UploadSummary | null,
};

export const useFramingStore = create<FramingState>((set, get) => ({
  ...structuredClone(initialState),

  /** §4.1 — uploads accumulate: upsert on pl_number, latest upload wins. */
  ingestRows: (rows, fileName) => {
    set((s) => {
      const byPl = new Map(s.lines.map((l) => [l.plNumber, l]));
      for (const row of rows) {
        const existing = byPl.get(row.plNumber);
        // §15.1 — classification is fixed at upload; a re-upload may reclassify.
        byPl.set(row.plNumber, existing ? { ...existing, ...row, id: existing.id } : row);
      }
      return { lines: [...byPl.values()] };
    });
    const summary: UploadSummary = {
      fileName,
      rfqCount: rows.filter((r) => r.track === 'RFQ').length,
      rfiCount: rows.filter((r) => r.track === 'RFI').length,
    };
    set({ lastUpload: summary });
    return summary;
  },

  editField: (plNumber, field, value) =>
    set((s) => {
      if (DERIVED_FIELDS.has(field)) return s;
      const stored = findStored(s.lines, plNumber);
      if (!stored) return s;

      const nextEdits: FramingEdits = { ...(s.edits[plNumber] ?? {}) };
      const nextDirty = new Set(s.dirtyFields[plNumber] ?? []);

      if (value === stored[field]) {
        // Back to the stored value — no longer a change to submit.
        delete nextEdits[field];
        nextDirty.delete(field);
      } else {
        nextEdits[field] = value;
        nextDirty.add(field);
      }

      return {
        edits: { ...s.edits, [plNumber]: nextEdits },
        dirtyFields: { ...s.dirtyFields, [plNumber]: [...nextDirty] },
      };
    }),

  resetLine: (plNumber) =>
    set((s) => {
      const edits = { ...s.edits };
      const dirtyFields = { ...s.dirtyFields };
      delete edits[plNumber];
      delete dirtyFields[plNumber];
      return { edits, dirtyFields };
    }),

  /** §8 — lenient: completeness never blocks Save; §6 gates Generate instead. */
  saveLine: (plNumber) =>
    set((s) => {
      const changed = s.dirtyFields[plNumber] ?? [];
      if (changed.length === 0) return s;
      const merged = effectiveLine(s, plNumber);
      if (!merged) return s;

      const patch: Partial<FramingLine> = {};
      for (const field of changed) {
        (patch as Record<string, unknown>)[field as string] = merged[field];
      }
      if (changed.includes('parentPlNumber')) patch.parentRanking = merged.parentRanking;
      patch.plName = merged.plName;

      const edits = { ...s.edits };
      const dirtyFields = { ...s.dirtyFields };
      delete edits[plNumber];
      delete dirtyFields[plNumber];

      return {
        lines: s.lines.map((l) => (l.plNumber === plNumber ? { ...l, ...patch } : l)),
        edits,
        dirtyFields,
      };
    }),

  saveAll: () => {
    for (const plNumber of dirtyPlNumbers(get())) get().saveLine(plNumber);
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/__tests__/framingStore.test.ts && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Run the whole suite, then commit**

```bash
npm test
git add src/store/framingStore.ts src/store/__tests__/framingStore.test.ts
git commit -m "feat(framing): framingStore with partial-field save per ADR-022"
```

PR A is complete here. Open the PR before starting Task 11.

---

# PR B — UI

### Task 11: Permissions, nav, route and i18n scaffolding

**Files:**
- Modify: `src/fixtures/roles.ts`, `src/lib/permissions.ts`, `src/App.tsx`
- Modify: `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`
- Create: `src/pages/FramingFilePage.tsx` (shell only — filled in Task 18)
- Test: `src/lib/__tests__/framingPermissions.test.ts`

**Interfaces:**
- Consumes: nothing from PR A.
- Produces: permissions `'view:framing-file' | 'upload:framing-file' | 'edit:framing-file' | 'save:framing-file'` added to the `Permission` union; a `framing-file` entry first in `NAV_ITEMS`; route `/framing-file`; i18n namespace `framing` with `title`, `desc`, `tab.rfq`, `tab.rfi`, `section.*` (9 keys), `upload.*`, `save.*`, `table.*`, `empty.*`.

The i18n namespace covers section titles and chrome only. Field labels come from the Task 8 schema — do not add 66 label keys.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/framingPermissions.test.ts
import { describe, it, expect } from 'vitest';
import { hasPermission, NAV_ITEMS, visibleNavFor } from '../permissions';
import { getT } from '../../i18n/getT';
import { FRAMING_SECTIONS } from '../framing/sections';

describe('Framing File permissions (§2, §2.1)', () => {
  it.each(['Admin', 'PMO', 'CPO'] as const)('lets %s view, edit and save', (role) => {
    expect(hasPermission(role, 'view:framing-file')).toBe(true);
    expect(hasPermission(role, 'edit:framing-file')).toBe(true);
    expect(hasPermission(role, 'save:framing-file')).toBe(true);
  });

  it.each(['Admin', 'PMO'] as const)('lets %s upload', (role) => {
    expect(hasPermission(role, 'upload:framing-file')).toBe(true);
  });

  it('never lets CPO upload', () => {
    expect(hasPermission('CPO', 'upload:framing-file')).toBe(false);
  });

  it.each(['Engineer', 'RCRC'] as const)('gives %s no framing access at all', (role) => {
    expect(hasPermission(role, 'view:framing-file')).toBe(false);
    expect(hasPermission(role, 'edit:framing-file')).toBe(false);
    expect(hasPermission(role, 'save:framing-file')).toBe(false);
    expect(hasPermission(role, 'upload:framing-file')).toBe(false);
  });
});

describe('Framing File navigation', () => {
  it('puts Framing File first — it is the system entry point', () => {
    expect(NAV_ITEMS[0].key).toBe('framing-file');
    expect(NAV_ITEMS[0].path).toBe('/framing-file');
    expect(NAV_ITEMS[0].permission).toBe('view:framing-file');
  });

  it.each(['Admin', 'PMO', 'CPO'] as const)('shows it to %s', (role) => {
    expect(visibleNavFor(role).map((n) => n.key)).toContain('framing-file');
  });

  it.each(['Engineer', 'RCRC'] as const)('hides it from %s', (role) => {
    expect(visibleNavFor(role).map((n) => n.key)).not.toContain('framing-file');
  });
});

describe('Framing File i18n', () => {
  it.each(['en', 'es'] as const)('resolves a title for every section in %s', (lang) => {
    const t = getT(lang);
    for (const section of FRAMING_SECTIONS) {
      expect(t(section.labelKey)).not.toBe(section.labelKey);
    }
  });

  it.each(['en', 'es'] as const)('resolves the page chrome keys in %s', (lang) => {
    const t = getT(lang);
    for (const key of [
      'framing.title', 'framing.desc', 'framing.tab.rfq', 'framing.tab.rfi',
      'framing.upload.label', 'framing.upload.button', 'framing.upload.notXlsx',
      'framing.upload.parseError', 'framing.upload.success',
      'framing.save.line', 'framing.save.all', 'framing.save.done',
      'framing.table.filterPlaceholder', 'framing.empty.title', 'framing.empty.desc',
    ]) {
      expect(t(key)).not.toBe(key);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/framingPermissions.test.ts`
Expected: FAIL — `hasPermission` rejects the unknown permission / `NAV_ITEMS[0].key` is `pre-estimation`.

- [ ] **Step 3: Write minimal implementation**

In `src/fixtures/roles.ts`, extend the `Permission` union and grant per §2:

```ts
export type Permission =
  | 'view:framing-file'
  | 'upload:framing-file'
  | 'edit:framing-file'
  | 'save:framing-file'
  | 'view:pre-estimation'
  // … existing members unchanged
```

Add to `ROLE_PERMISSIONS`: `Admin` and `PMO` each gain all four; `CPO` gains
`'view:framing-file'`, `'edit:framing-file'`, `'save:framing-file'` **but not**
`'upload:framing-file'`; `Engineer` and `RCRC` gain none. Leave every existing entry alone.

In `src/lib/permissions.ts`, prepend the nav entry:

```ts
export const NAV_ITEMS: NavItem[] = [
  { key: 'framing-file', label: 'Framing File', path: '/framing-file', permission: 'view:framing-file' },
  { key: 'pre-estimation', label: 'Pre-Estimation', path: '/pre-estimation', permission: 'view:pre-estimation' },
  // … existing entries unchanged
];
```

In `src/App.tsx`, import `FramingFilePage` and add the route as the first child of the
`AppShell` route:

```tsx
<Route path="/framing-file" element={<FramingFilePage />} />
```

In `src/i18n/types.ts`, add to `Translations`:

```ts
  framing: {
    title: string;
    desc: string;
    tab: { rfq: string; rfi: string };
    section: {
      plDetails: string;
      customerRequest: string;
      vehicleDescription: string;
      organDescription: string;
      scheduleMilestones: string;
      framework: string;
      prototypeDetails: string;
      additionalDetails: string;
      rfiDetails: string;
    };
    upload: {
      label: string; button: string; notXlsx: string;
      parseError: string; success: string; busy: string;
    };
    save: { line: string; all: string; done: string; nothing: string };
    table: { filterPlaceholder: string; selectRow: string };
    empty: { title: string; desc: string };
  };
```

In `src/i18n/en.ts`:

```ts
  framing: {
    title: 'Framing File',
    desc: 'Upload a framing file, review the parsed lines and save your corrections.',
    tab: { rfq: 'RFQ', rfi: 'RFI' },
    section: {
      plDetails: 'PL Details',
      customerRequest: 'Customer Request',
      vehicleDescription: 'Vehicle Description',
      organDescription: 'Organ Description',
      scheduleMilestones: 'Schedule Milestones',
      framework: 'Framework',
      prototypeDetails: 'Prototype Details',
      additionalDetails: 'Additional Details',
      rfiDetails: 'RFI Details',
    },
    upload: {
      label: 'File (.xlsx only)',
      button: 'Upload framing file',
      notXlsx: 'Only .xlsx files are accepted.',
      parseError: 'No GWF worksheet found in this file.',
      success: '{fileName}: {rfq} RFQ and {rfi} RFI lines loaded.',
      busy: 'Parsing…',
    },
    save: {
      line: 'Save line',
      all: 'Save all pending',
      done: '{count} line(s) saved.',
      nothing: 'No pending changes.',
    },
    table: { filterPlaceholder: 'Filter…', selectRow: 'Select a line to review it.' },
    empty: { title: 'No framing lines', desc: 'Upload a framing file to get started.' },
  },
```

In `src/i18n/es.ts`, the same shape in neutral professional Spanish:

```ts
  framing: {
    title: 'Framing File',
    desc: 'Suba un framing file, revise las líneas procesadas y guarde sus correcciones.',
    tab: { rfq: 'RFQ', rfi: 'RFI' },
    section: {
      plDetails: 'Detalles de PL',
      customerRequest: 'Solicitud del cliente',
      vehicleDescription: 'Descripción del vehículo',
      organDescription: 'Descripción del órgano',
      scheduleMilestones: 'Hitos del calendario',
      framework: 'Framework',
      prototypeDetails: 'Detalles de prototipos',
      additionalDetails: 'Detalles adicionales',
      rfiDetails: 'Detalles de RFI',
    },
    upload: {
      label: 'Archivo (solo .xlsx)',
      button: 'Subir framing file',
      notXlsx: 'Solo se aceptan archivos .xlsx.',
      parseError: 'No se encontró ninguna hoja GWF en este archivo.',
      success: '{fileName}: se cargaron {rfq} líneas RFQ y {rfi} RFI.',
      busy: 'Procesando…',
    },
    save: {
      line: 'Guardar línea',
      all: 'Guardar cambios pendientes',
      done: 'Se guardaron {count} línea(s).',
      nothing: 'No hay cambios pendientes.',
    },
    table: { filterPlaceholder: 'Filtrar…', selectRow: 'Seleccione una línea para revisarla.' },
    empty: { title: 'Sin líneas de framing', desc: 'Suba un framing file para comenzar.' },
  },
```

Create the page shell so the route resolves:

```tsx
// src/pages/FramingFilePage.tsx
import { RoleGate } from '../components/shared/RoleGate';
import { useT } from '../i18n/useT';

export function FramingFilePage() {
  return (
    <RoleGate permission="view:framing-file">
      <FramingFileContent />
    </RoleGate>
  );
}

function FramingFileContent() {
  const t = useT();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('framing.title')}</h1>
        <p className="text-sm text-slate-600">{t('framing.desc')}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/framingPermissions.test.ts && npm test && npm run typecheck`
Expected: all PASS. Run the whole suite — `NAV_ITEMS` reordering can break existing nav tests; fix those by index, not by reverting the order.

- [ ] **Step 5: Commit**

```bash
git add src/fixtures/roles.ts src/lib/permissions.ts src/App.tsx src/i18n src/pages/FramingFilePage.tsx src/lib/__tests__/framingPermissions.test.ts
git commit -m "feat(framing): route, nav entry, permissions and i18n namespace"
```

---

### Task 12: Upload control (§4.1)

**Files:**
- Create: `src/components/framing/FramingFileUpload.tsx`
- Test: `src/components/framing/__tests__/FramingFileUpload.test.tsx`

**Interfaces:**
- Consumes: `useFramingStore` (Task 10); `isXlsxFileName`, `readFramingWorkbook`, `parseFramingMatrix`, `FramingParseError` (Task 7); `Button`, `useT`, `useRoleStore`.
- Produces: `<FramingFileUpload />` — self-contained, reads and writes the store directly.

Two acceptance criteria drive the shape: CPO must find **no upload element in the DOM**
(HIW-458 AC#2/#7), and a non-`.xlsx` selection must show an inline rejection **without
invoking the parser** (AC#3/#8).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/framing/__tests__/FramingFileUpload.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import * as XLSX from 'xlsx';
import { FramingFileUpload } from '../FramingFileUpload';
import { useRoleStore } from '../../../store/roleStore';
import { useFramingStore } from '../../../store/framingStore';
import { LangProvider } from '../../../i18n/LangContext';

// Spying on an ES module namespace is unreliable under strict ESM, so the
// "never parsed it" assertion is made against observable state instead: a
// rejected file leaves the store untouched.

function renderUpload() {
  return render(<LangProvider><FramingFileUpload /></LangProvider>);
}

function xlsxFile(sheetName: string, name = 'framing.xlsx'): File {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['PL Number', 'EXPECTED ECO OUTPUT'], ['ZZ50', 'ECO2']]),
    sheetName,
  );
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new File([buf], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('FramingFileUpload (§4.1, HIW-458)', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useRoleStore.setState({ currentRole: 'PMO' });
  });

  it.each(['Admin', 'PMO'] as const)('renders an enabled control for %s', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderUpload();
    expect(screen.getByLabelText(/only/i)).toBeEnabled();
  });

  it('renders nothing at all for CPO — AC#2/#7', () => {
    useRoleStore.setState({ currentRole: 'CPO' });
    const { container } = renderUpload();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('rejects a non-.xlsx file inline and never parses it — AC#3/#8', async () => {
    renderUpload();
    await userEvent.upload(
      screen.getByLabelText(/only/i),
      new File(['a,b'], 'framing.csv', { type: 'text/csv' }),
    );
    expect(await screen.findByText(/only \.xlsx/i)).toBeInTheDocument();
    // Nothing was parsed: the store is untouched and no upload was recorded.
    expect(useFramingStore.getState().lastUpload).toBeNull();
    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
  });

  it('parses a valid GWF file and ingests the rows into the store — AC#4', async () => {
    renderUpload();
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF 2026'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(useFramingStore.getState().lines.some((l) => l.plNumber === 'ZZ50')).toBe(true);
    });
    expect(useFramingStore.getState().lastUpload?.fileName).toBe('framing.xlsx');
  });

  it('surfaces a parse error inline when no GWF sheet exists — AC#5', async () => {
    renderUpload();
    await userEvent.upload(screen.getByLabelText(/only/i), xlsxFile('GWF_old'));
    await userEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(await screen.findByText(/no gwf worksheet/i)).toBeInTheDocument();
  });

  it('keeps the button disabled until a valid file is chosen', () => {
    renderUpload();
    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
  });

  it('renders no readiness or validation indicator', () => {
    renderUpload();
    expect(screen.queryByText(/not ready/i)).toBeNull();
  });

  // Guards the known staleness trap: useRoleStore((s) => s.can) returns a stable
  // function reference and does NOT re-render on role switch. This component must
  // call can() inside the selector, so a live switch to CPO removes the control.
  it('drops the control when the role switches to CPO while mounted', async () => {
    const { container } = renderUpload();
    expect(container.querySelector('input[type="file"]')).not.toBeNull();

    await act(async () => {
      useRoleStore.setState({ currentRole: 'CPO' });
    });
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it('restores the control when the role switches back to PMO', async () => {
    const { container } = renderUpload();
    await act(async () => { useRoleStore.setState({ currentRole: 'CPO' }); });
    await act(async () => { useRoleStore.setState({ currentRole: 'PMO' }); });
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/framing/__tests__/FramingFileUpload.test.tsx`
Expected: FAIL — cannot resolve `../FramingFileUpload`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/framing/FramingFileUpload.tsx
import { useState, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { useRoleStore } from '../../store/roleStore';
import { useFramingStore } from '../../store/framingStore';
import {
  FramingParseError, isXlsxFileName, parseFramingMatrix, readFramingWorkbook,
} from '../../lib/framing/parseFramingFile';

/**
 * §4.1 — one .xlsx per upload, Admin/PMO only. CPO gets NO upload element at all
 * (HIW-458 AC#2): a conditional render, never a disabled control.
 */
export function FramingFileUpload() {
  // Calling can() inside the selector keeps this reactive to role switches.
  const canUpload = useRoleStore((s) => s.can('upload:framing-file'));
  const lines = useFramingStore((s) => s.lines);
  const ingestRows = useFramingStore((s) => s.ingestRows);
  const t = useT();

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!canUpload) return null;

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setNotice(null);
    if (picked && !isXlsxFileName(picked.name)) {
      setFile(null);
      setError(t('framing.upload.notXlsx'));
      return;
    }
    setError(null);
    setFile(picked);
  }

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const { matrix } = readFramingWorkbook(buffer);
      const existingCodes = lines.map((l) => l.plNumber);
      const rows = parseFramingMatrix(matrix, file.name, existingCodes);
      const summary = ingestRows(rows, file.name);
      setNotice(
        t('framing.upload.success', {
          fileName: summary.fileName, rfq: summary.rfqCount, rfi: summary.rfiCount,
        }),
      );
      setFile(null);
    } catch (err) {
      setError(err instanceof FramingParseError ? err.message : t('framing.upload.parseError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500" htmlFor="framing-file-input">
            {t('framing.upload.label')}
          </label>
          <input
            id="framing-file-input"
            type="file"
            accept=".xlsx"
            disabled={busy}
            onChange={handleSelect}
            className="mt-1 text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>
        <Button onClick={handleUpload} disabled={!file || busy}>
          <Upload size={14} /> {busy ? t('framing.upload.busy') : t('framing.upload.button')}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-2 text-sm text-emerald-700">{notice}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/framing/__tests__/FramingFileUpload.test.tsx && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/framing/FramingFileUpload.tsx src/components/framing/__tests__/FramingFileUpload.test.tsx
git commit -m "feat(framing): upload control gated to Admin and PMO"
```

---

### Task 13: Read-only selection table (§7.1, ADR-011)

**Files:**
- Create: `src/components/framing/FramingLineTable.tsx`
- Test: `src/components/framing/__tests__/FramingLineTable.test.tsx`

**Interfaces:**
- Consumes: `FramingLine` (Task 1); `useSortable` from `src/lib/useSortable.ts`; `useT`.
- Produces: `FRAMING_TABLE_COLUMNS: FramingTableColumn[]`; `<FramingLineTable lines selectedPlNumber onSelect />` with `interface Props { lines: FramingLine[]; selectedPlNumber: string | null; onSelect(plNumber: string): void }`.

Columns are the HIW-460 AC#2 minimum: PL Number, PL Name, Organ Type, Energy, Project
Ranking, Client, Métier, SP, PC, CO, SOP. Filter/sort state lives in this component, so
React Router unmounting the page resets it — exactly ADR-011's session+route scope.

**No readiness or validation indicator, and no editable cell** (AC#5/#8).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/framing/__tests__/FramingLineTable.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingLineTable, FRAMING_TABLE_COLUMNS } from '../FramingLineTable';
import { LangProvider } from '../../../i18n/LangContext';
import { EMPTY_FRAMING_LINE, type FramingLine } from '../../../types/framing';

const line = (over: Partial<FramingLine>): FramingLine => ({
  ...EMPTY_FRAMING_LINE, ...over,
});

const LINES = [
  line({ id: '1', plNumber: 'AA01', plName: 'AA01 Alpha', organType: 'Gearbox',
         energy: 'Diesel', projectRanking: 'M', client: 'RG', ownerN2: 'H-DESIGN',
         spDate: '2027-01-11', pcDate: '2027-03-01', coDate: '2027-06-01', sopDate: '2028-09-01' }),
  line({ id: '2', plNumber: 'AA02', plName: 'AA02 Beta', organType: 'Battery',
         energy: 'Electric', projectRanking: 'C93W', client: 'Nissan', ownerN2: 'H-SOFTWARE',
         spDate: '2027-02-01', pcDate: '', coDate: '2027-07-01', sopDate: '2028-11-01' }),
  line({ id: '3', plNumber: 'AB00', plName: 'AB00 Gamma', organType: 'Gearbox',
         energy: 'Gasoline', projectRanking: 'B', client: 'Dacia', ownerN2: 'H-TUNING',
         spDate: '2027-03-01', pcDate: '2027-04-01', coDate: '2027-08-01', sopDate: '2029-01-01' }),
];

const renderTable = (props: Partial<Parameters<typeof FramingLineTable>[0]> = {}) =>
  render(
    <LangProvider>
      <FramingLineTable lines={LINES} selectedPlNumber={null} onSelect={vi.fn()} {...props} />
    </LangProvider>,
  );

describe('FramingLineTable (§7.1, HIW-460)', () => {
  it('renders the AC#2 minimum columns', () => {
    expect(FRAMING_TABLE_COLUMNS.map((c) => c.key)).toEqual([
      'plNumber', 'plName', 'organType', 'energy', 'projectRanking',
      'client', 'ownerN2', 'spDate', 'pcDate', 'coDate', 'sopDate',
    ]);
  });

  it('renders one row per line', () => {
    renderTable();
    expect(screen.getAllByRole('row')).toHaveLength(LINES.length + 1);
  });

  it('exposes no editable control — AC#1/#8', () => {
    const { container } = renderTable();
    const body = container.querySelector('tbody')!;
    expect(body.querySelectorAll('input, select, textarea')).toHaveLength(0);
  });

  it('renders no readiness or validation indicator — AC#5', () => {
    renderTable();
    expect(screen.queryByText(/not ready/i)).toBeNull();
    expect(screen.queryByText(/invalid/i)).toBeNull();
    expect(screen.queryByTestId('readiness')).toBeNull();
  });

  it('calls onSelect with the row PL number — AC#4', async () => {
    const onSelect = vi.fn();
    renderTable({ onSelect });
    await userEvent.click(screen.getByText('AA02 Beta'));
    expect(onSelect).toHaveBeenCalledWith('AA02');
  });

  it('filters by substring on that column only — AC#6', async () => {
    renderTable();
    await userEvent.type(screen.getByTestId('filter-organType'), 'gear');
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(screen.queryByText('AA02 Beta')).toBeNull();
  });

  it('combines filters across columns', async () => {
    renderTable();
    await userEvent.type(screen.getByTestId('filter-organType'), 'gear');
    await userEvent.type(screen.getByTestId('filter-client'), 'dacia');
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(1);
    expect(screen.getByText('AB00 Gamma')).toBeInTheDocument();
  });

  it('sorts ascending then descending then off — AC#6', async () => {
    renderTable();
    const header = screen.getByTestId('sort-plNumber');
    const order = () =>
      screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);

    await userEvent.click(header);
    expect(order()).toEqual(['AA01', 'AA02', 'AB00']);
    await userEvent.click(header);
    expect(order()).toEqual(['AB00', 'AA02', 'AA01']);
    await userEvent.click(header);
    expect(order()).toEqual(['AA01', 'AA02', 'AB00']);
  });

  it('marks the selected row', () => {
    renderTable({ selectedPlNumber: 'AA02' });
    expect(screen.getByTestId('row-AA02')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('row-AA01')).toHaveAttribute('aria-selected', 'false');
  });

  it('renders an empty body without crashing', () => {
    renderTable({ lines: [] });
    expect(screen.getAllByRole('row')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/framing/__tests__/FramingLineTable.test.tsx`
Expected: FAIL — cannot resolve `../FramingLineTable`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/framing/FramingLineTable.tsx
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { FramingLine } from '../../types/framing';
import { useSortable } from '../../lib/useSortable';
import { useT } from '../../i18n/useT';

export interface FramingTableColumn {
  key: keyof FramingLine;
  /** The PRD's own column name — labels come from the schema, not i18n. */
  label: string;
}

/** HIW-460 AC#2 — the minimum column set. */
export const FRAMING_TABLE_COLUMNS: FramingTableColumn[] = [
  { key: 'plNumber', label: 'PL Number' },
  { key: 'plName', label: 'PL Name' },
  { key: 'organType', label: 'Organ Type' },
  { key: 'energy', label: 'Energy' },
  { key: 'projectRanking', label: 'Project Ranking' },
  { key: 'client', label: 'Client' },
  { key: 'ownerN2', label: 'Métier' },
  { key: 'spDate', label: 'SP' },
  { key: 'pcDate', label: 'PC' },
  { key: 'coDate', label: 'CO' },
  { key: 'sopDate', label: 'SOP' },
];

interface Props {
  lines: FramingLine[];
  selectedPlNumber: string | null;
  onSelect(plNumber: string): void;
}

const cell = (line: FramingLine, key: keyof FramingLine): string => String(line[key] ?? '');

/**
 * §7.1 — read-only selection table. No editable cell, and NO readiness or
 * validation indicator: §6 is enforced server-side at Generate (HIW-460 AC#5).
 *
 * Filter/sort state is local to this component, so navigating away unmounts and
 * resets it — ADR-011's session + route scope, for free.
 */
export function FramingLineTable({ lines, selectedPlNumber, onSelect }: Props) {
  const t = useT();
  const [filters, setFilters] = useState<Partial<Record<keyof FramingLine, string>>>({});

  const filtered = useMemo(
    () =>
      lines.filter((line) =>
        FRAMING_TABLE_COLUMNS.every(({ key }) => {
          const needle = (filters[key] ?? '').trim().toLowerCase();
          return needle === '' || cell(line, key).toLowerCase().includes(needle);
        }),
      ),
    [lines, filters],
  );

  const { sorted, requestSort, getSortIcon } = useSortable(filtered);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {FRAMING_TABLE_COLUMNS.map(({ key, label }) => (
              <th key={String(key)} className="px-3 py-2 text-left font-medium">
                <button
                  type="button"
                  data-testid={`sort-${String(key)}`}
                  onClick={() => requestSort(key)}
                  className="flex items-center gap-1 uppercase hover:text-slate-700"
                >
                  {label} <span aria-hidden="true">{getSortIcon(key)}</span>
                </button>
                <input
                  type="text"
                  data-testid={`filter-${String(key)}`}
                  aria-label={`${label} filter`}
                  placeholder={t('framing.table.filterPlaceholder')}
                  value={filters[key] ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-1.5 py-1 text-xs font-normal normal-case"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((line) => {
            const selected = line.plNumber === selectedPlNumber;
            return (
              <tr
                key={line.id || line.plNumber}
                data-testid={`row-${line.plNumber}`}
                aria-selected={selected}
                onClick={() => onSelect(line.plNumber)}
                className={clsx(
                  'cursor-pointer border-t border-slate-100 hover:bg-slate-50',
                  selected && 'bg-sky-50',
                )}
              >
                {FRAMING_TABLE_COLUMNS.map(({ key }) => (
                  <td key={String(key)} className="px-3 py-2.5">{cell(line, key)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/framing/__tests__/FramingLineTable.test.tsx && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/framing/FramingLineTable.tsx src/components/framing/__tests__/FramingLineTable.test.tsx
git commit -m "feat(framing): read-only selection table with per-column filter and sort"
```

---

### Task 14: Field renderer and collapsible section (§7.2)

**Files:**
- Create: `src/components/framing/FramingField.tsx`
- Create: `src/components/framing/FramingFormSection.tsx`
- Test: `src/components/framing/__tests__/FramingField.test.tsx`

**Interfaces:**
- Consumes: `FramingFieldDef`, `FramingSectionDef` (Task 8); `FRAMING_REFERENCE` (Task 2); `FramingLine` (Task 1).
- Produces: `<FramingField def value parentOptions onChange />` with `interface FieldProps { def: FramingFieldDef; value: unknown; parentOptions?: string[]; onChange(field: keyof FramingLine, value: unknown): void }`; `<FramingFormSection section line parentOptions onChange defaultOpen />`.

`parentRef` rendering delegates to `ParentLineSelector` (Task 15), which this task imports.
Build Task 15 first if executing strictly in order, or stub it and let Task 15's test tighten
it — the plan orders 14 before 15 only because 15 needs 14's `onChange` signature.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/framing/__tests__/FramingField.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingField } from '../FramingField';
import { FramingFormSection } from '../FramingFormSection';
import { LangProvider } from '../../../i18n/LangContext';
import { FRAMING_SECTIONS } from '../../../lib/framing/sections';
import { EMPTY_FRAMING_LINE } from '../../../types/framing';

const field = (props: Parameters<typeof FramingField>[0]) =>
  render(<LangProvider><FramingField {...props} /></LangProvider>);

describe('FramingField (§7.2)', () => {
  it('renders a text input that reports edits', async () => {
    const onChange = vi.fn();
    field({ def: { key: 'cluster', label: 'Cluster', kind: 'text' }, value: 'CL-01', onChange });
    const input = screen.getByLabelText('Cluster');
    await userEvent.clear(input);
    await userEvent.type(input, 'X');
    expect(onChange).toHaveBeenLastCalledWith('cluster', 'X');
  });

  it('renders a date picker for milestone fields', () => {
    field({ def: { key: 'spDate', label: 'Start of Project (SP)', kind: 'date' }, value: '2027-01-11', onChange: vi.fn() });
    expect(screen.getByLabelText('Start of Project (SP)')).toHaveAttribute('type', 'date');
  });

  it('renders a numeric input and reports numbers, not strings', async () => {
    const onChange = vi.fn();
    field({ def: { key: 'annualVolumeSop', label: 'Annual volume SOP', kind: 'number' }, value: null, onChange });
    const input = screen.getByLabelText('Annual volume SOP');
    expect(input).toHaveAttribute('type', 'number');
    await userEvent.type(input, '42');
    expect(onChange).toHaveBeenLastCalledWith('annualVolumeSop', 42);
  });

  it('reports an emptied numeric input as null', async () => {
    const onChange = vi.fn();
    field({ def: { key: 'protosPfc', label: '#Protos PFC', kind: 'number' }, value: 3, onChange });
    await userEvent.clear(screen.getByLabelText('#Protos PFC'));
    expect(onChange).toHaveBeenLastCalledWith('protosPfc', null);
  });

  it('renders a dropdown from the reference list, with an empty option', () => {
    field({ def: { key: 'projectRanking', label: 'Project ranking', kind: 'select', refList: 'projectRanking' }, value: 'M', onChange: vi.fn() });
    const select = screen.getByLabelText('Project ranking');
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'C133W' })).toBeInTheDocument();
    expect(select).toHaveValue('M');
  });

  it('renders a derived field as read-only with no input control', () => {
    field({ def: { key: 'plName', label: 'PL Name', kind: 'derived' }, value: 'AA01 Alpha', onChange: vi.fn() });
    expect(screen.getByText('AA01 Alpha')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('disables a readOnly select and never reports a change — §15.1', async () => {
    const onChange = vi.fn();
    field({ def: { key: 'expectedEcoOutput', label: 'Expected ECO Output', kind: 'select', refList: 'expectedEcoOutput', readOnly: true }, value: 'ECO2', onChange });
    const select = screen.getByLabelText('Expected ECO Output');
    expect(select).toBeDisabled();
    await userEvent.click(select);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders no error indicator for any field — HIW-463 AC#9', () => {
    const { container } = field({ def: { key: 'cluster', label: 'Cluster', kind: 'text' }, value: '', onChange: vi.fn() });
    expect(container.querySelector('[data-testid="field-error"]')).toBeNull();
    expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
  });
});

describe('FramingFormSection (§7.2)', () => {
  const plDetails = FRAMING_SECTIONS.find((s) => s.id === 'plDetails')!;

  const section = (over = {}) =>
    render(
      <LangProvider>
        <FramingFormSection
          section={plDetails}
          line={{ ...EMPTY_FRAMING_LINE, plNumber: 'AA01' }}
          parentOptions={['AA02']}
          onChange={vi.fn()}
          defaultOpen
          {...over}
        />
      </LangProvider>,
    );

  it('renders the translated section title', () => {
    section();
    expect(screen.getByRole('button', { name: /PL Details/i })).toBeInTheDocument();
  });

  it('renders every field of the section when open', () => {
    section();
    expect(screen.getByLabelText('PL Number')).toBeInTheDocument();
    expect(screen.getByText('PL Name')).toBeInTheDocument();
  });

  it('collapses and expands', async () => {
    section();
    await userEvent.click(screen.getByRole('button', { name: /PL Details/i }));
    expect(screen.queryByLabelText('PL Number')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /PL Details/i }));
    expect(screen.getByLabelText('PL Number')).toBeInTheDocument();
  });

  it('renders an empty section header with no fields — §5.6.7 and §15.3', () => {
    const proto = FRAMING_SECTIONS.find((s) => s.id === 'prototypeDetails')!;
    section({ section: proto });
    expect(screen.getByRole('button', { name: /Prototype Details/i })).toBeInTheDocument();
  });

  it('renders no section-level error indicator — HIW-463 AC#9', () => {
    const { container } = section();
    expect(container.querySelector('[data-testid="section-error"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/framing/__tests__/FramingField.test.tsx`
Expected: FAIL — cannot resolve `../FramingField`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/framing/FramingField.tsx
import type { FramingLine } from '../../types/framing';
import type { FramingFieldDef } from '../../lib/framing/sections';
import { FRAMING_REFERENCE } from '../../fixtures/framingReference';
import { ParentLineSelector } from './ParentLineSelector';

export interface FieldProps {
  def: FramingFieldDef;
  value: unknown;
  /** §5.5 — supplied only for kind 'parentRef'. */
  parentOptions?: string[];
  onChange(field: keyof FramingLine, value: unknown): void;
}

const INPUT_CLASS =
  'mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500';

/**
 * §7.2 — one field, rendered from its schema definition.
 *
 * Renders NO error indicator and NO readiness state for any field, valid or not:
 * §6 is enforced server-side at Generate (HIW-463 AC#9).
 */
export function FramingField({ def, value, parentOptions, onChange }: FieldProps) {
  const id = `framing-field-${String(def.key)}`;
  const text = value === null || value === undefined ? '' : String(value);

  if (def.kind === 'derived') {
    return (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-500">{def.label}</span>
        <span className="mt-1 rounded-md bg-slate-50 px-2 py-1.5 text-sm text-slate-700">
          {text}
        </span>
      </div>
    );
  }

  if (def.kind === 'parentRef') {
    return (
      <ParentLineSelector
        id={id}
        label={def.label}
        value={text}
        options={parentOptions ?? []}
        onChange={(next) => onChange(def.key, next)}
      />
    );
  }

  const label = (
    <label className="text-xs font-medium text-slate-500" htmlFor={id}>{def.label}</label>
  );

  if (def.kind === 'select') {
    const options = def.refList ? FRAMING_REFERENCE[def.refList] : [];
    return (
      <div className="flex flex-col">
        {label}
        <select
          id={id}
          className={INPUT_CLASS}
          value={text}
          disabled={def.readOnly}
          onChange={(e) => onChange(def.key, e.target.value)}
        >
          <option value="" />
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {label}
      <input
        id={id}
        type={def.kind === 'date' ? 'date' : def.kind === 'number' ? 'number' : 'text'}
        className={INPUT_CLASS}
        value={text}
        disabled={def.readOnly}
        onChange={(e) => {
          const raw = e.target.value;
          if (def.kind !== 'number') {
            onChange(def.key, raw);
            return;
          }
          onChange(def.key, raw.trim() === '' ? null : Number(raw));
        }}
      />
    </div>
  );
}
```

```tsx
// src/components/framing/FramingFormSection.tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { FramingLine } from '../../types/framing';
import type { FramingSectionDef } from '../../lib/framing/sections';
import { useT } from '../../i18n/useT';
import { FramingField } from './FramingField';

interface Props {
  section: FramingSectionDef;
  line: FramingLine;
  parentOptions: string[];
  onChange(field: keyof FramingLine, value: unknown): void;
  defaultOpen?: boolean;
}

/**
 * §7.2 — one collapsible section. Renders no section-level error state
 * (HIW-463 AC#9). An empty `fields` array renders a header only — §5.6.7's
 * Prototype Details and §15.3's RFI placeholder both rely on that.
 */
export function FramingFormSection({ section, line, parentOptions, onChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const t = useT();

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {t(section.labelKey)}
      </button>
      {open && section.fields.length > 0 && (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.fields.map((def) => (
            <FramingField
              key={String(def.key)}
              def={def}
              value={line[def.key]}
              parentOptions={parentOptions}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/framing/__tests__/FramingField.test.tsx && npm run typecheck`
Expected: all PASS (Task 15 must exist first — create it now if executing in strict order).

- [ ] **Step 5: Commit**

```bash
git add src/components/framing/FramingField.tsx src/components/framing/FramingFormSection.tsx src/components/framing/__tests__/FramingField.test.tsx
git commit -m "feat(framing): schema-driven field renderer and collapsible section"
```

---

### Task 15: Parent Prog. Line selector (§5.5)

**Files:**
- Create: `src/components/framing/ParentLineSelector.tsx`
- Test: `src/components/framing/__tests__/ParentLineSelector.test.tsx`

**Interfaces:**
- Consumes: nothing from PR A.
- Produces: `<ParentLineSelector id label value options onChange />` with `interface Props { id: string; label: string; value: string; options: string[]; onChange(next: string): void }`.

The exclusion of the row's own PL number happens in the store selector `parentOptions`
(Task 10), so this component renders whatever it is handed — plus an always-present empty
option, since empty is a valid choice (§5.5).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/framing/__tests__/ParentLineSelector.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ParentLineSelector } from '../ParentLineSelector';

const renderSelector = (over = {}) =>
  render(
    <ParentLineSelector
      id="parent" label="Parent Prog. Line" value="" options={['AA01', 'AA02']}
      onChange={vi.fn()} {...over}
    />,
  );

describe('ParentLineSelector (§5.5, HIW-463 AC#4)', () => {
  it('lists the supplied PL numbers', () => {
    renderSelector();
    expect(screen.getByRole('option', { name: 'AA01' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'AA02' })).toBeInTheDocument();
  });

  it('always offers a selectable empty option — empty is valid', () => {
    renderSelector();
    const empty = screen.getByRole('option', { name: /none/i });
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveValue('');
  });

  it('reports the chosen parent', async () => {
    const onChange = vi.fn();
    renderSelector({ onChange });
    await userEvent.selectOptions(screen.getByLabelText('Parent Prog. Line'), 'AA02');
    expect(onChange).toHaveBeenCalledWith('AA02');
  });

  it('reports clearing the parent as an empty string', async () => {
    const onChange = vi.fn();
    renderSelector({ value: 'AA02', onChange });
    await userEvent.selectOptions(screen.getByLabelText('Parent Prog. Line'), '');
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('reflects the current value', () => {
    renderSelector({ value: 'AA01' });
    expect(screen.getByLabelText('Parent Prog. Line')).toHaveValue('AA01');
  });

  it('renders no error indicator', () => {
    const { container } = renderSelector();
    expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/framing/__tests__/ParentLineSelector.test.tsx`
Expected: FAIL — cannot resolve `../ParentLineSelector`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/framing/ParentLineSelector.tsx
interface Props {
  id: string;
  label: string;
  value: string;
  /** The active cycle's PL numbers, already excluding this row's own (§5.5). */
  options: string[];
  onChange(next: string): void;
}

/**
 * §5.5 — Parent Prog. Line. Constrained to real PL numbers of the cycle, with an
 * empty choice always available: not every line has a parent. Parent Ranking is
 * derived elsewhere (store selector) and never entered here.
 */
export function ParentLineSelector({ id, label, value, options, onChange }: Props) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-slate-500" htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      >
        <option value="">— None —</option>
        {options.map((pl) => (
          <option key={pl} value={pl}>{pl}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/framing/__tests__/ParentLineSelector.test.tsx && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/framing/ParentLineSelector.tsx src/components/framing/__tests__/ParentLineSelector.test.tsx
git commit -m "feat(framing): Parent Prog. Line selector per PRD 5.5"
```

---

### Task 16: Detail form (§7.2, §15.3)

**Files:**
- Create: `src/components/framing/FramingDetailForm.tsx`
- Test: `src/components/framing/__tests__/FramingDetailForm.test.tsx`

**Interfaces:**
- Consumes: `sectionsForTrack` (Task 8); `useFramingStore`, `effectiveLine`, `parentOptions` (Task 10); `FramingFormSection` (Task 14).
- Produces: `<FramingDetailForm plNumber />` with `interface Props { plNumber: string }`.

Reads and writes the store directly, so the page needs to pass only the selected PL number.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/framing/__tests__/FramingDetailForm.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingDetailForm } from '../FramingDetailForm';
import { LangProvider } from '../../../i18n/LangContext';
import { useFramingStore, dirtyPlNumbers } from '../../../store/framingStore';

const renderForm = (plNumber: string) =>
  render(<LangProvider><FramingDetailForm plNumber={plNumber} /></LangProvider>);

describe('FramingDetailForm (§7.2, HIW-463)', () => {
  beforeEach(() => useFramingStore.setState(useFramingStore.getInitialState(), true));

  it('renders the 8 RFQ section headers — AC#1', () => {
    renderForm('AA00');
    for (const title of [
      /PL Details/i, /Customer Request/i, /Vehicle Description/i, /Organ Description/i,
      /Schedule Milestones/i, /Framework/i, /Prototype Details/i, /Additional Details/i,
    ]) {
      expect(screen.getByRole('button', { name: title })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /RFI Details/i })).toBeNull();
  });

  it('adds the RFI-only section on an RFI line — §15.3', () => {
    renderForm('AA02');
    expect(screen.getByRole('button', { name: /RFI Details/i })).toBeInTheDocument();
  });

  it('recomposes PL Name live with no network call — AC#8', async () => {
    renderForm('AA00');
    await userEvent.click(screen.getByRole('button', { name: /Organ Description/i }));
    // Vehicle code lives in Vehicle Description; open it and edit.
    await userEvent.click(screen.getByRole('button', { name: /Vehicle Description/i }));
    const vehicleCode = screen.getByLabelText('Vehicle code');
    await userEvent.clear(vehicleCode);
    await userEvent.type(vehicleCode, 'ZZ99');
    expect(screen.getByText(/ZZ99/)).toBeInTheDocument();
  });

  it('fills and clears Parent Ranking from the chosen parent — AC#5/#6/#20', async () => {
    renderForm('00AA');
    const selector = screen.getByLabelText('Parent Prog. Line');
    await userEvent.selectOptions(selector, 'AA00');
    expect(screen.getByText('Parent Ranking').parentElement).toHaveTextContent('M');
    await userEvent.selectOptions(selector, '');
    expect(screen.getByText('Parent Ranking').parentElement).not.toHaveTextContent('M');
  });

  it('excludes the row own PL number from the parent options — AC#4', () => {
    renderForm('AA00');
    expect(screen.queryByRole('option', { name: 'AA00' })).toBeNull();
    expect(screen.getByRole('option', { name: 'AA01' })).toBeInTheDocument();
  });

  it('renders no input for parentRanking — AC#5', () => {
    renderForm('AA00');
    expect(screen.queryByLabelText('Parent Ranking')).toBeNull();
  });

  it('renders the Generate-time fields nowhere — AC#7', () => {
    renderForm('AA00');
    for (const label of [/^Engineering$/i, /^Estimate type$/i, /^Injection system$/i, /^Market$/i]) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
  });

  it('holds edits in page state, persisting nothing — AC#10', async () => {
    renderForm('AA00');
    await userEvent.click(screen.getByRole('button', { name: /Framework/i }));
    const cluster = screen.getByLabelText('Cluster');
    await userEvent.clear(cluster);
    await userEvent.type(cluster, 'CL-99');
    expect(useFramingStore.getState().lines.find((l) => l.plNumber === 'AA00')!.cluster).toBe('CL-01');
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual(['AA00']);
  });

  it('renders expectedEcoOutput disabled — §15.1', async () => {
    renderForm('AA00');
    await userEvent.click(screen.getByRole('button', { name: /Customer Request/i }));
    expect(screen.getByLabelText('Expected ECO Output')).toBeDisabled();
  });

  it('renders no error indicator or readiness state anywhere — AC#9', async () => {
    const { container } = renderForm('AA00');
    await userEvent.click(screen.getByRole('button', { name: /Framework/i }));
    expect(container.querySelector('[aria-invalid="true"]')).toBeNull();
    expect(container.querySelector('[data-testid="field-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="section-error"]')).toBeNull();
    expect(screen.queryByText(/not ready/i)).toBeNull();
  });

  it('renders nothing for an unknown PL number', () => {
    const { container } = renderForm('DOES-NOT-EXIST');
    expect(container.textContent).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/framing/__tests__/FramingDetailForm.test.tsx`
Expected: FAIL — cannot resolve `../FramingDetailForm`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/framing/FramingDetailForm.tsx
import { useFramingStore, effectiveLine, parentOptions } from '../../store/framingStore';
import { sectionsForTrack } from '../../lib/framing/sections';
import { FramingFormSection } from './FramingFormSection';

interface Props {
  plNumber: string;
}

/**
 * §7.2 — the sectioned detail form. All editing happens here; the table never
 * holds an editable cell. Edits stay in page state until Save (ADR-008).
 *
 * Renders NO validation state of any kind (HIW-463 AC#9).
 */
export function FramingDetailForm({ plNumber }: Props) {
  const lines = useFramingStore((s) => s.lines);
  const edits = useFramingStore((s) => s.edits);
  const editField = useFramingStore((s) => s.editField);

  const line = effectiveLine({ lines, edits }, plNumber);
  if (!line) return null;

  const options = parentOptions({ lines }, plNumber);
  const sections = sectionsForTrack(line.track);

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <FramingFormSection
          key={section.id}
          section={section}
          line={line}
          parentOptions={options}
          onChange={(field, value) => editField(plNumber, field, value)}
          defaultOpen={index === 0}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/framing/__tests__/FramingDetailForm.test.tsx && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/framing/FramingDetailForm.tsx src/components/framing/__tests__/FramingDetailForm.test.tsx
git commit -m "feat(framing): sectioned detail form with live PL Name recompose"
```

---

### Task 17: Save controls (§8.1)

**Files:**
- Create: `src/components/framing/SaveControls.tsx`
- Test: `src/components/framing/__tests__/SaveControls.test.tsx`

**Interfaces:**
- Consumes: `useFramingStore`, `dirtyPlNumbers` (Task 10); `Button`, `useT`, `useRoleStore`.
- Produces: `<SaveControls plNumber />` with `interface Props { plNumber: string | null }`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/framing/__tests__/SaveControls.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SaveControls } from '../SaveControls';
import { LangProvider } from '../../../i18n/LangContext';
import { useFramingStore, dirtyPlNumbers } from '../../../store/framingStore';
import { useRoleStore } from '../../../store/roleStore';

const renderControls = (plNumber: string | null = 'AA00') =>
  render(<LangProvider><SaveControls plNumber={plNumber} /></LangProvider>);

describe('SaveControls (§8.1, HIW-463)', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useRoleStore.setState({ currentRole: 'PMO' });
  });

  it.each(['Admin', 'PMO', 'CPO'] as const)('shows both controls to %s — AC#17', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderControls();
    expect(screen.getByRole('button', { name: /save line/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save all/i })).toBeInTheDocument();
  });

  it('saves only the selected line — AC#11', async () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    renderControls('AA00');
    await userEvent.click(screen.getByRole('button', { name: /save line/i }));

    const after = useFramingStore.getState();
    expect(after.lines.find((l) => l.plNumber === 'AA00')!.cluster).toBe('CL-99');
    expect(after.lines.find((l) => l.plNumber === 'AA01')!.cluster).not.toBe('CL-88');
    expect(dirtyPlNumbers(after)).toEqual(['AA01']);
  });

  it('saves every pending line on global save — AC#12', async () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    renderControls('AA00');
    await userEvent.click(screen.getByRole('button', { name: /save all/i }));
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual([]);
  });

  it('is never disabled by any readiness state — AC#15', async () => {
    useFramingStore.getState().editField('AA00', 'frameworkComment', '');
    renderControls('AA00');
    const button = screen.getByRole('button', { name: /save line/i });
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(useFramingStore.getState().lines.find((l) => l.plNumber === 'AA00')!.frameworkComment).toBe('');
  });

  it('reports how many lines still have unsaved edits — AC#16', async () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    renderControls('AA00');
    expect(screen.getByTestId('framing-dirty-count')).toHaveTextContent('2');
    await userEvent.click(screen.getByRole('button', { name: /save line/i }));
    expect(screen.getByTestId('framing-dirty-count')).toHaveTextContent('1');
  });

  it('shows no consequence dialog — AC#18', async () => {
    useFramingStore.getState().editField('AA00', 'cluster', 'CL-99');
    renderControls('AA00');
    await userEvent.click(screen.getByRole('button', { name: /save line/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('disables the per-line control when nothing is selected or nothing is dirty', () => {
    renderControls(null);
    expect(screen.getByRole('button', { name: /save line/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/framing/__tests__/SaveControls.test.tsx`
Expected: FAIL — cannot resolve `../SaveControls`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/framing/SaveControls.tsx
import { Save } from 'lucide-react';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { useRoleStore } from '../../store/roleStore';
import { useFramingStore, dirtyPlNumbers } from '../../store/framingStore';

interface Props {
  plNumber: string | null;
}

/**
 * §8.1 — individual and global Save. Available to Admin, PMO and CPO; never
 * gated on any readiness state (Save is lenient, §8), and never shows an
 * estimation-consequence dialog (HIW-463 AC#18).
 */
export function SaveControls({ plNumber }: Props) {
  const canSave = useRoleStore((s) => s.can('save:framing-file'));
  const dirtyFields = useFramingStore((s) => s.dirtyFields);
  const saveLine = useFramingStore((s) => s.saveLine);
  const saveAll = useFramingStore((s) => s.saveAll);
  const t = useT();

  if (!canSave) return null;

  const dirty = dirtyPlNumbers({ dirtyFields });
  const lineIsDirty = plNumber !== null && dirty.includes(plNumber);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={!lineIsDirty} onClick={() => plNumber && saveLine(plNumber)}>
        <Save size={14} /> {t('framing.save.line')}
      </Button>
      <Button size="sm" variant="secondary" disabled={dirty.length === 0} onClick={saveAll}>
        <Save size={14} /> {t('framing.save.all')}
      </Button>
      <span data-testid="framing-dirty-count" className="text-xs text-slate-500">
        {dirty.length}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/framing/__tests__/SaveControls.test.tsx && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/framing/SaveControls.tsx src/components/framing/__tests__/SaveControls.test.tsx
git commit -m "feat(framing): individual and global save controls"
```

---

### Task 18: Page with RFQ/RFI tabs (§15, ADR-020)

**Files:**
- Modify: `src/pages/FramingFilePage.tsx`
- Test: `src/pages/__tests__/FramingFilePage.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 12, 13, 16, 17; `useFramingStore`, `linesForTrack` (Task 10); `EmptyState`, `RoleGate`, `useT`.
- Produces: the finished page.

Selecting a tab resets the selected line, since a PL number belongs to exactly one track.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/__tests__/FramingFilePage.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FramingFilePage } from '../FramingFilePage';
import { LangProvider } from '../../i18n/LangContext';
import { useFramingStore } from '../../store/framingStore';
import { useRoleStore } from '../../store/roleStore';

const renderPage = () => render(<LangProvider><FramingFilePage /></LangProvider>);

describe('FramingFilePage (§15, ADR-020)', () => {
  beforeEach(() => {
    useFramingStore.setState(useFramingStore.getInitialState(), true);
    useRoleStore.setState({ currentRole: 'PMO' });
  });

  it.each(['Admin', 'PMO', 'CPO'] as const)('renders the page for %s', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderPage();
    expect(screen.getByRole('heading', { name: /framing file/i })).toBeInTheDocument();
  });

  it.each(['Engineer', 'RCRC'] as const)('blocks %s behind the role gate', (role) => {
    useRoleStore.setState({ currentRole: role });
    renderPage();
    expect(screen.queryByRole('heading', { name: /framing file/i })).toBeNull();
    expect(screen.getByText(/view:framing-file/)).toBeInTheDocument();
  });

  it('shows both tabs, RFQ selected by default', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'RFQ' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'RFI' })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows only that track rows in each tab', async () => {
    renderPage();
    expect(screen.getByTestId('row-AA00')).toBeInTheDocument();
    expect(screen.queryByTestId('row-AA02')).toBeNull();

    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(screen.getByTestId('row-AA02')).toBeInTheDocument();
    expect(screen.queryByTestId('row-AA00')).toBeNull();
  });

  it('opens the detail form on row selection', async () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /PL Details/i })).toBeNull();
    await userEvent.click(screen.getByTestId('row-AA00'));
    expect(screen.getByRole('button', { name: /PL Details/i })).toBeInTheDocument();
  });

  it('clears the selected line when switching tabs', async () => {
    renderPage();
    await userEvent.click(screen.getByTestId('row-AA00'));
    expect(screen.getByRole('button', { name: /PL Details/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'RFI' }));
    expect(screen.queryByRole('button', { name: /PL Details/i })).toBeNull();
  });

  it('shows the upload control to PMO and hides it from CPO', () => {
    renderPage();
    expect(screen.getByLabelText(/only/i)).toBeInTheDocument();
  });

  it('hides the upload control from CPO — HIW-458 AC#2', () => {
    useRoleStore.setState({ currentRole: 'CPO' });
    const { container } = renderPage();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it('keeps filter state across opening and closing the form — ADR-011', async () => {
    renderPage();
    await userEvent.type(screen.getByTestId('filter-organType'), 'gear');
    await userEvent.click(screen.getByTestId('row-AA00'));
    expect(screen.getByTestId('filter-organType')).toHaveValue('gear');
  });

  it('renders an empty state when a track has no lines', async () => {
    useFramingStore.setState({ lines: [] });
    renderPage();
    expect(screen.getByText(/no framing lines/i)).toBeInTheDocument();
  });

  it('renders no readiness indicator anywhere on the page', () => {
    renderPage();
    expect(screen.queryByText(/not ready/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/FramingFilePage.test.tsx`
Expected: FAIL — the Task 11 shell renders no tabs or table.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/pages/FramingFilePage.tsx
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { FramingTrack } from '../types/framing';
import { RoleGate } from '../components/shared/RoleGate';
import { EmptyState } from '../components/shared/EmptyState';
import { FramingFileUpload } from '../components/framing/FramingFileUpload';
import { FramingLineTable } from '../components/framing/FramingLineTable';
import { FramingDetailForm } from '../components/framing/FramingDetailForm';
import { SaveControls } from '../components/framing/SaveControls';
import { useFramingStore, linesForTrack } from '../store/framingStore';
import { useT } from '../i18n/useT';

const TRACKS: FramingTrack[] = ['RFQ', 'RFI'];

export function FramingFilePage() {
  return (
    <RoleGate permission="view:framing-file">
      <FramingFileContent />
    </RoleGate>
  );
}

function FramingFileContent() {
  const lines = useFramingStore((s) => s.lines);
  const t = useT();

  const [track, setTrack] = useState<FramingTrack>('RFQ');
  const [selected, setSelected] = useState<string | null>(null);

  const visible = useMemo(() => linesForTrack({ lines }, track), [lines, track]);

  // A PL number belongs to exactly one track, so switching tabs drops the selection.
  function switchTrack(next: FramingTrack) {
    setTrack(next);
    setSelected(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('framing.title')}</h1>
          <p className="text-sm text-slate-600">{t('framing.desc')}</p>
        </div>
        <SaveControls plNumber={selected} />
      </div>

      <FramingFileUpload />

      <div role="tablist" aria-label={t('framing.title')} className="flex gap-1 border-b border-slate-200">
        {TRACKS.map((candidate) => (
          <button
            key={candidate}
            role="tab"
            type="button"
            aria-selected={track === candidate}
            onClick={() => switchTrack(candidate)}
            className={clsx(
              'px-4 py-2 text-sm font-medium',
              track === candidate
                ? 'border-b-2 border-sky-600 text-sky-700'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t(`framing.tab.${candidate.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title={t('framing.empty.title')} description={t('framing.empty.desc')} />
      ) : (
        <FramingLineTable lines={visible} selectedPlNumber={selected} onSelect={setSelected} />
      )}

      {selected && <FramingDetailForm plNumber={selected} />}
    </div>
  );
}
```

- [ ] **Step 4: Run the whole suite**

Run: `npx vitest run src/pages/__tests__/FramingFilePage.test.tsx && npm test && npm run typecheck && npm run lint`
Expected: all PASS, no lint errors. If a pre-existing nav test broke on the `NAV_ITEMS`
reorder from Task 11, fix the assertion rather than the order.

- [ ] **Step 5: Commit**

```bash
git add src/pages/FramingFilePage.tsx src/pages/__tests__/FramingFilePage.test.tsx
git commit -m "feat(framing): Framing File page with RFQ and RFI tabs"
```

PR B is complete here. Open the PR targeting PR A's branch.

---

## Open items carried by this plan

| # | Item | Handling in this plan |
|---|---|---|
| 1 | PL Name join character — §5.3's `·` is doc notation; `create_gpm:157-174` is authoritative and unread | Single space, isolated in `PL_NAME_SEPARATOR` (Task 4) |
| 2 | `Réducteur` / `Pile à combustible` have no FR→EN mapping in §5.1/§5.2 | Passed through untranslated, asserted by test (Task 5) |
| 3 | POC `Request type` lacks `Suppression`, though §4.3 drops it | POC list reproduced verbatim; the drop rule matches both strings (Tasks 2, 5) |
| 4 | `cpo`/`cpa` need Graph API (§4.2); the prototype has none | Fixture lists, flagged in code comments (Task 2) |
| 5 | RFI-only detail section fields undefined (FF-08) | Placeholder section in the schema (Task 8) |
| 6 | No real framing `.xlsx`; ~36 of ~71 headers unnamed by the PRD | One alias map, tolerant normalization, fixture workbooks in tests (Task 7) |
