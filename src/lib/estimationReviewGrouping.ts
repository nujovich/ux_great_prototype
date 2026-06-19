import type { EstimationReviewGridRow } from './estimationReviewRows';

export interface GroupSubtotal {
  totalFte: number;
  totalBh: number;
  totalKm: number;
  yearlyFte: Record<string, number>;
  yearlyBh: Record<string, number>;
  yearlyKm: Record<string, number>;
  yearlyKEuro: Record<string, number>;
}

export interface PlGroup {
  plNumber: string;
  plName: string;
  rows: EstimationReviewGridRow[];
  subtotal: GroupSubtotal;
}

function emptySubtotal(years: string[]): GroupSubtotal {
  const zero = () => Object.fromEntries(years.map((y) => [y, 0]));
  return {
    totalFte: 0, totalBh: 0, totalKm: 0,
    yearlyFte: zero(), yearlyBh: zero(), yearlyKm: zero(), yearlyKEuro: zero(),
  };
}

/**
 * Group estimation-review rows into one table per PL Number (HIW-175 retest):
 * each table represents a single PL Number and holds its métier lines.
 *
 * Table order is IMMUTABLE — groups are always emitted sorted by PL Number,
 * independent of any column sort applied to the rows. Column sorting reorders
 * rows WITHIN a table but never reorders the tables themselves.
 *
 * Falls back to the line id / line name when plNumber / plName are absent so
 * that loose fixtures (and unit-test rows) still group deterministically.
 */
export function groupRowsByPlNumber(
  rows: EstimationReviewGridRow[],
  years: string[],
): PlGroup[] {
  const buckets = new Map<string, EstimationReviewGridRow[]>();
  const names = new Map<string, string>();
  for (const r of rows) {
    const key = r.plNumber ?? r.id;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      names.set(key, r.plName ?? r.lineName);
    }
    buckets.get(key)!.push(r);
  }
  const orderedKeys = [...buckets.keys()].sort((a, b) => a.localeCompare(b));
  return orderedKeys.map((plNumber) => {
    const groupRows = buckets.get(plNumber)!;
    const subtotal = emptySubtotal(years);
    for (const r of groupRows) {
      subtotal.totalFte += r.totalFte;
      subtotal.totalBh += r.totalBh;
      subtotal.totalKm += r.totalKm;
      for (const y of years) {
        subtotal.yearlyFte[y]   += r.yearlyFte[y]   ?? 0;
        subtotal.yearlyBh[y]    += r.yearlyBh[y]    ?? 0;
        subtotal.yearlyKm[y]    += r.yearlyKm[y]    ?? 0;
        subtotal.yearlyKEuro[y] += r.yearlyKEuro[y] ?? 0;
      }
    }
    return { plNumber, plName: names.get(plNumber)!, rows: groupRows, subtotal };
  });
}
