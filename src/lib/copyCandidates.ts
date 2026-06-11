/**
 * Pre-Estimation View — Copy Estimation target filtering (HIW-174 §10).
 *
 * A line is a valid copy target when it is:
 *   1. not the source line,
 *   2. compatible with the source (same Organ Type + Energy + Project Ranking +
 *      Injection System, per checkCompatibility / BR-06/BR-07),
 *   3. in a status that can receive an estimate (To do or Draft),
 *   4. available to the current user (when ownOnly, assigned to activeEngineerId).
 */
import type { ProjectLine } from '../types';
import { checkCompatibility } from './compatibility';

export interface CopyCandidateOpts {
  ownOnly: boolean;
  activeEngineerId: string | null;
}

const COPYABLE_STATUSES = new Set(['To do', 'Draft']);

export function copyCandidates(
  lines: ProjectLine[],
  source: ProjectLine,
  opts: CopyCandidateOpts,
): ProjectLine[] {
  return lines.filter((l) => {
    if (l.id === source.id) return false;
    if (!COPYABLE_STATUSES.has(l.status)) return false;
    if (opts.ownOnly && opts.activeEngineerId && l.assignedEngineerId !== opts.activeEngineerId) return false;
    return checkCompatibility([source, l]).compatible;
  });
}
