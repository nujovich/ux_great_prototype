/**
 * Pre-Estimation View — Estimation Calculation.
 *
 * Spec: §9.1-9.5 (sdd-kit/great_dspy/specs/pre_estimation_specs.py)
 *
 * Formula: Total = (Variable × Occurrence) + Fixed
 * FTE = Total MD / 209
 *
 * Mantiene la interfaz pública que la UI consume (calcEstimationTotals, calcTotalDays)
 * pero con implementación alineada al SDD Kit. K€ NO se calcula en Pre-Estimation
 * (SDD §11): EstimationTotals.keuro es 0 y se computa en Allocation.
 */
import type { InductorSelection, PrototypeInductor, CustomJU } from '../types';

const MAN_DAY_FTE_DIVISOR = 209; // §9.2: working days per year

export interface EstimationTotals {
  manDays: number;
  fte: number;
  benchHours: number;
  km: number;
  keuro: number;
}

/**
 * Computes estimation totals per the PRD formula `Total = (Variable × Occurrence) + Fixed`
 * for each Job Unit, bucketed by `unit_type`:
 *   man_day → man-days (→ FTE = man-days / 209), bench_hours → BH, kilometres → KM.
 * Cran-less inductors are skipped (BR-12). The global occurrence multiplies every bucket;
 * a global of 0 yields all-zero output (BR-13). K€ is not computed in Pre-Estimation
 * (SDD §11) — `keuro` is a stub 0. Custom JUs contribute their `days` to man-days.
 */
export function calcEstimationTotals(
  selections: InductorSelection[],
  inductors: PrototypeInductor[],
  customJUs: CustomJU[],
  globalOccurrences: number,
): EstimationTotals {
  const g = globalOccurrences <= 0 ? 0 : globalOccurrences;
  let manDays = 0;
  let benchHours = 0;
  let km = 0;

  for (const sel of selections) {
    if (!sel.selectedCranId) continue; // BR-12
    const cranJUs = inductors
      .find((i) => i.id === sel.inductorId)
      ?.crans.find((c) => c.id === sel.selectedCranId)
      ?.jus ?? [];
    for (const ju of cranJUs) {
      const override = sel.juOccurrences.find((o) => o.juId === ju.id);
      const occurrence = override?.occurrence ?? ju.occurrence;
      const total = (ju.variable ?? 0) * occurrence + (ju.fixed ?? 0);
      switch (ju.unit_type) {
        case 'bench_hours': benchHours += total; break;
        case 'kilometres': km += total; break;
        case 'kiloeuros': break; // ignored in Pre-Estimation (K€ computed in Allocation, §11)
        default: manDays += total; break; // man_day
      }
    }
  }

  for (const c of customJUs) manDays += (c.variable ?? 0) * c.occurrence + (c.fixed ?? 0);

  manDays *= g;
  benchHours *= g;
  km *= g;

  const fte = manDays > 0 ? Math.round((manDays / MAN_DAY_FTE_DIVISOR) * 100) / 100 : 0;
  return { manDays, fte, benchHours, km, keuro: 0 };
}

/** Man-days bucket only — kept for backward compatibility with existing callers
 * and the persisted `Estimation.totalDays`. */
export function calcTotalDays(
  selections: InductorSelection[],
  inductors: PrototypeInductor[],
  customJUs: CustomJU[],
  globalOccurrences: number,
): number {
  return calcEstimationTotals(selections, inductors, customJUs, globalOccurrences).manDays;
}

