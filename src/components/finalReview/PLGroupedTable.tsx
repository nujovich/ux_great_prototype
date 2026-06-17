import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useT } from '../../i18n/useT';
import type { MetierNode, PlNode, Subtotal } from '../../lib/finalReviewAggregation';

interface Props {
  pl: PlNode;
  years: string[];
  canViewKeuro: boolean;
}

/** Total cost-type leaf rows under a métier (matches the POC "(n)" count). */
function metierLeafCount(metier: MetierNode): number {
  return metier.societes.reduce((n, s) => n + s.costTypes.length, 0);
}

/** Renders the metric cells: Total FTE, [Total K€], FTE per year, [K€ per year]. */
function MetricCells({
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
      {years.map((y) => (
        <td key={`fte-${y}`} className="px-2 py-1 border text-right">
          {(subtotal.fteByYear[y] ?? 0).toFixed(2)}
        </td>
      ))}
      {canViewKeuro &&
        years.map((y) => (
          <td key={`ke-${y}`} className="px-2 py-1 border text-right">
            {(subtotal.keByYear[y] ?? 0).toFixed(0)}
          </td>
        ))}
    </>
  );
}

export function PLGroupedTable({ pl, years, canViewKeuro }: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <table className="min-w-full text-xs border-collapse">
      <thead className="bg-gray-100">
        <tr>
          <th scope="col" className="px-2 py-1 border text-left">{t('finalReview.colName')}</th>
          <th scope="col" className="px-2 py-1 border text-right">{t('finalReview.colTotalFte')}</th>
          {canViewKeuro && (
            <th scope="col" className="px-2 py-1 border text-right">{t('finalReview.colTotalKe')}</th>
          )}
          {years.map((y) => (
            <th scope="col" key={`h-fte-${y}`} className="px-2 py-1 border text-right">{`FTE ${y}`}</th>
          ))}
          {canViewKeuro &&
            years.map((y) => (
              <th scope="col" key={`h-ke-${y}`} className="px-2 py-1 border text-right">{`K€ ${y}`}</th>
            ))}
        </tr>
      </thead>
      <tbody>
        {pl.metiers.map((metierNode) => {
          const mKey = `m:${metierNode.metier}`;
          const mOpen = expanded.has(mKey);
          return (
            <Fragment key={mKey}>
              <tr className="font-semibold bg-gray-50">
                <td className="px-2 py-1 border">
                  <button type="button" className="flex items-center gap-1" onClick={() => toggle(mKey)}>
                    {mOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{`${metierNode.metier} (${metierLeafCount(metierNode)})`}</span>
                  </button>
                </td>
                <MetricCells subtotal={metierNode.subtotal} years={years} canViewKeuro={canViewKeuro} />
              </tr>

              {mOpen &&
                metierNode.societes.map((societeNode) => {
                  const sKey = `${mKey}/s:${societeNode.societe}`;
                  const sOpen = expanded.has(sKey);
                  return (
                    <Fragment key={sKey}>
                      <tr className="bg-white">
                        <td className="px-2 py-1 border">
                          <button
                            type="button"
                            className="flex items-center gap-1 pl-4"
                            onClick={() => toggle(sKey)}
                          >
                            {sOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{`${societeNode.societe} (${societeNode.costTypes.length})`}</span>
                          </button>
                        </td>
                        <MetricCells subtotal={societeNode.subtotal} years={years} canViewKeuro={canViewKeuro} />
                      </tr>

                      {sOpen &&
                        societeNode.costTypes.map((ctNode) => {
                          const cKey = `${sKey}/c:${ctNode.costType}`;
                          return (
                            <tr key={cKey} className="bg-white">
                              <td className="px-2 py-1 border">
                                <span className="pl-12 inline-block">{ctNode.costType}</span>
                              </td>
                              <MetricCells subtotal={ctNode.subtotal} years={years} canViewKeuro={canViewKeuro} />
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
            </Fragment>
          );
        })}

        {/* PL total */}
        <tr className="font-semibold bg-gray-100">
          <td className="px-2 py-1 border">{t('finalReview.plTotal')}</td>
          <MetricCells subtotal={pl.subtotal} years={years} canViewKeuro={canViewKeuro} />
        </tr>
      </tbody>
    </table>
  );
}
