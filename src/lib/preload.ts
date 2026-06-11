import type { InductorSelection, PrototypeInductor } from '../types';

/**
 * Preload one selection per inductor (HIW-174: inductors appear already loaded).
 * Single-cran inductors auto-select their only cran and seed JU occurrences (§7);
 * multi-cran and zero-cran inductors start with no cran.
 */
export function preloadSelections(inductors: PrototypeInductor[]): InductorSelection[] {
  return inductors.map((ind) => {
    if (ind.crans.length === 1) {
      const cran = ind.crans[0];
      return {
        inductorId: ind.id,
        selectedCranId: cran.id,
        inductorOccurrence: 1,
        juOccurrences: cran.jus.map((ju) => ({ juId: ju.id, occurrence: ju.occurrence, locked: false })),
      };
    }
    return { inductorId: ind.id, selectedCranId: null, inductorOccurrence: 1, juOccurrences: [] };
  });
}
