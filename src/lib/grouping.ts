/**
 * Pre-Estimation View — Group by Compatibility Key.
 *
 * Groups project lines by the 4-field compatibility key:
 *   Organ Type · Energy/Fuel Type · Project Ranking · Injection System
 *
 * Null or empty field values are rendered as '—' in the key.
 * Spec: Phase 2 — Group by compatibility (HIW-174 §4)
 */
import type { ProjectLine } from '../types';

export interface CompatibilityGroup {
  key: string;
  fields: {
    organType: string | null;
    energyFuelType: string | null;
    projectRanking: string | null;
    injectionSystem: string | null;
  };
  lines: ProjectLine[];
}

const EMPTY = '—';

function fieldLabel(value: string | null | undefined): string {
  return value ?? EMPTY;
}

export function groupByCompatibility(lines: ProjectLine[]): CompatibilityGroup[] {
  const map = new Map<string, CompatibilityGroup>();

  for (const line of lines) {
    const organType = line.organType ?? null;
    const energyFuelType = line.energyFuelType ?? null;
    const projectRanking = line.projectRanking ?? null;
    const injectionSystem = line.injectionSystem ?? null;

    const key = [
      fieldLabel(organType),
      fieldLabel(energyFuelType),
      fieldLabel(projectRanking),
      fieldLabel(injectionSystem),
    ].join(' · ');

    if (!map.has(key)) {
      map.set(key, {
        key,
        fields: { organType, energyFuelType, projectRanking, injectionSystem },
        lines: [],
      });
    }

    map.get(key)!.lines.push(line);
  }

  return [...map.values()];
}
