import type { Estimation } from '../types';

export type PanelCopyAction = 'legacy' | 'copy' | 'none';

/**
 * Which contextual copy/import button the pre-estimation panel shows.
 * - Unsaved (no persisted estimation) + editable → import a legacy estimation.
 * - Saved draft (persisted estimation exists) → copy from other project lines.
 * - Locked or missing the copy capability → no button.
 */
export function panelCopyAction(opts: {
  existing: Estimation | null | undefined;
  canEdit: boolean;
  canCopy: boolean;
  locked: boolean;
}): PanelCopyAction {
  const { existing, canEdit, canCopy, locked } = opts;
  if (!canCopy || locked) return 'none';
  if (existing) return 'copy';
  if (canEdit) return 'legacy';
  return 'none';
}
