import type { ProjectLine, Estimation, PrototypeInductor } from '../types';
import { calcEstimationTotals } from './calc';
import { engineerApproval, cpoApproval } from './approvalColumns';

export interface EstimationReviewGridRow extends ProjectLine {
  totalFte: number;
  totalBh: number;
  totalKm: number;
  yearlyKEuro: Record<string, number>;
  // FTE/BH/KM per year: prototype shows 0 — Estimation type stores only K€ yearly
  // (yearlyBreakdown[]). Annual FTE/BH/KM breakdown requires a future data model change.
  yearlyFte: Record<string, number>;
  yearlyBh: Record<string, number>;
  yearlyKm: Record<string, number>;
  engineerApproval: string;
  cpoApproval: string;
}

export function deriveGridRow(
  line: ProjectLine,
  estimation: Estimation | null | undefined,
  inductors: PrototypeInductor[],
  cycleYears: string[],
): EstimationReviewGridRow {
  let totalFte = 0;
  let totalBh = 0;
  let totalKm = 0;
  let yearlyKEuro: Record<string, number> = {};
  const yearlyFte: Record<string, number> = Object.fromEntries(cycleYears.map((y) => [y, 0]));
  const yearlyBh: Record<string, number> = Object.fromEntries(cycleYears.map((y) => [y, 0]));
  const yearlyKm: Record<string, number> = Object.fromEntries(cycleYears.map((y) => [y, 0]));

  if (estimation) {
    const totals = calcEstimationTotals(
      estimation.inductorSelections,
      inductors,
      estimation.customJUs,
      estimation.globalOccurrences,
    );
    totalFte = totals.fte;
    totalBh = totals.benchHours;
    totalKm = totals.km;
    yearlyKEuro = Object.fromEntries(
      cycleYears.map((y, i) => [y, estimation.yearlyBreakdown[i] ?? 0]),
    );
  }

  return {
    ...line,
    totalFte,
    totalBh,
    totalKm,
    yearlyKEuro,
    yearlyFte,
    yearlyBh,
    yearlyKm,
    engineerApproval: engineerApproval(line.status),
    cpoApproval: cpoApproval(line.status),
  };
}
