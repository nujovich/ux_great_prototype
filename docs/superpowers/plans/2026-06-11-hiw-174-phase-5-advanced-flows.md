# HIW-174 Phase 5 — Advanced Flows + Cosmetics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining HIW-174 findings — multi-line compatible bulk estimation, Copy Estimation by compatibility + Legacy-cycle copy (§12.2), parent-child line relationships with HVT-change alert, PMO read-only gating, and the prototype rename cosmetic.

**Architecture:** Bottom-up, same as Phases 1–4. Each behaviour is extracted into a **pure, exported function** under `src/lib/` (the testable seam — this repo has no `@testing-library/react`, so UI wiring is verified through pure functions and data, never by rendering). The Zustand store delegates to those pure builders; React components stay thin. The SDD Kit source repo (`/home/nujovich/great-sdd-kit/`) gets the net-new Legacy-copy rules as data + pytest, bumped to **v2.1.0** (additive minor), keeping the spec registry the source of truth (brainstorming decision #1).

**Tech Stack:** React 19, Vite, TypeScript, Zustand, Vitest (pure unit tests only), Python SDD Kit (`great-sdd-kit`, git dependency), pytest.

---

## ⚠️ Subagent operating constraints (every task)

These are **non-negotiable** and must be repeated verbatim in every subagent prompt (a stray `git checkout` corrupted branch state in Phase 2):

- **Git:** you may run **only** `git add` and `git commit`. You must **NOT** run `git checkout`, `git switch`, `git reset`, `git branch`, `git stash`, `git rebase`, or `git push`. After committing, run `git log --oneline -1 --format='%H %p %s'` and confirm the parent is the prior HEAD.
- **Work on branch `main` only.** Do not create or switch branches.
- **Tests:** run `npx vitest run` (frontend) from `/home/nujovich/ux_great_prototype`. For SDD tasks run `pytest` from `/home/nujovich/great-sdd-kit`.
- **No RTL:** do not add `@testing-library/react` or render components in tests. Test pure functions and exported data only.
- **tsc:** run `npx tsc --noEmit` before committing UI changes; it must be clean.

---

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `src/lib/bulkSave.ts` (new) | Build per-line `Estimation` records from one shared config applied to N compatible lines | A1 |
| `src/store/dataStore.ts` (modify) | `bulkSetEstimation` action delegating to `buildBulkEstimations` | A1 |
| `src/components/estimation/EstimationPanel.tsx` (modify) | Accept `bulkLines`; header shows all selected names; save applies to all | A2 |
| `src/components/estimation/PreSaveSummaryModal.tsx` (modify) | One annual-breakdown section per bulk line, using each line's own dates | A3 |
| `src/lib/copyCandidates.ts` (new) | Compatibility + user-availability filter for Copy targets | B1 |
| `src/lib/legacyCopy.ts` (new) | §12.2 legacy-cycle merge rules → `inductorSelections` + `customJUs` | B2 |
| `src/fixtures/legacyEstimations.ts` (new) | Historical-cycle estimation fixtures for the Legacy tab | B3 |
| `src/components/estimation/CopyEstimationModal.tsx` (modify) | Compatibility filter + Current/Legacy tabs | B1, B3 |
| `src/lib/relationships.ts` (new) | `getRelatedLineIds`, `checkHvtAttributeChanged` (port of Python spec) | C2 |
| `src/fixtures/relationships.ts` (new) | `LINE_RELATIONSHIPS` + `ORIGINAL_HVT_SNAPSHOTS` | C1 |
| `src/types/index.ts` (modify) | `LineRelationship`, `HvtSnapshot`, `HvtChange` types | C1 |
| `src/components/estimation/RelatedLinesBanner.tsx` (new) | Related lines list + HVT-change warning | C3 |
| `src/fixtures/admin.ts` + `src/i18n/{en,es}.ts` (modify) | Prototype category rename → proto1–4 | E1 |
| `/home/nujovich/great-sdd-kit/great_sdd/specs/pre_estimation_specs.py` (modify) | Legacy-copy rules as data | B4 |
| `/home/nujovich/great-sdd-kit/tests/test_pipeline.py` (modify) | pytest for legacy-copy rules | B4 |

---

# Group A — Multi-line compatible bulk estimation (§5)

**Context:** `checkCompatibility` (`src/lib/compatibility.ts`) and `BulkActionsBar` already block/warn on incompatible selections and disable bulk-estimate when incompatible. The gap: `handleBulkEstimate` in `src/pages/PreEstimationPage.tsx:65-69` only opens the panel for `selectedLineIds[0]`. Saving must apply the **same** inductor/cran/occurrence config to **all** selected compatible lines, each line keeps **its own dates** for the annual breakdown, and the editor header must list **all** selected line names (additional comment).

### Task A1: `buildBulkEstimations` pure builder + store action

**Files:**
- Create: `src/lib/bulkSave.ts`
- Test: `src/lib/__tests__/bulkSave.test.ts`
- Modify: `src/store/dataStore.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/bulkSave.test.ts
import { describe, it, expect } from 'vitest';
import { buildBulkEstimations } from '../bulkSave';
import type { Estimation } from '../../types';

const base: Omit<Estimation, 'lineId'> = {
  inductorSelections: [{ inductorId: 'i1', selectedCranId: 'c1', inductorOccurrence: 1, juOccurrences: [{ juId: 'j1', occurrence: 2, locked: false }] }],
  customJUs: [{ id: 'cu1', name: 'X', variable: 1, fixed: 0, occurrence: 1 }],
  globalOccurrences: 2,
  yearlyBreakdown: [],
  totalDays: 10,
  totalKEuro: 0,
  status: 'Draft',
};

describe('buildBulkEstimations (HIW-174 §5)', () => {
  it('produces one Estimation per line id, each stamped with its own lineId and Draft status', () => {
    const out = buildBulkEstimations(['PL-1', 'PL-2'], base);
    expect(Object.keys(out)).toEqual(['PL-1', 'PL-2']);
    expect(out['PL-1'].lineId).toBe('PL-1');
    expect(out['PL-2'].lineId).toBe('PL-2');
    expect(out['PL-1'].status).toBe('Draft');
  });
  it('shares the same config (selections/customJUs/globalOccurrences/totals) across every line', () => {
    const out = buildBulkEstimations(['PL-1', 'PL-2'], base);
    expect(out['PL-2'].inductorSelections).toEqual(base.inductorSelections);
    expect(out['PL-2'].customJUs).toEqual(base.customJUs);
    expect(out['PL-2'].globalOccurrences).toBe(2);
    expect(out['PL-2'].totalDays).toBe(10);
  });
  it('deep-clones config so mutating one line does not bleed into another', () => {
    const out = buildBulkEstimations(['PL-1', 'PL-2'], base);
    out['PL-1'].inductorSelections[0].juOccurrences[0].occurrence = 99;
    expect(out['PL-2'].inductorSelections[0].juOccurrences[0].occurrence).toBe(2);
  });
  it('returns an empty object for an empty line list', () => {
    expect(buildBulkEstimations([], base)).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/bulkSave.test.ts`
Expected: FAIL — `buildBulkEstimations` not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/bulkSave.ts
/**
 * Pre-Estimation View — Multi-line bulk save (HIW-174 §5).
 *
 * Spec: BR-06/BR-07 (compatibility is checked upstream in checkCompatibility).
 * When several COMPATIBLE lines are estimated together, the same inductor/cran/
 * occurrence configuration is applied to each line. Per §5 each line keeps its
 * OWN dates for the monthly/yearly distribution — that is a presentation concern
 * handled by annualBreakdown(totals, line.spDate, line.durationMonths) in the
 * summary, so this builder only fans the shared config out per line id.
 */
import type { Estimation } from '../types';

export function buildBulkEstimations(
  lineIds: string[],
  base: Omit<Estimation, 'lineId'>,
): Record<string, Estimation> {
  const out: Record<string, Estimation> = {};
  for (const id of lineIds) {
    out[id] = {
      ...structuredClone(base),
      lineId: id,
      status: 'Draft',
    };
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/bulkSave.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the store action**

In `src/store/dataStore.ts`, add to the `DataState` interface (after `copyEstimation`):

```ts
  bulkSetEstimation: (lineIds: string[], base: Omit<Estimation, 'lineId'>) => void;
```

Add the import at the top:

```ts
import { buildBulkEstimations } from '../lib/bulkSave';
```

Add the action implementation (after `setEstimation`):

```ts
  bulkSetEstimation: (lineIds, base) =>
    set((s) => {
      const built = buildBulkEstimations(lineIds, base);
      const estimations = { ...s.estimations, ...built };
      const lines = s.lines.map((l) =>
        built[l.id]
          ? {
              ...l,
              status: 'Draft' as LineStatus,
              estimatedDays: base.totalDays,
              estimatedKEuro: base.totalKEuro,
              lastUpdatedAt: new Date().toISOString(),
            }
          : l,
      );
      return { estimations, lines };
    }),
```

- [ ] **Step 6: Verify tsc + full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/bulkSave.ts src/lib/__tests__/bulkSave.test.ts src/store/dataStore.ts
git commit -m "feat(pev): bulk multi-line estimation builder + store action (HIW-174 §5)"
git log --oneline -1 --format='%H %p %s'
```

---

### Task A2: EstimationPanel accepts `bulkLines` (all names + save-all)

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx`
- Modify: `src/pages/PreEstimationPage.tsx`

**Context:** `handleBulkEstimate` (PreEstimationPage.tsx:65-69) opens the panel for `selectedLineIds[0]`. We pass the full compatible selection as `bulkLines`. The panel still edits a single config, but on Save-as-Draft, if `bulkLines.length > 1`, it persists to all of them via `bulkSetEstimation` and lists all line names in the header.

- [ ] **Step 1: Add the prop to EstimationPanel**

Locate the `Props` interface in `src/components/estimation/EstimationPanel.tsx`. Add:

```ts
  /** When estimating multiple compatible lines at once, all selected lines.
   *  When present and length > 1, Save-as-Draft applies the config to every line. */
  bulkLines?: ProjectLine[];
```

- [ ] **Step 2: Read the store action**

Near the other `useDataStore` selectors at the top of the component body, add:

```ts
  const bulkSetEstimation = useDataStore((s) => s.bulkSetEstimation);
```

- [ ] **Step 3: Show all selected line names in the header**

Find the panel header where the single line's name is rendered (`line.lineName`). Add, directly under it, a multi-line indicator (only when bulk):

```tsx
{bulkLines && bulkLines.length > 1 && (
  <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-brand-700">
    <Layers size={12} />
    <span className="font-medium">{t('bulk.applyingTo', { n: bulkLines.length })}:</span>
    {bulkLines.map((l) => (
      <span key={l.id} className="rounded bg-brand-50 px-1.5 py-0.5">{l.lineName}</span>
    ))}
  </div>
)}
```

Add `Layers` to the existing `lucide-react` import in this file if not already imported.

- [ ] **Step 4: Apply config to all bulk lines on Save-as-Draft**

In `handleSaveDraft`, after the single-line `setEstimation(line.id, est)` call (where `est` is the freshly-built `Estimation`), add:

```ts
    if (bulkLines && bulkLines.length > 1) {
      const { lineId: _omit, ...base } = est;
      bulkSetEstimation(bulkLines.map((l) => l.id), base);
    }
```

(`est` already exists in `handleSaveDraft`; this reuses it. The single `setEstimation` for `line.id` is harmless and overwritten by the bulk call which includes `line.id` only if it is part of `bulkLines` — it always is, since the panel opens on a selected line.)

- [ ] **Step 5: Pass i18n key**

Add to `src/i18n/en.ts` under the `bulk` section: `applyingTo: 'Applying to {n} lines'`. Add to `src/i18n/es.ts`: `applyingTo: 'Aplicando a {n} líneas'`.

- [ ] **Step 6: Wire PreEstimationPage to pass bulkLines**

In `src/pages/PreEstimationPage.tsx`, the `<EstimationPanel>` render gains a `bulkLines` prop fed by the compatible selection. Add a memo near the other memos:

```ts
  const bulkLines = useMemo(
    () => (selectedLines.length > 1 && compatibility.compatible ? selectedLines : undefined),
    [selectedLines, compatibility],
  );
```

Then add `bulkLines={bulkLines}` to the `<EstimationPanel ... />` props.

- [ ] **Step 7: Verify tsc + suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean + green.

- [ ] **Step 8: Commit**

```bash
git add src/components/estimation/EstimationPanel.tsx src/pages/PreEstimationPage.tsx src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(pev): multi-line editor header + save-all to compatible lines (HIW-174 §5)"
git log --oneline -1 --format='%H %p %s'
```

---

### Task A3: PreSaveSummaryModal — one breakdown per bulk line

**Files:**
- Modify: `src/components/estimation/PreSaveSummaryModal.tsx`
- Modify: `src/components/estimation/EstimationPanel.tsx` (pass `bulkLines` into the modal)

**Context:** Phase 4 noted "one summary per line for multi-line save" as a gap. `annualBreakdown(totals, spDate, durationMonths)` already exists in `src/lib/calc.ts`. Each bulk line uses its own `spDate`/`durationMonths`.

- [ ] **Step 1: Add `lines` prop to the modal**

In `PreSaveSummaryModal.tsx`, find the `Props` interface. It currently receives the totals + (single) line dates. Add:

```ts
  /** When saving multiple lines, render one annual-breakdown section per line.
   *  When omitted/length 1, render the single-line breakdown as before. */
  lines?: { id: string; lineName: string; spDate?: string; durationMonths?: number }[];
```

- [ ] **Step 2: Render per-line sections**

In the modal body, where the single annual-breakdown table is rendered, wrap it so that when `lines && lines.length > 1`, it maps over `lines` and renders one titled section each, calling `annualBreakdown(totals, l.spDate, l.durationMonths)` per line:

```tsx
{lines && lines.length > 1 ? (
  lines.map((l) => {
    const rows = annualBreakdown(totals, l.spDate, l.durationMonths);
    return (
      <div key={l.id} className="mb-4">
        <h4 className="mb-1 text-xs font-semibold text-slate-700">{l.lineName}</h4>
        {renderBreakdownTable(rows)}
      </div>
    );
  })
) : (
  renderBreakdownTable(annualBreakdown(totals, singleSpDate, singleDurationMonths))
)}
```

Extract the existing table JSX into a local `renderBreakdownTable(rows: AnnualBreakdownRow[])` helper inside the component (DRY). Import `AnnualBreakdownRow` from `../../lib/calc`. `singleSpDate`/`singleDurationMonths` are the existing single-line date props — keep them.

- [ ] **Step 3: Pass `bulkLines` from EstimationPanel into the modal**

Where `<PreSaveSummaryModal ... />` is rendered in `EstimationPanel.tsx`, add:

```tsx
  lines={bulkLines && bulkLines.length > 1
    ? bulkLines.map((l) => ({ id: l.id, lineName: l.lineName, spDate: l.spDate, durationMonths: l.durationMonths }))
    : undefined}
```

- [ ] **Step 4: Verify tsc + suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean + green. (No new unit test — this is presentation over the already-tested `annualBreakdown`; verify the existing `calc.test.ts` annualBreakdown cases still pass.)

- [ ] **Step 5: Commit**

```bash
git add src/components/estimation/PreSaveSummaryModal.tsx src/components/estimation/EstimationPanel.tsx
git commit -m "feat(pev): pre-save summary renders one annual breakdown per bulk line (HIW-174 §5)"
git log --oneline -1 --format='%H %p %s'
```

---

# Group B — Copy Estimation: compatibility + Legacy cycle (§10, §12.2)

### Task B1: `copyCandidates` — compatibility + user-availability filter

**Files:**
- Create: `src/lib/copyCandidates.ts`
- Test: `src/lib/__tests__/copyCandidates.test.ts`
- Modify: `src/components/estimation/CopyEstimationModal.tsx`

**Context:** Today `CopyEstimationModal` filters by `metier === && cycleId === && status in [To do, Draft]` (lines 21-31). §10 requires: target list shows only **compatible** lines (same Organ Type+Energy+Project Ranking+Injection System, via `checkCompatibility`) **available to the current user** (when the user only sees own lines, restrict to lines assigned to them). Status eligibility (To do/Draft target) stays.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/copyCandidates.test.ts
import { describe, it, expect } from 'vitest';
import { copyCandidates } from '../copyCandidates';
import type { ProjectLine } from '../../types';

const mk = (id: string, over: Partial<ProjectLine> = {}): ProjectLine => ({
  id, project_id: 'P', name: id, metier: 'H-DESIGN', status: 'To do', updated_at: '',
  lineName: id, projectName: 'P', assignedEngineerId: 'eng-1',
  estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: 'PMO', lastUpdatedAt: '',
  cycleId: 'cyc-1', organType: 'Thermal Engine', energyFuelType: 'Gasoline',
  projectRanking: 'Mother', injectionSystem: 'Direct', ...over,
} as ProjectLine);

const source = mk('PL-SRC');

describe('copyCandidates (HIW-174 §10)', () => {
  it('excludes the source line itself', () => {
    const out = copyCandidates([source, mk('PL-A')], source, { ownOnly: false, activeEngineerId: null });
    expect(out.map((l) => l.id)).toEqual(['PL-A']);
  });
  it('keeps only compatible lines (same Organ/Energy/Ranking/Injection)', () => {
    const incompatible = mk('PL-B', { organType: 'Electric Motor' });
    const out = copyCandidates([mk('PL-A'), incompatible], source, { ownOnly: false, activeEngineerId: null });
    expect(out.map((l) => l.id)).toEqual(['PL-A']);
  });
  it('keeps only To do / Draft targets', () => {
    const sent = mk('PL-C', { status: 'Sent' });
    const out = copyCandidates([mk('PL-A'), sent], source, { ownOnly: false, activeEngineerId: null });
    expect(out.map((l) => l.id)).toEqual(['PL-A']);
  });
  it('when ownOnly, keeps only lines assigned to the active engineer', () => {
    const mine = mk('PL-A', { assignedEngineerId: 'eng-1' });
    const other = mk('PL-D', { assignedEngineerId: 'eng-9' });
    const out = copyCandidates([mine, other], source, { ownOnly: true, activeEngineerId: 'eng-1' });
    expect(out.map((l) => l.id)).toEqual(['PL-A']);
  });
  it('treats null vs value as incompatible (BR-07)', () => {
    const nullInj = mk('PL-E', { injectionSystem: null });
    const out = copyCandidates([nullInj], source, { ownOnly: false, activeEngineerId: null });
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/copyCandidates.test.ts`
Expected: FAIL — `copyCandidates` not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/copyCandidates.ts
/**
 * Pre-Estimation View — Copy Estimation target filtering (HIW-174 §10).
 *
 * A line is a valid copy target when it is:
 *   1. not the source line,
 *   2. compatible with the source (same Organ Type + Energy + Project Ranking +
 *      Injection System, per checkCompatibility / BR-06/BR-07),
 *   3. in a status that can receive an estimate (To do or Draft),
 *   4. available to the current user (when ownOnly, assigned to activeEngineerId).
 */
import type { ProjectLine } from '../types';
import { checkCompatibility } from './compatibility';

export interface CopyCandidateOpts {
  ownOnly: boolean;
  activeEngineerId: string | null;
}

const COPYABLE_STATUSES = new Set(['To do', 'Draft']);

export function copyCandidates(
  lines: ProjectLine[],
  source: ProjectLine,
  opts: CopyCandidateOpts,
): ProjectLine[] {
  return lines.filter((l) => {
    if (l.id === source.id) return false;
    if (!COPYABLE_STATUSES.has(l.status)) return false;
    if (opts.ownOnly && l.assignedEngineerId !== opts.activeEngineerId) return false;
    return checkCompatibility([source, l]).compatible;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/copyCandidates.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire into CopyEstimationModal**

In `src/components/estimation/CopyEstimationModal.tsx`, replace the `candidates` memo (lines 21-31) with a call to `copyCandidates`, reading role context:

```tsx
import { copyCandidates } from '../../lib/copyCandidates';
import { useRoleStore } from '../../store/roleStore';
// ...
  const can = useRoleStore((s) => s.can);
  const activeEngineerId = useRoleStore((s) => s.activeEngineerId);
  const candidates = useMemo(
    () => copyCandidates(lines, sourceLine, { ownOnly: can('view:own-lines-only'), activeEngineerId }),
    [lines, sourceLine, can, activeEngineerId],
  );
```

Update the subtitle text from métier-based to compatibility-based: change `t('copy.subtitle', { metier: sourceLine.metier })` usage — set `copy.subtitle` in `src/i18n/en.ts` to `'Showing lines compatible with {id} (same Organ Type, Energy, Ranking & Injection System).'` and in `es.ts` to the Spanish equivalent, and pass `{ id: sourceLine.id }` instead of `{ metier: ... }`.

- [ ] **Step 6: Verify tsc + suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean + green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/copyCandidates.ts src/lib/__tests__/copyCandidates.test.ts src/components/estimation/CopyEstimationModal.tsx src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(pev): Copy Estimation filters targets by compatibility + user availability (HIW-174 §10)"
git log --oneline -1 --format='%H %p %s'
```

---

### Task B2: `legacyCopy` — §12.2 legacy-cycle merge rules

**Files:**
- Create: `src/lib/legacyCopy.ts`
- Test: `src/lib/__tests__/legacyCopy.test.ts`

**Context (§12.2 — five rules):** copying from a **historical** estimation into the **current** workload standard:
1. **Unchanged JU** (same `juId`, same `variable` & `fixed`) → copy as-is (keep historical occurrence).
2. **Coefficients changed** (same `juId`, different `variable`/`fixed`) → apply **current** coefficients and **recalculate occurrence** to preserve the historical total: `occ = current.variable > 0 ? max(0, (historicalTotal - current.fixed) / current.variable) : 0`, where `historicalTotal = hist.variable * hist.occurrence + hist.fixed`.
3. **Orphaned JU** (in historical, absent from current workload) → copy as a **Custom JU**.
4. **New JU under a historical inductor** (in current workload's inductor but absent from historical) → add with **occurrence 0**.
5. **New inductor** (in current workload, not referenced by any historical JU) → **not** auto-added.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/legacyCopy.test.ts
import { describe, it, expect } from 'vitest';
import { mergeLegacyEstimation, type LegacyJU } from '../legacyCopy';
import type { PrototypeInductor } from '../../types';

const ju = (id: string, variable: number, fixed: number, occurrence: number, unit = 'man_day') =>
  ({ id, name: id, long_name: id, variable, fixed, unit_type: unit, occurrence, occurrence_locked: false, custom: false, metier: 'H-DESIGN' });

// Current workload: inductor I1 with JUs j1 (changed coeffs), j2 (unchanged), j4 (new JU); inductor I2 (new inductor)
const current: PrototypeInductor[] = [
  { id: 'I1', name: 'I1', category: 'C', crans: [{ id: 'cr1', name: 'cr1', jus: [ju('j1', 4, 1, 0), ju('j2', 2, 0, 0), ju('j4', 1, 0, 0)] }] },
  { id: 'I2', name: 'I2', category: 'C', crans: [{ id: 'cr2', name: 'cr2', jus: [ju('j5', 3, 0, 0)] }] },
];

// Historical estimation: j1 (coeffs differ: was 2/0), j2 (same 2/0), j3 (orphan — not in current)
const historical: LegacyJU[] = [
  { juId: 'j1', inductorId: 'I1', cranId: 'cr1', variable: 2, fixed: 0, occurrence: 5 }, // total = 10
  { juId: 'j2', inductorId: 'I1', cranId: 'cr1', variable: 2, fixed: 0, occurrence: 3 },
  { juId: 'j3', inductorId: 'I1', cranId: 'cr1', variable: 1, fixed: 0, occurrence: 4 },
];

describe('mergeLegacyEstimation (HIW-174 §12.2)', () => {
  const out = mergeLegacyEstimation(historical, current);
  const sel = out.inductorSelections.find((s) => s.inductorId === 'I1')!;
  const occOf = (id: string) => sel.juOccurrences.find((o) => o.juId === id)?.occurrence;

  it('rule 1 — unchanged JU keeps historical occurrence', () => {
    expect(occOf('j2')).toBe(3);
  });
  it('rule 2 — changed coefficients recalc occurrence to preserve historical total', () => {
    // historical total j1 = 2*5+0 = 10; current 4/1 → (10-1)/4 = 2.25
    expect(occOf('j1')).toBeCloseTo(2.25, 5);
  });
  it('rule 3 — orphaned JU becomes a Custom JU', () => {
    const cj = out.customJUs.find((c) => c.name.includes('j3'));
    expect(cj).toBeDefined();
    expect(cj!.variable).toBe(1);
    expect(cj!.occurrence).toBe(4);
  });
  it('rule 4 — new JU under a historical inductor is added with occurrence 0', () => {
    expect(occOf('j4')).toBe(0);
  });
  it('rule 5 — new inductor absent from history is NOT auto-added', () => {
    expect(out.inductorSelections.find((s) => s.inductorId === 'I2')).toBeUndefined();
  });
  it('selects the cran referenced by the historical JUs', () => {
    expect(sel.selectedCranId).toBe('cr1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/legacyCopy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/legacyCopy.ts
/**
 * Pre-Estimation View — Copy from Legacy Cycle (HIW-174 §12.2).
 *
 * Merges a historical-cycle estimation into the CURRENT workload standard:
 *  1. Unchanged JU (same coeffs)         → keep historical occurrence.
 *  2. Coefficients changed               → apply current coeffs, recalc occurrence
 *                                           to preserve the historical total.
 *  3. Orphaned JU (gone from current)    → copy as a Custom JU.
 *  4. New JU under a historical inductor → add with occurrence 0.
 *  5. New inductor (no historical JU)    → NOT auto-added.
 */
import type { InductorSelection, CustomJU, JUOccurrence, PrototypeInductor } from '../types';

export interface LegacyJU {
  juId: string;
  inductorId: string;
  cranId: string;
  variable: number;
  fixed: number;
  occurrence: number;
}

export interface LegacyCopyResult {
  inductorSelections: InductorSelection[];
  customJUs: CustomJU[];
}

export function mergeLegacyEstimation(
  historical: LegacyJU[],
  current: PrototypeInductor[],
): LegacyCopyResult {
  // Index current JUs by id for coefficient comparison and existence checks.
  const currentJU = new Map<string, { variable: number; fixed: number; inductorId: string; cranId: string }>();
  for (const ind of current) {
    for (const cran of ind.crans) {
      for (const ju of cran.jus) {
        currentJU.set(ju.id, { variable: ju.variable ?? 0, fixed: ju.fixed ?? 0, inductorId: ind.id, cranId: cran.id });
      }
    }
  }

  // Group historical JUs by the inductor they belonged to.
  const byInductor = new Map<string, { cranId: string; jus: JUOccurrence[] }>();
  const customJUs: CustomJU[] = [];

  for (const h of historical) {
    const cur = currentJU.get(h.juId);
    if (!cur) {
      // Rule 3 — orphaned JU → Custom JU.
      customJUs.push({
        id: `legacy-${h.juId}`,
        name: `${h.juId} (legacy)`,
        variable: h.variable,
        fixed: h.fixed,
        occurrence: h.occurrence,
      });
      continue;
    }
    let occurrence: number;
    const coeffsChanged = cur.variable !== h.variable || cur.fixed !== h.fixed;
    if (!coeffsChanged) {
      occurrence = h.occurrence; // Rule 1
    } else {
      // Rule 2 — preserve historical total under current coefficients.
      const historicalTotal = h.variable * h.occurrence + h.fixed;
      occurrence = cur.variable > 0 ? Math.max(0, (historicalTotal - cur.fixed) / cur.variable) : 0;
    }
    const bucket = byInductor.get(cur.inductorId) ?? { cranId: cur.cranId, jus: [] };
    bucket.jus.push({ juId: h.juId, occurrence, locked: false });
    byInductor.set(cur.inductorId, bucket);
  }

  // Rule 4 — for every inductor we touched, add its remaining current JUs at occurrence 0.
  // Rule 5 — inductors not touched are skipped entirely (never added).
  const inductorSelections: InductorSelection[] = [];
  for (const [inductorId, bucket] of byInductor) {
    const seen = new Set(bucket.jus.map((j) => j.juId));
    const ind = current.find((i) => i.id === inductorId);
    const cran = ind?.crans.find((c) => c.id === bucket.cranId);
    for (const ju of cran?.jus ?? []) {
      if (!seen.has(ju.id)) bucket.jus.push({ juId: ju.id, occurrence: 0, locked: false });
    }
    inductorSelections.push({
      inductorId,
      selectedCranId: bucket.cranId,
      inductorOccurrence: 1,
      juOccurrences: bucket.jus,
    });
  }

  return { inductorSelections, customJUs };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/legacyCopy.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/legacyCopy.ts src/lib/__tests__/legacyCopy.test.ts
git commit -m "feat(pev): legacy-cycle copy merge rules §12.2 (HIW-174)"
git log --oneline -1 --format='%H %p %s'
```

---

### Task B3: Legacy fixtures + Current/Legacy tabs in CopyEstimationModal

**Files:**
- Create: `src/fixtures/legacyEstimations.ts`
- Modify: `src/components/estimation/CopyEstimationModal.tsx`
- Modify: `src/store/dataStore.ts` (a `copyFromLegacy` action)
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`

**Context:** Add a second tab to the modal. The **Current cycle** tab keeps the compatibility-based copy from B1. The **Legacy cycle** tab lists historical estimations (from `LEGACY_ESTIMATIONS`) and, on confirm, builds a Draft estimation for the source line via `mergeLegacyEstimation` against the current `INDUCTORS` workload.

- [ ] **Step 1: Create the legacy fixtures**

```ts
// src/fixtures/legacyEstimations.ts
/**
 * Historical-cycle estimations for the Copy-from-Legacy tab (HIW-174 §12.2).
 * Each entry is a prior-cycle estimation a user can pull forward into the current
 * workload standard. Keyed by a synthetic legacy id; `label` is what the UI lists.
 */
import type { LegacyJU } from '../lib/legacyCopy';

export interface LegacyEstimation {
  id: string;
  label: string;
  cycleName: string;
  jus: LegacyJU[];
}

export const LEGACY_ESTIMATIONS: LegacyEstimation[] = [
  {
    id: 'leg-1',
    label: 'Auth API refactor (2025 H2)',
    cycleName: '2025 H2',
    jus: [
      { juId: 'ju-api-dev', inductorId: 'ind-api', cranId: 'cran-api-simple', variable: 2, fixed: 0.5, occurrence: 4 },
      { juId: 'ju-api-test', inductorId: 'ind-api', cranId: 'cran-api-simple', variable: 1, fixed: 0.25, occurrence: 4 },
      { juId: 'ju-legacy-orphan', inductorId: 'ind-api', cranId: 'cran-api-simple', variable: 1.5, fixed: 0, occurrence: 2 },
    ],
  },
];
```

> **Note for implementer:** before finalizing, open `src/fixtures/inductors.ts` and align the `juId`/`inductorId`/`cranId` values above with **real** ids from the current `INDUCTORS` fixture so that rules 1/2/4 hit real JUs and at least one id (`ju-legacy-orphan`) is intentionally absent (rule 3). Adjust the literal ids to match; keep one orphan.

- [ ] **Step 2: Add `copyFromLegacy` store action**

In `src/store/dataStore.ts`, add to `DataState`:

```ts
  copyFromLegacy: (targetLineId: string, inductorSelections: InductorSelection[], customJUs: CustomJU[]) => void;
```

Import `InductorSelection, CustomJU` in the existing type import line. Implement:

```ts
  copyFromLegacy: (targetLineId, inductorSelections, customJUs) =>
    set((s) => {
      const est: Estimation = {
        lineId: targetLineId,
        inductorSelections,
        customJUs,
        globalOccurrences: 1,
        yearlyBreakdown: [],
        totalDays: 0,
        totalKEuro: 0,
        status: 'Draft',
      };
      return {
        estimations: { ...s.estimations, [targetLineId]: est },
        lines: s.lines.map((l) =>
          l.id === targetLineId ? { ...l, status: 'Draft' as LineStatus, lastUpdatedAt: new Date().toISOString() } : l,
        ),
      };
    }),
```

(`totalDays` left 0 here — the panel recomputes totals from selections when opened, consistent with how `calcEstimationTotals` is the single source of truth; the user reviews & re-saves.)

- [ ] **Step 3: Add tabs to the modal**

In `CopyEstimationModal.tsx`, add tab state and a Legacy panel. Near the top of the component:

```tsx
import { LEGACY_ESTIMATIONS } from '../../fixtures/legacyEstimations';
import { mergeLegacyEstimation } from '../../lib/legacyCopy';
import { INDUCTORS } from '../../fixtures/inductors';
// ...
  const copyFromLegacy = useDataStore((s) => s.copyFromLegacy);
  const [tab, setTab] = useState<'current' | 'legacy'>('current');
  const [legacyId, setLegacyId] = useState<string | null>(null);
```

Render a two-button tab strip above the table:

```tsx
<div className="mb-3 flex gap-1 border-b border-slate-200">
  <button
    className={clsx('px-3 py-1.5 text-sm', tab === 'current' ? 'border-b-2 border-brand-600 font-medium text-brand-700' : 'text-slate-500')}
    onClick={() => setTab('current')}
  >{t('copy.tabCurrent')}</button>
  <button
    className={clsx('px-3 py-1.5 text-sm', tab === 'legacy' ? 'border-b-2 border-brand-600 font-medium text-brand-700' : 'text-slate-500')}
    onClick={() => setTab('legacy')}
  >{t('copy.tabLegacy')}</button>
</div>
```

(Add `import { clsx } from 'clsx';` if missing.)

When `tab === 'legacy'`, render a radio list of `LEGACY_ESTIMATIONS` (id, label, cycleName) bound to `legacyId`. Keep the existing candidates table under `tab === 'current'`.

- [ ] **Step 4: Branch the confirm handler**

Replace `handleConfirm` so it honours the active tab:

```tsx
function handleConfirm() {
  if (tab === 'current') {
    copyEstimation(sourceLine.id, selected);
    pushToast(t('copy.toastCopied', { n: selected.length }), 'success');
  } else {
    const leg = LEGACY_ESTIMATIONS.find((l) => l.id === legacyId);
    if (!leg) return;
    const { inductorSelections, customJUs } = mergeLegacyEstimation(leg.jus, INDUCTORS);
    copyFromLegacy(sourceLine.id, inductorSelections, customJUs);
    pushToast(t('copy.toastLegacyCopied', { label: leg.label }), 'success');
  }
  onClose();
}
```

Update the footer confirm button `disabled` to: `tab === 'current' ? selected.length === 0 : !legacyId`.

- [ ] **Step 5: i18n keys**

Add to `en.ts` `copy`: `tabCurrent: 'Current cycle'`, `tabLegacy: 'Legacy cycle'`, `toastLegacyCopied: 'Copied legacy estimation "{label}" as Draft'`. Add Spanish equivalents to `es.ts`.

- [ ] **Step 6: Verify tsc + suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean + green.

- [ ] **Step 7: Commit**

```bash
git add src/fixtures/legacyEstimations.ts src/store/dataStore.ts src/components/estimation/CopyEstimationModal.tsx src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(pev): Copy-from-Legacy-cycle tab wired to §12.2 merge (HIW-174)"
git log --oneline -1 --format='%H %p %s'
```

---

### Task B4: SDD spec — legacy-copy rules as data + pytest (v2.1.0)

**Files (SDD source repo `/home/nujovich/great-sdd-kit/`):**
- Modify: `great_sdd/specs/pre_estimation_specs.py`
- Modify: `tests/test_pipeline.py`
- Modify: `package.json`, `CHANGELOG.md`

**Context:** §12.2 has no representation in the spec registry yet. Per decision #1 the spec is the source of truth — encode the five rules as a documented pure function with pytest, mirroring the TS `mergeLegacyEstimation`. This is additive → **minor** bump v2.0.0 → v2.1.0.

- [ ] **Step 1: Add the failing pytest**

Append to `/home/nujovich/great-sdd-kit/tests/test_pipeline.py`:

```python
def test_legacy_copy_rules():
    from great_sdd.specs.pre_estimation_specs import merge_legacy_estimation
    current = {
        "j1": {"variable": 4.0, "fixed": 1.0, "inductor_id": "I1"},
        "j2": {"variable": 2.0, "fixed": 0.0, "inductor_id": "I1"},
        "j4": {"variable": 1.0, "fixed": 0.0, "inductor_id": "I1"},
        "j5": {"variable": 3.0, "fixed": 0.0, "inductor_id": "I2"},
    }
    historical = [
        {"ju_id": "j1", "variable": 2.0, "fixed": 0.0, "occurrence": 5.0},  # changed coeffs, total 10
        {"ju_id": "j2", "variable": 2.0, "fixed": 0.0, "occurrence": 3.0},  # unchanged
        {"ju_id": "j3", "variable": 1.0, "fixed": 0.0, "occurrence": 4.0},  # orphan
    ]
    out = merge_legacy_estimation(historical, current)
    occ = {o["ju_id"]: o["occurrence"] for o in out["job_units"]}
    assert occ["j2"] == 3.0                       # rule 1
    assert abs(occ["j1"] - 2.25) < 1e-9           # rule 2: (10-1)/4
    assert occ["j4"] == 0.0                        # rule 4
    assert "j5" not in occ                         # rule 5: new inductor not added
    assert any(c["ju_id"] == "j3" for c in out["custom_jus"])  # rule 3
```

Run: `cd /home/nujovich/great-sdd-kit && pytest tests/test_pipeline.py::test_legacy_copy_rules -v`
Expected: FAIL — `merge_legacy_estimation` not found.

- [ ] **Step 2: Implement the spec function**

Append to `great_sdd/specs/pre_estimation_specs.py` (after the parent-child section):

```python
# ──────────────────────────────────────────────
# 12.2 Copy from Legacy Cycle
# ──────────────────────────────────────────────
def merge_legacy_estimation(historical: list[dict], current: dict[str, dict]) -> dict:
    """Merge a historical-cycle estimation into the current workload standard (§12.2).

    Rules:
      1. Unchanged JU (same variable & fixed)  -> keep historical occurrence.
      2. Coefficients changed                  -> apply current coeffs, recalc occurrence
                                                   to preserve historical total.
      3. Orphaned JU (absent from current)     -> emit as a custom JU.
      4. New JU under a touched inductor        -> add with occurrence 0.
      5. New inductor (no historical JU)        -> not auto-added.
    """
    job_units: list[dict] = []
    custom_jus: list[dict] = []
    touched_inductors: set[str] = set()
    seen_ju: set[str] = set()

    for h in historical:
        cur = current.get(h["ju_id"])
        if cur is None:
            custom_jus.append({"ju_id": h["ju_id"], "variable": h["variable"],
                               "fixed": h["fixed"], "occurrence": h["occurrence"]})
            continue
        changed = cur["variable"] != h["variable"] or cur["fixed"] != h["fixed"]
        if not changed:
            occ = h["occurrence"]
        else:
            historical_total = h["variable"] * h["occurrence"] + h["fixed"]
            occ = max(0.0, (historical_total - cur["fixed"]) / cur["variable"]) if cur["variable"] > 0 else 0.0
        job_units.append({"ju_id": h["ju_id"], "occurrence": occ})
        seen_ju.add(h["ju_id"])
        touched_inductors.add(cur["inductor_id"])

    # Rule 4: fill remaining JUs of touched inductors at occurrence 0.
    for ju_id, meta in current.items():
        if meta["inductor_id"] in touched_inductors and ju_id not in seen_ju:
            job_units.append({"ju_id": ju_id, "occurrence": 0.0})
            seen_ju.add(ju_id)

    return {"job_units": job_units, "custom_jus": custom_jus}
```

Run: `cd /home/nujovich/great-sdd-kit && pytest tests/test_pipeline.py::test_legacy_copy_rules -v`
Expected: PASS.

- [ ] **Step 3: Full pytest must stay green**

Run: `cd /home/nujovich/great-sdd-kit && pytest tests/ -v`
Expected: all pass.

- [ ] **Step 4: Bump version + changelog**

Edit `/home/nujovich/great-sdd-kit/package.json` `"version"` → `"2.1.0"`. Add a `## 2.1.0` entry to `CHANGELOG.md`: "Add §12.2 legacy-cycle copy merge rules (`merge_legacy_estimation`) + pytest."

- [ ] **Step 5: Commit (SDD repo)**

```bash
cd /home/nujovich/great-sdd-kit
git add great_sdd/specs/pre_estimation_specs.py tests/test_pipeline.py package.json CHANGELOG.md
git commit -m "feat: §12.2 legacy-cycle copy merge rules + pytest (v2.1.0) [HIW-174]"
git log --oneline -1 --format='%H %p %s'
```

> **Tag/push/reinstall are deferred to the phase boundary** and done by the lead (not the subagent), per the git-safety constraint. The TS implementation (B2) is the live artifact for the prototype; the spec keeps the registry coherent.

---

# Group C — Parent-child line relationships + HVT-change alert (§5b)

### Task C1: Types + relationship/snapshot fixtures

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/fixtures/relationships.ts`

- [ ] **Step 1: Add types**

Append to `src/types/index.ts`:

```ts
// ── Parent-Child Line Relationships (HIW-174 §5b) ─────────
export interface LineRelationship {
  parentLineId: string;
  childLineId: string;
  relationshipType: 'parent_child' | 'sibling';
}

/** Snapshot of the HVT-monitored attributes of a line as last seen by the estimator. */
export interface HvtSnapshot {
  organType?: string;
  energyFuelType?: string;
  projectRanking?: string;
  injectionSystem?: string | null;
  spDate?: string;
  allianceCode?: string;
  vehicleCode?: string;
  standardEmissions?: string;
  client?: string;
  market?: string;
}

export interface HvtChange {
  lineId: string;
  fields: Record<string, { old: unknown; new: unknown }>;
}
```

- [ ] **Step 2: Create fixtures**

```ts
// src/fixtures/relationships.ts
/**
 * Parent-child relationships + original HVT snapshots (HIW-174 §5b).
 * The snapshot for PL-002 is intentionally STALE (different injectionSystem) so the
 * HVT-change alert fires when PL-001's editor lists PL-002 as a related line.
 */
import type { LineRelationship, HvtSnapshot } from '../types';

export const LINE_RELATIONSHIPS: LineRelationship[] = [
  { parentLineId: 'PL-001', childLineId: 'PL-002', relationshipType: 'parent_child' },
];

/** Original HVT attributes per line as last acknowledged by the estimator. */
export const ORIGINAL_HVT_SNAPSHOTS: Record<string, HvtSnapshot> = {
  // PL-002's live injectionSystem differs from this snapshot → change detected.
  'PL-002': {
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Indirect Injection', spDate: '2026-02-01',
    allianceCode: 'ALL-002', vehicleCode: 'VEH-C02', client: 'Nissan', market: 'LATAM',
  },
};
```

> **Note for implementer:** confirm the live `PL-002` fixture in `src/fixtures/projectLines.ts` still has `injectionSystem: 'Direct Injection'` so the snapshot above (`Indirect Injection`) genuinely differs. If the live value changed, pick any one differing field to keep the alert demonstrable.

- [ ] **Step 3: Verify tsc**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/fixtures/relationships.ts
git commit -m "feat(pev): line-relationship + HVT-snapshot types and fixtures (HIW-174 §5b)"
git log --oneline -1 --format='%H %p %s'
```

---

### Task C2: `relationships.ts` — getRelatedLineIds + checkHvtAttributeChanged

**Files:**
- Create: `src/lib/relationships.ts`
- Test: `src/lib/__tests__/relationships.test.ts`

**Context:** Port the Python spec (`get_related_line_ids`, `check_hvt_attribute_changed`, `pre_estimation_specs.py:225-263`). Monitored fields map: `organType, energyFuelType, projectRanking, injectionSystem, spDate, allianceCode, vehicleCode, standardEmissions, client, market`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/relationships.test.ts
import { describe, it, expect } from 'vitest';
import { getRelatedLineIds, checkHvtAttributeChanged } from '../relationships';
import type { LineRelationship, HvtSnapshot, ProjectLine } from '../../types';

const rels: LineRelationship[] = [
  { parentLineId: 'A', childLineId: 'B', relationshipType: 'parent_child' },
  { parentLineId: 'A', childLineId: 'C', relationshipType: 'parent_child' },
];

describe('getRelatedLineIds (HIW-174 §5b)', () => {
  it('returns children when given the parent', () => {
    expect(getRelatedLineIds('A', rels).sort()).toEqual(['B', 'C']);
  });
  it('returns the parent when given a child', () => {
    expect(getRelatedLineIds('B', rels)).toEqual(['A']);
  });
  it('returns empty for an unrelated line', () => {
    expect(getRelatedLineIds('Z', rels)).toEqual([]);
  });
});

const line = (over: Partial<ProjectLine>): ProjectLine =>
  ({ id: 'B', injectionSystem: 'Direct', client: 'Renault', ...over } as ProjectLine);

describe('checkHvtAttributeChanged (HIW-174 §5b)', () => {
  it('returns null when nothing changed', () => {
    const snap: HvtSnapshot = { injectionSystem: 'Direct', client: 'Renault' };
    expect(checkHvtAttributeChanged(line({}), snap)).toBeNull();
  });
  it('reports changed fields with old/new values', () => {
    const snap: HvtSnapshot = { injectionSystem: 'Indirect', client: 'Renault' };
    const res = checkHvtAttributeChanged(line({}), snap);
    expect(res).not.toBeNull();
    expect(res!.lineId).toBe('B');
    expect(res!.fields.injectionSystem).toEqual({ old: 'Indirect', new: 'Direct' });
    expect(res!.fields.client).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/relationships.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/relationships.ts
/**
 * Pre-Estimation View — Parent-child line relationships (HIW-174 §5b).
 * Port of get_related_line_ids / check_hvt_attribute_changed from the SDD spec
 * (pre_estimation_specs.py). HVT-monitored fields use the TS ProjectLine names.
 */
import type { LineRelationship, HvtSnapshot, HvtChange, ProjectLine } from '../types';

export function getRelatedLineIds(lineId: string, relationships: LineRelationship[]): string[] {
  const related: string[] = [];
  for (const rel of relationships) {
    if (rel.parentLineId === lineId) related.push(rel.childLineId);
    else if (rel.childLineId === lineId) related.push(rel.parentLineId);
  }
  return related;
}

const HVT_MONITORED_FIELDS: (keyof HvtSnapshot)[] = [
  'organType', 'energyFuelType', 'projectRanking', 'injectionSystem',
  'spDate', 'allianceCode', 'vehicleCode', 'standardEmissions', 'client', 'market',
];

export function checkHvtAttributeChanged(line: ProjectLine, original: HvtSnapshot): HvtChange | null {
  const fields: Record<string, { old: unknown; new: unknown }> = {};
  for (const f of HVT_MONITORED_FIELDS) {
    const oldVal = original[f];
    const newVal = (line as unknown as Record<string, unknown>)[f];
    if (oldVal !== newVal) fields[f] = { old: oldVal, new: newVal };
  }
  return Object.keys(fields).length > 0 ? { lineId: line.id, fields } : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/relationships.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/relationships.ts src/lib/__tests__/relationships.test.ts
git commit -m "feat(pev): related-line + HVT-change detection lib (HIW-174 §5b)"
git log --oneline -1 --format='%H %p %s'
```

---

### Task C3: RelatedLinesBanner in the estimation panel

**Files:**
- Create: `src/components/estimation/RelatedLinesBanner.tsx`
- Modify: `src/components/estimation/EstimationPanel.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`

- [ ] **Step 1: Create the banner component**

```tsx
// src/components/estimation/RelatedLinesBanner.tsx
import { AlertTriangle, Link2 } from 'lucide-react';
import type { ProjectLine } from '../../types';
import { getRelatedLineIds, checkHvtAttributeChanged } from '../../lib/relationships';
import { LINE_RELATIONSHIPS, ORIGINAL_HVT_SNAPSHOTS } from '../../fixtures/relationships';
import { useT } from '../../i18n/useT';

interface Props {
  line: ProjectLine;
  allLines: ProjectLine[];
}

/** Shows lines related to the current one (§5b) and warns when a related line's
 *  HVT attributes have drifted from the estimator's last-acknowledged snapshot. */
export function RelatedLinesBanner({ line, allLines }: Props) {
  const t = useT();
  const relatedIds = getRelatedLineIds(line.id, LINE_RELATIONSHIPS);
  if (relatedIds.length === 0) return null;

  const related = allLines.filter((l) => relatedIds.includes(l.id));
  const changes = related
    .map((l) => {
      const snap = ORIGINAL_HVT_SNAPSHOTS[l.id];
      return snap ? checkHvtAttributeChanged(l, snap) : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-slate-700">
        <Link2 size={14} /> {t('related.title', { n: related.length })}
      </div>
      <ul className="ml-5 list-disc text-slate-600">
        {related.map((l) => (
          <li key={l.id}><span className="font-mono text-[10px] text-slate-400">{l.id}</span> {l.lineName}</li>
        ))}
      </ul>
      {changes.map((c) => (
        <div key={c.lineId} className="mt-2 flex items-start gap-1.5 rounded bg-amber-100 px-2 py-1.5 text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{t('related.hvtChanged', { id: c.lineId, fields: Object.keys(c.fields).join(', ') })}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Render it in the panel**

In `EstimationPanel.tsx`, import the banner and render it near the top of the panel body (below the header, above the inductor list). It needs all lines:

```tsx
import { RelatedLinesBanner } from './RelatedLinesBanner';
import { useDataStore } from '../../store/dataStore';
// inside component (line already available; read all lines):
const allLines = useDataStore((s) => s.lines);
// in JSX:
{line && <RelatedLinesBanner line={line} allLines={allLines} />}
```

- [ ] **Step 3: i18n keys**

`en.ts`: add a `related` section: `title: 'Related lines ({n})'`, `hvtChanged: '⚠ HVT attributes changed on {id}: {fields}'`. `es.ts`: Spanish equivalents.

- [ ] **Step 4: Verify tsc + suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean + green.

- [ ] **Step 5: Commit**

```bash
git add src/components/estimation/RelatedLinesBanner.tsx src/components/estimation/EstimationPanel.tsx src/i18n/en.ts src/i18n/es.ts
git commit -m "feat(pev): related-lines banner + HVT-change alert in estimation panel (HIW-174 §5b)"
git log --oneline -1 --format='%H %p %s'
```

---

# Group D — PMO read-only gating (§2)

### Task D1: Permission-matrix test + gate copy/edit controls

**Files:**
- Create: `src/lib/__tests__/permissions.test.ts`
- Modify: `src/components/estimation/EstimationPanel.tsx` (gate edit controls + copy on permissions)

**Context:** At the permission level PMO already lacks `edit:estimation`, `save:draft`, `save:definitive`, `copy:estimation`, `edit:custom-jus` (`src/fixtures/roles.ts`). This task **locks that in with a test** and ensures the panel actually disables editing/copy for roles without the permission (so PMO opening the panel sees a read-only view).

- [ ] **Step 1: Write the permission-matrix test**

```ts
// src/lib/__tests__/permissions.test.ts
import { describe, it, expect } from 'vitest';
import { hasPermission } from '../permissions';

describe('PMO is read-only over estimation content (HIW-174 §2 / BR-20)', () => {
  const denied = ['edit:estimation', 'save:draft', 'save:definitive', 'copy:estimation', 'edit:custom-jus'] as const;
  it.each(denied)('PMO must NOT have %s', (perm) => {
    expect(hasPermission('PMO', perm)).toBe(false);
  });
  it('PMO can still view pre-estimation', () => {
    expect(hasPermission('PMO', 'view:pre-estimation')).toBe(true);
  });
  it('Engineer CAN edit and save', () => {
    expect(hasPermission('Engineer', 'edit:estimation')).toBe(true);
    expect(hasPermission('Engineer', 'save:draft')).toBe(true);
  });
});
```

Run: `npx vitest run src/lib/__tests__/permissions.test.ts`
Expected: PASS immediately (asserts current, correct config — this guards against regressions).

- [ ] **Step 2: Gate the panel's editing controls**

In `EstimationPanel.tsx`, read the capability and use it to disable mutating controls when absent:

```tsx
const canEdit = useRoleStore((s) => s.can)('edit:estimation');
```

Apply `disabled={!canEdit}` (or hide) to: cran dropdowns, occurrence inputs, Add Custom JU, Save-as-Draft and Promote buttons, and the Copy button (gate Copy on `can('copy:estimation')`). Where a `Button` is already conditionally disabled, combine: `disabled={!canEdit || <existing condition>}`.

- [ ] **Step 3: Verify tsc + suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean + green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/__tests__/permissions.test.ts src/components/estimation/EstimationPanel.tsx
git commit -m "feat(pev): PMO read-only gating in panel + permission-matrix test (HIW-174 §2)"
git log --oneline -1 --format='%H %p %s'
```

---

# Group E — Cosmetics

### Task E1: Rename prototype categories → proto1–proto4

**Files:**
- Modify: `src/fixtures/admin.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`
- Modify: `src/components/estimation/PrototypeEstimationForm.tsx` (only if it hard-codes names; it uses i18n keys `proto.catGreenfield` etc.)

**Context (§ Cosmetics):** Ticket: "Rename prototypes → proto1, proto2, proto3, proto4." The form (`PrototypeEstimationForm.tsx:10-13`) reads i18n keys `proto.catGreenfield/Refactor/Integration/Maintenance`. The admin fixture (`admin.ts:31-32...`) hard-codes `Greenfield/Refactor/...`.

- [ ] **Step 1: Update i18n names**

In `src/i18n/en.ts`, set the prototype category **names** to `proto1`–`proto4`:
`proto.catGreenfield: 'proto1'`, `proto.catRefactor: 'proto2'`, `proto.catIntegration: 'proto3'`, `proto.catMaintenance: 'proto4'`. Leave the `*Desc` description keys as-is. Mirror in `src/i18n/es.ts`.

- [ ] **Step 2: Update admin fixture names**

In `src/fixtures/admin.ts`, change the `PROTOTYPE_CATEGORIES` `name` values to `'proto1'`, `'proto2'`, `'proto3'`, `'proto4'` (keep ids and descriptions).

- [ ] **Step 3: Update any fixture test**

If `src/fixtures/__tests__` asserts the old names, update those assertions to `proto1`–`proto4`.

Run: `npx vitest run`
Expected: green.

- [ ] **Step 4: Verify tsc**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/fixtures/admin.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "chore(pev): rename prototype categories to proto1–proto4 (HIW-174 cosmetics)"
git log --oneline -1 --format='%H %p %s'
```

---

## Phase-boundary integration (lead, not subagent)

After all tasks land and `npx vitest run` + `npx tsc --noEmit` are green on `main`:

1. **SDD release:** in `/home/nujovich/great-sdd-kit` tag `v2.1.0`, push branch + tag, then in the prototype run `npm install great-sdd-kit@git+https://github.com/nujovich/great-sdd-kit.git#v2.1.0` and `pytest node_modules/great-sdd-kit/tests/ -v` to confirm the installed kit is green.
2. **Push the prototype:** `git push origin main` (fast-forward).
3. Update HIW-174 / report Phase 5 complete.

---

## Self-Review

**1. Spec coverage (design spec Phase 5 section):**
- Multi-line selection/compatibility (§5): block+error already in BulkActionsBar; **save-all to compatible lines** → A1/A2; **per-line distribution with own dates** → A3; **show all selected names** → A2. ✓
- Copy Estimation (§10): compatibility + assignment filter → B1. ✓
- Copy from Legacy Cycle (§12.2): merge rules → B2 (TS) + B4 (spec); UI tab → B3. ✓
- Parent-child (§5b): types/fixtures → C1; lib port → C2; banner+alert → C3. ✓
- Roles/PMO read-only (§2): test + gating → D1. ✓
- Cosmetics (prototype rename): E1. ✓

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to". Two **Note for implementer** callouts (B3, C1) ask the engineer to align fixture ids with real data — these are concrete verification steps, not unimplemented logic. ✓

**3. Type consistency:** `Estimation` shape (lineId/inductorSelections/customJUs/globalOccurrences/yearlyBreakdown/totalDays/totalKEuro/status) matches `src/types/index.ts`. `buildBulkEstimations(lineIds, base)` ↔ `bulkSetEstimation(lineIds, base)` ↔ A2 call `bulkSetEstimation(ids, base)`. `LegacyJU` fields (juId/inductorId/cranId/variable/fixed/occurrence) consistent across B2/B3 fixtures. `LineRelationship` (parentLineId/childLineId/relationshipType), `HvtSnapshot`, `HvtChange` consistent across C1/C2/C3. `copyCandidates(lines, source, {ownOnly, activeEngineerId})` consistent B1 usage. ✓

**Out of scope (unchanged from design spec):** Custom JU Unit Type/FMM; prototype count/category formalization (PRE-01). Legacy-copy SDD push/tag/reinstall deferred to phase boundary (lead).
