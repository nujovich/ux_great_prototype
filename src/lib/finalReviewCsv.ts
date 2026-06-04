import type { ProjectLine, Allocation } from '../types';

const FR_HEADERS = [
  'PL Number',
  'PL Name',
  'Métier',
  'Owner N2',
  'Societe',
  'Cost Type',
  'FMM Description',
  'JU Description',
  'JU Code',
  'Total FTE',
  'Total K€',
  'Total BH',
  'Total KM',
] as const;

function escape(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildFinalReviewCsvRows(lines: ProjectLine[], allocations: Allocation[]): string[] {
  const header = FR_HEADERS.map(escape).join(',');
  const allocByLine = new Map(allocations.map((a) => [a.lineId, a]));

  const rows: string[] = [];
  for (const line of lines) {
    const alloc = allocByLine.get(line.id);
    const splits = alloc?.splits ?? [];

    if (splits.length === 0) {
      rows.push(
        [
          line.id,
          line.lineName,
          line.metier,
          line.assignedEngineerId ?? '',
          '',
          '',
          '—',
          '—',
          '—',
          0,
          0,
          0,
          0,
        ]
          .map(escape)
          .join(','),
      );
      continue;
    }

    for (const split of splits) {
      rows.push(
        [
          line.id,
          line.lineName,
          line.metier,
          line.assignedEngineerId ?? '',
          split.societe ?? '',
          split.costType,
          '—',
          '—',
          '—',
          split.fte,
          split.keuro,
          0,
          0,
        ]
          .map(escape)
          .join(','),
      );
    }
  }

  return [header, ...rows];
}

export function exportFinalReviewCsv(lines: ProjectLine[], allocations: Allocation[], filename: string): void {
  const content = buildFinalReviewCsvRows(lines, allocations).join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
