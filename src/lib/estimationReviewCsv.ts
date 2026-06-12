import type { EstimationReviewGridRow } from './estimationReviewRows';

const STATIC_HEADERS = [
  'PL Number',
  'PL Name',
  'Métier',
  'Assignee',
  'Status',
  'Engineer Approval',
  'CPO Approval',
  'Total FTE',
  'Total BH',
  'Total KM',
];

function escape(v: string | number | null | undefined): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/**
 * Generate CSV from grid rows.
 * @param rows - all currently filtered rows
 * @param selectedIds - if non-empty, export only these IDs; if empty, export all rows
 * @param cycleYears - e.g. ['2026', '2027']
 */
export function generateCsv(
  rows: EstimationReviewGridRow[],
  selectedIds: string[],
  cycleYears: string[],
): string {
  const target = selectedIds.length > 0
    ? rows.filter((r) => selectedIds.includes(r.id))
    : rows;

  if (target.length === 0) return '';

  const yearlyHeaders = cycleYears.map((y) => `K€ ${y}`);
  const headers = [...STATIC_HEADERS, ...yearlyHeaders];

  const dataRows = target.map((r) => {
    const base = [
      r.id,
      r.lineName,
      r.metier,
      r.assignedEngineerId ?? '',
      r.status,
      r.engineerApproval,
      r.cpoApproval,
      r.totalFte,
      r.totalBh,
      r.totalKm,
    ];
    const yearly = cycleYears.map((y) => r.yearlyKEuro[y] ?? 0);
    return [...base, ...yearly].map(escape).join(',');
  });

  return [headers.map(escape).join(','), ...dataRows].join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
