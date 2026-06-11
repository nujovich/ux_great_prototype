import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { annualBreakdown, type AnnualBreakdownRow, type EstimationTotals } from '../../lib/calc';
import { formatFTE, formatBenchHours, formatKm } from '../../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  lineName: string;
  totals: EstimationTotals;
  spDate?: string;
  durationMonths?: number;
  /** When saving multiple lines, render one annual-breakdown section per line.
   *  When omitted/length 1, render the single-line breakdown as before. */
  lines?: { id: string; lineName: string; spDate?: string; durationMonths?: number }[];
}

export function PreSaveSummaryModal({ open, onClose, lineName, totals, spDate, durationMonths, lines }: Props) {
  const t = useT();

  function renderBreakdownTable(rows: AnnualBreakdownRow[]) {
    return rows.length > 0 ? (
      <table className="mt-4 w-full text-xs">
        <thead className="text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-2 py-1 text-left font-medium">{t('panel.summaryYear')}</th>
            <th className="px-2 py-1 text-right font-medium">{t('panel.totalEtp')}</th>
            <th className="px-2 py-1 text-right font-medium">{t('panel.totalBh')}</th>
            <th className="px-2 py-1 text-right font-medium">{t('panel.totalKm')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year} className="border-t border-slate-100">
              <td className="px-2 py-1 text-left text-slate-700">{r.year}</td>
              <td className="px-2 py-1 text-right text-slate-600">{formatFTE(r.fte)}</td>
              <td className="px-2 py-1 text-right text-slate-600">{formatBenchHours(r.benchHours)}</td>
              <td className="px-2 py-1 text-right text-slate-600">{formatKm(r.km)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t('panel.summaryTitle')} — ${lineName}`}
      footer={<Button variant="primary" onClick={onClose}>{t('panel.summaryClose')}</Button>}
    >
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-[10px] text-slate-500">{t('panel.totalEtp')}</div>
          <div className="text-lg font-bold text-slate-900">{formatFTE(totals.fte)}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-[10px] text-slate-500">{t('panel.totalBh')}</div>
          <div className="text-lg font-bold text-slate-900">{formatBenchHours(totals.benchHours)}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <div className="text-[10px] text-slate-500">{t('panel.totalKm')}</div>
          <div className="text-lg font-bold text-slate-900">{formatKm(totals.km)}</div>
        </div>
      </div>
      {lines && lines.length > 1 ? (
        lines.map((l) => {
          const rows = annualBreakdown(totals, l.spDate, l.durationMonths);
          return (
            <div key={l.id} className="mb-4">
              <h4 className="mb-1 text-xs font-semibold text-slate-700">{l.lineName}</h4>
              {renderBreakdownTable(rows)}
            </div>
          );
        })
      ) : (
        renderBreakdownTable(annualBreakdown(totals, spDate, durationMonths))
      )}
      <p className="mt-3 text-[10px] text-slate-400">{t('panel.summaryNoKeuro')}</p>
    </Modal>
  );
}
