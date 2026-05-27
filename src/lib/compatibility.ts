/**
 * Pre-Estimation View — Multi-line Selection Compatibility.
 *
 * Spec: BR-06, BR-07 (sdd-kit/great_dspy/specs/pre_estimation_specs.py)
 *
 * All selected lines must share identical values on:
 *   - Organ Type
 *   - Energy / Fuel Type
 *   - Project Ranking
 *   - Injection System
 *
 * null vs null = compatible.
 * null vs a value = INCOMPATIBLE.
 */
import type { ProjectLine } from '../types';

export interface CompatibilityResult {
  compatible: boolean;
  reasons: string[];
}

const COMPATIBILITY_FIELDS: (keyof ProjectLine)[] = [
  'organType',
  'energyFuelType',
  'projectRanking',
  'injectionSystem',
];

const FIELD_LABELS: Record<string, string> = {
  organType: 'Organ Type',
  energyFuelType: 'Energy / Fuel Type',
  projectRanking: 'Project Ranking',
  injectionSystem: 'Injection System',
};

export function checkCompatibility(lines: ProjectLine[]): CompatibilityResult {
  if (lines.length < 2) return { compatible: true, reasons: [] };

  const reasons: string[] = [];

  for (const field of COMPATIBILITY_FIELDS) {
    const values = new Map<string | null, number>();

    for (const line of lines) {
      const val = line[field] ?? null;
      values.set(val as string | null, (values.get(val as string | null) ?? 0) + 1);
    }

    // If all values are the same, this field is compatible
    if (values.size <= 1) continue;

    // Check null vs value conflict (BR-07)
    const hasNull = values.has(null);
    const hasValue = Array.from(values.keys()).some(k => k !== null);

    if (hasNull && hasValue) {
      const nonNulls = Array.from(values.keys())
        .filter(k => k !== null)
        .join(', ');
      reasons.push(
        `${FIELD_LABELS[field]}: mixed null and values (${nonNulls}) — null vs value is incompatible (BR-07)`
      );
    } else {
      const allValues = Array.from(values.keys()).join(', ');
      reasons.push(
        `${FIELD_LABELS[field]}: multiple values found (${allValues}) — all selected lines must share the same value (BR-06)`
      );
    }
  }

  return { compatible: reasons.length === 0, reasons };
}