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
