import { useMemo, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { RoleGate } from '../components/shared/RoleGate';
import { StatusBadge } from '../components/shared/StatusBadge';
import { StatusPieChart } from '../components/management/StatusPieChart';
import { useT } from '../i18n/useT';
import { CYCLES } from '../fixtures/cycles';
import type { LineStatus, Metier } from '../types';

const METIERS: Metier[] = ['Backend', 'Frontend', 'Data', 'DevOps', 'QA', 'Mobile'];
const STATUSES: LineStatus[] = ['to_do', 'draft', 'estimated', 'sent', 'rejected', 'approved'];

export function ManagementPage() {
  return (
    <RoleGate permission="view:management">
      <ManagementContent />
    </RoleGate>
  );
}

function ManagementContent() {
  const lines = useDataStore((s) => s.lines);
  const t = useT();
  const [cycleId, setCycleId] = useState<string>('cyc-2026h1');
  const [statusFilter, setStatusFilter] = useState<LineStatus | 'all'>('all');
  const [metierFilter, setMetierFilter] = useState<Metier | 'all'>('all');

  const filtered = useMemo(
    () =>
      lines.filter(
        (l) =>
          l.cycleId === cycleId &&
          (statusFilter === 'all' || l.status === statusFilter) &&
          (metierFilter === 'all' || l.metier === metierFilter),
      ),
    [lines, cycleId, statusFilter, metierFilter],
  );

  const matrix = useMemo(() => {
    const m: Record<Metier, Record<LineStatus, number>> = {} as never;
    METIERS.forEach((met) => {
      m[met] = { to_do: 0, draft: 0, estimated: 0, sent: 0, rejected: 0, approved: 0 };
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
        <FilterSelect label="Cycle" value={cycleId} onChange={setCycleId}>
          {CYCLES.map((c) => (
            <option key={c.id} value={c.id}>{c.name} {c.isActive ? '(activo)' : '(cerrado)'}</option>
          ))}
        </FilterSelect>
        <FilterSelect label={t('filters.status')} value={statusFilter} onChange={(v) => setStatusFilter(v as LineStatus | 'all')}>
          <option value="all">{t('filters.all')}</option>
          {STATUSES.map((s) => (<option key={s} value={s}>{t(`status.${s}`)}</option>))}
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
