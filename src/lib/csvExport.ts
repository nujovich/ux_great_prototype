import type { ProjectLine } from '../types';

function escapeCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const HEADERS = [
  'Project Name',
  'Line Name',
  'Métier',
  'Status',
  'Estimated Days',
  'Estimated K€',
  'Assigned Engineer ID',
  'Last Updated',
];

export function buildCsvRows(lines: ProjectLine[]): string[] {
  const header = HEADERS.map(escapeCell).join(',');
  const rows = lines.map((l) =>
    [
      l.projectName,
      l.lineName,
      l.metier,
      l.status,
      l.estimatedDays ?? 0,
      l.estimatedKEuro ?? 0,
      l.assignedEngineerId ?? '',
      l.lastUpdatedAt,
    ]
      .map(escapeCell)
      .join(','),
  );
  return [header, ...rows];
}

export function exportToCsv(lines: ProjectLine[], filename: string): void {
  const content = buildCsvRows(lines).join('\r\n');
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
