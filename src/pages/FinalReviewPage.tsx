import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { formatDays, formatKEuro } from '../lib/format';
import { exportToCsv } from '../lib/csvExport';
import { useT } from '../i18n/useT';
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
  const can = useRoleStore((s) => s.can);
  const t = useT();

  const activeCycleId = useMemo(() => cycles.find((c) => c.isActive)?.id ?? 'export', [cycles]);
  const approvedLines = useMemo(() => lines.filter((l) => l.status === 'approved'), [lines]);

  const byMetier = useMemo(() => {
    const map = new Map<Metier, { count: number; days: number; kEuro: number }>();
    lines.forEach((l) => {
      if (l.estimatedDays == null) return;
      const cur = map.get(l.metier) ?? { count: 0, days: 0, kEuro: 0 };
      cur.count += 1;
      cur.days += l.estimatedDays;
      cur.kEuro += l.estimatedKEuro ?? 0;
      map.set(l.metier, cur);
    });
    return [...map.entries()].sort((a, b) => b[1].kEuro - a[1].kEuro);
  }, [lines]);

  const totals = byMetier.reduce(
    (acc, [, v]) => ({ count: acc.count + v.count, days: acc.days + v.days, kEuro: acc.kEuro + v.kEuro }),
    { count: 0, days: 0, kEuro: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('finalReview.title')}</h1>
          <p className="text-sm text-slate-600">{t('finalReview.subtitle')}</p>
        </div>
        {can('export:final-review') && (
          <Button
            variant="secondary"
            onClick={() => exportToCsv(approvedLines, `final-review-${activeCycleId}.csv`)}
          >
            <Download size={14} /> {t('finalReview.exportCsv')}
          </Button>
        )}
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
              <th className="px-3 py-2 text-left font-medium">{t('finalReview.colMetier')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('finalReview.colLines')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('finalReview.colDays')}</th>
              <th className="px-3 py-2 text-right font-medium">k€</th>
              <th className="px-3 py-2 text-left font-medium">{t('finalReview.colDistribution')}</th>
            </tr>
          </thead>
          <tbody>
            {byMetier.map(([m, v]) => {
              const pct = totals.kEuro > 0 ? (v.kEuro / totals.kEuro) * 100 : 0;
              return (
                <tr key={m} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-medium text-slate-800">{m}</td>
                  <td className="px-3 py-2.5 text-right">{v.count}</td>
                  <td className="px-3 py-2.5 text-right">{formatDays(v.days)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{formatKEuro(v.kEuro)}</td>
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
