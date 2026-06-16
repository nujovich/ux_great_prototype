# HIW-176 — Allocation PRD Alignment: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Allocation view to match the GREAT/WP5 PRD: single flat grid with 18 PRD-required columns, 6-filter bar, TC K€ popup, split allocation modal, and bulk selection scoped to filtered rows.

**Architecture:** `AllocationPage.tsx` becomes a thin orchestrator; logic is decomposed into `AllocationFilters`, `AllocationGrid`, `TCPopup`, and `SplitModal` components under `src/components/allocation/`. Pure calc logic lives in `allocationCalc.ts` (tested in isolation). The existing Zustand store is unchanged; dirty state stays in local component state.

**Tech Stack:** React 18, TypeScript, Vitest (`npm test`), Vite. Shared `Modal` component at `src/components/shared/Modal.tsx`. Test runner: `npm test` (vitest run).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/types/index.ts` | Add 16 new fields to `AllocationRow`, remove `diversity`, add `AllocationFilterState` |
| Modify | `src/lib/allocationCalc.ts` | Add `distributeTcKeByYear`, `splitFteProportional`, `applyAllocationFilters`, `sortAllocationRows` |
| Modify | `src/lib/__tests__/allocationCalc.test.ts` | Update `row()` helper, add tests for new calc functions |
| Modify | `src/fixtures/allocations.ts` | Add new fields to fixture rows, remove diversity |
| Modify | `src/fixtures/societes.ts` | Remove `DIVERSITY_OPTIONS` export |
| Create | `src/components/allocation/AllocationFilters.tsx` | 6-filter bar with filter state persistence contract |
| Create | `src/components/allocation/__tests__/AllocationFilters.test.tsx` | Unit tests for filter bar |
| Create | `src/components/allocation/AllocationGrid.tsx` | Flat sorted table, 18 columns, checkbox, Split/Undo buttons |
| Create | `src/components/allocation/__tests__/AllocationGrid.test.tsx` | Render + sort + checkbox behavior tests |
| Create | `src/components/allocation/TCPopup.tsx` | K€ distribution modal triggered on Cost Type = TC |
| Create | `src/components/allocation/__tests__/TCPopup.test.tsx` | Pre-fill, running total, cancel reverts |
| Create | `src/components/allocation/SplitModal.tsx` | Split allocation modal with live preview |
| Create | `src/components/allocation/__tests__/SplitModal.test.tsx` | Min-2, sum-100%, FTE invariant, live preview |
| Modify | `src/pages/AllocationPage.tsx` | Orchestration: remove cards/diversity, wire all 4 components, filter persistence |

---

## Task 1: Type expansion + new calc utilities

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/allocationCalc.ts`
- Modify: `src/lib/__tests__/allocationCalc.test.ts`

- [ ] **Step 1.1 — Add failing tests for new calc functions**

Append to `src/lib/__tests__/allocationCalc.test.ts`:

```typescript
import {
  calcRowKeuro,
  validateAllocationSave,
  rowNeedsWarning,
  distributeTcKeByYear,
  splitFteProportional,
  applyAllocationFilters,
  sortAllocationRows,
} from '../allocationCalc';
import type { AllocationFilterState } from '../../types';

// (keep the existing describe blocks above, only modify the row() helper and add these)

describe('distributeTcKeByYear (ALLOC-BR-20)', () => {
  it('distributes proportionally to FTE share', () => {
    const result = distributeTcKeByYear(1000, { '2024': 1.0, '2025': 2.0, '2026': 1.0 });
    expect(result['2024']).toBeCloseTo(250);
    expect(result['2025']).toBeCloseTo(500);
    expect(result['2026']).toBeCloseTo(250);
  });

  it('returns zeros when totalFte is zero', () => {
    const result = distributeTcKeByYear(1000, { '2024': 0, '2025': 0 });
    expect(result['2024']).toBe(0);
    expect(result['2025']).toBe(0);
  });

  it('sum of distributed values equals totalKe (rounding tolerance)', () => {
    const result = distributeTcKeByYear(100, { '2024': 1.0, '2025': 1.0, '2026': 1.0 });
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, 1);
  });
});

describe('splitFteProportional (ALLOC-BR-23)', () => {
  it('splits FTE proportionally across two societes', () => {
    const result = splitFteProportional({ '2024': 2.0, '2025': 4.0 }, [25, 75]);
    expect(result[0]['2024']).toBeCloseTo(0.5);
    expect(result[0]['2025']).toBeCloseTo(1.0);
    expect(result[1]['2024']).toBeCloseTo(1.5);
    expect(result[1]['2025']).toBeCloseTo(3.0);
  });

  it('FTE sum per year equals original (invariant ALLOC-BR-23)', () => {
    const original = { '2024': 3.0, '2025': 5.0 };
    const result = splitFteProportional(original, [30, 70]);
    for (const year of Object.keys(original)) {
      const sum = result.reduce((acc, r) => acc + r[year], 0);
      expect(sum).toBeCloseTo(original[year], 1);
    }
  });
});

describe('applyAllocationFilters (ALLOC-BR-14, ALLOC-BR-25)', () => {
  const baseFilters: AllocationFilterState = {
    plSearch: '', metier: '', ownerN2: '', societe: '', costType: '', unresolvedOnly: false,
  };

  const rows = [
    row({ plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A', societe: 'Renault SAS-Paris', costType: 'FTE' }),
    row({ id: 'r2', plNumber: 'PL-02', plName: 'Project Beta', metier: 'H-TESTING', ownerN2: 'Zone-B', societe: null, costType: 'TC' }),
    row({ id: 'r3', plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A', societe: null, costType: 'FTE' }),
  ];

  it('empty filters return all rows', () => {
    expect(applyAllocationFilters(rows, baseFilters)).toHaveLength(3);
  });

  it('plSearch filters by plNumber', () => {
    expect(applyAllocationFilters(rows, { ...baseFilters, plSearch: 'PL-01' })).toHaveLength(2);
  });

  it('plSearch filters by plName (case-insensitive)', () => {
    expect(applyAllocationFilters(rows, { ...baseFilters, plSearch: 'beta' })).toHaveLength(1);
  });

  it('metier filter', () => {
    expect(applyAllocationFilters(rows, { ...baseFilters, metier: 'H-TESTING' })).toHaveLength(1);
  });

  it('societe = __unassigned__ shows only rows without societe', () => {
    const result = applyAllocationFilters(rows, { ...baseFilters, societe: '__unassigned__' });
    expect(result).toHaveLength(2);
    result.forEach(r => expect(r.societe).toBeNull());
  });

  it('unresolvedOnly shows rows missing societe OR costType', () => {
    const result = applyAllocationFilters(rows, { ...baseFilters, unresolvedOnly: true });
    expect(result).toHaveLength(2);
  });
});

describe('sortAllocationRows (ALLOC-BR-19)', () => {
  it('sorts by PL Number then Métier then Owner N2 then JU Code', () => {
    const unsorted = [
      row({ id: 'd', plNumber: 'PL-02', metier: 'H-DESIGN', ownerN2: 'Z', juCode: 'JU-01' }),
      row({ id: 'c', plNumber: 'PL-01', metier: 'H-TESTING', ownerN2: 'A', juCode: 'JU-01' }),
      row({ id: 'a', plNumber: 'PL-01', metier: 'H-DESIGN', ownerN2: 'A', juCode: 'JU-01' }),
      row({ id: 'b', plNumber: 'PL-01', metier: 'H-DESIGN', ownerN2: 'A', juCode: 'JU-02' }),
    ];
    const sorted = sortAllocationRows(unsorted);
    expect(sorted.map(r => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
```

- [ ] **Step 1.2 — Run tests to verify they fail (imports unresolved)**

```bash
npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `distributeTcKeByYear is not a function` (or similar import error).

- [ ] **Step 1.3 — Update `AllocationRow` in `src/types/index.ts`**

Replace the existing `AllocationSplit`, `AllocationRow`, and `Allocation` interfaces (lines ~186–205):

```typescript
export interface AllocationSplit {
  engineerId: string;
  percentage: number;
  days: number;
}

export interface AllocationRow extends AllocationSplit {
  id: string;
  // PL-level context (read-only in grid)
  plNumber: string;
  plName: string;
  metier: string;
  ownerN2: string;
  // JU-level identifiers (read-only)
  juCode: string;
  juDescription: string;
  fmmDescription: string;
  organType: string;
  energy: string;
  allianceCode: string;
  vehicleCode: string;
  standardEmissions: string;
  market: string;
  // FTE/K€ (read-only, from approved estimation)
  totalFte: number;
  fteByYear: Record<string, number>;
  keByYear: Record<string, number>;
  // Editable fields
  societe: string | null;
  costType: CostType;
  // Computed / state
  fte: number;
  keuro: number;
  isDirty: boolean;
  isSplitChild?: boolean;
  splitParentId?: string;
}

export interface Allocation {
  lineId: string;
  splits: AllocationRow[];
}

export interface AllocationFilterState {
  plSearch: string;
  metier: string;
  ownerN2: string;
  societe: string;       // '' = All, '__unassigned__' = no societe assigned
  costType: string;
  unresolvedOnly: boolean;
}
```

- [ ] **Step 1.4 — Update `row()` helper in `allocationCalc.test.ts`**

Replace the existing `row()` helper function (keep it in the same place, before the `describe` blocks):

```typescript
function row(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1',
    engineerId: 'eng-1',
    percentage: 100,
    days: 209,
    fte: 1.0,
    societe: null,
    costType: 'FTE',
    keuro: 0,
    isDirty: false,
    plNumber: 'PL-01',
    plName: 'Project Alpha',
    metier: 'H-DESIGN',
    ownerN2: 'Zone-A',
    juCode: 'JU-001',
    juDescription: 'Test JU',
    fmmDescription: '',
    organType: '',
    energy: '',
    allianceCode: '',
    vehicleCode: '',
    standardEmissions: '',
    market: '',
    totalFte: 1.0,
    fteByYear: { '2024': 0.5, '2025': 0.5 },
    keByYear: { '2024': 0, '2025': 0 },
    ...overrides,
  };
}
```

- [ ] **Step 1.5 — Add new functions to `src/lib/allocationCalc.ts`**

Append to the end of the file (keep all existing functions):

```typescript
import type { AllocationFilterState } from '../types';

export function distributeTcKeByYear(
  totalKe: number,
  fteByYear: Record<string, number>
): Record<string, number> {
  const totalFte = Object.values(fteByYear).reduce((a, b) => a + b, 0);
  if (totalFte === 0) {
    return Object.fromEntries(Object.keys(fteByYear).map(k => [k, 0]));
  }
  return Object.fromEntries(
    Object.entries(fteByYear).map(([year, fte]) => [
      year,
      Math.round((totalKe * (fte / totalFte)) * 100) / 100,
    ])
  );
}

export function splitFteProportional(
  fteByYear: Record<string, number>,
  percentages: number[]
): Record<string, number>[] {
  return percentages.map(pct =>
    Object.fromEntries(
      Object.entries(fteByYear).map(([year, fte]) => [
        year,
        Math.round((fte * (pct / 100)) * 100) / 100,
      ])
    )
  );
}

export function applyAllocationFilters(
  rows: AllocationRow[],
  filters: AllocationFilterState
): AllocationRow[] {
  return rows.filter(row => {
    if (filters.plSearch) {
      const q = filters.plSearch.toLowerCase();
      if (
        !row.plNumber.toLowerCase().includes(q) &&
        !row.plName.toLowerCase().includes(q)
      ) return false;
    }
    if (filters.metier && row.metier !== filters.metier) return false;
    if (filters.ownerN2 && row.ownerN2 !== filters.ownerN2) return false;
    if (filters.societe === '__unassigned__' && row.societe) return false;
    if (filters.societe && filters.societe !== '__unassigned__' && row.societe !== filters.societe) return false;
    if (filters.costType && row.costType !== filters.costType) return false;
    if (filters.unresolvedOnly && row.societe && row.costType) return false;
    return true;
  });
}

export function sortAllocationRows(rows: AllocationRow[]): AllocationRow[] {
  return [...rows].sort((a, b) => {
    const pl = a.plNumber.localeCompare(b.plNumber);
    if (pl !== 0) return pl;
    const mt = a.metier.localeCompare(b.metier);
    if (mt !== 0) return mt;
    const ow = a.ownerN2.localeCompare(b.ownerN2);
    if (ow !== 0) return ow;
    return a.juCode.localeCompare(b.juCode);
  });
}
```

Also add `AllocationRow` to the import at the top of `allocationCalc.ts`:

```typescript
import type { AllocationRow, AllocationFilterState } from '../types';
```

- [ ] **Step 1.6 — Run tests to verify they pass**

```bash
npm test 2>&1 | tail -10
```

Expected: all tests pass including the new `distributeTcKeByYear`, `splitFteProportional`, `applyAllocationFilters`, `sortAllocationRows` suites.

- [ ] **Step 1.7 — Typecheck**

```bash
npm run typecheck 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 1.8 — Commit**

```bash
git add src/types/index.ts src/lib/allocationCalc.ts src/lib/__tests__/allocationCalc.test.ts
git commit -m "feat(allocation): expand AllocationRow type, add calc utilities for TC/split/filter"
```

---

## Task 2: Update fixtures

**Files:**
- Modify: `src/fixtures/allocations.ts`
- Modify: `src/fixtures/societes.ts`

- [ ] **Step 2.1 — Read `src/fixtures/allocations.ts` and `src/fixtures/societes.ts` before editing**

- [ ] **Step 2.2 — Replace `src/fixtures/allocations.ts`**

Replace the entire file with (adding all new required fields to each `AllocationRow`, removing `diversity`):

```typescript
import type { Allocation, AllocationRow } from '../types';

function makeRow(overrides: Partial<AllocationRow> & Pick<AllocationRow, 'id' | 'juCode' | 'juDescription' | 'plNumber' | 'plName' | 'metier' | 'ownerN2'>): AllocationRow {
  return {
    engineerId: 'eng-1',
    percentage: 100,
    days: 209,
    fte: 1.0,
    totalFte: 1.0,
    fteByYear: { '2025': 0.5, '2026': 0.5 },
    keByYear: { '2025': 425, '2026': 425 },
    societe: null,
    costType: 'FTE',
    keuro: 850,
    isDirty: false,
    fmmDescription: 'FMM Desc',
    organType: 'INT',
    energy: 'BEV',
    allianceCode: 'AC-001',
    vehicleCode: 'VC-01',
    standardEmissions: 'EU7',
    market: 'EU',
    ...overrides,
  };
}

export const ALLOCATIONS: Allocation[] = [
  {
    lineId: 'line-1',
    splits: [
      makeRow({
        id: 'alloc-1-a',
        plNumber: 'PL-001',
        plName: 'Renault R5 EV Platform',
        metier: 'H-DESIGN',
        ownerN2: 'Zone-EMEA',
        juCode: 'JU-D-001',
        juDescription: 'System Design Phase 1',
        societe: 'Renault SAS-Paris',
        costType: 'FTE',
        keuro: 850,
      }),
    ],
  },
  {
    lineId: 'line-2',
    splits: [
      makeRow({
        id: 'alloc-2-a',
        plNumber: 'PL-002',
        plName: 'Scenic EV Homologation',
        metier: 'H-TESTING',
        ownerN2: 'Zone-EMEA',
        juCode: 'JU-T-001',
        juDescription: 'Thermal Test Campaign',
        societe: 'RNBV-Amsterdam',
        costType: 'FTE',
        percentage: 60,
        days: 125,
        fte: 0.6,
        totalFte: 1.0,
        fteByYear: { '2025': 0.3, '2026': 0.3 },
        keByYear: { '2025': 255, '2026': 255 },
        keuro: 510,
        isSplitChild: true,
        splitParentId: 'alloc-2-orig',
      }),
      makeRow({
        id: 'alloc-2-b',
        plNumber: 'PL-002',
        plName: 'Scenic EV Homologation',
        metier: 'H-TESTING',
        ownerN2: 'Zone-EMEA',
        juCode: 'JU-T-001',
        juDescription: 'Thermal Test Campaign',
        societe: 'Renault Korea',
        costType: 'TSA',
        percentage: 40,
        days: 84,
        fte: 0.4,
        totalFte: 1.0,
        fteByYear: { '2025': 0.2, '2026': 0.2 },
        keByYear: { '2025': 170, '2026': 170 },
        keuro: 340,
        isSplitChild: true,
        splitParentId: 'alloc-2-orig',
      }),
    ],
  },
  {
    lineId: 'line-3',
    splits: [
      makeRow({
        id: 'alloc-3-a',
        plNumber: 'PL-003',
        plName: 'Alpine A110 Refresh',
        metier: 'H-CUSTOMER',
        ownerN2: 'Zone-APAC',
        juCode: 'JU-C-001',
        juDescription: 'Customer Experience Audit',
        societe: 'Renault SAS-Paris',
        costType: 'TC',
        fteByYear: { '2025': 0.3, '2026': 0.7 },
        keByYear: { '2025': 255, '2026': 595 },
        keuro: 850,
      }),
    ],
  },
];
```

- [ ] **Step 2.3 — Update `src/fixtures/societes.ts`**

Read the file first. Then remove the `export` keyword from `DIVERSITY_OPTIONS` (keep the constant but unexported so no external code references it). If it's a named export `export const DIVERSITY_OPTIONS`, change to `const DIVERSITY_OPTIONS`.

- [ ] **Step 2.4 — Run typecheck**

```bash
npm run typecheck 2>&1 | head -30
```

Expected: no errors. If `AllocationPage.tsx` or other files reference `diversity` or `DIVERSITY_OPTIONS`, typecheck will flag them — note them but do NOT fix them in this task (that's Task 7).

- [ ] **Step 2.5 — Commit**

```bash
git add src/fixtures/allocations.ts src/fixtures/societes.ts
git commit -m "feat(allocation): update fixtures with PRD fields, remove diversity"
```

---

## Task 3: AllocationFilters component

**Files:**
- Create: `src/components/allocation/AllocationFilters.tsx`
- Create: `src/components/allocation/__tests__/AllocationFilters.test.tsx`

- [ ] **Step 3.1 — Write failing tests**

Create `src/components/allocation/__tests__/AllocationFilters.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AllocationFilters } from '../AllocationFilters';
import type { AllocationFilterState } from '../../../types';

const emptyFilters: AllocationFilterState = {
  plSearch: '', metier: '', ownerN2: '', societe: '', costType: '', unresolvedOnly: false,
};

const options = {
  metierOptions: ['H-DESIGN', 'H-TESTING'],
  ownerN2Options: ['Zone-A', 'Zone-B'],
  societeOptions: ['Renault SAS-Paris', 'RNBV-Amsterdam'],
};

describe('AllocationFilters', () => {
  it('renders all 6 filter controls', () => {
    render(<AllocationFilters filters={emptyFilters} onChange={() => {}} {...options} />);
    expect(screen.getByPlaceholderText(/PL Number/i)).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Métier/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Owner N2/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Société/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Cost Type/i })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: /unresolved/i })).toBeDefined();
  });

  it('calls onChange with updated plSearch', () => {
    const onChange = vi.fn();
    render(<AllocationFilters filters={emptyFilters} onChange={onChange} {...options} />);
    fireEvent.change(screen.getByPlaceholderText(/PL Number/i), { target: { value: 'PL-01' } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, plSearch: 'PL-01' });
  });

  it('calls onChange with __unassigned__ for Unassigned societe option', () => {
    const onChange = vi.fn();
    render(<AllocationFilters filters={emptyFilters} onChange={onChange} {...options} />);
    fireEvent.change(screen.getByRole('combobox', { name: /Société/i }), {
      target: { value: '__unassigned__' },
    });
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, societe: '__unassigned__' });
  });

  it('calls onChange with unresolvedOnly toggled', () => {
    const onChange = vi.fn();
    render(<AllocationFilters filters={emptyFilters} onChange={onChange} {...options} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /unresolved/i }));
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, unresolvedOnly: true });
  });
});
```

- [ ] **Step 3.2 — Run test to verify it fails**

```bash
npm test -- src/components/allocation/__tests__/AllocationFilters.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3.3 — Create `src/components/allocation/AllocationFilters.tsx`**

```typescript
import type { AllocationFilterState } from '../../types';

interface AllocationFiltersProps {
  filters: AllocationFilterState;
  onChange: (filters: AllocationFilterState) => void;
  metierOptions: string[];
  ownerN2Options: string[];
  societeOptions: string[];
}

export function AllocationFilters({
  filters,
  onChange,
  metierOptions,
  ownerN2Options,
  societeOptions,
}: AllocationFiltersProps) {
  const set = (patch: Partial<AllocationFilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border-b">
      <input
        type="text"
        placeholder="PL Number / Name"
        value={filters.plSearch}
        onChange={e => set({ plSearch: e.target.value })}
        className="border rounded px-2 py-1 text-sm w-44"
        aria-label="PL Number / Name search"
      />

      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-600">Métier</span>
        <select
          aria-label="Métier"
          value={filters.metier}
          onChange={e => set({ metier: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {metierOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>

      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-600">Owner N2</span>
        <select
          aria-label="Owner N2"
          value={filters.ownerN2}
          onChange={e => set({ ownerN2: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {ownerN2Options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>

      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-600">Société</span>
        <select
          aria-label="Société"
          value={filters.societe}
          onChange={e => set({ societe: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          <option value="__unassigned__">Unassigned</option>
          {societeOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-600">Cost Type</span>
        <select
          aria-label="Cost Type"
          value={filters.costType}
          onChange={e => set({ costType: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          <option value="FTE">FTE</option>
          <option value="TSA">TSA</option>
          <option value="TC">TC</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          aria-label="Show unresolved only"
          checked={filters.unresolvedOnly}
          onChange={e => set({ unresolvedOnly: e.target.checked })}
        />
        <span>Show unresolved only</span>
      </label>
    </div>
  );
}
```

- [ ] **Step 3.4 — Run tests to verify they pass**

```bash
npm test -- src/components/allocation/__tests__/AllocationFilters.test.tsx 2>&1 | tail -10
```

Expected: 4 tests pass.

- [ ] **Step 3.5 — Commit**

```bash
git add src/components/allocation/AllocationFilters.tsx src/components/allocation/__tests__/AllocationFilters.test.tsx
git commit -m "feat(allocation): add AllocationFilters component with 6 PRD filters"
```

---

## Task 4: AllocationGrid component

**Files:**
- Create: `src/components/allocation/AllocationGrid.tsx`
- Create: `src/components/allocation/__tests__/AllocationGrid.test.tsx`

- [ ] **Step 4.1 — Write failing tests**

Create `src/components/allocation/__tests__/AllocationGrid.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AllocationGrid } from '../AllocationGrid';
import type { AllocationRow } from '../../../types';

function row(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1', engineerId: 'eng-1', percentage: 100, days: 209, fte: 1.0, totalFte: 1.0,
    fteByYear: { '2025': 0.5, '2026': 0.5 }, keByYear: { '2025': 425, '2026': 425 },
    societe: null, costType: 'FTE', keuro: 850, isDirty: false,
    plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A',
    juCode: 'JU-001', juDescription: 'Test JU', fmmDescription: '', organType: 'INT',
    energy: 'BEV', allianceCode: 'AC-01', vehicleCode: 'VC-01', standardEmissions: 'EU7', market: 'EU',
    ...overrides,
  };
}

const noop = () => {};
const defaultProps = {
  rows: [row()],
  canEdit: true,
  selectedIds: [],
  onSelectRow: noop,
  onSelectAll: noop,
  onChangeSociete: noop,
  onChangeCostType: noop,
  onSplit: noop,
  onUndoSplit: noop,
  activeYears: ['2025', '2026'],
  canViewKeuro: true,
};

describe('AllocationGrid', () => {
  it('renders JU Code column', () => {
    render(<AllocationGrid {...defaultProps} />);
    expect(screen.getByText('JU-001')).toBeDefined();
  });

  it('renders FTE per year columns', () => {
    render(<AllocationGrid {...defaultProps} />);
    expect(screen.getByText('FTE 2025')).toBeDefined();
    expect(screen.getByText('FTE 2026')).toBeDefined();
  });

  it('renders K€ per year when canViewKeuro=true', () => {
    render(<AllocationGrid {...defaultProps} />);
    expect(screen.getByText('K€ 2025')).toBeDefined();
  });

  it('hides K€ columns when canViewKeuro=false', () => {
    render(<AllocationGrid {...defaultProps} canViewKeuro={false} />);
    expect(screen.queryByText('K€ 2025')).toBeNull();
  });

  it('check-all checkbox calls onSelectAll', () => {
    const onSelectAll = vi.fn();
    render(<AllocationGrid {...defaultProps} onSelectAll={onSelectAll} />);
    const checkAll = screen.getByRole('checkbox', { name: /select all/i });
    fireEvent.click(checkAll);
    expect(onSelectAll).toHaveBeenCalledWith(true);
  });

  it('row checkbox calls onSelectRow', () => {
    const onSelectRow = vi.fn();
    render(<AllocationGrid {...defaultProps} onSelectRow={onSelectRow} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // first data row checkbox
    expect(onSelectRow).toHaveBeenCalledWith('r1', true);
  });

  it('split-child row shows Undo button, not Split', () => {
    render(<AllocationGrid {...defaultProps} rows={[row({ isSplitChild: true, splitParentId: 'r0' })]} />);
    expect(screen.queryByText('Split')).toBeNull();
    expect(screen.getByText('Undo')).toBeDefined();
  });
});
```

- [ ] **Step 4.2 — Run test to verify it fails**

```bash
npm test -- src/components/allocation/__tests__/AllocationGrid.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 4.3 — Create `src/components/allocation/AllocationGrid.tsx`**

```typescript
import type { AllocationRow, CostType } from '../../types';
import { SOCIETES } from '../../fixtures/societes';

interface AllocationGridProps {
  rows: AllocationRow[];
  canEdit: boolean;
  selectedIds: string[];
  onSelectRow: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onChangeSociete: (rowId: string, societe: string) => void;
  onChangeCostType: (rowId: string, costType: CostType) => void;
  onSplit: (rowId: string) => void;
  onUndoSplit: (rowId: string) => void;
  activeYears: string[];
  canViewKeuro: boolean;
}

export function AllocationGrid({
  rows, canEdit, selectedIds, onSelectRow, onSelectAll,
  onChangeSociete, onChangeCostType, onSplit, onUndoSplit,
  activeYears, canViewKeuro,
}: AllocationGridProps) {
  const allSelected = rows.length > 0 && rows.every(r => selectedIds.includes(r.id));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            {canEdit && (
              <th className="px-2 py-1 border">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={e => onSelectAll(e.target.checked)}
                />
              </th>
            )}
            <th className="px-2 py-1 border text-left">Métier</th>
            <th className="px-2 py-1 border text-left">Owner N2</th>
            <th className="px-2 py-1 border text-left">PL #</th>
            <th className="px-2 py-1 border text-left">PL Name</th>
            <th className="px-2 py-1 border text-left">Société</th>
            <th className="px-2 py-1 border text-left">Cost Type</th>
            <th className="px-2 py-1 border text-left">Organ Type</th>
            <th className="px-2 py-1 border text-left">Energy</th>
            <th className="px-2 py-1 border text-left">Alliance</th>
            <th className="px-2 py-1 border text-left">Vehicle</th>
            <th className="px-2 py-1 border text-left">Emissions</th>
            <th className="px-2 py-1 border text-left">Market</th>
            <th className="px-2 py-1 border text-left">FMM Desc</th>
            <th className="px-2 py-1 border text-left">JU Desc</th>
            <th className="px-2 py-1 border text-left">JU Code</th>
            <th className="px-2 py-1 border text-right">Total FTE</th>
            {activeYears.map(y => (
              <th key={`fte-${y}`} className="px-2 py-1 border text-right">FTE {y}</th>
            ))}
            {canViewKeuro && activeYears.map(y => (
              <th key={`ke-${y}`} className="px-2 py-1 border text-right">K€ {y}</th>
            ))}
            {canEdit && <th className="px-2 py-1 border">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              className={`border-b hover:bg-blue-50 ${row.isDirty ? 'bg-amber-50' : ''}`}
            >
              {canEdit && (
                <td className="px-2 py-1 border text-center">
                  <input
                    type="checkbox"
                    aria-label={`Select row ${row.id}`}
                    checked={selectedIds.includes(row.id)}
                    onChange={e => onSelectRow(row.id, e.target.checked)}
                  />
                </td>
              )}
              <td className="px-2 py-1 border">{row.metier}</td>
              <td className="px-2 py-1 border">{row.ownerN2}</td>
              <td className="px-2 py-1 border font-mono">{row.plNumber}</td>
              <td className="px-2 py-1 border">{row.plName}</td>
              <td className="px-2 py-1 border">
                {canEdit ? (
                  <select
                    value={row.societe ?? ''}
                    onChange={e => onChangeSociete(row.id, e.target.value)}
                    className={`border rounded px-1 text-xs w-full ${!row.societe && row.costType !== 'FTE' ? 'border-red-400' : ''}`}
                  >
                    <option value="">— Unassigned —</option>
                    {SOCIETES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                ) : (
                  <span>{row.societe ?? '—'}</span>
                )}
              </td>
              <td className="px-2 py-1 border">
                {canEdit ? (
                  <select
                    value={row.costType}
                    onChange={e => onChangeCostType(row.id, e.target.value as CostType)}
                    className="border rounded px-1 text-xs"
                  >
                    <option value="FTE">FTE</option>
                    <option value="TSA">TSA</option>
                    <option value="TC">TC</option>
                  </select>
                ) : (
                  <span>{row.costType}</span>
                )}
              </td>
              <td className="px-2 py-1 border">{row.organType}</td>
              <td className="px-2 py-1 border">{row.energy}</td>
              <td className="px-2 py-1 border">{row.allianceCode}</td>
              <td className="px-2 py-1 border">{row.vehicleCode}</td>
              <td className="px-2 py-1 border">{row.standardEmissions}</td>
              <td className="px-2 py-1 border">{row.market}</td>
              <td className="px-2 py-1 border max-w-[120px] truncate" title={row.fmmDescription}>{row.fmmDescription}</td>
              <td className="px-2 py-1 border max-w-[120px] truncate" title={row.juDescription}>{row.juDescription}</td>
              <td className="px-2 py-1 border font-mono">{row.juCode}</td>
              <td className="px-2 py-1 border text-right">{row.totalFte.toFixed(2)}</td>
              {activeYears.map(y => (
                <td key={`fte-${y}`} className="px-2 py-1 border text-right">
                  {(row.fteByYear[y] ?? 0).toFixed(2)}
                </td>
              ))}
              {canViewKeuro && activeYears.map(y => (
                <td
                  key={`ke-${y}`}
                  className={`px-2 py-1 border text-right ${row.isDirty ? 'text-amber-600' : ''}`}
                >
                  {(row.keByYear[y] ?? 0).toFixed(0)}
                </td>
              ))}
              {canEdit && (
                <td className="px-2 py-1 border text-center">
                  {row.isSplitChild ? (
                    <button
                      onClick={() => onUndoSplit(row.id)}
                      className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100"
                    >
                      Undo
                    </button>
                  ) : (
                    <button
                      onClick={() => onSplit(row.id)}
                      className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100"
                    >
                      Split
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={99} className="px-4 py-6 text-center text-gray-400">
                No job units match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4.4 — Run tests to verify they pass**

```bash
npm test -- src/components/allocation/__tests__/AllocationGrid.test.tsx 2>&1 | tail -10
```

Expected: 7 tests pass.

- [ ] **Step 4.5 — Commit**

```bash
git add src/components/allocation/AllocationGrid.tsx src/components/allocation/__tests__/AllocationGrid.test.tsx
git commit -m "feat(allocation): add AllocationGrid component with 18 PRD columns"
```

---

## Task 5: TCPopup component

**Files:**
- Create: `src/components/allocation/TCPopup.tsx`
- Create: `src/components/allocation/__tests__/TCPopup.test.tsx`

- [ ] **Step 5.1 — Write failing tests**

Create `src/components/allocation/__tests__/TCPopup.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TCPopup } from '../TCPopup';
import type { AllocationRow } from '../../../types';

function tcRow(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1', engineerId: 'eng-1', percentage: 100, days: 209, fte: 1.0, totalFte: 1.0,
    fteByYear: { '2025': 1.0, '2026': 3.0 }, keByYear: { '2025': 0, '2026': 0 },
    societe: 'Renault SAS-Paris', costType: 'TC', keuro: 0, isDirty: false,
    plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A',
    juCode: 'JU-001', juDescription: '', fmmDescription: '', organType: '', energy: '',
    allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
    ...overrides,
  };
}

describe('TCPopup', () => {
  it('pre-fills K€ proportionally to FTE share (2025=25%, 2026=75% of 1000)', () => {
    render(<TCPopup open row={tcRow()} onConfirm={() => {}} onCancel={() => {}} />);
    // totalKe defaults to 0; user must type a total. Enter 1000 in the total input.
    const totalInput = screen.getByLabelText(/Total K€/i);
    fireEvent.change(totalInput, { target: { value: '1000' } });
    expect((screen.getByLabelText('K€ 2025') as HTMLInputElement).value).toBe('250');
    expect((screen.getByLabelText('K€ 2026') as HTMLInputElement).value).toBe('750');
  });

  it('shows running total of yearly K€ values', () => {
    render(<TCPopup open row={tcRow()} onConfirm={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Total K€/i), { target: { value: '1000' } });
    expect(screen.getByText(/Running total.*1000/i)).toBeDefined();
  });

  it('calls onConfirm with keByYear values on confirm', () => {
    const onConfirm = vi.fn();
    render(<TCPopup open row={tcRow()} onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Total K€/i), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith({ '2025': 250, '2026': 750 });
  });

  it('calls onCancel when cancelled', () => {
    const onCancel = vi.fn();
    render(<TCPopup open row={tcRow()} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('blocks confirm and shows error when societe is empty', () => {
    render(<TCPopup open row={tcRow({ societe: null })} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
    expect(screen.getByText(/societe is required/i)).toBeDefined();
  });
});
```

- [ ] **Step 5.2 — Run test to verify it fails**

```bash
npm test -- src/components/allocation/__tests__/TCPopup.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 5.3 — Create `src/components/allocation/TCPopup.tsx`**

```typescript
import { useState, useEffect } from 'react';
import type { AllocationRow } from '../../types';
import { distributeTcKeByYear } from '../../lib/allocationCalc';
import { Modal } from '../shared/Modal';

interface TCPopupProps {
  open: boolean;
  row: AllocationRow;
  onConfirm: (keByYear: Record<string, number>) => void;
  onCancel: () => void;
}

export function TCPopup({ open, row, onConfirm, onCancel }: TCPopupProps) {
  const years = Object.keys(row.fteByYear).sort();
  const [totalKe, setTotalKe] = useState(0);
  const [yearlyKe, setYearlyKe] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      setTotalKe(0);
      setYearlyKe(Object.fromEntries(years.map(y => [y, 0])));
    }
  }, [open, row.id]);

  const handleTotalChange = (value: number) => {
    setTotalKe(value);
    setYearlyKe(distributeTcKeByYear(value, row.fteByYear));
  };

  const handleYearChange = (year: string, value: number) => {
    setYearlyKe(prev => ({ ...prev, [year]: value }));
  };

  const runningTotal = Object.values(yearlyKe).reduce((a, b) => a + b, 0);
  const canConfirm = !!row.societe;

  return (
    <Modal open={open} title={`TC K€ — ${row.juCode} / ${row.plName}`} onClose={onCancel}>
      {!row.societe && (
        <p className="text-red-600 text-sm mb-3">Société is required before setting TC K€.</p>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="tc-total-ke">
          Total K€
        </label>
        <input
          id="tc-total-ke"
          aria-label="Total K€"
          type="number"
          min={0}
          value={totalKe || ''}
          onChange={e => handleTotalChange(parseFloat(e.target.value) || 0)}
          className="border rounded px-2 py-1 text-sm w-32"
        />
        <span className="ml-2 text-xs text-gray-500">Pre-fills by FTE share</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {years.map(year => (
          <label key={year} className="flex flex-col text-sm gap-1">
            <span>K€ {year}</span>
            <input
              aria-label={`K€ ${year}`}
              type="number"
              min={0}
              value={yearlyKe[year] ?? 0}
              onChange={e => handleYearChange(year, parseFloat(e.target.value) || 0)}
              className="border rounded px-2 py-1 text-sm w-28"
            />
          </label>
        ))}
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Running total: <strong>{runningTotal.toFixed(0)} K€</strong>
      </p>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          disabled={!canConfirm}
          onClick={() => onConfirm(yearlyKe)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5.4 — Run tests to verify they pass**

```bash
npm test -- src/components/allocation/__tests__/TCPopup.test.tsx 2>&1 | tail -10
```

Expected: 5 tests pass.

- [ ] **Step 5.5 — Commit**

```bash
git add src/components/allocation/TCPopup.tsx src/components/allocation/__tests__/TCPopup.test.tsx
git commit -m "feat(allocation): add TCPopup for K€ distribution when Cost Type=TC"
```

---

## Task 6: SplitModal component

**Files:**
- Create: `src/components/allocation/SplitModal.tsx`
- Create: `src/components/allocation/__tests__/SplitModal.test.tsx`

- [ ] **Step 6.1 — Write failing tests**

Create `src/components/allocation/__tests__/SplitModal.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitModal } from '../SplitModal';
import type { AllocationRow } from '../../../types';

function splitRow(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1', engineerId: 'eng-1', percentage: 100, days: 209, fte: 1.0, totalFte: 1.0,
    fteByYear: { '2025': 1.0, '2026': 2.0 }, keByYear: { '2025': 850, '2026': 1700 },
    societe: null, costType: 'FTE', keuro: 2550, isDirty: false,
    plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A',
    juCode: 'JU-001', juDescription: '', fmmDescription: '', organType: '', energy: '',
    allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
    ...overrides,
  };
}

const societeOptions = ['Renault SAS-Paris', 'RNBV-Amsterdam', 'Renault Korea'];

describe('SplitModal', () => {
  it('starts with exactly 2 société slots (ALLOC-BR-22)', () => {
    render(<SplitModal open row={splitRow()} societeOptions={societeOptions} onConfirm={() => {}} onClose={() => {}} />);
    const pctInputs = screen.getAllByRole('spinbutton');
    expect(pctInputs).toHaveLength(2);
  });

  it('Confirm disabled when percentages do not sum to 100 (ALLOC-BR-11)', () => {
    render(<SplitModal open row={splitRow()} societeOptions={societeOptions} onConfirm={() => {}} onClose={() => {}} />);
    const [pct1] = screen.getAllByRole('spinbutton');
    fireEvent.change(pct1, { target: { value: '30' } });
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  it('Confirm enabled when percentages sum to 100', () => {
    render(<SplitModal open row={splitRow()} societeOptions={societeOptions} onConfirm={() => {}} onClose={() => {}} />);
    const [pct1, pct2] = screen.getAllByRole('spinbutton');
    fireEvent.change(pct1, { target: { value: '40' } });
    fireEvent.change(pct2, { target: { value: '60' } });
    expect(screen.getByRole('button', { name: /confirm/i })).not.toBeDisabled();
  });

  it('live preview shows FTE per year updating as percentage changes', () => {
    render(<SplitModal open row={splitRow()} societeOptions={societeOptions} onConfirm={() => {}} onClose={() => {}} />);
    const [pct1] = screen.getAllByRole('spinbutton');
    fireEvent.change(pct1, { target: { value: '50' } });
    // Row 1 should show FTE 2025 = 0.50 (50% of 1.0)
    expect(screen.getByText('0.50')).toBeDefined();
  });

  it('calls onConfirm with societe+percentage pairs', () => {
    const onConfirm = vi.fn();
    render(<SplitModal open row={splitRow()} societeOptions={societeOptions} onConfirm={onConfirm} onClose={() => {}} />);
    const [pct1, pct2] = screen.getAllByRole('spinbutton');
    fireEvent.change(pct1, { target: { value: '60' } });
    fireEvent.change(pct2, { target: { value: '40' } });
    // Select societes
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Renault SAS-Paris' } });
    fireEvent.change(selects[1], { target: { value: 'RNBV-Amsterdam' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith([
      { societe: 'Renault SAS-Paris', percentage: 60 },
      { societe: 'RNBV-Amsterdam', percentage: 40 },
    ]);
  });
});
```

- [ ] **Step 6.2 — Run test to verify it fails**

```bash
npm test -- src/components/allocation/__tests__/SplitModal.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 6.3 — Create `src/components/allocation/SplitModal.tsx`**

```typescript
import { useState, useEffect } from 'react';
import type { AllocationRow } from '../../types';
import { splitFteProportional } from '../../lib/allocationCalc';
import { Modal } from '../shared/Modal';

interface SplitSlot {
  societe: string;
  percentage: number;
}

interface SplitModalProps {
  open: boolean;
  row: AllocationRow;
  societeOptions: string[];
  onConfirm: (slots: SplitSlot[]) => void;
  onClose: () => void;
}

export function SplitModal({ open, row, societeOptions, onConfirm, onClose }: SplitModalProps) {
  const years = Object.keys(row.fteByYear).sort();
  const [slots, setSlots] = useState<SplitSlot[]>([
    { societe: '', percentage: 50 },
    { societe: '', percentage: 50 },
  ]);

  useEffect(() => {
    if (open) {
      setSlots([{ societe: '', percentage: 50 }, { societe: '', percentage: 50 }]);
    }
  }, [open, row.id]);

  const updateSlot = (idx: number, patch: Partial<SplitSlot>) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const addSlot = () => setSlots(prev => [...prev, { societe: '', percentage: 0 }]);

  const pctSum = slots.reduce((a, s) => a + s.percentage, 0);
  const canConfirm = pctSum === 100 && slots.length >= 2;

  const ftePreviewBySlot = splitFteProportional(row.fteByYear, slots.map(s => s.percentage));

  return (
    <Modal open={open} title={`Split — ${row.juCode} / ${row.plName}`} onClose={onClose}>
      <p className="text-sm text-gray-500 mb-3">
        Total FTE: {row.totalFte.toFixed(2)} — distribute by percentage (must sum to 100%)
      </p>

      <table className="w-full text-sm mb-3 border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 border text-left">Société</th>
            <th className="px-2 py-1 border text-right">%</th>
            {years.map(y => (
              <th key={y} className="px-2 py-1 border text-right">FTE {y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, idx) => (
            <tr key={idx}>
              <td className="px-2 py-1 border">
                <select
                  value={slot.societe}
                  onChange={e => updateSlot(idx, { societe: e.target.value })}
                  className="border rounded px-1 text-sm w-full"
                >
                  <option value="">— Select —</option>
                  {societeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-2 py-1 border">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={slot.percentage}
                  onChange={e => updateSlot(idx, { percentage: parseFloat(e.target.value) || 0 })}
                  className="border rounded px-1 text-sm w-16 text-right"
                />
              </td>
              {years.map((y, yi) => (
                <td key={y} className="px-2 py-1 border text-right text-gray-700">
                  {(ftePreviewBySlot[idx]?.[y] ?? 0).toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className={`text-sm mb-3 ${pctSum !== 100 ? 'text-red-600' : 'text-green-700'}`}>
        Total: {pctSum}% {pctSum !== 100 ? `(${100 - pctSum > 0 ? '+' : ''}${pctSum - 100}% remaining)` : '✓'}
      </p>

      <div className="flex justify-between items-center">
        <button
          onClick={addSlot}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add société
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">
            Cancel
          </button>
          <button
            disabled={!canConfirm}
            onClick={() => onConfirm(slots)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 6.4 — Run tests to verify they pass**

```bash
npm test -- src/components/allocation/__tests__/SplitModal.test.tsx 2>&1 | tail -10
```

Expected: 5 tests pass.

- [ ] **Step 6.5 — Commit**

```bash
git add src/components/allocation/SplitModal.tsx src/components/allocation/__tests__/SplitModal.test.tsx
git commit -m "feat(allocation): add SplitModal with live preview, min-2 rule, 100% validation"
```

---

## Task 7: AllocationPage refactor (orchestration)

**Files:**
- Modify: `src/pages/AllocationPage.tsx`

This task replaces the page entirely. Read the current file first, then replace it.

- [ ] **Step 7.1 — Read `src/pages/AllocationPage.tsx` before editing**

- [ ] **Step 7.2 — Replace `src/pages/AllocationPage.tsx`**

```typescript
import { useState, useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { usePermissions } from '../lib/permissions';
import { RoleGate } from '../components/shared/RoleGate';
import { AllocationFilters } from '../components/allocation/AllocationFilters';
import { AllocationGrid } from '../components/allocation/AllocationGrid';
import { TCPopup } from '../components/allocation/TCPopup';
import { SplitModal } from '../components/allocation/SplitModal';
import { Modal } from '../components/shared/Modal';
import type { AllocationRow, AllocationFilterState, CostType } from '../types';
import {
  applyAllocationFilters,
  sortAllocationRows,
  splitFteProportional,
  validateAllocationSave,
} from '../lib/allocationCalc';
import { SOCIETES } from '../fixtures/societes';

const EMPTY_FILTERS: AllocationFilterState = {
  plSearch: '', metier: '', ownerN2: '', societe: '', costType: '', unresolvedOnly: false,
};

const ACTIVE_YEARS = ['2025', '2026'];

function AllocationContent() {
  const { can } = usePermissions();
  const allocations = useDataStore(s => s.allocations);
  const saveDirtyAllocations = useDataStore(s => s.saveDirtyAllocations);

  // Single source of truth — includes split children inserted inline (not in the store)
  const [displayRows, setDisplayRows] = useState<AllocationRow[]>(() =>
    sortAllocationRows(allocations.flatMap(a => a.splits))
  );

  // Filters — preserved across in-page actions, reset on unmount (ALLOC-BR-14)
  const [filters, setFilters] = useState<AllocationFilterState>(EMPTY_FILTERS);
  const filteredRows = useMemo(() => applyAllocationFilters(displayRows, filters), [displayRows, filters]);

  // Bulk selection scoped to filteredRows (ALLOC-BR-25)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const handleSelectRow = (id: string, checked: boolean) =>
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? filteredRows.map(r => r.id) : []);

  const updateRow = (id: string, patch: Partial<AllocationRow>) =>
    setDisplayRows(prev => prev.map(r => r.id === id ? { ...r, ...patch, isDirty: true } : r));

  // Inline cell changes
  const handleChangeSociete = (rowId: string, societe: string) =>
    updateRow(rowId, { societe: societe || null });

  const handleChangeCostType = (rowId: string, costType: CostType) => {
    updateRow(rowId, { costType });
    if (costType === 'TC') {
      setTcTarget(displayRows.find(r => r.id === rowId) ?? null);
    }
  };

  // TC popup (ALLOC-BR-20/21)
  const [tcTarget, setTcTarget] = useState<AllocationRow | null>(null);
  const handleTcConfirm = (keByYear: Record<string, number>) => {
    if (tcTarget) updateRow(tcTarget.id, { keByYear });
    setTcTarget(null);
  };
  const handleTcCancel = () => {
    if (tcTarget) {
      // Revert costType to its value before the TC change
      const original = allocations.flatMap(a => a.splits).find(r => r.id === tcTarget.id);
      if (original) updateRow(tcTarget.id, { costType: original.costType, isDirty: false });
    }
    setTcTarget(null);
  };

  // Split (ALLOC-BR-22/23/24)
  const [splitTarget, setSplitTarget] = useState<AllocationRow | null>(null);
  const handleSplitConfirm = (slots: Array<{ societe: string; percentage: number }>) => {
    if (!splitTarget) return;
    const childFteByYear = splitFteProportional(splitTarget.fteByYear, slots.map(s => s.percentage));
    const children: AllocationRow[] = slots.map((slot, i) => ({
      ...splitTarget,
      id: `${splitTarget.id}-split-${i}`,
      societe: slot.societe || null,
      percentage: slot.percentage,
      fteByYear: childFteByYear[i],
      keByYear: Object.fromEntries(Object.keys(splitTarget.fteByYear).map(y => [y, 0])),
      isSplitChild: true,
      splitParentId: splitTarget.id,
      isDirty: true,
    }));
    // Replace parent row with child rows in place
    setDisplayRows(prev => {
      const idx = prev.findIndex(r => r.id === splitTarget.id);
      return [...prev.slice(0, idx), ...children, ...prev.slice(idx + 1)];
    });
    setSplitTarget(null);
  };

  // Undo split (ALLOC-BR-12): restore original row from store, remove all children
  const handleUndoSplit = (rowId: string) => {
    const row = displayRows.find(r => r.id === rowId);
    if (!row?.splitParentId) return;
    const parentId = row.splitParentId;
    const original = allocations.flatMap(a => a.splits).find(r => r.id === parentId);
    if (!original) return;
    setDisplayRows(prev => {
      const firstChildIdx = prev.findIndex(r => r.splitParentId === parentId);
      const withoutChildren = prev.filter(r => r.splitParentId !== parentId);
      return [
        ...withoutChildren.slice(0, firstChildIdx),
        { ...original, isDirty: false },
        ...withoutChildren.slice(firstChildIdx),
      ];
    });
  };

  // Bulk société (ALLOC-BR-09/10)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSociete, setBulkSociete] = useState('');
  const handleBulkApply = () => {
    setDisplayRows(prev =>
      prev.map(r => selectedIds.includes(r.id) ? { ...r, societe: bulkSociete, isDirty: true } : r)
    );
    setSelectedIds([]);
    setShowBulkModal(false);
    setBulkSociete('');
  };

  // Save
  const handleSave = () => {
    const dirty = displayRows.filter(r => r.isDirty);
    const { valid, errors } = validateAllocationSave(dirty);
    if (!valid) { alert(errors.join('\n')); return; }
    saveDirtyAllocations(dirty);
    setDisplayRows(prev => prev.map(r => ({ ...r, isDirty: false })));
  };

  // Derived filter dropdown options
  const metierOptions = useMemo(() => [...new Set(displayRows.map(r => r.metier))].sort(), [displayRows]);
  const ownerN2Options = useMemo(() => [...new Set(displayRows.map(r => r.ownerN2))].sort(), [displayRows]);
  const societeOptions = useMemo(() => SOCIETES.map(s => s.name), []);

  const dirtyCount = displayRows.filter(r => r.isDirty).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Allocation</h1>
          <p className="text-sm text-gray-500">Assignment of approved job units to societes and cost types.</p>
        </div>
        <div className="flex gap-2 items-center">
          {can('edit:allocation') && selectedIds.length > 0 && (
            <button onClick={() => setShowBulkModal(true)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">
              Bulk assign société ({selectedIds.length})
            </button>
          )}
          {can('edit:allocation') && dirtyCount > 0 && (
            <button onClick={handleSave} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              Save ({dirtyCount} changed)
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <AllocationFilters
        filters={filters}
        onChange={setFilters}
        metierOptions={metierOptions}
        ownerN2Options={ownerN2Options}
        societeOptions={societeOptions}
      />

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <AllocationGrid
          rows={filteredRows}
          canEdit={can('edit:allocation')}
          selectedIds={selectedIds}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          onChangeSociete={handleChangeSociete}
          onChangeCostType={handleChangeCostType}
          onSplit={id => setSplitTarget(displayRows.find(r => r.id === id) ?? null)}
          onUndoSplit={handleUndoSplit}
          activeYears={ACTIVE_YEARS}
          canViewKeuro={can('view:k-euro-rates')}
        />
      </div>

      {tcTarget && <TCPopup open row={tcTarget} onConfirm={handleTcConfirm} onCancel={handleTcCancel} />}
      {splitTarget && (
        <SplitModal open row={splitTarget} societeOptions={societeOptions} onConfirm={handleSplitConfirm} onClose={() => setSplitTarget(null)} />
      )}

      <Modal open={showBulkModal} title="Bulk assign société" onClose={() => setShowBulkModal(false)}>
        <p className="text-sm text-gray-600 mb-3">
          Assign société to {selectedIds.length} selected row{selectedIds.length !== 1 ? 's' : ''}.
          Cost type is not changed (ALLOC-BR-10).
        </p>
        <select value={bulkSociete} onChange={e => setBulkSociete(e.target.value)} className="border rounded px-2 py-1 text-sm w-full mb-4">
          <option value="">— Select société —</option>
          {societeOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex justify-end gap-2">
          <button onClick={() => setShowBulkModal(false)} className="px-3 py-1 text-sm border rounded">Cancel</button>
          <button disabled={!bulkSociete} onClick={handleBulkApply} className="px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-40">
            Apply to selected
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function AllocationPage() {
  return (
    <RoleGate permission="view:allocation">
      <AllocationContent />
    </RoleGate>
  );
}
```

- [ ] **Step 7.3 — Run typecheck**

```bash
npm run typecheck 2>&1 | head -30
```

Fix any TypeScript errors before continuing. Common issues:
- `saveDirtyAllocations` in the store may need a signature update if it doesn't accept `AllocationRow[]` — check `src/store/dataStore.ts` and adjust the call or the store action.
- `SOCIETES` structure — confirm the `{ id, name }` shape matches `fixtures/societes.ts`.

- [ ] **Step 7.4 — Run all tests**

```bash
npm test 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 7.5 — Commit**

```bash
git add src/pages/AllocationPage.tsx
git commit -m "feat(allocation): refactor AllocationPage — unified grid, TC popup, split, bulk check-all"
```

---

## Task 8: Final validation

- [ ] **Step 8.1 — Full test suite**

```bash
npm test 2>&1
```

Expected: all tests pass.

- [ ] **Step 8.2 — Typecheck**

```bash
npm run typecheck 2>&1
```

Expected: no errors.

- [ ] **Step 8.3 — Lint**

```bash
npm run lint 2>&1
```

Fix any lint errors.

- [ ] **Step 8.4 — Run SDD Kit conformance tests**

```bash
cd /home/nujovich/ux_great_prototype && pytest node_modules/great-sdd-kit/tests/ -v 2>&1 | tail -10
```

Expected: 341/341 pass.

- [ ] **Step 8.5 — Final commit if any lint fixes were needed**

```bash
git add -p
git commit -m "chore(allocation): lint fixes post-refactor"
```
