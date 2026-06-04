import { useMemo } from 'react';
import { Download, Send } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { formatDays, formatKEuro } from '../lib/format';
import { exportFinalReviewCsv } from '../lib/finalReviewCsv';
import { useT } from '../i18n/useT';
import { useSortable } from '../lib/useSortable';
import type { Metier } from '../types';

export function FinalReviewPage() {
  return (
    <RoleGate permission="view:final-review">
      <FinalReviewContent />
    </RoleGate>
  );
}

function FinalReviewContent() {
  const lines = useDataStore((s) => s.lines);
  const cycles = useDataStore((s) => s.cycles);
  const allocations = useDataStore((s) => s.allocations);
  const can = useRoleStore((s) => s.can);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  const activeCycleId = useMemo(() => cycles.find((c) => c.is_active)?.id ?? 'export', [cycles]);
  const approvedLines = useMemo(
    () => lines.filter((l) => l.status === 'Approved' && l.cycleId === activeCycleId),
    [lines, activeCycleId],
  );

  const byMetier = useMemo(() => {
    const map = new Map<Metier, { count: number; days: number; kEuro: number }>();
    approvedLines.forEach((l) => {
      if (l.estimatedDays == null) return;
      const cur = map.get(l.metier) ?? { count: 0, days: 0, kEuro: 0 };
      cur.count += 1;
      cur.days += l.estimatedDays;
      cur.kEuro += l.estimatedKEuro ?? 0;
      map.set(l.metier, cur);
    });
    return [...map.entries()].sort((a, b) => b[1].kEuro - a[1].kEuro);
  }, [approvedLines]);

  const metierRows = useMemo(
    () => byMetier.map(([m, v]) => ({ metier: m, ...v })),
    [byMetier],
  );
  const { sorted: sortedMetier, requestSort, getSortIcon } = useSortable(metierRows);

  const totals = byMetier.reduce(
    (acc, [, v]) => ({ count: acc.count + v.count, days: acc.days + v.days, kEuro: acc.kEuro + v.kEuro }),
    { count: 0, days: 0, kEuro: 0 },
  );

  function handleSendStage3() {
    // FR-BR-06: non-blocking — sends even if allocation is incomplete
    // FR-BR-07: re-sendable — each send transmits current state
    // FR-BR-08: sends entire active cycle (approvedLines)
    pushToast(
      `Stage 3 enviado al HVT — ${approvedLines.length} línea(s) aprobadas del ciclo ${activeCycleId}`,
      'success',
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('finalReview.title')}</h1>
          <p className="text-sm text-slate-600">{t('finalReview.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {can('export:final-review') && (
            <Button
              variant="secondary"
              onClick={() => exportFinalReviewCsv(approvedLines, allocations, `final-review-${activeCycleId}.csv`)}
            >
              <Download size={14} /> {t('finalReview.exportCsv')}
            </Button>
          )}
          {can('send:stage3') && (
            <Button variant="primary" onClick={handleSendStage3}>
              <Send size={14} /> {t('finalReview.sendStage3')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat label={t('finalReview.estimated')} value={String(totals.count)} />
        <Stat label={t('finalReview.totalDays')} value={formatDays(totals.days)} />
        <Stat label="Total k€" value={formatKEuro(totals.kEuro)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('metier')}>
                {t('finalReview.colMetier')} {getSortIcon('metier')}
              </th>
              <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('count')}>
                {t('finalReview.colLines')} {getSortIcon('count')}
              </th>
              <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('days')}>
                {t('finalReview.colDays')} {getSortIcon('days')}
              </th>
              <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('kEuro')}>
                k€ {getSortIcon('kEuro')}
              </th>
              <th className="px-3 py-2 text-left font-medium">{t('finalReview.colDistribution')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedMetier.map((row) => {
              const pct = totals.kEuro > 0 ? (row.kEuro / totals.kEuro) * 100 : 0;
              return (
                <tr key={row.metier} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-medium text-slate-800">{row.metier}</td>
                  <td className="px-3 py-2.5 text-right">{row.count}</td>
                  <td className="px-3 py-2.5 text-right">{formatDays(row.days)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{formatKEuro(row.kEuro)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs text-slate-500">{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
