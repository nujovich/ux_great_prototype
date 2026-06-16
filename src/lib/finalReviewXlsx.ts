import * as XLSX from 'xlsx';
import type { PlNode, Subtotal } from './finalReviewAggregation';

// ---------------------------------------------------------------------------
// Matrix builder (pure — no DOM/XLSX dependency, fully testable)
// ---------------------------------------------------------------------------

const FIXED_HEADERS = [
  'Métier',
  'Owner N2',
  'Société',
  'Cost Type',
  'FMM Description',
  'JU Description',
  'JU Code',
  'Total FTE',
  'Total K€',
  'Total BH',
  'Total KM',
] as const;

/** Returns the per-year column headers for `years`: FTE Y, K€ Y, BH Y, KM Y per year. */
function yearHeaders(years: string[]): string[] {
  return years.flatMap((y) => [`FTE ${y}`, `K€ ${y}`, `BH ${y}`, `KM ${y}`]);
}

/** Numeric tail of a Subtotal (Total FTE, Total K€, Total BH, Total KM, then per-year). */
function subtotalTail(sub: Subtotal, years: string[]): (number)[] {
  const perYear = years.flatMap((y) => [
    sub.fteByYear[y] ?? 0,
    sub.keByYear[y] ?? 0,
    sub.bhByYear[y] ?? 0,
    sub.kmByYear[y] ?? 0,
  ]);
  return [sub.totalFte, sub.totalKe, sub.totalBh, sub.totalKm, ...perYear];
}

/** Builds an empty leading text-cell tuple (7 items) with a label in position 0. */
function labelRow(label: string, sub: Subtotal, years: string[]): (string | number)[] {
  // Columns: Métier, Owner N2, Société, Cost Type, FMM Description, JU Description, JU Code
  return [label, '', '', '', '', '', '', ...subtotalTail(sub, years)];
}

/**
 * Builds the full 2-D matrix for a single PL export.
 * No internal/prototype fields are included (no id, isDirty, percentage, engineerId, etc.).
 */
export function buildPlSheetMatrix(pl: PlNode, years: string[]): (string | number)[][] {
  const rows: (string | number)[][] = [];

  // Header row
  rows.push([...FIXED_HEADERS, ...yearHeaders(years)]);

  for (const metier of pl.metiers) {
    for (const societe of metier.societes) {
      for (const costType of societe.costTypes) {
        // JU data rows
        for (const row of costType.rows) {
          const totalKe = years.reduce((acc, y) => acc + (row.keByYear[y] ?? 0), 0);
          const perYear = years.flatMap((y) => [
            row.fteByYear[y] ?? 0,
            row.keByYear[y] ?? 0,
            0, // BH stubbed
            0, // KM stubbed
          ]);
          rows.push([
            metier.metier,
            row.ownerN2,
            societe.societe ?? '—',
            costType.costType,
            row.fmmDescription,
            row.juDescription,
            row.juCode,
            row.totalFte,
            totalKe,
            0, // Total BH stubbed
            0, // Total KM stubbed
            ...perYear,
          ]);
        }

        // Cost Type subtotal
        rows.push(labelRow('Cost Type subtotal', costType.subtotal, years));
      }

      // Société subtotal
      rows.push(labelRow('Société subtotal', societe.subtotal, years));
    }

    // Métier subtotal
    rows.push(labelRow('Métier subtotal', metier.subtotal, years));
  }

  // PL total
  rows.push(labelRow('PL total', pl.subtotal, years));

  return rows;
}

// ---------------------------------------------------------------------------
// Export (side-effecting — uses SheetJS)
// ---------------------------------------------------------------------------

export function exportPlToXlsx(
  pl: PlNode,
  years: string[],
  filename = `final-review-${pl.plNumber}.xlsx`,
): void {
  const matrix = buildPlSheetMatrix(pl, years);
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, pl.plNumber.slice(0, 31)); // sheet name max 31 chars
  XLSX.writeFile(wb, filename);
}
