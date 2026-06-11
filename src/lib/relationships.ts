/**
 * Pre-Estimation View — Parent-child line relationships (HIW-174 §5b).
 * Port of get_related_line_ids / check_hvt_attribute_changed from the SDD spec
 * (pre_estimation_specs.py). HVT-monitored fields use the TS ProjectLine names.
 */
import type { LineRelationship, HvtSnapshot, HvtChange, ProjectLine } from '../types';

export function getRelatedLineIds(lineId: string, relationships: LineRelationship[]): string[] {
  const related: string[] = [];
  for (const rel of relationships) {
    if (rel.parentLineId === lineId) related.push(rel.childLineId);
    else if (rel.childLineId === lineId) related.push(rel.parentLineId);
  }
  return related;
}

const HVT_MONITORED_FIELDS: (keyof HvtSnapshot)[] = [
  'organType', 'energyFuelType', 'projectRanking', 'injectionSystem',
  'spDate', 'allianceCode', 'vehicleCode', 'standardEmissions', 'client', 'market',
];

export function checkHvtAttributeChanged(line: ProjectLine, original: HvtSnapshot): HvtChange | null {
  const fields: Record<string, { old: unknown; new: unknown }> = {};
  for (const f of HVT_MONITORED_FIELDS) {
    const oldVal = original[f];
    const newVal = (line as unknown as Record<string, unknown>)[f];
    if (oldVal !== newVal) fields[f] = { old: oldVal, new: newVal };
  }
  return Object.keys(fields).length > 0 ? { lineId: line.id, fields } : null;
}
