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
