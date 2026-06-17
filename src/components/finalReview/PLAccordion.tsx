import { useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { PLGroupedTable } from './PLGroupedTable';
import type { PlNode } from '../../lib/finalReviewAggregation';

interface Props {
  pl: PlNode;
  years: string[];
  canViewKeuro: boolean;
  canExport: boolean;
}

export function PLAccordion({ pl, years, canViewKeuro, canExport }: Props) {
  const [open, setOpen] = useState(false);
  const t = useT();

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left font-medium text-slate-800 hover:text-slate-900"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>
            {pl.plNumber} — {pl.plName}
          </span>
          <span className="ml-4 text-xs text-slate-500 font-normal">
            Total FTE: {pl.subtotal.totalFte.toFixed(2)}
            {canViewKeuro && (
              <> &nbsp;·&nbsp; Total K€: {pl.subtotal.totalKe.toFixed(0)}</>
            )}
          </span>
        </button>

        {canExport && (
          <button
            type="button"
            disabled
            title={t('finalReview.exportDisabledHint')}
            className="ml-4 flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <Download size={12} />
            {t('finalReview.exportXlsx')}
          </button>
        )}
      </div>

      {open && (
        <div className="overflow-x-auto p-2">
          <PLGroupedTable pl={pl} years={years} canViewKeuro={canViewKeuro} />
        </div>
      )}
    </div>
  );
}
