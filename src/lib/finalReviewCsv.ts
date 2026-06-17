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

function escape(value: string | number | null | undefined): string {
  const str = String(value ?? '');
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
          '', // Owner N2: not available without a split; emit empty to match spec
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
      // Owner N2 comes from the AllocationRow (split.ownerN2), not the ProjectLine.
      // Total K€: derived from keByYear when populated; falls back to split.keuro when keByYear
      // has no entries (e.g. legacy rows without per-year breakdown) to avoid silent zero exports.
      const keByYearValues = Object.values(split.keByYear);
      const totalKe = keByYearValues.length > 0
        ? keByYearValues.reduce((acc, v) => acc + v, 0)
        : (split.keuro ?? 0);
      rows.push(
        [
          line.id,
          line.lineName,
          line.metier,
          split.ownerN2 ?? '', // spec-correct source for Owner N2
          split.societe ?? '',
          split.costType,
          '—',
          '—',
          '—',
          split.fte,
          totalKe, // derived from keByYear, consistent with XLSX path
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
