# SDD Compliance — Full Gap Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the React/Vite/TS frontend into full compliance with the 74 SDD-Kit business rules, closing 5 spec gaps found by auditing `sdd-kit/great_dspy/specs/` against the live codebase.

**Architecture:** All fixes are local UI changes — no new pages, no new stores. Role permissions live in `src/fixtures/roles.ts` (one source of truth). Approval-column logic mirrors the spec's `ENGINEER_APPROVAL_MAP` / `CPO_APPROVAL_MAP` exactly. CSV export reuses the existing `src/lib/csvExport.ts` pattern.

**Tech Stack:** React 18, TypeScript (strict), Zustand, Vite, Vitest, Tailwind CSS.

---

## Gap Audit (found vs spec)

| # | Rule(s) | Symptom | File |
|---|---------|---------|------|
| 1 | pre_estimation_specs `Role.CPO can_view=False`; allocation_specs `CPO can_view=False`; management_view `MANAGEMENT_ACCESS[CPO]=False`; management_view `MANAGEMENT_ACCESS[RCRC]=False`; allocation_specs `RCRC can_edit=True` | CPO has `view:pre-estimation`, `view:allocation`, `view:management`. RCRC has `view:management`, lacks `edit:allocation`. | `src/fixtures/roles.ts` |
| 2 | FR-BR-03 "Approved lines only" | `FinalReviewPage` aggregates all lines that have `estimatedDays != null` — includes `estimated`, `sent`, `draft` | `src/pages/FinalReviewPage.tsx` |
| 3 | ERev spec §3 `ENGINEER_APPROVAL_MAP` / `CPO_APPROVAL_MAP` | EstimationReview has no Engineer Approval or CPO Approval columns | `src/pages/EstimationReviewPage.tsx` |
| 4 | estimation_review_specs `can_export_csv=True` for all roles | No CSV export in EstimationReview | `src/pages/EstimationReviewPage.tsx`, `src/lib/csvExport.ts` |
| 5 | i18n completeness (not a spec rule, but quality gap) | `CustomJUSection` in `EstimationPanel` has 4 hardcoded Spanish strings | `src/components/estimation/EstimationPanel.tsx`, i18n files |

---

## Files touched

| File | Action |
|------|--------|
| `src/fixtures/roles.ts` | Modify — fix 5 permission entries |
| `src/pages/FinalReviewPage.tsx` | Modify — filter `status === 'approved'` |
| `src/pages/EstimationReviewPage.tsx` | Modify — add approval columns + CSV export button |
| `src/lib/csvExport.ts` | Modify — add `exportEstimationReviewToCsv` |
| `src/components/estimation/EstimationPanel.tsx` | Modify — i18n `CustomJUSection` |
| `src/i18n/types.ts` | Modify — add 4 keys under `panel` namespace |
| `src/i18n/es.ts` | Modify — add 4 ES strings |
| `src/i18n/en.ts` | Modify — add 4 EN strings |

---

## Task 1 — Fix role permissions (`roles.ts`)

**Spec references:** `pre_estimation_specs.py` Role.CPO `can_view=False`; `allocation_specs.py` CPO + RCRC; `management_view_specs.py` MANAGEMENT_ACCESS.

**Files:**
- Modify: `src/fixtures/roles.ts`

- [ ] **Step 1: Open the file and read the current CPO and RCRC permission arrays**

  File: `src/fixtures/roles.ts` — look at the `CPO` and `RCRC` entries of `ROLE_PERMISSIONS`.

- [ ] **Step 2: Apply the permission corrections**

  Replace the `CPO` and `RCRC` entries with the spec-compliant versions:

  ```ts
  // src/fixtures/roles.ts

  // CPO: can_view=False for Pre-Estimation (pre_estimation_specs),
  //      can_view=False for Allocation (allocation_specs §1),
  //      MANAGEMENT_ACCESS[CPO]=False (management_view_specs §1)
  CPO: [
    // 'view:pre-estimation',   ← removed (spec: CPO cannot view Pre-Estimation)
    'view:estimation-review',
    'approve:estimation',
    'reject:estimation',
    // 'view:allocation',       ← removed (spec: CPO cannot view Allocation)
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    // 'view:management',       ← removed (spec: MANAGEMENT_ACCESS[CPO]=False)
  ],

  // RCRC: MANAGEMENT_ACCESS[RCRC]=False (management_view_specs §1),
  //       can_edit=True, can_save=True for Allocation (allocation_specs §1)
  RCRC: [
    'view:pre-estimation',
    'view:estimation-review',
    'view:allocation',
    'edit:allocation',    // ← added (spec: RCRC can_edit=True, can_save=True)
    'view:final-review',
    'export:final-review',
    // 'view:management',  ← removed (spec: MANAGEMENT_ACCESS[RCRC]=False)
  ],
  ```

- [ ] **Step 3: Run TypeScript check**

  ```bash
  npx tsc -b --noEmit
  ```
  Expected: no errors.

- [ ] **Step 4: Run Vitest**

  ```bash
  npx vitest run
  ```
  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/fixtures/roles.ts
  git commit -m "fix(roles): align CPO and RCRC permissions with SDD Kit specs

  - CPO: remove view:pre-estimation, view:allocation, view:management
  - RCRC: remove view:management, add edit:allocation
  Refs: pre_estimation_specs Role.CPO; allocation_specs RCRC; management_view MANAGEMENT_ACCESS"
  ```

---

## Task 2 — Final Review shows approved-only lines (FR-BR-03)

**Spec reference:** `final_review_specs.py` FR-BR-03 "Approved lines only — Only status=Approved (PL, Métier) pairs appear".

**Files:**
- Modify: `src/pages/FinalReviewPage.tsx`

- [ ] **Step 1: Find the aggregation `useMemo` in `FinalReviewContent`**

  The faulty block is around line 30:
  ```tsx
  const byMetier = useMemo(() => {
    const map = new Map<Metier, { count: number; days: number; kEuro: number }>();
    lines.forEach((l) => {
      if (l.estimatedDays == null) return;  // ← wrong filter
  ```

- [ ] **Step 2: Change both `approvedLines` derivation and `byMetier` aggregation to filter strictly on `status === 'approved'`**

  ```tsx
  // Replace these two useMemo blocks:

  const approvedLines = useMemo(
    () => lines.filter((l) => l.status === 'approved'),
    [lines],
  );

  const byMetier = useMemo(() => {
    const map = new Map<Metier, { count: number; days: number; kEuro: number }>();
    approvedLines.forEach((l) => {                    // ← use approvedLines, not lines
      const cur = map.get(l.metier) ?? { count: 0, days: 0, kEuro: 0 };
      cur.count += 1;
      cur.days += l.estimatedDays ?? 0;
      cur.kEuro += l.estimatedKEuro ?? 0;
      map.set(l.metier, cur);
    });
    return [...map.entries()].sort((a, b) => b[1].kEuro - a[1].kEuro);
  }, [approvedLines]);                                // ← dependency is approvedLines
  ```

- [ ] **Step 3: Run TypeScript check**

  ```bash
  npx tsc -b --noEmit
  ```
  Expected: no errors.

- [ ] **Step 4: Run Vitest**

  ```bash
  npx vitest run
  ```
  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/FinalReviewPage.tsx
  git commit -m "fix(final-review): show approved-only lines per FR-BR-03

  Previous code filtered on estimatedDays != null, which included estimated/sent lines.
  Spec FR-BR-03 is explicit: only status=Approved pairs appear."
  ```

---

## Task 3 — EstimationReview: approval columns + CSV export

**Spec references:**
- `estimation_review_specs.py` §3 `ENGINEER_APPROVAL_MAP` / `CPO_APPROVAL_MAP`
- `estimation_review_specs.py` `can_export_csv=True` for all roles

**Files:**
- Modify: `src/pages/EstimationReviewPage.tsx`
- Modify: `src/lib/csvExport.ts`

- [ ] **Step 1: Add approval-derivation helpers at the top of `EstimationReviewPage.tsx`**

  Add these pure functions just after the imports (before `export function EstimationReviewPage`):

  ```tsx
  // Mirrors estimation_review_specs.py §3 ENGINEER_APPROVAL_MAP / CPO_APPROVAL_MAP
  function engineerApproval(status: ProjectLine['status']): string {
    return ['estimated', 'sent', 'approved'].includes(status) ? '✓' : '—';
  }

  function cpoApproval(status: ProjectLine['status']): string {
    switch (status) {
      case 'approved': return '✓ Approved';
      case 'rejected': return '✗ Rejected';
      case 'sent':     return '⏳ Pending';
      default:         return '—';
    }
  }
  ```

- [ ] **Step 2: Add i18n keys for the two new column headers and the export button**

  In `src/i18n/types.ts`, inside the `estReview` namespace, add:
  ```ts
  colEngApproval: string;
  colCpoApproval: string;
  exportCsv: string;
  ```

  In `src/i18n/es.ts`, inside `estReview`:
  ```ts
  colEngApproval: 'Aprob. Ing.',
  colCpoApproval: 'Aprob. CPO',
  exportCsv: 'Exportar CSV',
  ```

  In `src/i18n/en.ts`, inside `estReview`:
  ```ts
  colEngApproval: 'Eng. Approval',
  colCpoApproval: 'CPO Approval',
  exportCsv: 'Export CSV',
  ```

- [ ] **Step 3: Add the Export CSV button to `ReviewContent`**

  In the `<div>` at the top of the JSX that already contains the `<h1>`, change:

  ```tsx
  // BEFORE
  <div>
    <h1 className="text-xl font-bold text-slate-900">{t('estReview.title')}</h1>
    <p className="text-sm text-slate-600">{t('estReview.subtitle')}</p>
  </div>
  ```

  ```tsx
  // AFTER
  <div className="flex items-start justify-between">
    <div>
      <h1 className="text-xl font-bold text-slate-900">{t('estReview.title')}</h1>
      <p className="text-sm text-slate-600">{t('estReview.subtitle')}</p>
    </div>
    <Button variant="secondary" size="sm" onClick={() => exportEstimationReviewToCsv(visibleLines, t)}>
      <Download size={14} /> {t('estReview.exportCsv')}
    </Button>
  </div>
  ```

  Also add the import at the top of the file:
  ```tsx
  import { Download } from 'lucide-react';
  import { exportEstimationReviewToCsv } from '../lib/csvExport';
  ```

  And expose `visibleLines` from `ReviewContent` (it's already computed in the `useMemo`, just make sure the variable is in scope for the button).

- [ ] **Step 4: Add the two approval columns to the `Section` table**

  In `function Section`, find the `<thead>` row and add two new `<th>` after `colStatus`:

  ```tsx
  <th className="px-3 py-2 text-left font-medium">{t('estReview.colEngApproval')}</th>
  <th className="px-3 py-2 text-left font-medium">{t('estReview.colCpoApproval')}</th>
  ```

  In the `<tbody>` row, add two new `<td>` after the status cell:

  ```tsx
  <td className="px-3 py-2.5 text-xs font-mono">{engineerApproval(l.status)}</td>
  <td className="px-3 py-2.5 text-xs font-mono">{cpoApproval(l.status)}</td>
  ```

  Note: `engineerApproval` and `cpoApproval` are module-level functions, so they're accessible inside `Section` directly.

- [ ] **Step 5: Add `exportEstimationReviewToCsv` to `src/lib/csvExport.ts`**

  Add at the bottom of `csvExport.ts`:

  ```ts
  // Estimation Review CSV (estimation_review_specs.py §9 CSV_EXPORT_COLUMNS)
  export function exportEstimationReviewToCsv(
    lines: ProjectLine[],
    t: (key: string) => string,
  ): void {
    const headers = [
      'PL Number', 'PL Name', 'Métier', 'Status',
      'Eng. Approval', 'CPO Approval', 'Days', 'k€',
    ];

    const rows = lines.map((l) =>
      [
        l.id,
        l.lineName,
        l.metier,
        l.status,
        ['estimated', 'sent', 'approved'].includes(l.status) ? '✓' : '—',
        (() => {
          switch (l.status) {
            case 'approved': return '✓ Approved';
            case 'rejected': return '✗ Rejected';
            case 'sent':     return '⏳ Pending';
            default:         return '—';
          }
        })(),
        l.estimatedDays ?? 0,
        l.estimatedKEuro ?? 0,
      ]
        .map(escapeCell)
        .join(','),
    );

    const content = [headers.map(escapeCell).join(','), ...rows].join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'estimation-review.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  ```

  Note: `escapeCell` is already defined earlier in the same file — reuse it.
  Note: The `t` parameter is accepted for future i18n of headers but is not used here — the column names in the CSV are intentionally in English (spec CSV_EXPORT_COLUMNS is in English).

- [ ] **Step 6: Run TypeScript check**

  ```bash
  npx tsc -b --noEmit
  ```
  Expected: no errors.

- [ ] **Step 7: Run Vitest**

  ```bash
  npx vitest run
  ```
  Expected: all tests pass.

- [ ] **Step 8: Commit**

  ```bash
  git add src/pages/EstimationReviewPage.tsx src/lib/csvExport.ts src/i18n/types.ts src/i18n/es.ts src/i18n/en.ts
  git commit -m "feat(est-review): add approval columns and CSV export per ERev spec

  - Engineer Approval / CPO Approval columns derived from status
    (mirrors ENGINEER_APPROVAL_MAP and CPO_APPROVAL_MAP from estimation_review_specs.py)
  - CSV export button visible to all roles (can_export_csv=True for all)"
  ```

---

## Task 4 — i18n CustomJUSection in EstimationPanel

**Spec reference:** Not a business rule, but 4 hardcoded Spanish strings remain in `CustomJUSection` after the i18n pass.

**Files:**
- Modify: `src/components/estimation/EstimationPanel.tsx`
- Modify: `src/i18n/types.ts`
- Modify: `src/i18n/es.ts`
- Modify: `src/i18n/en.ts`

- [ ] **Step 1: Add 4 i18n keys to `src/i18n/types.ts`**

  Inside the `panel` namespace:
  ```ts
  customJUs: string;
  addCustomJU: string;
  noCustomJUs: string;
  noCustomJUsPermission: string;
  customJUPlaceholder: string;
  ```

- [ ] **Step 2: Add the translations to `src/i18n/es.ts`** (inside `panel`):

  ```ts
  customJUs: 'JUs Custom',
  addCustomJU: '+ Agregar JU',
  noCustomJUs: 'Sin JUs custom.',
  noCustomJUsPermission: 'Solo PMO/Admin pueden agregar Custom JUs.',
  customJUPlaceholder: 'Descripción',
  ```

- [ ] **Step 3: Add the translations to `src/i18n/en.ts`** (inside `panel`):

  ```ts
  customJUs: 'Custom JUs',
  addCustomJU: '+ Add JU',
  noCustomJUs: 'No custom JUs.',
  noCustomJUsPermission: 'Only PMO/Admin can add Custom JUs.',
  customJUPlaceholder: 'Description',
  ```

- [ ] **Step 4: Wire `useT()` into `CustomJUSection` and replace all hardcoded strings**

  In `CustomJUSection` (around line 742 of `EstimationPanel.tsx`), add `const t = useT();` and replace:

  ```tsx
  function CustomJUSection({ customJUs, canEdit, canEditCustomJU, onChange }) {
    const t = useT();
    return (
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {t('panel.customJUs')}
          </span>
          {canEdit && canEditCustomJU && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onChange((j) => [...j, { id: `ju-${Date.now()}`, description: '', days: 1 }])}
            >
              {t('panel.addCustomJU')}
            </Button>
          )}
        </div>
        {customJUs.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-3 text-center text-[10px] text-slate-400">
            {canEditCustomJU ? t('panel.noCustomJUs') : t('panel.noCustomJUsPermission')}
          </div>
        ) : (
          <div className="space-y-1.5">
            {customJUs.map((ju, idx) => (
              <div key={ju.id} className="flex items-center gap-2">
                <input
                  value={ju.description}
                  placeholder={t('panel.customJUPlaceholder')}
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

- [ ] **Step 5: Run TypeScript check**

  ```bash
  npx tsc -b --noEmit
  ```
  Expected: no errors.

- [ ] **Step 6: Run Vitest**

  ```bash
  npx vitest run
  ```
  Expected: all tests pass.

- [ ] **Step 7: Run SDD Kit tests**

  ```bash
  pytest sdd-kit/tests/ -v --tb=short -q
  ```
  Expected: 257 passed.

- [ ] **Step 8: Commit**

  ```bash
  git add src/components/estimation/EstimationPanel.tsx src/i18n/types.ts src/i18n/es.ts src/i18n/en.ts
  git commit -m "feat(i18n): translate CustomJUSection — last hardcoded Spanish strings in EstimationPanel"
  ```

---

## Self-Review Checklist

| Gap | Task | Covered? |
|-----|------|----------|
| CPO can_view=False (Pre-Estimation) | Task 1 | ✅ |
| CPO can_view=False (Allocation) | Task 1 | ✅ |
| CPO MANAGEMENT_ACCESS=False | Task 1 | ✅ |
| RCRC MANAGEMENT_ACCESS=False | Task 1 | ✅ |
| RCRC can_edit=True (Allocation) | Task 1 | ✅ |
| FR-BR-03 Approved lines only | Task 2 | ✅ |
| ENGINEER_APPROVAL_MAP columns | Task 3 | ✅ |
| CPO_APPROVAL_MAP columns | Task 3 | ✅ |
| can_export_csv=True (all roles) | Task 3 | ✅ |
| CustomJUSection i18n | Task 4 | ✅ |

**Not in scope (pending external decisions per spec):**
- Email alerts (TRANS-01, 02, 03 blocking — no email service decided)
- Stage 3 HVT payload (FINAL-01 blocking — not agreed with HVT team)
- Timeline data source in Management (MGMT-01 blocking)
- Column sorting / resizing (TABLE-BR-01 — frontend table library not decided)
