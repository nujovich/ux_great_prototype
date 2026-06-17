import type { EstimationReviewGridRow } from './estimationReviewRows';

export interface AssigneeSubtotal {
  totalFte: number;
  totalBh: number;
  totalKm: number;
  yearlyFte: Record<string, number>;
  yearlyBh: Record<string, number>;
  yearlyKm: Record<string, number>;
  yearlyKEuro: Record<string, number>;
}

export interface AssigneeGroup {
  assigneeId: string | null; // null = unassigned
  assigneeName: string;
  rows: EstimationReviewGridRow[];
  subtotal: AssigneeSubtotal;
}

const UNASSIGNED = '__unassigned__';

function emptySubtotal(years: string[]): AssigneeSubtotal {
  const zero = () => Object.fromEntries(years.map((y) => [y, 0]));
  return {
    totalFte: 0, totalBh: 0, totalKm: 0,
    yearlyFte: zero(), yearlyBh: zero(), yearlyKm: zero(), yearlyKEuro: zero(),
  };
}

export function groupRowsByAssignee(
  rows: EstimationReviewGridRow[],
  resolveName: (assigneeId: string | null) => string,
  years: string[],
): AssigneeGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, EstimationReviewGridRow[]>();
  for (const r of rows) {
    const key = r.assignedEngineerId ?? UNASSIGNED;
    if (!buckets.has(key)) { buckets.set(key, []); order.push(key); }
    buckets.get(key)!.push(r);
  }
  return order.map((key) => {
    const groupRows = buckets.get(key)!;
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
    const assigneeId = key === UNASSIGNED ? null : key;
    return { assigneeId, assigneeName: resolveName(assigneeId), rows: groupRows, subtotal };
  });
}
