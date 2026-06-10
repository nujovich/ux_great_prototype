# HIW-174 Phase 2 — Project Line Grid & Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Pre-Estimation grid in line with the PRD: enrich the project-line data model, render the full PRD column set (key subset by default + a "show all columns" toggle), compact rows, role-based filters (Assignee + Métier hidden for Engineers), group-by-compatibility, and an unsaved-changes guard with intra-panel line navigation.

**Architecture:** Bottom-up. (1) Extend the `ProjectLine` type and fixtures with the missing PRD fields. (2) Refactor the grid to drive its columns from an exported column-descriptor list so the UI is testable without a DOM. (3) Extract grid filtering into a pure function and add the Assignee filter + role-based filter visibility. (4) Replace group-by-métier with a pure `groupByCompatibility`. (5) Add a `isEstimationDirty` seam + a Modal-based unsaved-changes dialog + line navigation inside `EstimationPanel`. Because the project has **no `@testing-library/react`** (all tests are pure unit tests via Vitest), every UI feature exposes a pure function or exported data structure as its testable seam — mirroring how Phase 1 tested `FILTER_METIERS`.

**Tech Stack:** React 19 + Vite + TypeScript, Zustand stores (`roleStore`, `dataStore`, `uiStore`), Vitest. Tailwind for styling. Métiers are `H-*`. Status uses `Modification Requested` (Phase 1).

**Decisions locked in brainstorming + Phase 2 kickoff (design: `docs/superpowers/specs/2026-06-10-hiw-174-pre-estimation-prd-alignment-design.md`):**
- **Columns:** a key subset (~9 columns) renders by default; a "Show all columns" toggle expands to the full PRD set with horizontal scroll.
- **Engineer filter visibility:** hide the Assignee and Métier filters when `can('view:own-lines-only')` (the Engineer signal) — no new permission added.
- **Unsaved-changes dialog:** the panel gains intra-panel line navigation (a list of the visible lines); switching lines (or closing) with unsaved changes shows "You have unsaved changes. Leave without saving?" with **Cancel** / **Discard**.
- Branch: work directly on `main` (per user). Run on `main`.

**Field naming:** the frontend `ProjectLine` interface uses **camelCase** (the OpenAPI `ProjectLineDetail` uses snake_case; we follow the existing camelCase convention of `ProjectLine`). New fields: `requestType`, `client`, `market`, `allianceCode`, `vehicleCode`, `energy`, `estimateType`, `engineering`, `pcDate`, `coDate`, `sopDate`. (`organType`, `energyFuelType`, `projectRanking`, `injectionSystem`, `spDate` already exist.)

---

## File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/types/index.ts` | `ProjectLine` interface | add 11 PRD fields |
| `src/fixtures/projectLines.ts` | 26 mock lines | populate new fields |
| `src/components/grid/gridColumns.ts` | **NEW** — column descriptors + `getGridColumns(showAll)` | testable seam |
| `src/components/grid/ProjectLineGrid.tsx` | grid render | drive columns from descriptors; compact rows; `showAllColumns` prop |
| `src/lib/gridFilter.ts` | **NEW** — pure `applyGridFilters` + `shouldShowOwnerFilters` | testable seam |
| `src/components/grid/GridFilters.tsx` | filter bar | add Assignee filter; hide Assignee/Métier for Engineer |
| `src/lib/grouping.ts` | **NEW** — pure `groupByCompatibility` | testable seam |
| `src/pages/PreEstimationPage.tsx` | page wiring | use new filter/group fns; show-all toggle; pass nav to panel |
| `src/lib/estimationDirty.ts` | **NEW** — pure `isEstimationDirty` | testable seam |
| `src/components/estimation/EstimationPanel.tsx` | panel | dirty guard + line nav + dialog |
| `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/types.ts` | labels | new column/filter/dialog keys |

Run tests with `npx vitest run`; typecheck with `npx tsc -b`. Baseline at start of Phase 2: **95 tests passing**.

---

## Task 1: Extend the ProjectLine type with PRD fields

**Files:**
- Modify: `src/types/index.ts` (the `ProjectLine` interface, lines 93-111)

- [ ] **Step 1: Add the fields to the interface**

In `src/types/index.ts`, extend `ProjectLine` (after the existing `injectionSystem?` / `spDate?` block) with the new optional fields:

```ts
  organType?: string;
  energyFuelType?: string;
  projectRanking?: string;
  injectionSystem?: string | null;
  spDate?: string;
  // ── PRD grid columns (HIW-174 Phase 2) ──────────────────
  requestType?: string;
  client?: string;
  market?: string;
  allianceCode?: string;
  vehicleCode?: string;
  energy?: string;
  estimateType?: string;
  engineering?: string;
  pcDate?: string;
  coDate?: string;
  sopDate?: string;
  durationMonths?: number;
  description?: string;
  cycleId: string;
```

(Keep `durationMonths`, `description`, `cycleId` exactly as they were — they already follow `spDate`.)

- [ ] **Step 2: Typecheck**

Run: `cd /home/nujovich/ux_great_prototype && npx tsc -b`
Expected: clean (new fields are optional, so nothing breaks yet).

- [ ] **Step 3: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/types/index.ts
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): add PRD grid columns to ProjectLine type (HIW-174 §4)"
```

---

## Task 2: Populate the new PRD fields in fixtures

**Files:**
- Modify: `src/fixtures/projectLines.ts` (all 26 line objects)
- Test: `src/fixtures/__tests__/projectLines.test.ts` (create)

The grid must show realistic variety. Use this value palette (pick deterministically — e.g. cycle by index — so the data is varied but reproducible):
- `requestType`: one of `'New Project'`, `'Evolution'`, `'Running Change'`
- `client`: derive from `projectName` domain — e.g. `'Renault'`, `'Nissan'`, `'Mitsubishi'`, `'Dacia'` (vary across lines)
- `market`: one of `'Europe'`, `'LATAM'`, `'Asia'`, `'North America'`
- `allianceCode`: `'ALL-'` + zero-padded line index (e.g. `'ALL-001'`)
- `vehicleCode`: `'VEH-'` + a 1-2 letter platform + index (e.g. `'VEH-B12'`)
- `energy`: align with existing `energyFuelType` (e.g. `'Gasoline'`→`'Petrol'`, `'Electric'`→`'BEV'`, else `'Hybrid'`) — a short market-energy label distinct from `energyFuelType`
- `estimateType`: one of `'Full'`, `'Delta'`, `'ROM'`
- `engineering`: one of `'Internal'`, `'Supplier'`, `'Mixed'`
- `pcDate`, `coDate`, `sopDate`: milestone dates AFTER `spDate`, in order SP < PC < CO < SOP (e.g. spDate `'2026-01-01'` → pc `'2026-04-01'`, co `'2026-08-01'`, sop `'2026-12-01'`). Keep them ISO `YYYY-MM-DD`.

- [ ] **Step 1: Write the failing fixtures test**

Create `src/fixtures/__tests__/projectLines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PROJECT_LINES } from '../projectLines';

describe('project line fixtures (HIW-174 §4 PRD columns)', () => {
  it('every line populates the PRD grid columns', () => {
    expect(PROJECT_LINES.length).toBeGreaterThan(0);
    for (const l of PROJECT_LINES) {
      for (const f of ['requestType', 'client', 'market', 'allianceCode', 'vehicleCode', 'energy', 'estimateType', 'engineering', 'pcDate', 'coDate', 'sopDate'] as const) {
        expect(l[f], `${l.id} missing ${f}`).toBeTruthy();
      }
    }
  });

  it('milestone dates are ordered SP <= PC <= CO <= SOP', () => {
    for (const l of PROJECT_LINES) {
      if (l.spDate && l.pcDate && l.coDate && l.sopDate) {
        expect(l.spDate <= l.pcDate, `${l.id} SP<=PC`).toBe(true);
        expect(l.pcDate <= l.coDate, `${l.id} PC<=CO`).toBe(true);
        expect(l.coDate <= l.sopDate, `${l.id} CO<=SOP`).toBe(true);
      }
    }
  });

  it('still preserves the null-injection-system coverage for compatibility tests', () => {
    expect(PROJECT_LINES.some((l) => l.injectionSystem == null)).toBe(true);
    expect(PROJECT_LINES.some((l) => l.injectionSystem != null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/fixtures/__tests__/projectLines.test.ts`
Expected: FAIL — the new fields are absent.

- [ ] **Step 3: Populate the fixtures**

Add the 11 new fields to **every** object in `PROJECT_LINES`, using the palette above and keeping `spDate < pcDate < coDate < sopDate`. Worked example for `PL-001` (spDate `'2026-01-01'`):

```ts
  {
    id: 'PL-001', project_id: 'P-AUTH-H-DESIGN', name: 'Auth API refactor',
    metier: M('H-DESIGN'), status: S('To do'), updated_at: '2026-05-10T09:00:00Z',
    lineName: 'Authentication API refactor', projectName: 'Auth Platform',
    assignedEngineerId: 'eng-1', estimatedDays: null, estimatedKEuro: null,
    lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-10T09:00:00Z', cycleId: 'cyc-2026h1',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-01-01', durationMonths: 6,
    requestType: 'New Project', client: 'Renault', market: 'Europe',
    allianceCode: 'ALL-001', vehicleCode: 'VEH-B12', energy: 'Petrol',
    estimateType: 'Full', engineering: 'Internal',
    pcDate: '2026-04-01', coDate: '2026-08-01', sopDate: '2026-12-01',
    description: 'Refactor the authentication API to support OAuth2.0 with JWT tokens',
  },
```

Apply the same field block to all 26 lines, varying the palette values by index so columns show variety. For lines whose `injectionSystem` is `null`, KEEP it `null` (do not fill it). For lines with no `spDate`, set the three milestone dates to plausible ordered values anyway (they just need to be present + ordered among themselves).

- [ ] **Step 4: Run test (PASS) + full suite + tsc**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/fixtures/__tests__/projectLines.test.ts   # PASS
npx vitest run                                                # full suite PASS (95 + 3 new)
npx tsc -b                                                    # clean
```

- [ ] **Step 5: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/fixtures/projectLines.ts src/fixtures/__tests__/projectLines.test.ts
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): populate PRD grid columns in project-line fixtures (HIW-174 §4)"
```

---

## Task 3: Column descriptors + grid render (key subset + show-all toggle, compact rows)

**Files:**
- Create: `src/components/grid/gridColumns.ts`
- Test: `src/components/grid/__tests__/gridColumns.test.ts` (create)
- Modify: `src/components/grid/ProjectLineGrid.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/types.ts` (column labels)

Design: a column descriptor is `{ key, labelKey, align?, group: 'key' | 'extra' }`. `getGridColumns(showAll)` returns the `key` columns when `showAll` is false, and key+extra when true. The grid maps over the returned descriptors. ID, Status, Engineer (Assignee), Días, k€ keep their bespoke cell rendering; the new PRD columns render a plain `ProjectLine` field value.

Key columns (default): `status`, `plNumber` (id), `plName` (lineName), `client`, `metier`, `organType`, `injectionSystem`, `assignee` (engineer), `estimatedDays`.
Extra columns (show-all adds): `requestType`, `projectRanking`, `market`, `allianceCode`, `vehicleCode`, `energy`, `spDate`, `pcDate`, `coDate`, `sopDate`, `engineering`, `estimateType`.

- [ ] **Step 1: Write the failing test**

Create `src/components/grid/__tests__/gridColumns.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getGridColumns, KEY_COLUMN_KEYS } from '../gridColumns';

describe('grid columns (HIW-174 §4)', () => {
  it('default (showAll=false) returns only the key columns', () => {
    const cols = getGridColumns(false).map((c) => c.key);
    expect(cols).toEqual([...KEY_COLUMN_KEYS]);
  });

  it('showAll=true is a superset that adds the PRD extras', () => {
    const keyCols = getGridColumns(false).map((c) => c.key);
    const allCols = getGridColumns(true).map((c) => c.key);
    expect(allCols.length).toBeGreaterThan(keyCols.length);
    for (const k of keyCols) expect(allCols).toContain(k);
    // PRD extras present only in show-all
    for (const k of ['requestType', 'market', 'allianceCode', 'vehicleCode', 'spDate', 'pcDate', 'coDate', 'sopDate', 'engineering', 'estimateType', 'projectRanking', 'energy']) {
      expect(allCols).toContain(k);
    }
  });

  it('every column has a stable key and an i18n label key', () => {
    for (const c of getGridColumns(true)) {
      expect(c.key).toBeTruthy();
      expect(c.labelKey).toMatch(/^gridCol\./);
    }
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (module does not exist)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/components/grid/__tests__/gridColumns.test.ts`
Expected: FAIL — cannot resolve `../gridColumns`.

- [ ] **Step 3: Create the column descriptors module**

Create `src/components/grid/gridColumns.ts`:

```ts
export type ColumnAlign = 'left' | 'right';

export interface GridColumn {
  /** stable identifier; for plain PRD fields this equals the ProjectLine field name */
  key: string;
  /** i18n key under the `gridCol` namespace */
  labelKey: string;
  align?: ColumnAlign;
  /** 'key' = always shown; 'extra' = only when "show all columns" is on */
  group: 'key' | 'extra';
}

const COLUMNS: GridColumn[] = [
  { key: 'status', labelKey: 'gridCol.status', group: 'key' },
  { key: 'plNumber', labelKey: 'gridCol.plNumber', group: 'key' },
  { key: 'plName', labelKey: 'gridCol.plName', group: 'key' },
  { key: 'client', labelKey: 'gridCol.client', group: 'key' },
  { key: 'metier', labelKey: 'gridCol.metier', group: 'key' },
  { key: 'organType', labelKey: 'gridCol.organType', group: 'key' },
  { key: 'injectionSystem', labelKey: 'gridCol.injectionSystem', group: 'key' },
  { key: 'assignee', labelKey: 'gridCol.assignee', group: 'key' },
  { key: 'estimatedDays', labelKey: 'gridCol.days', align: 'right', group: 'key' },
  // ── extras (PRD full set) ──
  { key: 'requestType', labelKey: 'gridCol.requestType', group: 'extra' },
  { key: 'projectRanking', labelKey: 'gridCol.projectRanking', group: 'extra' },
  { key: 'market', labelKey: 'gridCol.market', group: 'extra' },
  { key: 'allianceCode', labelKey: 'gridCol.allianceCode', group: 'extra' },
  { key: 'vehicleCode', labelKey: 'gridCol.vehicleCode', group: 'extra' },
  { key: 'energy', labelKey: 'gridCol.energy', group: 'extra' },
  { key: 'spDate', labelKey: 'gridCol.spDate', group: 'extra' },
  { key: 'pcDate', labelKey: 'gridCol.pcDate', group: 'extra' },
  { key: 'coDate', labelKey: 'gridCol.coDate', group: 'extra' },
  { key: 'sopDate', labelKey: 'gridCol.sopDate', group: 'extra' },
  { key: 'engineering', labelKey: 'gridCol.engineering', group: 'extra' },
  { key: 'estimateType', labelKey: 'gridCol.estimateType', group: 'extra' },
];

export const KEY_COLUMN_KEYS = COLUMNS.filter((c) => c.group === 'key').map((c) => c.key);

export function getGridColumns(showAll: boolean): GridColumn[] {
  return showAll ? COLUMNS : COLUMNS.filter((c) => c.group === 'key');
}
```

- [ ] **Step 4: Run the test, expect PASS**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/components/grid/__tests__/gridColumns.test.ts`
Expected: PASS.

- [ ] **Step 5: Add i18n labels**

In `src/i18n/en.ts`, add a `gridCol` section (next to `filters`):

```ts
  gridCol: {
    status: 'Status', plNumber: 'PL Number', plName: 'PL Name', client: 'Client',
    metier: 'Métier', organType: 'Organ Type', injectionSystem: 'Injection System',
    assignee: 'Assignee', days: 'Days', requestType: 'Request Type',
    projectRanking: 'Project Ranking', market: 'Market', allianceCode: 'Alliance Code',
    vehicleCode: 'Vehicle Code', energy: 'Energy', spDate: 'SP', pcDate: 'PC',
    coDate: 'CO', sopDate: 'SOP', engineering: 'Engineering', estimateType: 'Estimate Type',
  },
  showAllColumns: 'Show all columns',
```

In `src/i18n/es.ts`, the parallel section:

```ts
  gridCol: {
    status: 'Estado', plNumber: 'N° PL', plName: 'Nombre PL', client: 'Cliente',
    metier: 'Métier', organType: 'Tipo de Órgano', injectionSystem: 'Sistema de Inyección',
    assignee: 'Asignado', days: 'Días', requestType: 'Tipo de Solicitud',
    projectRanking: 'Ranking de Proyecto', market: 'Mercado', allianceCode: 'Código Alianza',
    vehicleCode: 'Código Vehículo', energy: 'Energía', spDate: 'SP', pcDate: 'PC',
    coDate: 'CO', sopDate: 'SOP', engineering: 'Ingeniería', estimateType: 'Tipo de Estimación',
  },
  showAllColumns: 'Mostrar todas las columnas',
```

In `src/i18n/types.ts`, add the matching `gridCol` object type (all keys `: string`) and `showAllColumns: string` to the translation interface, mirroring the structure of the existing `filters`/`preEst` sections.

- [ ] **Step 6: Refactor the grid to render from descriptors + compact rows**

Rewrite `src/components/grid/ProjectLineGrid.tsx` so it:
- accepts a new prop `showAllColumns: boolean`;
- builds columns via `getGridColumns(showAllColumns)`;
- renders headers from `t(col.labelKey)` with `text-right` when `col.align === 'right'`;
- renders cells via a `renderCell(col, line)` helper;
- **compact rows:** the `plName` cell shows ONLY `line.lineName` (remove the `projectName` subtitle `<div>`); keep the Modification-Requested rejection-comment block under `plName`.

```tsx
import { clsx } from 'clsx';
import { MessageSquareWarning } from 'lucide-react';
import type { ProjectLine } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDays, formatKEuro } from '../../lib/format';
import { ENGINEERS } from '../../fixtures/engineers';
import { useT } from '../../i18n/useT';
import { getGridColumns, type GridColumn } from './gridColumns';

interface Props {
  lines: ProjectLine[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onRowClick: (id: string) => void;
  showSelection: boolean;
  showKEuro: boolean;
  showAllColumns: boolean;
}

export function ProjectLineGrid({
  lines, selectedIds, onToggleSelect, onRowClick, showSelection, showKEuro, showAllColumns,
}: Props) {
  const t = useT();
  const columns = getGridColumns(showAllColumns);

  function renderCell(col: GridColumn, line: ProjectLine) {
    switch (col.key) {
      case 'status':
        return <StatusBadge status={line.status} />;
      case 'plNumber':
        return <span className="font-mono text-[10px] text-slate-400">{line.id}</span>;
      case 'plName':
        return (
          <div>
            <div className="font-medium text-slate-900">{line.lineName}</div>
            {line.status === 'Modification Requested' && line.rejectionComment && (
              <div className="mt-0.5 flex items-start gap-1 text-[10px] text-red-700">
                <MessageSquareWarning size={10} className="mt-0.5 shrink-0" />
                <span className="line-clamp-1">{line.rejectionComment}</span>
              </div>
            )}
          </div>
        );
      case 'assignee': {
        const eng = ENGINEERS.find((e) => e.id === line.assignedEngineerId);
        return <span className="text-slate-500">{eng?.name ?? '—'}</span>;
      }
      case 'estimatedDays':
        return <span className="text-slate-600">{formatDays(line.estimatedDays)}</span>;
      default: {
        const v = (line as Record<string, unknown>)[col.key];
        return <span className="text-slate-500">{v == null || v === '' ? '—' : String(v)}</span>;
      }
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            {showSelection && <th className="w-7 px-2 py-1.5" />}
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx('px-2 py-1.5 font-medium', col.align === 'right' ? 'text-right' : 'text-left')}
              >
                {t(col.labelKey)}
              </th>
            ))}
            {showKEuro && <th className="px-2 py-1.5 text-right font-medium">k€</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const selected = selectedIds.includes(line.id);
            return (
              <tr
                key={line.id}
                className={clsx(
                  'cursor-pointer border-t border-slate-100 hover:bg-slate-50',
                  selected && 'bg-brand-50/50',
                  line.status === 'Modification Requested' && 'bg-red-50/30',
                )}
                onClick={() => onRowClick(line.id)}
              >
                {showSelection && (
                  <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(line.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-2 py-1', col.align === 'right' && 'text-right')}>
                    {renderCell(col, line)}
                  </td>
                ))}
                {showKEuro && (
                  <td className="px-2 py-1 text-right font-medium text-slate-600">
                    {formatKEuro(line.estimatedKEuro)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Wire the show-all toggle in the page (minimal, completed in Task 6 wiring too)**

In `src/pages/PreEstimationPage.tsx`, add state `const [showAllColumns, setShowAllColumns] = useState(false);` and pass `showAllColumns={showAllColumns}` to BOTH `<ProjectLineGrid .../>` usages. Add a toggle button next to the Compatible-mode button:

```tsx
<Button variant={showAllColumns ? 'primary' : 'secondary'} size="sm" onClick={() => setShowAllColumns((v) => !v)}>
  {t('showAllColumns')}
</Button>
```

- [ ] **Step 8: Verify**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/components/grid/__tests__/gridColumns.test.ts   # PASS
npx tsc -b                                                          # clean
npx vitest run                                                      # full suite PASS
```

- [ ] **Step 9: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/components/grid/gridColumns.ts src/components/grid/__tests__/gridColumns.test.ts src/components/grid/ProjectLineGrid.tsx src/pages/PreEstimationPage.tsx src/i18n/
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): PRD grid columns with key-subset + show-all toggle; compact rows (HIW-174 §4)"
```

---

## Task 4: Pure grid-filter function + Assignee filter + role-based filter visibility

**Files:**
- Create: `src/lib/gridFilter.ts`
- Test: `src/lib/__tests__/gridFilter.test.ts` (create)
- Modify: `src/components/grid/GridFilters.tsx`
- Modify: `src/pages/PreEstimationPage.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/types.ts` (assignee label)

Design: extract the filtering currently inline in `PreEstimationPage` into a pure `applyGridFilters`, and add an `assignee` filter. Add `shouldShowOwnerFilters(canOwnOnly)` to drive filter visibility (Engineers — `canOwnOnly === true` — hide Assignee + Métier).

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/gridFilter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyGridFilters, shouldShowOwnerFilters, type GridFilters } from '../gridFilter';
import type { ProjectLine } from '../../types';

const base = (over: Partial<ProjectLine>): ProjectLine => ({
  id: 'PL-x', project_id: 'P', name: 'n', metier: 'H-DESIGN', status: 'To do',
  updated_at: '', lineName: 'Line', projectName: 'Proj', assignedEngineerId: 'eng-1',
  estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: '', lastUpdatedAt: '',
  cycleId: 'c', ...over,
} as ProjectLine);

const ALL: GridFilters = { status: 'all', metier: 'all', assignee: 'all', search: '' };

describe('applyGridFilters (HIW-174 §4)', () => {
  const lines = [
    base({ id: 'A', status: 'Draft', metier: 'H-DESIGN', assignedEngineerId: 'eng-1', lineName: 'Alpha' }),
    base({ id: 'B', status: 'To do', metier: 'H-SOFTWARE', assignedEngineerId: 'eng-2', lineName: 'Beta' }),
  ];

  it('returns all lines with the all-filter and no owner restriction', () => {
    expect(applyGridFilters(lines, ALL, { ownOnly: false, activeEngineerId: null }).map((l) => l.id)).toEqual(['A', 'B']);
  });
  it('owner restriction keeps only the active engineer lines', () => {
    expect(applyGridFilters(lines, ALL, { ownOnly: true, activeEngineerId: 'eng-2' }).map((l) => l.id)).toEqual(['B']);
  });
  it('filters by status, metier, assignee, and search (case-insensitive)', () => {
    expect(applyGridFilters(lines, { ...ALL, status: 'Draft' }, { ownOnly: false, activeEngineerId: null }).map((l) => l.id)).toEqual(['A']);
    expect(applyGridFilters(lines, { ...ALL, metier: 'H-SOFTWARE' }, { ownOnly: false, activeEngineerId: null }).map((l) => l.id)).toEqual(['B']);
    expect(applyGridFilters(lines, { ...ALL, assignee: 'eng-1' }, { ownOnly: false, activeEngineerId: null }).map((l) => l.id)).toEqual(['A']);
    expect(applyGridFilters(lines, { ...ALL, search: 'beta' }, { ownOnly: false, activeEngineerId: null }).map((l) => l.id)).toEqual(['B']);
  });
});

describe('shouldShowOwnerFilters', () => {
  it('hides assignee/metier filters for own-lines-only (Engineer)', () => {
    expect(shouldShowOwnerFilters(true)).toBe(false);
  });
  it('shows them otherwise (PMO/Admin/RCRC)', () => {
    expect(shouldShowOwnerFilters(false)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (module missing)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/gridFilter.test.ts`
Expected: FAIL — cannot resolve `../gridFilter`.

- [ ] **Step 3: Create the pure filter module**

Create `src/lib/gridFilter.ts`:

```ts
import type { LineStatus, Metier, ProjectLine } from '../types';

export interface GridFilters {
  status: LineStatus | 'all';
  metier: Metier | 'all';
  assignee: string | 'all';
  search: string;
}

export interface OwnerScope {
  ownOnly: boolean;
  activeEngineerId: string | null;
}

export function applyGridFilters(lines: ProjectLine[], f: GridFilters, scope: OwnerScope): ProjectLine[] {
  let list = lines;
  if (scope.ownOnly && scope.activeEngineerId) {
    list = list.filter((l) => l.assignedEngineerId === scope.activeEngineerId);
  }
  if (f.status !== 'all') list = list.filter((l) => l.status === f.status);
  if (f.metier !== 'all') list = list.filter((l) => l.metier === f.metier);
  if (f.assignee !== 'all') list = list.filter((l) => l.assignedEngineerId === f.assignee);
  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    list = list.filter(
      (l) =>
        l.lineName.toLowerCase().includes(q) ||
        l.projectName.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q),
    );
  }
  return list;
}

/** Engineers (own-lines-only) do not get Assignee/Métier filter controls. */
export function shouldShowOwnerFilters(canOwnOnly: boolean): boolean {
  return !canOwnOnly;
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/gridFilter.test.ts`
Expected: PASS.

- [ ] **Step 5: Migrate `GridFilters` component to the new shape + Assignee control**

Rewrite `src/components/grid/GridFilters.tsx`:
- import `GridFilters` type from `../../lib/gridFilter` (REMOVE the local `GridFilters` interface to avoid duplication) and keep exporting `FILTER_METIERS`;
- add a `showOwnerFilters: boolean` prop; render the Assignee `<select>` (options from `ENGINEERS`) and the Métier `<select>` ONLY when `showOwnerFilters` is true; the search + status filters always render.

```tsx
import type { LineStatus, Metier } from '../../types';
import { useT } from '../../i18n/useT';
import { statusI18nKey } from '../../lib/stateMachine';
import { ENGINEERS } from '../../fixtures/engineers';
import type { GridFilters } from '../../lib/gridFilter';

const STATUSES: LineStatus[] = ['To do', 'Draft', 'Estimated', 'Sent', 'Modification Requested', 'Approved'];
const METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-PROJECT', 'H-CUSTOMER', 'H-TESTING', 'H-NP'];

// Non-estimable métiers excluded from the filter (HIW-174 §4 / SDD EXCLUDED_METIERS_FROM_FILTER)
const EXCLUDED_METIERS: Metier[] = ['H-NP', 'H-TESTING', 'H-PROJECT'];
export const FILTER_METIERS: Metier[] = METIERS.filter((m) => !EXCLUDED_METIERS.includes(m));

interface Props {
  value: GridFilters;
  onChange: (v: GridFilters) => void;
  showOwnerFilters: boolean;
}

export function GridFiltersBar({ value, onChange, showOwnerFilters }: Props) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">{t('filters.search')}</label>
        <input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder={t('filters.searchPlaceholder')}
          className="mt-1 w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">{t('filters.status')}</label>
        <select
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as GridFilters['status'] })}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="all">{t('filters.all')}</option>
          {STATUSES.map((s) => (<option key={s} value={s}>{t(statusI18nKey(s))}</option>))}
        </select>
      </div>
      {showOwnerFilters && (
        <>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500">{t('filters.metier')}</label>
            <select
              value={value.metier}
              onChange={(e) => onChange({ ...value, metier: e.target.value as GridFilters['metier'] })}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="all">{t('filters.all')}</option>
              {FILTER_METIERS.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500">{t('filters.assignee')}</label>
            <select
              value={value.assignee}
              onChange={(e) => onChange({ ...value, assignee: e.target.value })}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="all">{t('filters.all')}</option>
              {ENGINEERS.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Add `filters.assignee` i18n**

`src/i18n/en.ts` `filters` section: add `assignee: 'Assignee',`. `src/i18n/es.ts`: add `assignee: 'Asignado',`. `src/i18n/types.ts`: add `assignee: string;` to the `filters` type.

- [ ] **Step 7: Rewire `PreEstimationPage` to the pure filter + new filter shape**

In `src/pages/PreEstimationPage.tsx`:
- import `{ applyGridFilters, shouldShowOwnerFilters, type GridFilters }` from `'../lib/gridFilter'` (REMOVE the import of `GridFilters` type from the component);
- initial filter state: `useState<GridFilters>({ status: 'all', metier: 'all', assignee: 'all', search: '' })`;
- replace the inline `visibleLines` filtering body with:
  ```ts
  const visibleLines = useMemo(
    () => applyGridFilters(lines, filters, { ownOnly: can('view:own-lines-only'), activeEngineerId }),
    [lines, filters, can, activeEngineerId],
  );
  ```
- pass `showOwnerFilters={shouldShowOwnerFilters(can('view:own-lines-only'))}` to `<GridFiltersBar />`.

- [ ] **Step 8: Verify**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/lib/__tests__/gridFilter.test.ts   # PASS
npx tsc -b                                             # clean
npx vitest run                                         # full suite PASS
```

- [ ] **Step 9: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/lib/gridFilter.ts src/lib/__tests__/gridFilter.test.ts src/components/grid/GridFilters.tsx src/pages/PreEstimationPage.tsx src/i18n/
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): Assignee filter + role-based filter visibility via pure applyGridFilters (HIW-174 §4)"
```

---

## Task 5: Group-by-compatibility (replace group-by-métier)

**Files:**
- Create: `src/lib/grouping.ts`
- Test: `src/lib/__tests__/grouping.test.ts` (create)
- Modify: `src/pages/PreEstimationPage.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/types.ts` (group header label parts)

Design: a pure `groupByCompatibility(lines)` keying by `organType + energyFuelType + projectRanking + injectionSystem` (the BR-06/BR-07 compatibility fields). Returns groups with a stable, display-ready key and the four field values. `null`/missing fields render as `'—'` in the key and header.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/grouping.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { groupByCompatibility } from '../grouping';
import type { ProjectLine } from '../../types';

const L = (over: Partial<ProjectLine>): ProjectLine => ({
  id: 'x', project_id: 'P', name: 'n', metier: 'H-DESIGN', status: 'To do', updated_at: '',
  lineName: 'L', projectName: 'P', assignedEngineerId: null, estimatedDays: null,
  estimatedKEuro: null, lastUpdatedBy: '', lastUpdatedAt: '', cycleId: 'c', ...over,
} as ProjectLine);

describe('groupByCompatibility (HIW-174 §4)', () => {
  it('groups by Organ Type + Energy + Project Ranking + Injection System', () => {
    const a = L({ id: 'A', organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother', injectionSystem: 'Direct Injection' });
    const b = L({ id: 'B', organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother', injectionSystem: 'Direct Injection' });
    const c = L({ id: 'C', organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child', injectionSystem: null });
    const groups = groupByCompatibility([a, b, c]);
    expect(groups.length).toBe(2);
    const big = groups.find((g) => g.lines.length === 2)!;
    expect(big.lines.map((l) => l.id).sort()).toEqual(['A', 'B']);
    expect(big.fields).toEqual({ organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother', injectionSystem: 'Direct Injection' });
  });

  it('treats null/undefined injection system as its own group and labels it —', () => {
    const c = L({ id: 'C', organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child', injectionSystem: null });
    const [g] = groupByCompatibility([c]);
    expect(g.fields.injectionSystem).toBe(null);
    expect(g.key).toContain('—'); // null rendered as em dash in the key
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (module missing)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/grouping.test.ts`
Expected: FAIL — cannot resolve `../grouping`.

- [ ] **Step 3: Create the grouping module**

Create `src/lib/grouping.ts`:

```ts
import type { ProjectLine } from '../types';

export interface CompatibilityGroup {
  key: string;
  fields: {
    organType: string | null;
    energyFuelType: string | null;
    projectRanking: string | null;
    injectionSystem: string | null;
  };
  lines: ProjectLine[];
}

const DASH = '—';
const show = (v: string | null | undefined) => (v == null || v === '' ? DASH : v);

export function groupByCompatibility(lines: ProjectLine[]): CompatibilityGroup[] {
  const map = new Map<string, CompatibilityGroup>();
  for (const line of lines) {
    const fields = {
      organType: line.organType ?? null,
      energyFuelType: line.energyFuelType ?? null,
      projectRanking: line.projectRanking ?? null,
      injectionSystem: line.injectionSystem ?? null,
    };
    const key = [fields.organType, fields.energyFuelType, fields.projectRanking, fields.injectionSystem]
      .map(show)
      .join(' · ');
    const g = map.get(key);
    if (g) g.lines.push(line);
    else map.set(key, { key, fields, lines: [line] });
  }
  return [...map.values()];
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/grouping.test.ts`
Expected: PASS.

- [ ] **Step 5: Replace group-by-métier in the page**

In `src/pages/PreEstimationPage.tsx`:
- import `{ groupByCompatibility }` from `'../lib/grouping'` (and drop the now-unused `Metier` import if it becomes unused);
- replace the `compatibleGroups` useMemo with:
  ```ts
  const compatibleGroups = useMemo(
    () => (compatibleMode ? groupByCompatibility(visibleLines) : null),
    [visibleLines, compatibleMode],
  );
  ```
- in the grouped render, key/iterate over `group.key` and render a header from the four fields, e.g.:
  ```tsx
  {compatibleGroups.map((group) => (
    <div key={group.key}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{group.key}</span>
        <span className="text-xs text-slate-400">({t('preEst.lines', { n: group.lines.length })})</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>
      <ProjectLineGrid
        lines={group.lines}
        selectedIds={selectedLineIds}
        onToggleSelect={toggleSelect}
        onRowClick={(id) => openEstimationPanel(id)}
        showSelection={showSelection}
        showKEuro={showKEuro}
        showAllColumns={showAllColumns}
      />
    </div>
  ))}
  ```

- [ ] **Step 6: Verify**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/lib/__tests__/grouping.test.ts   # PASS
npx tsc -b                                           # clean
npx vitest run                                       # full suite PASS
```

- [ ] **Step 7: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/lib/grouping.ts src/lib/__tests__/grouping.test.ts src/pages/PreEstimationPage.tsx
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): group-by-compatibility (Organ Type+Energy+Ranking+Injection) replacing group-by-métier (HIW-174 §4)"
```

---

## Task 6: Unsaved-changes guard + intra-panel line navigation

**Files:**
- Create: `src/lib/estimationDirty.ts`
- Test: `src/lib/__tests__/estimationDirty.test.ts` (create)
- Modify: `src/components/estimation/EstimationPanel.tsx`
- Modify: `src/pages/PreEstimationPage.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/types.ts` (dialog labels)

Design: a pure `isEstimationDirty(baseline, current)` compares the panel's editable state (`selections`, `customJUs`, `globalOccurrences`) against the persisted estimation snapshot. The panel:
- computes `dirty` from its live state vs the `existing` estimation;
- gains a `navLines: ProjectLine[]` prop (the visible lines) and an `onSwitchLine(id)` callback;
- renders a compact line navigator (a `<select>` of `navLines`, value = current line id);
- intercepts close AND line-switch: if `dirty`, open a Modal asking "You have unsaved changes. Leave without saving?" with **Cancel** (stay) / **Discard** (proceed). A pending action (close vs switch-to-id) is stored and executed on Discard.

- [ ] **Step 1: Write the failing test for the dirty seam**

Create `src/lib/__tests__/estimationDirty.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isEstimationDirty, type DirtyState } from '../estimationDirty';

const empty: DirtyState = { inductorSelections: [], customJUs: [], globalOccurrences: 1 };

describe('isEstimationDirty (HIW-174 §4)', () => {
  it('is false when current equals baseline', () => {
    expect(isEstimationDirty(empty, { ...empty })).toBe(false);
  });
  it('is false when baseline is undefined and current is the pristine default', () => {
    expect(isEstimationDirty(undefined, empty)).toBe(false);
  });
  it('detects a changed global occurrence', () => {
    expect(isEstimationDirty(empty, { ...empty, globalOccurrences: 2 })).toBe(true);
  });
  it('detects added custom JUs', () => {
    expect(isEstimationDirty(empty, { ...empty, customJUs: [{ id: 'c1', description: 'x', days: 2 }] })).toBe(true);
  });
  it('detects changed inductor selections', () => {
    const cur: DirtyState = { ...empty, inductorSelections: [{ inductorId: 'i1', selectedCranId: 'c1', inductorOccurrence: 1, juOccurrences: [] }] };
    expect(isEstimationDirty(empty, cur)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (module missing)

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/estimationDirty.test.ts`
Expected: FAIL — cannot resolve `../estimationDirty`.

- [ ] **Step 3: Create the dirty seam**

Create `src/lib/estimationDirty.ts`:

```ts
import type { InductorSelection, CustomJU } from '../types';

export interface DirtyState {
  inductorSelections: InductorSelection[];
  customJUs: CustomJU[];
  globalOccurrences: number;
}

const PRISTINE: DirtyState = { inductorSelections: [], customJUs: [], globalOccurrences: 1 };

/**
 * True when `current` differs from the persisted baseline. A missing baseline is
 * treated as the pristine default (empty selections, no custom JUs, occurrence 1),
 * so an untouched freshly-opened panel is never "dirty".
 */
export function isEstimationDirty(baseline: DirtyState | undefined, current: DirtyState): boolean {
  const base = baseline ?? PRISTINE;
  return (
    base.globalOccurrences !== current.globalOccurrences ||
    JSON.stringify(base.inductorSelections) !== JSON.stringify(current.inductorSelections) ||
    JSON.stringify(base.customJUs) !== JSON.stringify(current.customJUs)
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `cd /home/nujovich/ux_great_prototype && npx vitest run src/lib/__tests__/estimationDirty.test.ts`
Expected: PASS.

- [ ] **Step 5: Add dialog i18n**

`src/i18n/en.ts` — add a `panel` sub-key (or extend the existing `panel` section if present) and a top-level `unsaved` block:

```ts
  unsaved: {
    title: 'Unsaved changes',
    body: 'You have unsaved changes. Leave without saving?',
    cancel: 'Cancel',
    discard: 'Discard',
    switchLabel: 'Line',
  },
```

`src/i18n/es.ts`:

```ts
  unsaved: {
    title: 'Cambios sin guardar',
    body: 'Tienes cambios sin guardar. ¿Salir sin guardar?',
    cancel: 'Cancelar',
    discard: 'Descartar',
    switchLabel: 'Línea',
  },
```

`src/i18n/types.ts`: add the matching `unsaved` object type.

- [ ] **Step 6: Wire the panel — dirty state, navigator, guard dialog**

In `src/components/estimation/EstimationPanel.tsx`:
- add imports: `import { isEstimationDirty } from '../../lib/estimationDirty';` (Modal is already imported).
- extend `Props`:
  ```ts
  interface Props {
    line: ProjectLine | null;
    onClose: () => void;
    navLines?: ProjectLine[];
    onSwitchLine?: (id: string) => void;
  }
  ```
- compute dirty (after `selections`/`customJUs`/`globalOccurrences` are declared):
  ```ts
  const dirty = useMemo(
    () => isEstimationDirty(
      existing
        ? { inductorSelections: existing.inductorSelections, customJUs: existing.customJUs, globalOccurrences: existing.globalOccurrences }
        : undefined,
      { inductorSelections: selections, customJUs, globalOccurrences },
    ),
    [existing, selections, customJUs, globalOccurrences],
  );
  ```
- add guard state + helpers:
  ```ts
  const [pendingAction, setPendingAction] = useState<{ type: 'close' } | { type: 'switch'; id: string } | null>(null);

  const requestClose = useCallback(() => {
    if (dirty) setPendingAction({ type: 'close' });
    else onClose();
  }, [dirty, onClose]);

  const requestSwitch = useCallback((id: string) => {
    if (id === line?.id) return;
    if (dirty) setPendingAction({ type: 'switch', id });
    else onSwitchLine?.(id);
  }, [dirty, line, onSwitchLine]);

  const confirmLeave = useCallback(() => {
    const a = pendingAction;
    setPendingAction(null);
    if (a?.type === 'close') onClose();
    else if (a?.type === 'switch') onSwitchLine?.(a.id);
  }, [pendingAction, onClose, onSwitchLine]);
  ```
- route the panel's existing close affordances (the `X` button and any backdrop/Escape handler that currently call `onClose`) through `requestClose` instead.
- render the line navigator near the panel header when `navLines` is provided (value bound to `line?.id`):
  ```tsx
  {navLines && navLines.length > 1 && (
    <select
      value={line?.id ?? ''}
      onChange={(e) => requestSwitch(e.target.value)}
      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
      aria-label={t('unsaved.switchLabel')}
    >
      {navLines.map((l) => (<option key={l.id} value={l.id}>{l.lineName}</option>))}
    </select>
  )}
  ```
- render the guard dialog (place near the other Modals at the end of the component JSX):
  ```tsx
  <Modal
    open={pendingAction !== null}
    onClose={() => setPendingAction(null)}
    title={t('unsaved.title')}
    footer={
      <>
        <Button variant="secondary" size="sm" onClick={() => setPendingAction(null)}>{t('unsaved.cancel')}</Button>
        <Button variant="primary" size="sm" onClick={confirmLeave}>{t('unsaved.discard')}</Button>
      </>
    }
  >
    <p className="text-sm text-slate-600">{t('unsaved.body')}</p>
  </Modal>
  ```

> Read the panel's current header/close JSX before editing so `requestClose` replaces every `onClose()` call site (the `X` icon button, and any Escape/backdrop handler). The Modal component's own `onClose` for the guard dialog should NOT route through `requestClose` (that would recurse) — it just dismisses the guard.

- [ ] **Step 7: Pass nav props from the page**

In `src/pages/PreEstimationPage.tsx`, update the `<EstimationPanel>` usage:

```tsx
{currentLine && (
  <EstimationPanel
    line={currentLine}
    onClose={() => openEstimationPanel(null)}
    navLines={visibleLines}
    onSwitchLine={(id) => openEstimationPanel(id)}
  />
)}
```

- [ ] **Step 8: Verify**

```bash
cd /home/nujovich/ux_great_prototype
npx vitest run src/lib/__tests__/estimationDirty.test.ts   # PASS
npx tsc -b                                                  # clean
npx vitest run                                              # full suite PASS
```

- [ ] **Step 9: Commit**

```bash
git -C /home/nujovich/ux_great_prototype add src/lib/estimationDirty.ts src/lib/__tests__/estimationDirty.test.ts src/components/estimation/EstimationPanel.tsx src/pages/PreEstimationPage.tsx src/i18n/
git -C /home/nujovich/ux_great_prototype commit -m "feat(pev): unsaved-changes guard + intra-panel line navigation (HIW-174 §4)"
```

---

## Done criteria for Phase 2

- `ProjectLine` carries all PRD columns; fixtures populate them with ordered milestone dates.
- Grid renders the key subset by default and the full PRD set under a "Show all columns" toggle; rows are compact (no project subtitle line).
- Métier filter still excludes H-NP/H-TESTING/H-PROJECT; Assignee filter added; both Assignee + Métier hidden for Engineers (own-lines-only); search + status always visible.
- Compatible mode groups by `Organ Type + Energy + Project Ranking + Injection System` with a per-group header; `null` injection system forms its own group.
- Editing a line and switching/closing with unsaved changes prompts "You have unsaved changes. Leave without saving?" (Cancel/Discard).
- `npx tsc -b` clean; `npx vitest run` fully green (95 baseline + new suites: projectLines, gridColumns, gridFilter, grouping, estimationDirty).

## Deferred to later phases (not in this plan)
- Multi-line compatibility block + error UI, copy (compat + legacy), parent-child relationships → **Phase 5**.
- Standard/Custom JU fields display, single-cran label, "No workload standard" state, preloaded inductors, totals relabel + chart removal, the `Total = (Variable × Occurrence) + Fixed` formula wiring (and the `variable=occurrence` fixture rebalance) → **Phase 3**.
- Two-step save in all states, empty-draft block, pre-save summary → **Phase 4**.
- "Not estimated" → "To do" display label: still pending product confirmation (out of scope).
