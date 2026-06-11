/**
 * Historical-cycle estimations for the Copy-from-Legacy tab (HIW-174 §12.2).
 * Each entry is a prior-cycle estimation a user can pull forward into the current
 * workload standard. `label` is what the UI lists; `jus` feed mergeLegacyEstimation.
 *
 * JU ids chosen to exercise all four merge rules against the live INDUCTORS fixture:
 *   - ju-1-2-1  (ind-1 / cr-1-2) → Rule 1: same coeffs (variable=2.0, fixed=0)
 *   - ju-1-2-2  (ind-1 / cr-1-2) → Rule 2: coeffs changed (historical variable=2.0 vs current 1.5)
 *   - ju-2-1-1  (ind-2 / cr-2-1) → contributes a second inductor bucket; Rule 1 match
 *   - ju-LEGACY-GHOST-01          → Rule 3: orphan absent from INDUCTORS → Custom JU
 *   Rule 4 (new JU under a touched inductor, added at occurrence 0) is exercised implicitly:
 *   any JU present in cran cr-1-2 of ind-1 that does NOT appear in the legacy list (e.g.
 *   a third JU added to that cran after the historical cycle) receives occurrence 0 per Rule 4.
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
      // Rule 1 — identical coeffs: keep historical occurrence (4)
      {
        juId: 'ju-1-2-1',
        inductorId: 'ind-1',
        cranId: 'cr-1-2',
        variable: 2.0,
        fixed: 0,
        occurrence: 4,
      },
      // Rule 2 — coeffs changed: historical variable=2.0 vs current 1.5 → occurrence recalculated
      {
        juId: 'ju-1-2-2',
        inductorId: 'ind-1',
        cranId: 'cr-1-2',
        variable: 2.0,
        fixed: 0,
        occurrence: 3,
      },
      // Rule 3 — orphan juId absent from INDUCTORS → becomes Custom JU
      {
        juId: 'ju-LEGACY-GHOST-01',
        inductorId: 'ind-1',
        cranId: 'cr-1-2',
        variable: 1.2,
        fixed: 0.5,
        occurrence: 2,
      },
    ],
  },
  {
    id: 'leg-2',
    label: 'DB schema overhaul (2025 H1)',
    cycleName: '2025 H1',
    jus: [
      // Rule 1 — identical coeffs for DB migration JU
      {
        juId: 'ju-2-1-1',
        inductorId: 'ind-2',
        cranId: 'cr-2-1',
        variable: 0.8,
        fixed: 0,
        occurrence: 6,
      },
      // Rule 3 — another orphan from prior workload standard
      {
        juId: 'ju-LEGACY-GHOST-02',
        inductorId: 'ind-2',
        cranId: 'cr-2-1',
        variable: 0.5,
        fixed: 1.0,
        occurrence: 3,
      },
    ],
  },
];
