import type { LineStatus } from '../../types';
import { useT } from '../../i18n/useT';
import { statusI18nKey } from '../../lib/stateMachine';
import { ENGINEERS } from '../../fixtures/engineers';
import type { GridFilters } from '../../lib/gridFilter';
import { FILTER_METIERS } from './filterConstants';

const STATUSES: LineStatus[] = ['To do', 'Draft', 'Estimated', 'Sent', 'Modification Requested', 'Approved'];

interface Props {
  value: GridFilters;
  onChange: (v: GridFilters) => void;
  showOwnerFilters: boolean;
}

export function GridFiltersBar({ value, onChange, showOwnerFilters }: Props) {
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
          {STATUSES.map((s) => (<option key={s} value={s}>{t(statusI18nKey(s))}</option>))}
        </select>
      </div>
      {showOwnerFilters && (
        <>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500">{t('filters.metier')}</label>
            <select
              value={value.metier}
              onChange={(e) => onChange({ ...value, metier: e.target.value as GridFilters['metier'] })}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="all">{t('filters.all')}</option>
              {FILTER_METIERS.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500">{t('filters.assignee')}</label>
            <select
              value={value.assignee}
              onChange={(e) => onChange({ ...value, assignee: e.target.value })}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="all">{t('filters.all')}</option>
              {ENGINEERS.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}
