# Estimation UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Pre-Estimation page with a compact table, a centered full-screen estimation modal, real Inductor→Cran→JobUnit data hierarchy, bulk-estimate wiring, and "Modo Compatibles" grouping.

**Architecture:** New `Cran`/`JobUnit` types replace the old flat `InductorValue`. The estimation modal is rebuilt as a centered overlay with a tree view (Inductor→Cran→JUs) and a flat JU view, both sharing a search string. `ManageInductorsModal` is a separate component. `PreEstimationPage` gains a compatible-mode toggle.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, Vite, Lucide icons.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/types/index.ts` | Add `Cran`, `JobUnit`, `JUOccurrence`, `InductorSelection`; update `Estimation`; remove `InductorValue` |
| Create | `src/fixtures/crans.ts` | All cran variants per inductor |
| Create | `src/fixtures/jobUnits.ts` | JU library records per cran |
| Modify | `src/fixtures/index.ts` | Re-export new fixture files |
| Modify | `src/lib/calc.ts` | Update `calcTotalDays` signature |
| Modify | `src/store/dataStore.ts` | Update `copyEstimation` for new shape |
| Modify | `src/components/grid/ProjectLineGrid.tsx` | Compact row styles |
| Rewrite | `src/components/estimation/EstimationPanel.tsx` | Centered modal with tree/flat views, search, lock, persist |
| Create | `src/components/estimation/ManageInductorsModal.tsx` | Grouped inductor add/remove dialog |
| Modify | `src/components/estimation/CopyEstimationModal.tsx` | No data-shape change needed (copies opaque `Estimation` object) |
| Modify | `src/pages/PreEstimationPage.tsx` | Bulk-estimate opens modal; Modo Compatibles toggle |

---

## Task 1: Update types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Replace `InductorValue` and update `Estimation`** — open `src/types/index.ts` and make these changes:

```typescript
// REMOVE this interface entirely:
// export interface InductorValue { ... }

// ADD after the Inductor interface:
export interface Cran {
  id: string;
  inductorId: string;
  name: string;
}

export interface JobUnit {
  id: string;
  cranId: string;
  inductorId: string;
  shortName: string;
  description: string;
  variable: number;
  fixed: number;
  unitType: 'ManDay' | 'BenchHours' | 'Kilometres' | 'KEuros';
  fmm?: string;
  smm?: string;
  dmm?: string;
  genericProfile?: string;
  comment?: string;
}

export interface JUOccurrence {
  juId: string;
  occurrence: number;
  locked: boolean;
}

export interface InductorSelection {
  inductorId: string;
  selectedCranId: string | null;
  inductorOccurrence: number;
  juOccurrences: JUOccurrence[];
}

// REPLACE the Estimation interface with:
export interface Estimation {
  lineId: string;
  inductorSelections: InductorSelection[];
  customJUs: CustomJU[];
  globalOccurrences: number;
  yearlyBreakdown: number[];
  totalDays: number;
  totalKEuro: number;
  status: LineStatus;
  draftedAt?: string;
  estimatedAt?: string;
}
```

- [ ] **Verify TypeScript still compiles** (calc.ts and dataStore.ts will have errors — that is expected until Tasks 5–6):

```bash
cd /mnt/c/Users/NadiaUjovich/ux_great_prototype && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Cran, JobUnit, InductorSelection types; update Estimation"
```

---

## Task 2: Create crans fixture

**Files:**
- Create: `src/fixtures/crans.ts`

- [ ] **Create `src/fixtures/crans.ts`** with this exact content:

```typescript
import type { Cran } from '../types';

export const CRANS: Cran[] = [
  // ind-1: API endpoints
  { id: 'cr-1-1', inductorId: 'ind-1', name: 'REST Standard' },
  { id: 'cr-1-2', inductorId: 'ind-1', name: 'REST + Auth' },
  { id: 'cr-1-3', inductorId: 'ind-1', name: 'GraphQL' },
  // ind-2: DB tables
  { id: 'cr-2-1', inductorId: 'ind-2', name: 'PostgreSQL' },
  { id: 'cr-2-2', inductorId: 'ind-2', name: 'MySQL' },
  // ind-3: Integraciones externas
  { id: 'cr-3-1', inductorId: 'ind-3', name: 'HTTP REST' },
  { id: 'cr-3-2', inductorId: 'ind-3', name: 'SOAP' },
  { id: 'cr-3-3', inductorId: 'ind-3', name: 'Event-Driven' },
  // ind-4: Pantallas UI
  { id: 'cr-4-1', inductorId: 'ind-4', name: 'Basic' },
  { id: 'cr-4-2', inductorId: 'ind-4', name: 'Rich / Interactive' },
  // ind-5: Componentes reutilizables
  { id: 'cr-5-1', inductorId: 'ind-5', name: 'Simple' },
  { id: 'cr-5-2', inductorId: 'ind-5', name: 'Complex' },
  // ind-6: Pipelines ETL
  { id: 'cr-6-1', inductorId: 'ind-6', name: 'Batch' },
  { id: 'cr-6-2', inductorId: 'ind-6', name: 'Streaming' },
  // ind-7: Reportes / dashboards
  { id: 'cr-7-1', inductorId: 'ind-7', name: 'Static' },
  { id: 'cr-7-2', inductorId: 'ind-7', name: 'Interactive' },
  // ind-8: Despliegues infra
  { id: 'cr-8-1', inductorId: 'ind-8', name: 'Standard' },
  { id: 'cr-8-2', inductorId: 'ind-8', name: 'Blue-Green' },
  // ind-9: Test cases E2E
  { id: 'cr-9-1', inductorId: 'ind-9', name: 'Selenium' },
  { id: 'cr-9-2', inductorId: 'ind-9', name: 'Playwright' },
  // ind-10: Vistas mobile
  { id: 'cr-10-1', inductorId: 'ind-10', name: 'Native iOS/Android' },
  { id: 'cr-10-2', inductorId: 'ind-10', name: 'React Native' },
  // ind-11: Migraciones de datos
  { id: 'cr-11-1', inductorId: 'ind-11', name: 'Simple (CSV/flat)' },
  { id: 'cr-11-2', inductorId: 'ind-11', name: 'Complex (relational)' },
  // ind-12: Documentación técnica
  { id: 'cr-12-1', inductorId: 'ind-12', name: 'Standard' },
  { id: 'cr-12-2', inductorId: 'ind-12', name: 'Extended' },
];
```

- [ ] **Commit**

```bash
git add src/fixtures/crans.ts
git commit -m "feat: add crans fixture"
```

---

## Task 3: Create jobUnits fixture

**Files:**
- Create: `src/fixtures/jobUnits.ts`

- [ ] **Create `src/fixtures/jobUnits.ts`** with this exact content:

```typescript
import type { JobUnit } from '../types';

export const JOB_UNITS: JobUnit[] = [
  // ── cr-1-1: API endpoints / REST Standard ──
  { id: 'ju-1-1-1', cranId: 'cr-1-1', inductorId: 'ind-1', shortName: 'API-S01', description: 'Setup & scaffolding', variable: 0, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-1-1-2', cranId: 'cr-1-1', inductorId: 'ind-1', shortName: 'API-S02', description: 'CRUD endpoints per resource', variable: 1.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-1-1-3', cranId: 'cr-1-1', inductorId: 'ind-1', shortName: 'API-S03', description: 'Integration tests', variable: 0.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-1-2: API endpoints / REST + Auth ──
  { id: 'ju-1-2-1', cranId: 'cr-1-2', inductorId: 'ind-1', shortName: 'API-A01', description: 'Auth middleware & guards', variable: 0, fixed: 2.0, unitType: 'ManDay' },
  { id: 'ju-1-2-2', cranId: 'cr-1-2', inductorId: 'ind-1', shortName: 'API-A02', description: 'CRUD endpoints per resource', variable: 1.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-1-2-3', cranId: 'cr-1-2', inductorId: 'ind-1', shortName: 'API-A03', description: 'Token & session management', variable: 0, fixed: 1.5, unitType: 'ManDay' },

  // ── cr-1-3: API endpoints / GraphQL ──
  { id: 'ju-1-3-1', cranId: 'cr-1-3', inductorId: 'ind-1', shortName: 'API-G01', description: 'Schema definition', variable: 0.8, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-1-3-2', cranId: 'cr-1-3', inductorId: 'ind-1', shortName: 'API-G02', description: 'Resolvers per type', variable: 2.0, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-1-3-3', cranId: 'cr-1-3', inductorId: 'ind-1', shortName: 'API-G03', description: 'Subscriptions', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-2-1: DB tables / PostgreSQL ──
  { id: 'ju-2-1-1', cranId: 'cr-2-1', inductorId: 'ind-2', shortName: 'DB-P01', description: 'Table schema & migrations', variable: 0.5, fixed: 0.3, unitType: 'ManDay' },
  { id: 'ju-2-1-2', cranId: 'cr-2-1', inductorId: 'ind-2', shortName: 'DB-P02', description: 'Indexes & constraints', variable: 0.3, fixed: 0.2, unitType: 'ManDay' },

  // ── cr-2-2: DB tables / MySQL ──
  { id: 'ju-2-2-1', cranId: 'cr-2-2', inductorId: 'ind-2', shortName: 'DB-M01', description: 'Table schema & migrations', variable: 0.5, fixed: 0.3, unitType: 'ManDay' },
  { id: 'ju-2-2-2', cranId: 'cr-2-2', inductorId: 'ind-2', shortName: 'DB-M02', description: 'Indexes & constraints', variable: 0.3, fixed: 0.2, unitType: 'ManDay' },

  // ── cr-3-1: Integraciones externas / HTTP REST ──
  { id: 'ju-3-1-1', cranId: 'cr-3-1', inductorId: 'ind-3', shortName: 'INT-R01', description: 'HTTP client setup & auth', variable: 0, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-3-1-2', cranId: 'cr-3-1', inductorId: 'ind-3', shortName: 'INT-R02', description: 'Endpoint integration per service', variable: 3.0, fixed: 0, unitType: 'ManDay' },

  // ── cr-3-2: Integraciones externas / SOAP ──
  { id: 'ju-3-2-1', cranId: 'cr-3-2', inductorId: 'ind-3', shortName: 'INT-S01', description: 'WSDL parsing & client generation', variable: 0, fixed: 2.5, unitType: 'ManDay' },
  { id: 'ju-3-2-2', cranId: 'cr-3-2', inductorId: 'ind-3', shortName: 'INT-S02', description: 'Operation mapping per service', variable: 2.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-3-3: Integraciones externas / Event-Driven ──
  { id: 'ju-3-3-1', cranId: 'cr-3-3', inductorId: 'ind-3', shortName: 'INT-E01', description: 'Message broker setup', variable: 0, fixed: 2.0, unitType: 'ManDay' },
  { id: 'ju-3-3-2', cranId: 'cr-3-3', inductorId: 'ind-3', shortName: 'INT-E02', description: 'Event handler per topic', variable: 1.5, fixed: 0, unitType: 'ManDay' },

  // ── cr-4-1: Pantallas UI / Basic ──
  { id: 'ju-4-1-1', cranId: 'cr-4-1', inductorId: 'ind-4', shortName: 'UI-B01', description: 'Layout & navigation', variable: 1.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-4-1-2', cranId: 'cr-4-1', inductorId: 'ind-4', shortName: 'UI-B02', description: 'Form screens', variable: 0.8, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-4-2: Pantallas UI / Rich Interactive ──
  { id: 'ju-4-2-1', cranId: 'cr-4-2', inductorId: 'ind-4', shortName: 'UI-R01', description: 'Layout & navigation', variable: 1.8, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-4-2-2', cranId: 'cr-4-2', inductorId: 'ind-4', shortName: 'UI-R02', description: 'Complex form screens', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-4-2-3', cranId: 'cr-4-2', inductorId: 'ind-4', shortName: 'UI-R03', description: 'Charts & data visualizations', variable: 2.5, fixed: 0, unitType: 'ManDay' },

  // ── cr-5-1: Componentes / Simple ──
  { id: 'ju-5-1-1', cranId: 'cr-5-1', inductorId: 'ind-5', shortName: 'CMP-S01', description: 'Component design & implementation', variable: 0.8, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-5-1-2', cranId: 'cr-5-1', inductorId: 'ind-5', shortName: 'CMP-S02', description: 'Storybook / documentation', variable: 0.3, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-5-2: Componentes / Complex ──
  { id: 'ju-5-2-1', cranId: 'cr-5-2', inductorId: 'ind-5', shortName: 'CMP-C01', description: 'Component design & state management', variable: 1.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-5-2-2', cranId: 'cr-5-2', inductorId: 'ind-5', shortName: 'CMP-C02', description: 'Testing & documentation', variable: 0.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-6-1: Pipelines ETL / Batch ──
  { id: 'ju-6-1-1', cranId: 'cr-6-1', inductorId: 'ind-6', shortName: 'ETL-B01', description: 'Extract & transform logic', variable: 3.0, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-6-1-2', cranId: 'cr-6-1', inductorId: 'ind-6', shortName: 'ETL-B02', description: 'Load & orchestration', variable: 2.0, fixed: 1.0, unitType: 'ManDay' },

  // ── cr-6-2: Pipelines ETL / Streaming ──
  { id: 'ju-6-2-1', cranId: 'cr-6-2', inductorId: 'ind-6', shortName: 'ETL-S01', description: 'Stream processor implementation', variable: 4.0, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-6-2-2', cranId: 'cr-6-2', inductorId: 'ind-6', shortName: 'ETL-S02', description: 'Error handling & replay', variable: 0, fixed: 2.0, unitType: 'ManDay' },

  // ── cr-7-1: Reportes / Static ──
  { id: 'ju-7-1-1', cranId: 'cr-7-1', inductorId: 'ind-7', shortName: 'RPT-S01', description: 'Data query & model', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-7-1-2', cranId: 'cr-7-1', inductorId: 'ind-7', shortName: 'RPT-S02', description: 'Report layout & export', variable: 1.0, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-7-2: Reportes / Interactive ──
  { id: 'ju-7-2-1', cranId: 'cr-7-2', inductorId: 'ind-7', shortName: 'RPT-I01', description: 'Data query & model', variable: 2.0, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-7-2-2', cranId: 'cr-7-2', inductorId: 'ind-7', shortName: 'RPT-I02', description: 'Interactive charts', variable: 2.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-7-2-3', cranId: 'cr-7-2', inductorId: 'ind-7', shortName: 'RPT-I03', description: 'Filter & drill-down logic', variable: 0.5, fixed: 1.0, unitType: 'ManDay' },

  // ── cr-8-1: Despliegues infra / Standard ──
  { id: 'ju-8-1-1', cranId: 'cr-8-1', inductorId: 'ind-8', shortName: 'INF-S01', description: 'Environment provisioning', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-8-1-2', cranId: 'cr-8-1', inductorId: 'ind-8', shortName: 'INF-S02', description: 'CI/CD pipeline setup', variable: 0, fixed: 2.0, unitType: 'ManDay' },

  // ── cr-8-2: Despliegues infra / Blue-Green ──
  { id: 'ju-8-2-1', cranId: 'cr-8-2', inductorId: 'ind-8', shortName: 'INF-B01', description: 'Blue-green environment setup', variable: 0, fixed: 3.0, unitType: 'ManDay' },
  { id: 'ju-8-2-2', cranId: 'cr-8-2', inductorId: 'ind-8', shortName: 'INF-B02', description: 'Traffic routing & rollback config', variable: 0, fixed: 1.5, unitType: 'ManDay' },

  // ── cr-9-1: Test cases E2E / Selenium ──
  { id: 'ju-9-1-1', cranId: 'cr-9-1', inductorId: 'ind-9', shortName: 'QA-SE01', description: 'Selenium framework setup', variable: 0, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-9-1-2', cranId: 'cr-9-1', inductorId: 'ind-9', shortName: 'QA-SE02', description: 'Test case implementation', variable: 0.3, fixed: 0, unitType: 'ManDay' },

  // ── cr-9-2: Test cases E2E / Playwright ──
  { id: 'ju-9-2-1', cranId: 'cr-9-2', inductorId: 'ind-9', shortName: 'QA-PW01', description: 'Playwright framework setup', variable: 0, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-9-2-2', cranId: 'cr-9-2', inductorId: 'ind-9', shortName: 'QA-PW02', description: 'Test case implementation', variable: 0.25, fixed: 0, unitType: 'ManDay' },

  // ── cr-10-1: Vistas mobile / Native ──
  { id: 'ju-10-1-1', cranId: 'cr-10-1', inductorId: 'ind-10', shortName: 'MOB-N01', description: 'Screen layout & navigation', variable: 2.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-10-1-2', cranId: 'cr-10-1', inductorId: 'ind-10', shortName: 'MOB-N02', description: 'Platform-specific logic', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-10-2: Vistas mobile / React Native ──
  { id: 'ju-10-2-1', cranId: 'cr-10-2', inductorId: 'ind-10', shortName: 'MOB-R01', description: 'Screen layout & navigation', variable: 2.0, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-10-2-2', cranId: 'cr-10-2', inductorId: 'ind-10', shortName: 'MOB-R02', description: 'Native module bridge', variable: 0, fixed: 2.0, unitType: 'ManDay' },

  // ── cr-11-1: Migraciones / Simple ──
  { id: 'ju-11-1-1', cranId: 'cr-11-1', inductorId: 'ind-11', shortName: 'MIG-S01', description: 'Data mapping & transformation', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-11-1-2', cranId: 'cr-11-1', inductorId: 'ind-11', shortName: 'MIG-S02', description: 'Validation & error reporting', variable: 0.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-11-2: Migraciones / Complex ──
  { id: 'ju-11-2-1', cranId: 'cr-11-2', inductorId: 'ind-11', shortName: 'MIG-C01', description: 'Relational mapping & joins', variable: 2.5, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-11-2-2', cranId: 'cr-11-2', inductorId: 'ind-11', shortName: 'MIG-C02', description: 'Rollback & audit trail', variable: 0, fixed: 2.0, unitType: 'ManDay' },

  // ── cr-12-1: Documentación / Standard ──
  { id: 'ju-12-1-1', cranId: 'cr-12-1', inductorId: 'ind-12', shortName: 'DOC-S01', description: 'Technical spec document', variable: 0.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-12-1-2', cranId: 'cr-12-1', inductorId: 'ind-12', shortName: 'DOC-S02', description: 'API / interface documentation', variable: 0.3, fixed: 0, unitType: 'ManDay' },

  // ── cr-12-2: Documentación / Extended ──
  { id: 'ju-12-2-1', cranId: 'cr-12-2', inductorId: 'ind-12', shortName: 'DOC-E01', description: 'Architecture & design docs', variable: 0.8, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-12-2-2', cranId: 'cr-12-2', inductorId: 'ind-12', shortName: 'DOC-E02', description: 'Runbook & ops guide', variable: 0, fixed: 1.5, unitType: 'ManDay' },
];
```

- [ ] **Commit**

```bash
git add src/fixtures/jobUnits.ts
git commit -m "feat: add jobUnits fixture (workload standard library)"
```

---

## Task 4: Update fixtures/index.ts

**Files:**
- Modify: `src/fixtures/index.ts`

- [ ] **Add exports for new fixture files** — replace the content of `src/fixtures/index.ts`:

```typescript
export * from './roles';
export * from './engineers';
export * from './inductors';
export * from './crans';
export * from './jobUnits';
export * from './cycles';
export * from './projectLines';
export * from './allocations';
export * from './admin';
```

- [ ] **Commit**

```bash
git add src/fixtures/index.ts
git commit -m "feat: re-export crans and jobUnits from fixtures index"
```

---

## Task 5: Update calc.ts

**Files:**
- Modify: `src/lib/calc.ts`

- [ ] **Rewrite `src/lib/calc.ts`** with the updated `calcTotalDays`:

```typescript
import type { InductorSelection, JobUnit, CustomJU, Metier } from '../types';
import { K_EURO_RATES, CURRENT_CYCLE_ID } from '../fixtures/cycles';

export function calcTotalDays(
  selections: InductorSelection[],
  jobUnits: JobUnit[],
  customJUs: CustomJU[],
  globalOccurrences: number,
): number {
  const inductorDays = selections.reduce((acc, sel) => {
    if (!sel.selectedCranId) return acc;
    const cranJUs = jobUnits.filter((ju) => ju.cranId === sel.selectedCranId);
    const selDays = cranJUs.reduce((sum, ju) => {
      const juOcc = sel.juOccurrences.find((o) => o.juId === ju.id);
      const occ = juOcc?.occurrence ?? sel.inductorOccurrence;
      return sum + occ * ju.variable + ju.fixed;
    }, 0);
    return acc + selDays;
  }, 0);
  const customDays = customJUs.reduce((acc, j) => acc + j.days, 0);
  return (inductorDays + customDays) * Math.max(globalOccurrences, 1);
}

export function calcKEuro(days: number, metier: Metier): number {
  const rate = K_EURO_RATES.find((r) => r.metier === metier && r.cycleId === CURRENT_CYCLE_ID);
  return days * (rate?.rate ?? 0.85);
}

export function yearlyBreakdown(totalDays: number): number[] {
  const weights = [0.5, 1, 1.2, 1.3, 1.4, 1.4, 1.2, 1.1, 1, 0.9, 0.6, 0.4];
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Number(((w / sum) * totalDays).toFixed(2)));
}
```

- [ ] **Check types compile** — the old `EstimationPanel.tsx` will error (expected, fixed in Task 8):

```bash
cd /mnt/c/Users/NadiaUjovich/ux_great_prototype && npx tsc --noEmit 2>&1 | grep -v EstimationPanel | head -20
```

- [ ] **Commit**

```bash
git add src/lib/calc.ts
git commit -m "feat: update calcTotalDays for InductorSelection/JobUnit model"
```

---

## Task 6: Update dataStore.ts

**Files:**
- Modify: `src/store/dataStore.ts`

- [ ] **The `copyEstimation` function copies the entire `Estimation` object opaquely** — it already works with the new shape since it spreads `src`. No logic change needed. Only the import needs updating to remove `InductorValue`. Verify `src/store/dataStore.ts` doesn't import `InductorValue` directly:

```bash
grep -n "InductorValue" /mnt/c/Users/NadiaUjovich/ux_great_prototype/src/store/dataStore.ts
```

Expected output: (nothing — `dataStore.ts` imports from `../types` only the types it uses: `ProjectLine, LineStatus, Allocation, AllocationSplit, Estimation`).

- [ ] **If there are any `InductorValue` references, remove them. Otherwise skip to commit.**

- [ ] **Commit**

```bash
git add src/store/dataStore.ts
git commit -m "chore: verify dataStore compatible with new Estimation shape"
```

---

## Task 7: Compact main table

**Files:**
- Modify: `src/components/grid/ProjectLineGrid.tsx`

- [ ] **Replace all padding and text-size classes in `src/components/grid/ProjectLineGrid.tsx`** to reduce row height. Replace the entire file with:

```tsx
import { clsx } from 'clsx';
import { MessageSquareWarning } from 'lucide-react';
import type { ProjectLine } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDays, formatKEuro } from '../../lib/format';
import { ENGINEERS } from '../../fixtures/engineers';

interface Props {
  lines: ProjectLine[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onRowClick: (id: string) => void;
  showSelection: boolean;
  showKEuro: boolean;
}

export function ProjectLineGrid({
  lines,
  selectedIds,
  onToggleSelect,
  onRowClick,
  showSelection,
  showKEuro,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            {showSelection && <th className="w-7 px-2 py-1.5" />}
            <th className="px-2 py-1.5 text-left font-medium">ID</th>
            <th className="px-2 py-1.5 text-left font-medium">Proyecto / Línea</th>
            <th className="px-2 py-1.5 text-left font-medium">Métier</th>
            <th className="px-2 py-1.5 text-left font-medium">Engineer</th>
            <th className="px-2 py-1.5 text-left font-medium">Status</th>
            <th className="px-2 py-1.5 text-right font-medium">Días</th>
            {showKEuro && <th className="px-2 py-1.5 text-right font-medium">k€</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const eng = ENGINEERS.find((e) => e.id === line.assignedEngineerId);
            const selected = selectedIds.includes(line.id);
            return (
              <tr
                key={line.id}
                className={clsx(
                  'cursor-pointer border-t border-slate-100 hover:bg-slate-50',
                  selected && 'bg-brand-50/50',
                  line.status === 'rejected' && 'bg-red-50/30',
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
                <td className="px-2 py-1 font-mono text-[10px] text-slate-400">{line.id}</td>
                <td className="px-2 py-1">
                  <div className="font-medium text-slate-900">{line.lineName}</div>
                  <div className="text-[9px] text-slate-400">{line.projectName}</div>
                  {line.status === 'rejected' && line.rejectionComment && (
                    <div className="mt-0.5 flex items-start gap-1 text-[10px] text-red-700">
                      <MessageSquareWarning size={10} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{line.rejectionComment}</span>
                    </div>
                  )}
                </td>
                <td className="px-2 py-1 text-slate-500">{line.metier}</td>
                <td className="px-2 py-1 text-slate-500">{eng?.name ?? '—'}</td>
                <td className="px-2 py-1">
                  <StatusBadge status={line.status} />
                </td>
                <td className="px-2 py-1 text-right text-slate-600">{formatDays(line.estimatedDays)}</td>
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

- [ ] **Start the dev server and verify the table is visibly more compact:**

```bash
cd /mnt/c/Users/NadiaUjovich/ux_great_prototype && npm run dev
```

Open http://localhost:5173, navigate to Pre-Estimation. Rows should be noticeably smaller — target ~20 rows visible on a 1080p screen.

- [ ] **Commit**

```bash
git add src/components/grid/ProjectLineGrid.tsx
git commit -m "feat: compact table rows for higher density (~20 rows visible)"
```

---

## Task 8: Rewrite EstimationPanel as centered modal

**Files:**
- Rewrite: `src/components/estimation/EstimationPanel.tsx`

This is the main component. It owns all estimation state and renders the full modal layout including the inductor tree, flat view, search, lock, and persist logic.

- [ ] **Replace the entire content of `src/components/estimation/EstimationPanel.tsx`** with:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Lock, Copy, X, ChevronDown, ChevronRight, Trash2, Search } from 'lucide-react';
import type { InductorSelection, JUOccurrence, CustomJU, ProjectLine } from '../../types';
import { INDUCTORS } from '../../fixtures/inductors';
import { CRANS } from '../../fixtures/crans';
import { JOB_UNITS } from '../../fixtures/jobUnits';
import { calcTotalDays, calcKEuro, yearlyBreakdown } from '../../lib/calc';
import { formatDays, formatKEuro } from '../../lib/format';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';
import { CopyEstimationModal } from './CopyEstimationModal';
import { ManageInductorsModal } from './ManageInductorsModal';

interface Props {
  line: ProjectLine | null;
  onClose: () => void;
}

export function EstimationPanel({ line, onClose }: Props) {
  const can = useRoleStore((s) => s.can);
  const existing = useDataStore((s) => (line ? s.estimations[line.id] : undefined));
  const setEstimation = useDataStore((s) => s.setEstimation);
  const setLineStatus = useDataStore((s) => s.setLineStatus);
  const pushToast = useUIStore((s) => s.pushToast);

  const [selections, setSelections] = useState<InductorSelection[]>([]);
  const [customJUs, setCustomJUs] = useState<CustomJU[]>([]);
  const [globalOccurrences, setGlobalOccurrences] = useState(1);
  const [viewMode, setViewMode] = useState<'inductors' | 'flat'>('inductors');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showManage, setShowManage] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState(false);

  useEffect(() => {
    if (!line) return;
    if (existing) {
      setSelections(existing.inductorSelections);
      setCustomJUs(existing.customJUs);
      setGlobalOccurrences(existing.globalOccurrences);
    } else {
      setSelections([]);
      setCustomJUs([]);
      setGlobalOccurrences(1);
    }
    setSearch('');
    setViewMode('inductors');
  }, [line?.id]);

  const locked = !line || line.status === 'estimated' || line.status === 'approved' || line.status === 'allocated';
  const canEdit = can('edit:estimation') && !locked;
  const canEditCustomJU = can('edit:custom-jus');

  const totalDays = useMemo(
    () => calcTotalDays(selections, JOB_UNITS, customJUs, globalOccurrences),
    [selections, customJUs, globalOccurrences],
  );
  const totalKEuro = useMemo(() => (line ? calcKEuro(totalDays, line.metier) : 0), [totalDays, line]);
  const breakdown = useMemo(() => yearlyBreakdown(totalDays), [totalDays]);

  // ── Inductor tree helpers ──
  function addInductors(ids: string[]) {
    setSelections((prev) => {
      const existing = prev.map((s) => s.inductorId);
      const toAdd: InductorSelection[] = ids
        .filter((id) => !existing.includes(id))
        .map((id) => ({ inductorId: id, selectedCranId: null, inductorOccurrence: 1, juOccurrences: [] }));
      const toKeep = prev.filter((s) => ids.includes(s.inductorId));
      return [...toKeep, ...toAdd];
    });
  }

  function removeInductor(inductorId: string) {
    setSelections((prev) => prev.filter((s) => s.inductorId !== inductorId));
  }

  function selectCran(inductorId: string, cranId: string) {
    const cranJUs = JOB_UNITS.filter((ju) => ju.cranId === cranId);
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.inductorId !== inductorId) return sel;
        return {
          ...sel,
          selectedCranId: cranId,
          juOccurrences: cranJUs.map((ju) => ({
            juId: ju.id,
            occurrence: sel.inductorOccurrence,
            locked: false,
          })),
        };
      }),
    );
  }

  function updateInductorOccurrence(inductorId: string, occ: number) {
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.inductorId !== inductorId) return sel;
        return {
          ...sel,
          inductorOccurrence: occ,
          juOccurrences: sel.juOccurrences.map((jo) =>
            jo.locked ? jo : { ...jo, occurrence: occ },
          ),
        };
      }),
    );
  }

  function updateJUOccurrence(inductorId: string, juId: string, occ: number) {
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.inductorId !== inductorId) return sel;
        return {
          ...sel,
          juOccurrences: sel.juOccurrences.map((jo) =>
            jo.juId === juId ? { ...jo, occurrence: occ } : jo,
          ),
        };
      }),
    );
  }

  function toggleJULock(inductorId: string, juId: string) {
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.inductorId !== inductorId) return sel;
        return {
          ...sel,
          juOccurrences: sel.juOccurrences.map((jo) =>
            jo.juId === juId ? { ...jo, locked: !jo.locked } : jo,
          ),
        };
      }),
    );
  }

  function toggleExpanded(inductorId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(inductorId) ? next.delete(inductorId) : next.add(inductorId);
      return next;
    });
  }

  // ── Filtered data ──
  const q = search.trim().toLowerCase();

  const filteredSelections = useMemo(() => {
    if (!q) return selections;
    return selections.filter((sel) => {
      const ind = INDUCTORS.find((i) => i.id === sel.inductorId);
      if (ind?.name.toLowerCase().includes(q)) return true;
      if (!sel.selectedCranId) return false;
      const cranJUs = JOB_UNITS.filter((ju) => ju.cranId === sel.selectedCranId);
      return cranJUs.some(
        (ju) => ju.shortName.toLowerCase().includes(q) || ju.description.toLowerCase().includes(q),
      );
    });
  }, [selections, q]);

  const flatJUs = useMemo(() => {
    const rows: Array<{ ju: (typeof JOB_UNITS)[0]; sel: InductorSelection; jo: JUOccurrence }> = [];
    for (const sel of selections) {
      if (!sel.selectedCranId) continue;
      for (const jo of sel.juOccurrences) {
        const ju = JOB_UNITS.find((j) => j.id === jo.juId);
        if (ju) rows.push({ ju, sel, jo });
      }
    }
    if (!q) return rows;
    return rows.filter(
      ({ ju }) =>
        ju.shortName.toLowerCase().includes(q) || ju.description.toLowerCase().includes(q),
    );
  }, [selections, q]);

  // ── Persist ──
  function persist(status: 'draft' | 'estimated') {
    setEstimation(line!.id, {
      lineId: line!.id,
      inductorSelections: selections,
      customJUs,
      globalOccurrences,
      yearlyBreakdown: breakdown,
      totalDays,
      totalKEuro,
      status,
      ...(status === 'draft'
        ? { draftedAt: new Date().toISOString() }
        : { estimatedAt: new Date().toISOString() }),
    });
    setLineStatus(line!.id, status, { estimatedDays: totalDays, estimatedKEuro: totalKEuro });
  }

  function handleSaveDraft() {
    persist('draft');
    pushToast(`Borrador guardado para ${line!.id}`, 'success');
    onClose();
  }

  function handlePromote() {
    persist('estimated');
    pushToast(`${line!.id} promovida a estimación definitiva`, 'success');
    setConfirmPromote(false);
    onClose();
  }

  const hasMinimumForDraft = globalOccurrences > 0;
  const hasMinimumForDefinitive =
    globalOccurrences > 0 &&
    selections.some((s) => s.selectedCranId !== null && s.juOccurrences.length > 0);

  if (!line) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Centered modal */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
        <div className="flex h-full w-full max-w-[90vw] flex-col rounded-xl bg-white shadow-2xl" style={{ maxHeight: '88vh' }}>

          {/* Header */}
          <div className="flex flex-shrink-0 items-start justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">{line.lineName}</h2>
                {locked && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    <Lock size={12} /> Bloqueada
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {line.id} · {line.projectName} · {line.metier}
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {/* Rejection banner */}
          {line.status === 'rejected' && line.rejectionComment && (
            <div className="mx-6 mt-3 flex-shrink-0 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">Comentario del CPO (rechazo)</div>
              <p className="mt-1">{line.rejectionComment}</p>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-2">
            <div className="flex overflow-hidden rounded-md border border-slate-200">
              <button
                onClick={() => setViewMode('inductors')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'inductors' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Inductores
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={`border-l border-slate-200 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'flat' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Job Units
              </button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar inductor o JU…"
                className="w-52 rounded-md border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div className="flex-1" />
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => setShowManage(true)}>
                Manage Inductors
              </Button>
            )}
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1">
            {/* Left: inductor tree or flat JU table */}
            <div className="flex-1 overflow-y-auto border-r border-slate-100 px-6 py-4">
              {viewMode === 'inductors' ? (
                <InductorTreeView
                  selections={filteredSelections}
                  expanded={expanded}
                  canEdit={canEdit}
                  onToggleExpanded={toggleExpanded}
                  onSelectCran={selectCran}
                  onUpdateInductorOccurrence={updateInductorOccurrence}
                  onUpdateJUOccurrence={updateJUOccurrence}
                  onToggleJULock={toggleJULock}
                  onRemoveInductor={removeInductor}
                />
              ) : (
                <FlatJUView
                  rows={flatJUs}
                  canEdit={canEdit}
                  onUpdateOccurrence={updateJUOccurrence}
                  onToggleLock={toggleJULock}
                />
              )}

              {/* Custom JUs */}
              <CustomJUSection
                customJUs={customJUs}
                canEdit={canEdit}
                canEditCustomJU={canEditCustomJU}
                onChange={setCustomJUs}
              />
            </div>

            {/* Right: summary */}
            <div className="w-52 flex-shrink-0 overflow-y-auto px-4 py-4">
              <div className="mb-3">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Ocurr. global
                </label>
                <input
                  type="number"
                  min={1}
                  value={globalOccurrences}
                  onChange={(e) => setGlobalOccurrences(Math.max(1, Number(e.target.value)))}
                  disabled={!canEdit}
                  className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50 focus:border-brand-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-slate-400">Multiplicador final</p>
              </div>

              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">Total días</div>
                <div className="text-xl font-bold text-slate-900">{formatDays(totalDays)}</div>
              </div>
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">Total k€</div>
                <div className="text-xl font-bold text-slate-900">{formatKEuro(totalKEuro)}</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1.5 text-[10px] font-semibold uppercase text-slate-500">Distribución anual</div>
                <div className="flex items-end gap-0.5" style={{ height: 48 }}>
                  {breakdown.map((m, i) => {
                    const max = Math.max(...breakdown, 0.01);
                    const h = (m / max) * 44;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center">
                        <div
                          className="w-full rounded-t bg-brand-500"
                          style={{ height: `${Math.max(h, 2)}px` }}
                          title={`Mes ${i + 1}: ${m.toFixed(1)}d`}
                        />
                        <div className="mt-0.5 text-[8px] text-slate-400">
                          {['E','F','M','A','M','J','J','A','S','O','N','D'][i]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="h-2.5 w-2.5 rounded-sm border border-blue-300 bg-blue-100" />
                  Hereda ocurr. inductor
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="h-2.5 w-2.5 rounded-sm border border-amber-400 bg-amber-100" />
                  Bloqueada 🔒
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
            <div>
              {existing && canEdit && (
                <Button size="sm" variant="secondary" onClick={() => setShowCopyModal(true)}>
                  <Copy size={14} /> Copiar a otras líneas
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="md" variant="ghost" onClick={onClose}>Cerrar</Button>
              {canEdit && (
                <>
                  <Button size="md" variant="secondary" onClick={handleSaveDraft} disabled={!hasMinimumForDraft}>
                    Guardar borrador
                  </Button>
                  <Button size="md" variant="primary" onClick={() => setConfirmPromote(true)} disabled={!hasMinimumForDefinitive}>
                    Promover a definitiva
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm promote modal */}
      <Modal
        open={confirmPromote}
        onClose={() => setConfirmPromote(false)}
        title="Promover a estimación definitiva"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmPromote(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handlePromote}>Promover</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          La línea <strong>{line.id}</strong> pasará a estado <strong>Estimada</strong>.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          <li>• Total días: <strong>{formatDays(totalDays)}</strong></li>
          <li>• Total k€: <strong>{formatKEuro(totalKEuro)}</strong></li>
        </ul>
      </Modal>

      {showCopyModal && <CopyEstimationModal sourceLine={line} onClose={() => setShowCopyModal(false)} />}
      {showManage && (
        <ManageInductorsModal
          activeInductorIds={selections.map((s) => s.inductorId)}
          onApply={(ids) => { addInductors(ids); setShowManage(false); }}
          onClose={() => setShowManage(false)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// InductorTreeView sub-component
// ─────────────────────────────────────────────
interface TreeProps {
  selections: InductorSelection[];
  expanded: Set<string>;
  canEdit: boolean;
  onToggleExpanded: (id: string) => void;
  onSelectCran: (inductorId: string, cranId: string) => void;
  onUpdateInductorOccurrence: (inductorId: string, occ: number) => void;
  onUpdateJUOccurrence: (inductorId: string, juId: string, occ: number) => void;
  onToggleJULock: (inductorId: string, juId: string) => void;
  onRemoveInductor: (inductorId: string) => void;
}

function InductorTreeView({
  selections, expanded, canEdit,
  onToggleExpanded, onSelectCran, onUpdateInductorOccurrence,
  onUpdateJUOccurrence, onToggleJULock, onRemoveInductor,
}: TreeProps) {
  if (selections.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
        Sin inductores. Usá "Manage Inductors" para añadir.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {selections.map((sel) => {
        const ind = INDUCTORS.find((i) => i.id === sel.inductorId)!;
        const availableCrans = CRANS.filter((c) => c.inductorId === sel.inductorId);
        const isExpanded = expanded.has(sel.inductorId);
        const cranJUs = sel.selectedCranId
          ? JOB_UNITS.filter((ju) => ju.cranId === sel.selectedCranId)
          : [];

        const indDays = cranJUs.reduce((acc, ju) => {
          const jo = sel.juOccurrences.find((o) => o.juId === ju.id);
          const occ = jo?.occurrence ?? sel.inductorOccurrence;
          return acc + occ * ju.variable + ju.fixed;
        }, 0);

        return (
          <div key={sel.inductorId} className="overflow-hidden rounded-lg border border-slate-200">
            {/* Inductor header row */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
              <button
                onClick={() => onToggleExpanded(sel.inductorId)}
                className="text-slate-400 hover:text-slate-600"
                disabled={!sel.selectedCranId}
              >
                {isExpanded && sel.selectedCranId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-800">{ind.name}</span>
                <span className="ml-2 text-[10px] text-slate-400">{ind.category}</span>
              </div>
              <span className="text-[10px] text-slate-400">Cran:</span>
              <select
                value={sel.selectedCranId ?? ''}
                onChange={(e) => e.target.value && onSelectCran(sel.inductorId, e.target.value)}
                disabled={!canEdit}
                className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs focus:border-brand-400 focus:outline-none disabled:bg-slate-50"
              >
                <option value="">— seleccionar —</option>
                {availableCrans.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">Ocurr.</span>
              <input
                type="number"
                min={1}
                value={sel.inductorOccurrence}
                onChange={(e) => onUpdateInductorOccurrence(sel.inductorId, Math.max(1, Number(e.target.value)))}
                disabled={!canEdit}
                className="w-12 rounded border border-slate-300 px-1.5 py-0.5 text-right text-xs disabled:bg-slate-50 focus:border-brand-400 focus:outline-none"
              />
              <span className="w-14 text-right text-xs font-semibold text-brand-700">{formatDays(indDays)}</span>
              {canEdit && (
                <button onClick={() => onRemoveInductor(sel.inductorId)} className="text-slate-300 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Warning if no cran selected */}
            {!sel.selectedCranId && (
              <div className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-[10px] text-amber-700">
                ⚠ Seleccioná un cran para cargar las Job Units
              </div>
            )}

            {/* JU rows (only when expanded and cran selected) */}
            {sel.selectedCranId && isExpanded && cranJUs.map((ju) => {
              const jo = sel.juOccurrences.find((o) => o.juId === ju.id) ?? {
                juId: ju.id, occurrence: sel.inductorOccurrence, locked: false,
              };
              const juDays = jo.occurrence * ju.variable + ju.fixed;
              return (
                <div
                  key={ju.id}
                  className={`flex items-center gap-2 border-t border-slate-100 px-3 py-1.5 pl-8 ${jo.locked ? 'bg-amber-50' : 'bg-white'}`}
                >
                  <span className="w-16 font-mono text-[10px] text-slate-400">{ju.shortName}</span>
                  <span className="flex-1 text-xs text-slate-700">{ju.description}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {ju.variable > 0 ? `×${ju.variable}` : ''}{ju.fixed > 0 ? `+${ju.fixed}` : ''}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={jo.occurrence}
                    onChange={(e) => onUpdateJUOccurrence(sel.inductorId, ju.id, Math.max(1, Number(e.target.value)))}
                    disabled={!canEdit}
                    className={`w-12 rounded border px-1.5 py-0.5 text-right text-xs focus:outline-none disabled:opacity-60 ${
                      jo.locked
                        ? 'border-amber-400 bg-amber-50 focus:border-amber-500'
                        : 'border-blue-200 bg-blue-50 focus:border-brand-400'
                    }`}
                  />
                  <span className="w-12 text-right text-[10px] font-semibold text-brand-700 font-mono">{formatDays(juDays)}</span>
                  {canEdit && (
                    <button
                      onClick={() => onToggleJULock(sel.inductorId, ju.id)}
                      className={`rounded p-0.5 text-xs transition-colors ${jo.locked ? 'text-amber-600' : 'text-slate-300 hover:text-slate-500'}`}
                      title={jo.locked ? 'Desbloquear JU' : 'Bloquear JU'}
                    >
                      <Lock size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Collapsed JU count */}
            {sel.selectedCranId && !isExpanded && (
              <div
                className="cursor-pointer border-t border-slate-100 bg-white px-4 py-1 text-[10px] text-slate-400 hover:text-slate-600"
                onClick={() => onToggleExpanded(sel.inductorId)}
              >
                {cranJUs.length} JU{cranJUs.length !== 1 ? 's' : ''} · clic para expandir
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// FlatJUView sub-component
// ─────────────────────────────────────────────
interface FlatRow {
  ju: (typeof JOB_UNITS)[0];
  sel: InductorSelection;
  jo: JUOccurrence;
}

function FlatJUView({
  rows, canEdit, onUpdateOccurrence, onToggleLock,
}: {
  rows: FlatRow[];
  canEdit: boolean;
  onUpdateOccurrence: (inductorId: string, juId: string, occ: number) => void;
  onToggleLock: (inductorId: string, juId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
        Sin Job Units. Añadí inductores y seleccioná un cran primero.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Short</th>
            <th className="px-3 py-2 text-left font-medium">Job Unit</th>
            <th className="px-3 py-2 text-left font-medium">Inductor / Cran</th>
            <th className="px-3 py-2 text-right font-medium">Ocurr.</th>
            <th className="px-3 py-2 text-right font-medium">Var.</th>
            <th className="px-3 py-2 text-right font-medium">Fixed</th>
            <th className="px-3 py-2 text-right font-medium">Días</th>
            {canEdit && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ ju, sel, jo }) => {
            const ind = INDUCTORS.find((i) => i.id === sel.inductorId);
            const cran = CRANS.find((c) => c.id === sel.selectedCranId);
            const juDays = jo.occurrence * ju.variable + ju.fixed;
            return (
              <tr
                key={ju.id}
                className={`border-t border-slate-100 ${jo.locked ? 'bg-amber-50' : ''}`}
              >
                <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400">{ju.shortName}</td>
                <td className="px-3 py-1.5 text-slate-700">{ju.description}</td>
                <td className="px-3 py-1.5 text-[10px] text-slate-400">
                  {ind?.name} / {cran?.name}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <input
                    type="number"
                    min={1}
                    value={jo.occurrence}
                    onChange={(e) => onUpdateOccurrence(sel.inductorId, ju.id, Math.max(1, Number(e.target.value)))}
                    disabled={!canEdit}
                    className={`w-12 rounded border px-1.5 py-0.5 text-right text-xs focus:outline-none disabled:opacity-60 ${
                      jo.locked
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                  />
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-[10px] text-slate-400">{ju.variable}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[10px] text-slate-400">{ju.fixed}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-brand-700">{formatDays(juDays)}</td>
                {canEdit && (
                  <td className="px-2">
                    <button
                      onClick={() => onToggleLock(sel.inductorId, ju.id)}
                      className={`rounded p-0.5 ${jo.locked ? 'text-amber-600' : 'text-slate-300 hover:text-slate-500'}`}
                      title={jo.locked ? 'Desbloquear' : 'Bloquear'}
                    >
                      <Lock size={12} />
                    </button>
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

// ─────────────────────────────────────────────
// CustomJUSection sub-component
// ─────────────────────────────────────────────
function CustomJUSection({
  customJUs, canEdit, canEditCustomJU, onChange,
}: {
  customJUs: CustomJU[];
  canEdit: boolean;
  canEditCustomJU: boolean;
  onChange: React.Dispatch<React.SetStateAction<CustomJU[]>>;
}) {
  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Custom JUs</span>
        {canEdit && canEditCustomJU && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onChange((j) => [...j, { id: `ju-${Date.now()}`, description: '', days: 1 }])}
          >
            + Agregar JU
          </Button>
        )}
      </div>
      {customJUs.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 p-3 text-center text-[10px] text-slate-400">
          {canEditCustomJU ? 'Sin JUs custom.' : 'Solo PMO/Admin pueden agregar Custom JUs.'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {customJUs.map((ju, idx) => (
            <div key={ju.id} className="flex items-center gap-2">
              <input
                value={ju.description}
                placeholder="Descripción"
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))}
                disabled={!canEdit || !canEditCustomJU}
                className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
              />
              <input
                type="number"
                min={0}
                step={0.5}
                value={ju.days}
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, days: Number(e.target.value) } : x)))}
                disabled={!canEdit || !canEditCustomJU}
                className="w-16 rounded border border-slate-300 px-2 py-1 text-right text-xs disabled:bg-slate-50"
              />
              {canEdit && canEditCustomJU && (
                <button onClick={() => onChange((j) => j.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Verify dev server compiles** (ManageInductorsModal doesn't exist yet — TypeScript error expected on that import only):

```bash
cd /mnt/c/Users/NadiaUjovich/ux_great_prototype && npx tsc --noEmit 2>&1 | grep -i error | head -10
```

Expected: one error about `ManageInductorsModal` not found. All others should be gone.

- [ ] **Commit (even with the missing import — next task fixes it):**

```bash
git add src/components/estimation/EstimationPanel.tsx
git commit -m "feat: rewrite EstimationPanel as centered 90%-screen modal with Cran/JU tree"
```

---

## Task 9: Create ManageInductorsModal

**Files:**
- Create: `src/components/estimation/ManageInductorsModal.tsx`

- [ ] **Create `src/components/estimation/ManageInductorsModal.tsx`:**

```tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { INDUCTORS } from '../../fixtures/inductors';
import { Button } from '../shared/Button';

interface Props {
  activeInductorIds: string[];
  onApply: (inductorIds: string[]) => void;
  onClose: () => void;
}

export function ManageInductorsModal({ activeInductorIds, onApply, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(activeInductorIds));

  const categories = [...new Set(INDUCTORS.map((i) => i.category))].sort();

  function toggleInductor(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleCategory(cat: string) {
    const inCat = INDUCTORS.filter((i) => i.category === cat).map((i) => i.id);
    const allSelected = inCat.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      inCat.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Manage Inductors</h3>
            <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 p-5">
            {categories.map((cat) => {
              const inCat = INDUCTORS.filter((i) => i.category === cat);
              const selCount = inCat.filter((i) => selected.has(i.id)).length;
              const allSel = selCount === inCat.length;
              const someSel = selCount > 0 && !allSel;

              return (
                <div key={cat} className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allSel}
                      ref={(el) => { if (el) el.indeterminate = someSel; }}
                      onChange={() => toggleCategory(cat)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                    />
                    <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {cat}
                    </span>
                    <span className="text-[10px] text-slate-400">{selCount}/{inCat.length}</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {inCat.map((ind) => (
                      <label
                        key={ind.id}
                        className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(ind.id)}
                          onChange={() => toggleInductor(ind.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                        />
                        <span className="text-xs text-slate-700">{ind.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={() => onApply([...selected])}>
              Aplicar ({selected.size} inductores)
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Verify full TypeScript compilation succeeds:**

```bash
cd /mnt/c/Users/NadiaUjovich/ux_great_prototype && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Open the app, click a row in Pre-Estimation, verify:**
  - Modal appears centered with dark backdrop
  - "Manage Inductors" button opens the grouped checkbox dialog
  - Adding inductors shows them in the tree
  - Selecting a cran shows JU rows
  - Changing inductor occurrence updates non-locked JUs
  - Lock button toggles JU to amber/locked state
  - Toggle to "Job Units" shows flat view

- [ ] **Commit**

```bash
git add src/components/estimation/ManageInductorsModal.tsx
git commit -m "feat: add ManageInductorsModal with grouped category checkboxes"
```

---

## Task 10: Bulk estimate + Modo Compatibles

**Files:**
- Modify: `src/pages/PreEstimationPage.tsx`

- [ ] **Replace `src/pages/PreEstimationPage.tsx`** with the following (adds `compatibleMode` toggle and wires bulk estimate to open the modal on the first selected line):

```tsx
import { useMemo, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { GridFiltersBar, type GridFilters } from '../components/grid/GridFilters';
import { ProjectLineGrid } from '../components/grid/ProjectLineGrid';
import { BulkActionsBar } from '../components/grid/BulkActionsBar';
import { EstimationPanel } from '../components/estimation/EstimationPanel';
import { EmptyState } from '../components/shared/EmptyState';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { checkCompatibility } from '../lib/compatibility';
import type { Metier } from '../types';

export function PreEstimationPage() {
  return (
    <RoleGate permission="view:pre-estimation">
      <PreEstimationContent />
    </RoleGate>
  );
}

function PreEstimationContent() {
  const role = useRoleStore((s) => s.currentRole);
  const activeEngineerId = useRoleStore((s) => s.activeEngineerId);
  const can = useRoleStore((s) => s.can);
  const lines = useDataStore((s) => s.lines);
  const {
    selectedLineIds,
    toggleSelect,
    clearSelection,
    estimationPanelLineId,
    openEstimationPanel,
  } = useUIStore();

  const [filters, setFilters] = useState<GridFilters>({ status: 'all', metier: 'all', search: '' });
  const [compatibleMode, setCompatibleMode] = useState(false);

  const visibleLines = useMemo(() => {
    let list = lines;
    if (can('view:own-lines-only') && activeEngineerId) {
      list = list.filter((l) => l.assignedEngineerId === activeEngineerId);
    }
    if (filters.status !== 'all') list = list.filter((l) => l.status === filters.status);
    if (filters.metier !== 'all') list = list.filter((l) => l.metier === filters.metier);
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.lineName.toLowerCase().includes(q) ||
          l.projectName.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [lines, filters, can, activeEngineerId]);

  const selectedLines = useMemo(
    () => lines.filter((l) => selectedLineIds.includes(l.id)),
    [lines, selectedLineIds],
  );
  const compatibility = useMemo(() => checkCompatibility(selectedLines), [selectedLines]);

  const showSelection = role !== 'RCRC';
  const showKEuro = can('view:k-euro-rates') || role === 'Engineer';

  const currentLine = lines.find((l) => l.id === estimationPanelLineId) ?? null;

  // Group lines by metier for compatible mode
  const compatibleGroups = useMemo(() => {
    if (!compatibleMode) return null;
    const groups = new Map<Metier, typeof visibleLines>();
    for (const line of visibleLines) {
      const group = groups.get(line.metier) ?? [];
      group.push(line);
      groups.set(line.metier, group);
    }
    return [...groups.entries()].map(([metier, groupLines]) => ({ metier, lines: groupLines }));
  }, [visibleLines, compatibleMode]);

  function handleBulkEstimate() {
    // Open estimation modal for the first selected compatible line
    if (selectedLineIds.length > 0) {
      openEstimationPanel(selectedLineIds[0]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pre-Estimation</h1>
          <p className="text-sm text-slate-600">
            {can('view:own-lines-only')
              ? 'Tus project lines asignadas. Click en una fila para estimar.'
              : 'Todas las project lines del portfolio.'}
          </p>
        </div>
        <Button
          variant={compatibleMode ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setCompatibleMode((v) => !v)}
        >
          <LayoutGrid size={14} />
          Modo compatibles
        </Button>
      </div>

      <GridFiltersBar value={filters} onChange={setFilters} />

      {showSelection && (
        <BulkActionsBar
          count={selectedLineIds.length}
          compatibility={compatibility}
          onClear={clearSelection}
          onBulkEstimate={role !== 'Engineer' ? handleBulkEstimate : undefined}
        />
      )}

      {visibleLines.length === 0 ? (
        <EmptyState
          title="No hay project lines"
          description={
            can('view:own-lines-only')
              ? 'No tenés líneas asignadas con los filtros actuales.'
              : 'Sin resultados para los filtros aplicados.'
          }
        />
      ) : compatibleGroups ? (
        <div className="space-y-6">
          {compatibleGroups.map(({ metier, lines: groupLines }) => (
            <div key={metier}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {metier}
                </span>
                <span className="text-xs text-slate-400">({groupLines.length} líneas)</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>
              <ProjectLineGrid
                lines={groupLines}
                selectedIds={selectedLineIds}
                onToggleSelect={toggleSelect}
                onRowClick={(id) => openEstimationPanel(id)}
                showSelection={showSelection}
                showKEuro={showKEuro}
              />
            </div>
          ))}
        </div>
      ) : (
        <ProjectLineGrid
          lines={visibleLines}
          selectedIds={selectedLineIds}
          onToggleSelect={toggleSelect}
          onRowClick={(id) => openEstimationPanel(id)}
          showSelection={showSelection}
          showKEuro={showKEuro}
        />
      )}

      {currentLine && (
        <EstimationPanel line={currentLine} onClose={() => openEstimationPanel(null)} />
      )}
    </div>
  );
}
```

- [ ] **Verify TypeScript compiles cleanly:**

```bash
cd /mnt/c/Users/NadiaUjovich/ux_great_prototype && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Smoke-test in browser:**
  - "Modo compatibles" button toggles on/off, groups lines by métier
  - Select 2+ lines, click "Estimar en bulk" → opens modal for first selected line
  - Modal opens and closes correctly

- [ ] **Commit**

```bash
git add src/pages/PreEstimationPage.tsx
git commit -m "feat: bulk estimate opens modal; add Modo Compatibles grouped view"
```

---

## Self-Review Checklist

After all tasks are complete, verify these spec requirements are covered:

| Requirement | Task |
|---|---|
| Compact table ~20 rows | Task 7 |
| Estimation modal centered 90% | Task 8 |
| Inductors grouped with Cran selector | Task 8 |
| JU rows under inductor with occurrence | Task 8 |
| Inductor occurrence propagates to non-locked JUs | Task 8 |
| Lock per JU | Task 8 |
| Flat JU view toggle | Task 8 |
| Search filters both views, persists on toggle | Task 8 |
| Manage Inductors with group checkboxes | Task 9 |
| Bulk estimate opens modal | Task 10 |
| Modo Compatibles groups by métier | Task 10 |
| CustomJU kept (PMO/Admin) | Task 8 |
| New types: Cran, JobUnit, InductorSelection, JUOccurrence | Task 1 |
| Crans fixture (2-3 per inductor) | Task 2 |
| JU fixture (2-3 per cran) | Task 3 |
| calc.ts formula: (occ × variable) + fixed | Task 5 |
