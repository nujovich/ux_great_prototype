# GREAT System — Estimation UX Redesign

**Date:** 2026-05-26  
**Status:** Approved

---

## 1. Overview

Six interconnected improvements to the Pre-Estimation page and Estimation Modal. The main table becomes more compact (~20 rows visible), the estimation panel becomes a centered full-screen modal, and the inductor/JU model is upgraded to support the real Conflux data hierarchy: Inductor → Cran selection → Job Units loaded from a workload standard library.

---

## 2. Data Model Changes

### 2.1 New Types

```typescript
// A cran is a variant of an inductor that determines JU coefficients
interface Cran {
  id: string;
  inductorId: string;
  name: string; // e.g. "REST Standard", "PostgreSQL"
}

// A job unit from the workload standard library
interface JobUnit {
  id: string;
  cranId: string;
  inductorId: string;
  shortName: string;     // e.g. "API-001"
  description: string;
  variable: number;      // variable coefficient
  fixed: number;         // fixed days added regardless of occurrence
  unitType: 'ManDay' | 'BenchHours' | 'Kilometres' | 'KEuros';
  fmm?: string;
  smm?: string;
  dmm?: string;
  genericProfile?: string;
  comment?: string;
}

// Per-JU occurrence state within an estimation
interface JUOccurrence {
  juId: string;
  occurrence: number;
  locked: boolean; // if true, does not inherit inductor-level occurrence changes
}

// Replaces InductorValue
interface InductorSelection {
  inductorId: string;
  selectedCranId: string | null; // null = no cran selected, inductor is skipped
  inductorOccurrence: number;    // propagates to all non-locked JUs
  juOccurrences: JUOccurrence[];
}
```

### 2.2 Updated Estimation Type

`inductorValues: InductorValue[]` is replaced by `inductorSelections: InductorSelection[]`. `customJUs` are kept. The existing `occurrences` field is renamed to `globalOccurrences` for clarity.

### 2.3 Calculation Formula

```
days_per_JU = (juOccurrence × variable) + fixed
days_per_inductor = sum(days_per_JU for all JUs of selectedCran)
totalDays = sum(days_per_inductor) × globalOccurrences
```

Inductors with `selectedCranId = null` contribute 0 days and do not block saving.

### 2.4 New Fixtures

- `src/fixtures/crans.ts` — crans per inductor (2–3 variants each)
- `src/fixtures/jobUnits.ts` — 2–4 JUs per cran, covering all 12 existing inductors

---

## 3. Compact Main Table

### Goal
Reduce row height so ~20 rows are visible without scrolling on a standard 1080p screen.

### Changes to `ProjectLineGrid.tsx`
- Row padding: `py-2.5` → `py-1`
- Header padding: `py-2.5` → `py-1.5`
- Line name: `text-sm` → `text-[11px]`
- Sub-info (projectName): `text-xs` → `text-[9px]`
- Status badge: slightly smaller padding (`px-1.5 py-0.5` → `px-1 py-0`)
- ID cell: already small, keep monospace `text-[10px]`

---

## 4. Estimation Modal (replaces side panel)

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header: line name + ID + status                    [✕]  │
├─────────────────────────────────────────────────────────┤
│ Toolbar: [Inductores|Job Units] [🔍 search] [⚙ Manage] │
├───────────────────────────────────┬─────────────────────┤
│                                   │ Global occurrence   │
│   Inductor tree / JU flat table   │ Total días          │
│   (scrollable)                    │ Total k€            │
│                                   │ Yearly breakdown    │
│                                   │ Legend              │
├───────────────────────────────────┴─────────────────────┤
│ [📋 Copy]              [Close] [Draft] [Promote →]      │
└─────────────────────────────────────────────────────────┘
```

- Positioned: fixed overlay (`inset-0`), centered with flex
- Size: `w-[90vw] h-[88vh]`
- Backdrop: `bg-black/40`, click outside closes
- Right panel: fixed `w-52`, not scrollable
- Left panel: flex-1, overflow-y-auto

### 4.1 Inductor Tree View (default)

Each inductor row has:
- Expand/collapse chevron
- Inductor name + category badge
- Cran selector (`<select>` with available crans for this inductor)
- Inductor-level occurrence input
- Computed total days for this inductor
- Delete button

When a cran is selected, JU rows appear below (indented). All JUs load with `occurrence = inductorOccurrence` and `locked = false` as initial state.
- `shortName` (monospace badge)
- `description`
- Formula hint (`×variable` or `×variable+fixed`)
- Per-JU occurrence input (blue tint = inheriting, yellow tint = locked)
- Computed days for this JU
- Lock toggle button (🔓/🔒)
- Delete button

When inductor-level occurrence changes, all non-locked JUs in that inductor update their occurrence to match.

When no cran is selected: show warning row `⚠ Seleccioná un cran` — no JUs shown.

### 4.2 Flat View ("Job Units")

Table columns: Short Name | Description | Inductor / Cran | Occurrence | Variable | Fixed | Days | Lock

Occurrence inputs behave identically to tree view (blue = inherited, yellow = locked). Lock toggle works here too.

### 4.3 Search

Single `<input>` in toolbar. Filters in real-time:
- In tree view: hides inductor rows whose name doesn't match AND whose JUs don't match. If a JU matches, its parent inductor is shown even if the inductor name doesn't match.
- In flat view: hides JU rows that don't match either `shortName` or `description`.
- Search state (string) persists when toggling between views.

### 4.4 Custom JUs (kept)

Separate section below the inductor tree/flat view, same as current behavior. PMO/Admin only. Not included in the Cran model.

---

## 5. Manage Inductors Modal

A modal rendered on top of the Estimation Modal (`z-index` higher).

Layout: grid of category cards. Each card:
- Category header with checkbox (selects/deselects all inductors in group)
- List of inductors with individual checkboxes
- Shows count `X/Y sel.`

Clicking "Apply" updates the active inductor list in the estimation. Removing an inductor that has a selected cran+JUs prompts: "¿Eliminar inductor con X JUs?" (one confirm, no undo in prototype).

---

## 6. Bulk Estimate

"Estimar en bulk" in `BulkActionsBar` currently does nothing. Change: it opens the Estimation Modal for the **first** selected compatible line. The modal title indicates it's a bulk action: `Estimación bulk (N líneas)` — in this prototype it only edits the first line, with a note that bulk application to all selected lines is future work.

---

## 7. Modo Compatibles

A button in the toolbar of `PreEstimationPage` (next to filters). Toggling it re-renders the line list as multiple small grouped tables instead of one flat table. Each group = one compatibility cluster (same metier + status that the existing `checkCompatibility` logic already computes). Each sub-table has a small header showing the group label. The filter and search still apply within this mode.

---

## 8. Files Affected

| File | Change |
|---|---|
| `src/types/index.ts` | Add `Cran`, `JobUnit`, `JUOccurrence`, `InductorSelection`; update `Estimation` |
| `src/fixtures/inductors.ts` | Keep; add `crans` export to `crans.ts` |
| `src/fixtures/crans.ts` | New — cran variants per inductor |
| `src/fixtures/jobUnits.ts` | New — JU library records per cran |
| `src/lib/calc.ts` | Update `calcTotalDays` for new formula |
| `src/store/dataStore.ts` | Update estimation state shape |
| `src/components/grid/ProjectLineGrid.tsx` | Compact row styles |
| `src/components/estimation/EstimationPanel.tsx` | Rewrite as centered modal |
| `src/components/estimation/ManageInductorsModal.tsx` | New component |
| `src/components/estimation/CopyEstimationModal.tsx` | Update to new `inductorSelections` shape |
| `src/pages/PreEstimationPage.tsx` | Bulk estimate wiring + Modo Compatibles |
| `src/components/grid/BulkActionsBar.tsx` | Bulk estimate opens modal |

---

## 9. Out of Scope

- Actual multi-line bulk application (opens modal on first line only)
- Backend/API integration
- Persistence beyond in-memory store
