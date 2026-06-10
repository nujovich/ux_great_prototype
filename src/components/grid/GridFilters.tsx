import type { LineStatus, Metier } from '../../types';
import { useT } from '../../i18n/useT';
import { statusI18nKey } from '../../lib/stateMachine';

const STATUSES: LineStatus[] = ['To do', 'Draft', 'Estimated', 'Sent', 'Modification Requested', 'Approved'];
const METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-PROJECT', 'H-CUSTOMER', 'H-TESTING', 'H-NP'];

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
  const t = useT();
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">{t('filters.search')}</label>
        <input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder={t('filters.searchPlaceholder')}
          className="mt-1 w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">{t('filters.status')}</label>
        <select
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as GridFilters['status'] })}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="all">{t('filters.all')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(statusI18nKey(s))}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">{t('filters.metier')}</label>
        <select
          value={value.metier}
          onChange={(e) => onChange({ ...value, metier: e.target.value as GridFilters['metier'] })}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="all">{t('filters.all')}</option>
          {METIERS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
