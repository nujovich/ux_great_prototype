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
 * (SDD §11) — `keuro` is a stub 0. Custom JUs are bucketed by their own `unitType`
 * exactly like standard JUs (man_day → man-days/FTE, bench_hours, kilometres; kiloeuros ignored).
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

  for (const c of customJUs) {
    const total = (c.variable ?? 0) * c.occurrence + (c.fixed ?? 0);
    switch (c.unitType) {
      case 'bench_hours': benchHours += total; break;
      case 'kilometres': km += total; break;
      case 'kiloeuros': break; // ignored in Pre-Estimation (K€ computed in Allocation, §11)
      default: manDays += total; break; // man_day (and legacy custom JUs without unitType)
    }
  }

  manDays *= g;
  benchHours *= g;
  km *= g;

  const fte = manDays > 0 ? Math.round((manDays / MAN_DAY_FTE_DIVISOR) * 100) / 100 : 0;
  return { manDays, fte, benchHours, km, keuro: 0 };
}

export interface AnnualBreakdownRow {
  year: number;
  manDays: number;
  fte: number;
  benchHours: number;
  km: number;
}

/**
 * Distributes the estimation totals uniformly across `durationMonths` starting at `spDate`
 * and aggregates by calendar year (§9.4). FTE per year = man-days(year) / 209.
 * Missing `durationMonths` (or ≤0) puts everything in the SP year; missing `spDate`
 * returns no rows (the summary then shows only the grand totals).
 */
export function annualBreakdown(
  totals: EstimationTotals,
  spDate: string | undefined,
  durationMonths: number | undefined,
): AnnualBreakdownRow[] {
  if (!spDate) return [];
  const startYear = Number(spDate.slice(0, 4));
  const startMonth = Number(spDate.slice(5, 7)); // 1-12
  if (!Number.isFinite(startYear) || !Number.isFinite(startMonth)) return [];

  const months = durationMonths && durationMonths > 0 ? Math.floor(durationMonths) : 1;
  const perMonthMd = totals.manDays / months;
  const perMonthBh = totals.benchHours / months;
  const perMonthKm = totals.km / months;

  const byYear = new Map<number, { manDays: number; benchHours: number; km: number }>();
  for (let i = 0; i < months; i++) {
    const monthIndex = startMonth - 1 + i; // 0-based from Jan of startYear
    const year = startYear + Math.floor(monthIndex / 12);
    const acc = byYear.get(year) ?? { manDays: 0, benchHours: 0, km: 0 };
    acc.manDays += perMonthMd;
    acc.benchHours += perMonthBh;
    acc.km += perMonthKm;
    byYear.set(year, acc);
  }

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => ({
      year,
      manDays: Math.round(v.manDays * 100) / 100,
      fte: Math.round((v.manDays / MAN_DAY_FTE_DIVISOR) * 100) / 100,
      benchHours: Math.round(v.benchHours * 100) / 100,
      km: Math.round(v.km * 100) / 100,
    }));
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

