import type { ProjectLine } from '../types';

/**
 * A project line can be selected for Bulk Estimate only while it is still
 * pending estimation. Once it reaches 'Estimated' or 'Approved' its values are
 * locked, so it must not be part of a bulk (re)estimate selection.
 */
export function isLineSelectableForEstimate(line: ProjectLine): boolean {
  return line.status !== 'Estimated' && line.status !== 'Approved';
}
