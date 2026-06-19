import type { Estimation } from '../types';

export interface PanelCopyButtons {
  /** Import a legacy (historical-cycle) estimation into the form. */
  legacy: boolean;
  /** Copy the current estimation to other compatible project lines. */
  copy: boolean;
}

/**
 * Which contextual copy/import buttons the pre-estimation panel shows.
 * The two actions are independent (HIW-174 retest2): importing a legacy
 * estimation stays available for the whole editing session, even after the
 * line has been saved as Draft, so it no longer vanishes once `existing` is set.
 * - legacy import → whenever the panel is editable (and the copy capability is granted).
 * - copy to other lines → whenever a persisted estimation exists to copy from.
 * - Locked or missing the copy capability → no buttons.
 */
export function panelCopyButtons(opts: {
  existing: Estimation | null | undefined;
  canEdit: boolean;
  canCopy: boolean;
  locked: boolean;
}): PanelCopyButtons {
  const { existing, canEdit, canCopy, locked } = opts;
  if (!canCopy || locked) return { legacy: false, copy: false };
  return { legacy: canEdit, copy: !!existing };
}
