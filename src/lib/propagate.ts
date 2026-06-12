import type { InductorSelection } from '../types';

/**
 * Applies an inductor-level occurrence to all unlocked JUs (HIW-14 §2 / Scenario 2).
 * Locked JUs keep their current occurrence unchanged (occurrence_lock = true).
 * Returns a new InductorSelection; the input is not mutated.
 */
export function propagateInductorOccurrence(
  selection: InductorSelection,
  occurrence: number,
): InductorSelection {
  return {
    ...selection,
    inductorOccurrence: occurrence,
    juOccurrences: selection.juOccurrences.map((jo) =>
      jo.locked ? jo : { ...jo, occurrence },
    ),
  };
}
