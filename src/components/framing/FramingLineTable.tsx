import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { FramingLine } from '../../types/framing';
import { useSortable } from '../../lib/useSortable';
import { useT } from '../../i18n/useT';

export interface FramingTableColumn {
  key: keyof FramingLine;
  /** The PRD's own column name — labels come from the schema, not i18n. */
  label: string;
}

/** HIW-460 AC#2 — the minimum column set. */
// eslint-disable-next-line react-refresh/only-export-components -- schema constant intentionally co-located with the table it defines
export const FRAMING_TABLE_COLUMNS: FramingTableColumn[] = [
  { key: 'plNumber', label: 'PL Number' },
  { key: 'plName', label: 'PL Name' },
  { key: 'organType', label: 'Organ Type' },
  { key: 'energy', label: 'Energy' },
  { key: 'projectRanking', label: 'Project Ranking' },
  { key: 'client', label: 'Client' },
  { key: 'ownerN2', label: 'Métier' },
  { key: 'spDate', label: 'SP' },
  { key: 'pcDate', label: 'PC' },
  { key: 'coDate', label: 'CO' },
  { key: 'sopDate', label: 'SOP' },
];

interface Props {
  lines: FramingLine[];
  selectedPlNumber: string | null;
  onSelect(plNumber: string): void;
}

const cell = (line: FramingLine, key: keyof FramingLine): string => String(line[key] ?? '');

/**
 * §7.1 — read-only selection table. No editable cell, and NO readiness or
 * validation indicator: §6 is enforced server-side at Generate (HIW-460 AC#5).
 *
 * Filter/sort state is local to this component, so navigating away unmounts and
 * resets it — ADR-011's session + route scope, for free.
 */
export function FramingLineTable({ lines, selectedPlNumber, onSelect }: Props) {
  const t = useT();
  const [filters, setFilters] = useState<Partial<Record<keyof FramingLine, string>>>({});

  const filtered = useMemo(
    () =>
      lines.filter((line) =>
        FRAMING_TABLE_COLUMNS.every(({ key }) => {
          const needle = (filters[key] ?? '').trim().toLowerCase();
          return needle === '' || cell(line, key).toLowerCase().includes(needle);
        }),
      ),
    [lines, filters],
  );

  const { sorted, requestSort, getSortIcon } = useSortable(filtered);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {FRAMING_TABLE_COLUMNS.map(({ key, label }) => (
              <th key={String(key)} className="px-3 py-2 text-left font-medium">
                <button
                  type="button"
                  data-testid={`sort-${String(key)}`}
                  onClick={() => requestSort(key)}
                  className="flex items-center gap-1 uppercase hover:text-slate-700"
                >
                  {label} <span aria-hidden="true">{getSortIcon(key)}</span>
                </button>
                <input
                  type="text"
                  data-testid={`filter-${String(key)}`}
                  aria-label={`${label} filter`}
                  placeholder={t('framing.table.filterPlaceholder')}
                  value={filters[key] ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 px-1.5 py-1 text-xs font-normal normal-case"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((line) => {
            const selected = line.plNumber === selectedPlNumber;
            return (
              <tr
                key={line.id || line.plNumber}
                data-testid={`row-${line.plNumber}`}
                aria-selected={selected}
                onClick={() => onSelect(line.plNumber)}
                className={clsx(
                  'cursor-pointer border-t border-slate-100 hover:bg-slate-50',
                  selected && 'bg-sky-50',
                )}
              >
                {FRAMING_TABLE_COLUMNS.map(({ key }) => (
                  <td key={String(key)} className="px-3 py-2.5">{cell(line, key)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
