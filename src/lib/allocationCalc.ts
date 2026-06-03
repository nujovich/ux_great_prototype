import type { AllocationRow } from '../types';

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
