import * as XLSX from 'xlsx';
import type { PlNode, Subtotal } from './finalReviewAggregation';

// ---------------------------------------------------------------------------
// Matrix builder (pure — no DOM/XLSX dependency, fully testable)
// ---------------------------------------------------------------------------

const FIXED_HEADERS = [
  'Métier',
  'Owner N2',
  'Societe', // spec spells it without accent (FINAL_REVIEW_JU_COLUMNS in final_review_specs.py)
  'Cost Type',
  'FMM Description',
  'JU Description',
  'JU Code',
  'Total FTE',
  'Total K€',
  'Total BH',
  'Total KM',
] as const;

/** Returns the per-year column headers for `years`, grouped by metric (all FTE years, then all K€, then BH, then KM). */
function yearHeaders(years: string[]): string[] {
  return [
    ...years.map((y) => `FTE ${y}`),
    ...years.map((y) => `K€ ${y}`),
    ...years.map((y) => `BH ${y}`),
    ...years.map((y) => `KM ${y}`),
  ];
}

/** Numeric tail of a Subtotal (Total FTE, Total K€, Total BH, Total KM, then per-year grouped by metric). */
function subtotalTail(sub: Subtotal, years: string[]): (number)[] {
  const perYear = [
    ...years.map((y) => sub.fteByYear[y] ?? 0),
    ...years.map((y) => sub.keByYear[y] ?? 0),
    ...years.map(() => 0),
    ...years.map(() => 0),
  ];
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
          // Total K€: sum keByYear over declared years; fall back to row.keuro when keByYear is
          // empty (legacy rows without per-year breakdown) to avoid silently exporting 0.
          const keByYearEntries = Object.keys(row.keByYear);
          const totalKe = keByYearEntries.length > 0
            ? years.reduce((acc, y) => acc + (row.keByYear[y] ?? 0), 0)
            : (row.keuro ?? 0);
          const perYear = [
            ...years.map((y) => row.fteByYear[y] ?? 0),
            ...years.map((y) => row.keByYear[y] ?? 0),
            ...years.map(() => 0), // BH stubbed
            ...years.map(() => 0), // KM stubbed
          ];
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
            0, // Total BH — FINAL-01: zeroed pending HVT payload agreement
            0, // Total KM — FINAL-01: zeroed pending HVT payload agreement
            ...perYear,
          ]);
        }

        // Cost Type subtotal
        rows.push(labelRow('Cost Type subtotal', costType.subtotal, years));
      }

      // Societe subtotal
      rows.push(labelRow('Societe subtotal', societe.subtotal, years));
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
