import type { InductorSelection, PrototypeInductor } from '../types';

/**
 * Builds an InductorSelection for a freshly chosen cran (HIW-14 §6 / Scenario 6).
 * All JU occurrences are seeded from the cran's workload-standard defaults and
 * marked unlocked — any prior selection's occurrences are discarded.
 */
export function buildCranSelection(
  inductor: PrototypeInductor,
  cranId: string,
): Omit<InductorSelection, 'inductorId'> {
  const cranJUs = inductor.crans.find((c) => c.id === cranId)?.jus ?? [];
  return {
    selectedCranId: cranId,
    inductorOccurrence: 1,
    juOccurrences: cranJUs.map((ju) => ({
      juId: ju.id,
      occurrence: ju.occurrence,
      locked: false,
    })),
  };
}
