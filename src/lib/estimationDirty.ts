import type { InductorSelection, CustomJU } from '../types';

export interface DirtyState {
  inductorSelections: InductorSelection[];
  customJUs: CustomJU[];
  globalOccurrences: number;
}

const PRISTINE: DirtyState = { inductorSelections: [], customJUs: [], globalOccurrences: 1 };

/**
 * True when `current` differs from the persisted baseline. A missing baseline is
 * treated as the pristine default (empty selections, no custom JUs, occurrence 1),
 * so an untouched freshly-opened panel is never "dirty".
 */
export function isEstimationDirty(baseline: DirtyState | undefined, current: DirtyState): boolean {
  const base = baseline ?? PRISTINE;
  return (
    base.globalOccurrences !== current.globalOccurrences ||
    JSON.stringify(base.inductorSelections) !== JSON.stringify(current.inductorSelections) ||
    JSON.stringify(base.customJUs) !== JSON.stringify(current.customJUs)
  );
}
