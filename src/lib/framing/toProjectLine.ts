import type { Metier, ProjectLine } from '../../types';
import type { FramingLine } from '../../types/framing';

/**
 * Framing line → project line, the §9 Generate mapping.
 *
 * Slice 1 of HIW-452 deliberately wrote no `project_line` at all, to avoid
 * resolving the Sent-vs-Framing-Change status contradiction. This mapping does
 * not resolve it either, and does not have to: it only ever produces `To do`,
 * the one status both models hold, and touches no transition downstream of it.
 *
 * One framing line becomes ONE project line, at the métier its Owner N2 names.
 * `project_id` is the composition the schema documents — pl_number + metier
 * (pev.ts ProjectLineListItem) — which is also what makes a repeat send
 * detectable rather than silently duplicating rows.
 */

/** The full Metier enum (pev.ts). Owner N2 is free text until checked against it. */
const KNOWN_METIERS: readonly Metier[] = [
  'H-DESIGN', 'H-TUNING', 'H-SOFTWARE', 'H-CUSTOMER', 'H-PROJECT', 'H-NP', 'H-TESTING',
];

export interface GenerateOptions {
  cycleId: string;
  /** The acting role, recorded as `lastUpdatedBy`. */
  actor: string;
}

/** Owner N2 as a Metier, or null when it is not one. Trim- and case-tolerant. */
export function metierFor(ownerN2: string): Metier | null {
  const needle = (ownerN2 ?? '').trim().toUpperCase();
  return KNOWN_METIERS.find((m) => m === needle) ?? null;
}

/**
 * Whether this line can become a project line at all: an RFQ row (§15 — the
 * send is RFQ only; RFI has its own §15.5 channel) with a PL Number and an
 * Owner N2 that names a real métier. A file can carry an Owner N2 nobody maps,
 * and a row that cannot be mapped must be visibly skipped, never half-sent.
 */
export function isSendableToPreEstimation(line: FramingLine): boolean {
  return (
    line.track === 'RFQ'
    && (line.plNumber ?? '').trim() !== ''
    && metierFor(line.ownerN2) !== null
  );
}

export function framingLineToProjectLine(
  line: FramingLine,
  { cycleId, actor }: GenerateOptions,
): ProjectLine | null {
  const metier = metierFor(line.ownerN2);
  if (metier === null || !isSendableToPreEstimation(line)) return null;

  const plNumber = line.plNumber.trim();
  const key = `${plNumber}-${metier}`;
  const now = new Date().toISOString();

  return {
    id: key,
    project_id: key,
    name: line.plName,
    metier,
    status: 'To do',
    updated_at: now,
    lineName: `${line.plName} — ${metier}`,
    projectName: line.projectName,
    plNumber,
    plName: line.plName,
    assignedEngineerId: null,
    estimatedDays: null,
    estimatedKEuro: null,
    lastUpdatedBy: actor,
    lastUpdatedAt: now,
    cycleId,
    organType: line.organType,
    // The prototype carries the same value under two names; the framing file
    // has one Fuel column, so both read from it rather than one being invented.
    energy: line.energy,
    energyFuelType: line.energy,
    projectRanking: line.projectRanking,
    client: line.client,
    requestType: line.requestType,
    allianceCode: line.allianceCode,
    vehicleCode: line.vehicleCode,
    standardEmissions: line.standardEmissions,
    spDate: line.spDate,
    pcDate: line.pcDate,
    coDate: line.coDate,
    sopDate: line.sopDate,
    // engineering / estimateType / injectionSystem / market are Generate's own
    // derivations (see parseFramingFile's header note) and their rules are not
    // written down anywhere we can read. Left unset rather than guessed.
  };
}
