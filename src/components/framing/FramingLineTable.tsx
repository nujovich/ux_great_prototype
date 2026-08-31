import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Download } from 'lucide-react';
import type { FramingLine } from '../../types/framing';
import { useSortable } from '../../lib/useSortable';
import { useT } from '../../i18n/useT';
import { Button } from '../shared/Button';
import { downloadFramingCsv } from '../../lib/framing/framingCsv';

export interface FramingTableColumn {
  key: keyof FramingLine;
  /** The PRD's own column name — labels come from the schema, not i18n. */
  label: string;
}

const METIER_COLUMN: FramingTableColumn = { key: 'ownerN2', label: 'Métier' };

/**
 * HIW-460 AC#2's minimum column set, less Métier.
 *
 * AC#2 lists Métier; the reviewer asked for it out of the grid (2026-08-31).
 * It is still the field that decides which `project_id` a line lands on when
 * it is sent to Pre-Estimation, so it stays in the export rather than
 * disappearing from the view altogether — see FRAMING_CSV_COLUMNS.
 */
// eslint-disable-next-line react-refresh/only-export-components -- schema constant intentionally co-located with the table it defines
export const FRAMING_TABLE_COLUMNS: FramingTableColumn[] = [
  { key: 'plNumber', label: 'PL Number' },
  { key: 'plName', label: 'PL Name' },
  { key: 'organType', label: 'Organ Type' },
  { key: 'energy', label: 'Energy' },
  { key: 'projectRanking', label: 'Project Ranking' },
  { key: 'client', label: 'Client' },
  { key: 'spDate', label: 'SP' },
  { key: 'pcDate', label: 'PC' },
  { key: 'coDate', label: 'CO' },
  { key: 'sopDate', label: 'SOP' },
];

/**
 * What the CSV download carries: the rendered columns plus Métier, back in its
 * AC#2 position. The export is the hand-off artefact — dropping a field from it
 * as a side effect of a display change is how data quietly goes missing.
 */
// eslint-disable-next-line react-refresh/only-export-components -- schema constant intentionally co-located with the table it defines
export const FRAMING_CSV_COLUMNS: FramingTableColumn[] = [
  ...FRAMING_TABLE_COLUMNS.slice(0, 6),
  METIER_COLUMN,
  ...FRAMING_TABLE_COLUMNS.slice(6),
];

/**
 * Row selection, for sending RFQ lines to Pre-Estimation. Optional on purpose:
 * the RFI tab passes nothing and gets NO selection column at all, rather than a
 * disabled one — the same conditional-render rule the upload control follows for
 * CPO. `isDisabled` lets the caller veto a row (already sent, unmappable métier)
 * without the table having to know why.
 */
export interface FramingTableSelection {
  checked: string[];
  onToggle(plNumber: string): void;
  onToggleAll(plNumbers: string[], checked: boolean): void;
  isDisabled?(line: FramingLine): boolean;
}

interface Props {
  lines: FramingLine[];
  selectedPlNumber: string | null;
  onSelect(plNumber: string): void;
  selection?: FramingTableSelection;
}

const cell = (line: FramingLine, key: keyof FramingLine): string => String(line[key] ?? '');

/**
 * §7.1 — read-only selection table. No editable cell, and NO readiness or
 * validation indicator: §6 is enforced server-side at Generate (HIW-460 AC#5).
 *
 * Filter/sort state is local to this component, so navigating away unmounts and
 * resets it — ADR-011's session + route scope, for free.
 */
export function FramingLineTable({ lines, selectedPlNumber, onSelect, selection }: Props) {
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

  // Task 7 — visible-vs-total only when a filter is actually narrowing the
  // set; sorting never changes the count, so `filtered.length` === `sorted.length`.
  const isFiltered = filtered.length < lines.length;

  // Select-all acts on exactly the rows on screen (filtered + sorted), the same
  // rule the CSV export follows — and never on a row the caller vetoed.
  const selectableVisible = selection
    ? sorted.filter((line) => !selection.isDisabled?.(line)).map((l) => l.plNumber)
    : [];
  const checkedSet = new Set(selection?.checked ?? []);
  const allVisibleChecked = selectableVisible.length > 0
    && selectableVisible.every((pl) => checkedSet.has(pl));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p data-testid="framing-table-row-count" className="text-xs text-slate-500">
          {isFiltered
            ? t('framing.table.rowCountFiltered', { visible: filtered.length, total: lines.length })
            : t('framing.table.rowCount', { count: lines.length })}
        </p>
        {/* Task 7 — download exactly the currently visible (filtered + sorted) rows. */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => downloadFramingCsv(sorted, FRAMING_CSV_COLUMNS, `framing-file-table-${Date.now()}.csv`)}
        >
          <Download size={14} /> {t('framing.table.exportCsv')}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {selection && (
                <th data-selection-cell className="w-10 px-3 py-2 text-left align-top">
                  <input
                    type="checkbox"
                    aria-label={t('framing.bulk.selectAll')}
                    checked={allVisibleChecked}
                    disabled={selectableVisible.length === 0}
                    onChange={() => selection.onToggleAll(selectableVisible, !allVisibleChecked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                </th>
              )}
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
                  {selection && (
                    <td data-selection-cell className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={t('framing.bulk.selectRow', { plNumber: line.plNumber })}
                        checked={checkedSet.has(line.plNumber)}
                        disabled={selection.isDisabled?.(line) ?? false}
                        // The row's own click opens the detail form; ticking a box
                        // must not also do that.
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => selection.onToggle(line.plNumber)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                  )}
                  {FRAMING_TABLE_COLUMNS.map(({ key }) => (
                    <td key={String(key)} className="px-3 py-2.5">{cell(line, key)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
