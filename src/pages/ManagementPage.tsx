import { useMemo, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { RoleGate } from '../components/shared/RoleGate';
import { StatusBadge } from '../components/shared/StatusBadge';
import { StatusPieChart } from '../components/management/StatusPieChart';
import { useT } from '../i18n/useT';
import { statusI18nKey } from '../lib/stateMachine';
import type { LineStatus, Metier } from '../types';

// MGMT-BR-04: H-NP and H-PROJECT are excluded from Management View
const METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-CUSTOMER', 'H-TESTING'];
const STATUSES: LineStatus[] = ['To do', 'Draft', 'Estimated', 'Sent', 'Rejected', 'Approved'];

export function ManagementPage() {
  return (
    <RoleGate permission="view:management">
      <ManagementContent />
    </RoleGate>
  );
}

function ManagementContent() {
  const lines = useDataStore((s) => s.lines);
  // MGMT-BR-06: only the active cycle is shown; historical cycles are not selectable
  const activeCycleId = useDataStore((s) => s.cycles.find((c) => c.is_active)?.id ?? '');
  const t = useT();
  const [statusFilter, setStatusFilter] = useState<LineStatus | 'all'>('all');
  const [metierFilter, setMetierFilter] = useState<Metier | 'all'>('all');

  const filtered = useMemo(
    () =>
      lines.filter(
        (l) =>
          l.cycleId === activeCycleId &&
          (statusFilter === 'all' || l.status === statusFilter) &&
          (metierFilter === 'all' || l.metier === metierFilter),
      ),
    [lines, activeCycleId, statusFilter, metierFilter],
  );

  const matrix = useMemo(() => {
    const m: Record<Metier, Record<LineStatus, number>> = {} as never;
    METIERS.forEach((met) => {
      m[met] = { 'To do': 0, 'Draft': 0, 'Estimated': 0, 'Sent': 0, 'Rejected': 0, 'Approved': 0 };
    });
    filtered.forEach((l) => {
      m[l.metier][l.status] += 1;
    });
    return m;
  }, [filtered]);

  const statusTotals = useMemo(() => {
    const totals: Partial<Record<LineStatus, number>> = {};
    filtered.forEach((l) => {
      totals[l.status] = (totals[l.status] ?? 0) + 1;
    });
    return totals;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('mgmt.title')}</h1>
        <p className="text-sm text-slate-600">{t('mgmt.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <FilterSelect label={t('filters.status')} value={statusFilter} onChange={(v) => setStatusFilter(v as LineStatus | 'all')}>
          <option value="all">{t('filters.all')}</option>
          {STATUSES.map((s) => (<option key={s} value={s}>{t(statusI18nKey(s))}</option>))}
        </FilterSelect>
        <FilterSelect label={t('filters.metier')} value={metierFilter} onChange={(v) => setMetierFilter(v as Metier | 'all')}>
          <option value="all">{t('filters.all')}</option>
          {METIERS.map((m) => (<option key={m} value={m}>{m}</option>))}
        </FilterSelect>
      </div>

      <StatusPieChart
        data={statusTotals}
        title={t('mgmt.pieTitle')}
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t('filters.metier')}</th>
              {STATUSES.map((s) => (
                <th key={s} className="px-3 py-2 text-center font-medium">
                  <StatusBadge status={s} />
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">{t('mgmt.colTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {METIERS.map((m) => {
              const total = STATUSES.reduce((acc, s) => acc + matrix[m][s], 0);
              if (total === 0) return null;
              return (
                <tr key={m} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-medium text-slate-800">{m}</td>
                  {STATUSES.map((s) => (
                    <td key={s} className="px-3 py-2.5 text-center">
                      {matrix[m][s] > 0 ? (
                        <span className="font-mono text-sm text-slate-700">{matrix[m][s]}</span>
                      ) : (
                        <span className="text-slate-300">·</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-bold">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
      >
        {children}
      </select>
    </div>
  );
}
