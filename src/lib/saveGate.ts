import type { InductorSelection, CustomJU } from '../types';

/**
 * The empty-Draft block (HIW-174 §9): Save-as-Draft is allowed only when there is at
 * least one inductor with a selected cran OR at least one named Custom JU. Zero
 * occurrence is still allowed (BR-13) — it just contributes zero to the totals.
 */
export function canSaveDraft(selections: InductorSelection[], customJUs: CustomJU[]): boolean {
  const hasSelection = selections.some((s) => s.selectedCranId !== null);
  const hasNamedCustom = customJUs.some((c) => c.name.trim().length > 0);
  return hasSelection || hasNamedCustom;
}

/**
 * Promote-to-definitive gate (HIW-174 §9 / K5): allowed when globalOccurrence > 0 AND there
 * is at least one cran-backed selection with JU occurrences OR at least one named Custom JU.
 * The Custom-JU branch lets an inductor with an empty workload standard still be estimated.
 */
export function canPromoteDefinitive(
  selections: InductorSelection[],
  customJUs: CustomJU[],
  globalOccurrences: number,
): boolean {
  if (globalOccurrences <= 0) return false;
  const hasCranJUs = selections.some((s) => s.selectedCranId !== null && s.juOccurrences.length > 0);
  const hasNamedCustom = customJUs.some((c) => c.name.trim().length > 0);
  return hasCranJUs || hasNamedCustom;
}
