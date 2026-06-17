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

export interface ProjectGroup {
  projectName: string;
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
 * Group estimation-review rows into one bucket per project (projectName),
 * preserving both intra-group row order and the order each project first appears.
 * Mirrors the allocation grid's plNumber grouping one level up the hierarchy:
 * each estimation-review row is already a project line, so rows are grouped by
 * their parent project.
 */
export function groupRowsByProject(
  rows: EstimationReviewGridRow[],
  years: string[],
): ProjectGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, EstimationReviewGridRow[]>();
  for (const r of rows) {
    const key = r.projectName;
    if (!buckets.has(key)) { buckets.set(key, []); order.push(key); }
    buckets.get(key)!.push(r);
  }
  return order.map((projectName) => {
    const groupRows = buckets.get(projectName)!;
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
    return { projectName, rows: groupRows, subtotal };
  });
}
