/**
 * Pre-Estimation View — Estimation Calculation.
 *
 * Spec: §9.1-9.5 (sdd-kit/great_dspy/specs/pre_estimation_specs.py)
 *
 * Formula: Total = (Variable × Occurrence) + Fixed
 * FTE = Total MD / 209
 *
 * Mantiene la interfaz pública que la UI consume (calcTotalDays, calcKEuro, yearlyBreakdown)
 * pero con implementación alineada al SDD Kit.
 */
import type { InductorSelection, PrototypeInductor, CustomJU, Metier } from '../types';

const MAN_DAY_FTE_DIVISOR = 209;  // §9.2: Working days per year

/**
 * Calcula el total de días-hombre de la estimación.
 * Formula: Total = (Variable × Occurrence) + Fixed  (§9.1)
 * Inductores sin cran se saltan silenciosamente (BR-12).
 */
export function calcTotalDays(
  selections: InductorSelection[],
  inductors: PrototypeInductor[],
  customJUs: CustomJU[],
  globalOccurrences: number,
): number {
  const inductorDays = selections.reduce((acc, sel) => {
    if (!sel.selectedCranId) return acc;  // BR-12

    const cranJUs = inductors
      .find((i) => i.id === sel.inductorId)
      ?.crans.find((c) => c.id === sel.selectedCranId)
      ?.jus ?? [];
    const selDays = cranJUs.reduce((sum, ju) => {
      const juOcc = sel.juOccurrences.find((o) => o.juId === ju.id);
      const occ = juOcc?.occurrence ?? sel.inductorOccurrence;
      // §9.1: Total = (Variable × Occurrence) + Fixed
      return sum + occ * (ju.variable ?? 0) + (ju.fixed ?? 0);
    }, 0);
    return acc + selDays;
  }, 0);

  // Custom JUs (BR-11: permitidos incluso sin workload standard)
  const customDays = customJUs.reduce((acc, j) => acc + j.days, 0);

  // globalOccurrences se conserva para compatibilidad con UI existente
  return (inductorDays + customDays) * Math.max(globalOccurrences, 1);
}

/**
 * Calcula FTE = Total MD / 209  (§9.2)
 */
export function calcFTE(totalDays: number): number {
  return totalDays > 0
    ? Math.round((totalDays / MAN_DAY_FTE_DIVISOR) * 100) / 100
    : 0;
}

/**
 * K€ NO se calcula en Pre-Estimation (§11).
 * Se calcula en Allocation: K€ = FTE × Rate(societe-site, year).
 * Esta función es un stub temporal.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calcKEuro(_days: number, _metier: Metier): number {
  return 0;
}

/**
 * Distribución mensual uniforme simulada.
 * La distribución real usa SP date (§9.4), pero esta función
 * mantiene compatibilidad con la UI actual.
 */
export function yearlyBreakdown(totalDays: number): number[] {
  if (totalDays <= 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  // Distribución uniforme: totalDays / 12 por mes
  const monthly = Math.round((totalDays / 12) * 100) / 100;
  const months: number[] = [];
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    months.push(monthly);
    sum += monthly;
  }

  // Ajustar el último mes para que sume exactamente totalDays
  const diff = Math.round((totalDays - sum) * 100) / 100;
  if (diff !== 0) {
    months[11] = Math.round((months[11] + diff) * 100) / 100;
  }

  return months;
}