import type { ProjectLine } from '../types';

export interface CompatibilityResult {
  compatible: boolean;
  reasons: string[];
}

export function checkCompatibility(lines: ProjectLine[]): CompatibilityResult {
  if (lines.length < 2) return { compatible: true, reasons: [] };
  const reasons: string[] = [];

  const metiers = new Set(lines.map((l) => l.metier));
  if (metiers.size > 1) reasons.push(`Mezcla ${metiers.size} métiers distintos (${[...metiers].join(', ')})`);

  const cycles = new Set(lines.map((l) => l.cycleId));
  if (cycles.size > 1) reasons.push('Las líneas pertenecen a cycles diferentes');

  const lockedStatus = lines.filter((l) => l.status === 'allocated' || l.status === 'approved');
  if (lockedStatus.length > 0) reasons.push(`${lockedStatus.length} línea(s) ya está(n) aprobada(s)/asignada(s)`);

  return { compatible: reasons.length === 0, reasons };
}
