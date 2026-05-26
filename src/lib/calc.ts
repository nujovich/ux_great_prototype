/**
 * Pre-Estimation View — Estimation Calculation.
 *
 * Spec: §9.1-9.5 (sdd-kit/great_dspy/specs/pre_estimation_specs.py)
 *
 * Formula: Total = (Variable × Occurrence) + Fixed
 * Unit types: man_day → FTE = Total / 209
 *             bench_hours → BH
 *             kilometres → KM
 *             k_euros → excluded from current scope
 *
 * Monthly distribution: uniform from SP date (always 1st of month)
 */
import type { InductorSelection, JobUnit, CustomJU, Metier } from '../types';

const MAN_DAY_FTE_DIVISOR = 209;  // §9.2: Working days per year

export interface CalculationResult {
  totalManDays: number;
  totalFte: number;
  totalBh: number;
  totalKm: number;
  breakdown: {
    shortName: string;
    variable: number;
    occurrence: number;
    fixed: number;
    total: number;
    unitType: string;
  }[];
}

export function calculateEstimation(
  selections: InductorSelection[],
  jobUnits: JobUnit[],
  customJUs: CustomJU[],
): CalculationResult {
  let totalManDays = 0;
  let totalBh = 0;
  let totalKm = 0;
  const breakdown: CalculationResult['breakdown'] = [];

  // Standard JUs from inductors
  for (const sel of selections) {
    if (!sel.selectedCranId) continue;  // BR-12: skip inductors without cran

    const cranJUs = jobUnits.filter((ju) => ju.cranId === sel.selectedCranId);

    for (const ju of cranJUs) {
      const juOcc = sel.juOccurrences.find((o) => o.juId === ju.id);
      const occurrence = juOcc?.occurrence ?? sel.inductorOccurrence;

      // Formula: Total = (Variable × Occurrence) + Fixed  (§9.1)
      const total = occurrence * ju.variable + ju.fixed;

      // Unit type handling (§9.2)
      switch (ju.unitType) {
        case 'ManDay':
          totalManDays += total;
          break;
        case 'BenchHours':
          totalBh += total;
          break;
        case 'Kilometres':
          totalKm += total;
          break;
        case 'KEuros':
          // Excluded from current scope (§9.2)
          break;
      }

      breakdown.push({
        shortName: ju.shortName,
        variable: ju.variable,
        occurrence,
        fixed: ju.fixed,
        total: Math.round(total * 100) / 100,
        unitType: ju.unitType,
      });
    }
  }

  // Custom JUs (BR-11: allowed even without workload standard)
  for (const cju of customJUs) {
    totalManDays += cju.days;
    breakdown.push({
      shortName: 'Custom',
      variable: 0,
      occurrence: 1,
      fixed: cju.days,
      total: cju.days,
      unitType: 'ManDay',
    });
  }

  // FTE = Total MD / 209  (§9.2)
  const totalFte = totalManDays > 0
    ? Math.round((totalManDays / MAN_DAY_FTE_DIVISOR) * 100) / 100
    : 0;

  return {
    totalManDays: Math.round(totalManDays * 100) / 100,
    totalFte,
    totalBh: Math.round(totalBh * 100) / 100,
    totalKm: Math.round(totalKm * 100) / 100,
    breakdown,
  };
}

/**
 * Monthly distribution — uniform from SP date (§9.4)
 *
 * SP date is always set to 1st of the start month.
 * Monthly values sum to the annual total.
 */
export function distributeByMonth(
  totalManDays: number,
  spDate: string,
  durationMonths: number = 12,
): number[] {
  if (durationMonths <= 0) return [];

  const monthly = totalManDays / durationMonths;
  const result: number[] = [];

  for (let i = 0; i < 12; i++) {
    result.push(i < durationMonths ? Math.round(monthly * 100) / 100 : 0);
  }

  return result;
}

/**
 * K€ is NOT calculated in Pre-Estimation (§11).
 * It is calculated during Allocation using:
 *   K€ per year = FTE(year) × Rate(societe-site, year)
 *
 * This function is a stub that returns 0.
 * The real K€ calculation lives in the Allocation pipeline.
 */
export function calcKEuro(_totalFte: number, _metier: Metier): number {
  return 0;
}