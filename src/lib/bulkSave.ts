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
