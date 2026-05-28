import type { LineStatus, Metier } from '../../types';

const STATUSES: LineStatus[] = ['to_do', 'draft', 'estimated', 'sent', 'rejected', 'approved'];
const METIERS: Metier[] = ['Backend', 'Frontend', 'Data', 'DevOps', 'QA', 'Mobile'];

export interface GridFilters {
  status: LineStatus | 'all';
  metier: Metier | 'all';
  search: string;
}

interface Props {
  value: GridFilters;
  onChange: (v: GridFilters) => void;
}

export function GridFiltersBar({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">Buscar</label>
        <input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Proyecto o nombre de línea…"
          className="mt-1 w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">Status</label>
        <select
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as GridFilters['status'] })}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="all">Todos</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">Métier</label>
        <select
          value={value.metier}
          onChange={(e) => onChange({ ...value, metier: e.target.value as GridFilters['metier'] })}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="all">Todos</option>
          {METIERS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
