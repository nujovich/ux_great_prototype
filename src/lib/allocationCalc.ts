import type { AllocationRow, AllocationFilterState } from '../types';

const FTE_DIVISOR = 209;

export function calcRowKeuro(days: number, metierRate: number): number {
  if (days <= 0 || metierRate <= 0) return 0;
  return Math.round((days / FTE_DIVISOR) * metierRate * 100) / 100;
}

export function calcRowFte(days: number): number {
  return days > 0 ? Math.round((days / FTE_DIVISOR) * 100) / 100 : 0;
}

export function validateAllocationSave(rows: AllocationRow[]): { valid: boolean; errors: string[] } {
  const errors = rows
    .filter((r) => (r.costType === 'TSA' || r.costType === 'TC') && !r.societe)
    .map((r) => `Row ${r.id}: ${r.costType} requires a societe (ALLOC-BR-06/ALLOC-BR-13)`);
  return { valid: errors.length === 0, errors };
}

export function rowNeedsWarning(row: AllocationRow): boolean {
  return row.costType === 'FTE' && row.fte > 0 && !row.societe;
}

export function distributeTcKeByYear(
  totalKe: number,
  fteByYear: Record<string, number>
): Record<string, number> {
  const totalFte = Object.values(fteByYear).reduce((a, b) => a + b, 0);
  if (totalFte === 0) {
    return Object.fromEntries(Object.keys(fteByYear).map(k => [k, 0]));
  }
  const years = Object.keys(fteByYear).sort();
  const result: Record<string, number> = {};
  let allocated = 0;
  for (let i = 0; i < years.length - 1; i++) {
    const v = Math.round((totalKe * (fteByYear[years[i]] / totalFte)) * 100) / 100;
    result[years[i]] = v;
    allocated += v;
  }
  result[years[years.length - 1]] = Math.round((totalKe - allocated) * 100) / 100;
  return result;
}

export function splitFteProportional(
  fteByYear: Record<string, number>,
  percentages: number[]
): Record<string, number>[] {
  return percentages.map(pct =>
    Object.fromEntries(
      Object.entries(fteByYear).map(([year, fte]) => [
        year,
        Math.round((fte * (pct / 100)) * 100) / 100,
      ])
    )
  );
}

export function applyAllocationFilters(
  rows: AllocationRow[],
  filters: AllocationFilterState
): AllocationRow[] {
  return rows.filter(row => {
    if (filters.plSearch) {
      const q = filters.plSearch.toLowerCase();
      if (
        !row.plNumber.toLowerCase().includes(q) &&
        !row.plName.toLowerCase().includes(q)
      ) return false;
    }
    if (filters.metier && row.metier !== filters.metier) return false;
    if (filters.ownerN2 && row.ownerN2 !== filters.ownerN2) return false;
    if (filters.societe === '__unassigned__' && row.societe) return false;
    if (filters.societe && filters.societe !== '__unassigned__' && row.societe !== filters.societe) return false;
    if (filters.costType && row.costType !== filters.costType) return false;
    if (filters.unresolvedOnly && row.societe !== null) return false;
    return true;
  });
}

export function sortAllocationRows(rows: AllocationRow[]): AllocationRow[] {
  return [...rows].sort((a, b) => {
    const pl = a.plNumber.localeCompare(b.plNumber);
    if (pl !== 0) return pl;
    const mt = a.metier.localeCompare(b.metier);
    if (mt !== 0) return mt;
    const ow = a.ownerN2.localeCompare(b.ownerN2);
    if (ow !== 0) return ow;
    return a.juCode.localeCompare(b.juCode);
  });
}
