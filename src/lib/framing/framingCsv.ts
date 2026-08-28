import type { FramingLine } from '../../types/framing';

export interface FramingCsvColumn {
  key: keyof FramingLine;
  label: string;
}

function escape(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Task 7 (HIW-452 remediation) — pure matrix builder for the table's own CSV
 * download (1_Framing_File_Review.py:402-408). Deliberately dumb: it exports
 * exactly the rows and columns it is handed, in that order. Exporting the
 * table's *currently visible* (filtered + sorted) set rather than the full
 * store is the caller's job — see FramingLineTable, which passes its own
 * filtered/sorted rows and its own column list.
 */
export function buildFramingCsvRows(lines: FramingLine[], columns: FramingCsvColumn[]): string[] {
  const header = columns.map((c) => escape(c.label)).join(',');
  const rows = lines.map((line) => columns.map((c) => escape(line[c.key])).join(','));
  return [header, ...rows];
}

export function downloadFramingCsv(
  lines: FramingLine[],
  columns: FramingCsvColumn[],
  filename: string,
): void {
  const content = buildFramingCsvRows(lines, columns).join('\r\n');
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
