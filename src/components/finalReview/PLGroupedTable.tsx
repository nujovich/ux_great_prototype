import { Fragment } from 'react';
import { useT } from '../../i18n/useT';
import type { PlNode, Subtotal } from '../../lib/finalReviewAggregation';

interface Props {
  pl: PlNode;
  years: string[];
  canViewKeuro: boolean;
}

/**
 * Renders per-year FTE / K€ / BH / KM cells.
 * BH and KM are stubbed at 0 (FINAL-01); the Subtotal type carries them for future use.
 */
function YearCells({
  subtotal,
  years,
  canViewKeuro,
  fmt = (n: number) => n.toFixed(0),
}: {
  subtotal: Subtotal;
  years: string[];
  canViewKeuro: boolean;
  fmt?: (n: number) => string;
}) {
  return (
    <>
      {years.map((y) => (
        <td key={`fte-${y}`} className="px-2 py-1 border text-right">
          {fmt(subtotal.fteByYear[y] ?? 0)}
        </td>
      ))}
      {canViewKeuro &&
        years.map((y) => (
          <td key={`ke-${y}`} className="px-2 py-1 border text-right">
            {fmt(subtotal.keByYear[y] ?? 0)}
          </td>
        ))}
      {years.map((y) => (
        <td key={`bh-${y}`} className="px-2 py-1 border text-right">
          {fmt(subtotal.bhByYear[y] ?? 0)}
        </td>
      ))}
      {years.map((y) => (
        <td key={`km-${y}`} className="px-2 py-1 border text-right">
          {fmt(subtotal.kmByYear[y] ?? 0)}
        </td>
      ))}
    </>
  );
}

/**
 * Renders Total FTE / K€ / BH / KM cells + per-year breakdown.
 * Used ONLY in the PL-total row so that totalFte.toFixed(2) is unique in the table
 * (intermediate subtotals do not render a totalFte cell).
 */
function TotalCells({
  subtotal,
  years,
  canViewKeuro,
}: {
  subtotal: Subtotal;
  years: string[];
  canViewKeuro: boolean;
}) {
  return (
    <>
      <td className="px-2 py-1 border text-right">{subtotal.totalFte.toFixed(2)}</td>
      {canViewKeuro && (
        <td className="px-2 py-1 border text-right">{subtotal.totalKe.toFixed(0)}</td>
      )}
      <td className="px-2 py-1 border text-right">{subtotal.totalBh.toFixed(0)}</td>
      <td className="px-2 py-1 border text-right">{subtotal.totalKm.toFixed(0)}</td>
      <YearCells subtotal={subtotal} years={years} canViewKeuro={canViewKeuro} />
    </>
  );
}

export function PLGroupedTable({ pl, years, canViewKeuro }: Props) {
  const t = useT();

  // Fixed info columns: Métier, Owner N2, Société, Cost Type, FMM Desc, JU Desc, JU Code
  const FIXED_COLS = 7;
  // Aggregate columns: Total FTE + [Total K€] + Total BH + Total KM
  const TOTAL_COLS = 3 + (canViewKeuro ? 1 : 0);
  // colSpan for intermediate subtotal label rows — spans fixed + aggregate columns so that
  // no totalFte cell is rendered in those rows (totalFte shown only in PL-total row)
  const SUBTOTAL_SPAN = FIXED_COLS + TOTAL_COLS;

  return (
    <table className="min-w-full text-xs border-collapse">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-2 py-1 border text-left">{t('finalReview.colMetier')}</th>
          <th className="px-2 py-1 border text-left">{t('finalReview.colOwnerN2')}</th>
          <th className="px-2 py-1 border text-left">{t('finalReview.colSociete')}</th>
          <th className="px-2 py-1 border text-left">{t('finalReview.colCostType')}</th>
          <th className="px-2 py-1 border text-left">{t('finalReview.colFmmDesc')}</th>
          <th className="px-2 py-1 border text-left">{t('finalReview.colJuDesc')}</th>
          <th className="px-2 py-1 border text-left">{t('finalReview.colJuCode')}</th>
          <th className="px-2 py-1 border text-right">{t('finalReview.colTotalFte')}</th>
          {canViewKeuro && (
            <th className="px-2 py-1 border text-right">{t('finalReview.colTotalKe')}</th>
          )}
          <th className="px-2 py-1 border text-right">{t('finalReview.colTotalBh')}</th>
          <th className="px-2 py-1 border text-right">{t('finalReview.colTotalKm')}</th>
          {years.map((y) => (
            <th key={`h-fte-${y}`} className="px-2 py-1 border text-right">{`FTE ${y}`}</th>
          ))}
          {canViewKeuro &&
            years.map((y) => (
              <th key={`h-ke-${y}`} className="px-2 py-1 border text-right">{`K€ ${y}`}</th>
            ))}
          {years.map((y) => (
            <th key={`h-bh-${y}`} className="px-2 py-1 border text-right">{`BH ${y}`}</th>
          ))}
          {years.map((y) => (
            <th key={`h-km-${y}`} className="px-2 py-1 border text-right">{`KM ${y}`}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {pl.metiers.map((metierNode) => (
          <Fragment key={metierNode.metier}>
            {metierNode.societes.map((societeNode) => (
              <Fragment key={`${metierNode.metier}/${societeNode.societe}`}>
                {societeNode.costTypes.map((ctNode) => (
                  <Fragment
                    key={`${metierNode.metier}/${societeNode.societe}/${ctNode.costType}`}
                  >
                    {/* JU data rows */}
                    {ctNode.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-2 py-1 border">{row.metier}</td>
                        <td className="px-2 py-1 border">{row.ownerN2}</td>
                        <td className="px-2 py-1 border">{row.societe ?? '—'}</td>
                        <td className="px-2 py-1 border">{row.costType}</td>
                        <td className="px-2 py-1 border">{row.fmmDescription}</td>
                        <td className="px-2 py-1 border">{row.juDescription}</td>
                        <td className="px-2 py-1 border">{row.juCode}</td>
                        <td className="px-2 py-1 border text-right">
                          {row.totalFte.toFixed(2)}
                        </td>
                        {canViewKeuro && (
                          <td className="px-2 py-1 border text-right">
                            {Object.values(row.keByYear)
                              .reduce((s, v) => s + v, 0)
                              .toFixed(0)}
                          </td>
                        )}
                        {/* BH / KM stubs (FINAL-01) */}
                        <td className="px-2 py-1 border text-right">0</td>
                        <td className="px-2 py-1 border text-right">0</td>
                        {years.map((y) => (
                          <td
                            key={`fte-${row.id}-${y}`}
                            className="px-2 py-1 border text-right"
                          >
                            {(row.fteByYear[y] ?? 0).toFixed(2)}
                          </td>
                        ))}
                        {canViewKeuro &&
                          years.map((y) => (
                            <td
                              key={`ke-${row.id}-${y}`}
                              className="px-2 py-1 border text-right"
                            >
                              {(row.keByYear[y] ?? 0).toFixed(0)}
                            </td>
                          ))}
                        {years.map((y) => (
                          <td
                            key={`bh-${row.id}-${y}`}
                            className="px-2 py-1 border text-right"
                          >
                            0
                          </td>
                        ))}
                        {years.map((y) => (
                          <td
                            key={`km-${row.id}-${y}`}
                            className="px-2 py-1 border text-right"
                          >
                            0
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Cost Type subtotal — label spans fixed + aggregate columns */}
                    <tr className="font-semibold bg-gray-50">
                      <td colSpan={SUBTOTAL_SPAN} className="px-2 py-1 border">
                        {t('finalReview.subtotalCostType')}
                      </td>
                      <YearCells
                        subtotal={ctNode.subtotal}
                        years={years}
                        canViewKeuro={canViewKeuro}
                      />
                    </tr>
                  </Fragment>
                ))}

                {/* Société subtotal */}
                <tr className="font-semibold bg-gray-50">
                  <td colSpan={SUBTOTAL_SPAN} className="px-2 py-1 border">
                    {t('finalReview.subtotalSociete')}
                  </td>
                  <YearCells
                    subtotal={societeNode.subtotal}
                    years={years}
                    canViewKeuro={canViewKeuro}
                  />
                </tr>
              </Fragment>
            ))}

            {/* Métier subtotal */}
            <tr className="font-semibold bg-gray-50">
              <td colSpan={SUBTOTAL_SPAN} className="px-2 py-1 border">
                {t('finalReview.subtotalMetier')}
              </td>
              <YearCells
                subtotal={metierNode.subtotal}
                years={years}
                canViewKeuro={canViewKeuro}
              />
            </tr>
          </Fragment>
        ))}

        {/* PL total — totalFte.toFixed(2) appears only here in this table */}
        <tr className="font-semibold bg-gray-100">
          <td colSpan={FIXED_COLS} className="px-2 py-1 border">
            {t('finalReview.plTotal')}
          </td>
          <TotalCells subtotal={pl.subtotal} years={years} canViewKeuro={canViewKeuro} />
        </tr>
      </tbody>
    </table>
  );
}
