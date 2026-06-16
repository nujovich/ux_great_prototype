import { clsx } from 'clsx';
import { MessageSquareWarning } from 'lucide-react';
import type { ProjectLine } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDays, formatKEuro } from '../../lib/format';
import { ENGINEERS } from '../../fixtures/engineers';
import { useT } from '../../i18n/useT';
import { getGridColumns, type GridColumn } from './gridColumns';

interface Props {
  lines: ProjectLine[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onRowClick: (id: string) => void;
  showSelection: boolean;
  showKEuro: boolean;
}

export function ProjectLineGrid({
  lines, selectedIds, onToggleSelect, onRowClick, showSelection, showKEuro,
}: Props) {
  const t = useT();
  const columns = getGridColumns();

  function renderCell(col: GridColumn, line: ProjectLine) {
    switch (col.key) {
      case 'status':
        return <StatusBadge status={line.status} />;
      case 'plNumber':
        return <span className="font-mono text-[10px] text-slate-400">{line.id}</span>;
      case 'plName':
        return (
          <div>
            <div className="font-medium text-slate-900">{line.lineName}</div>
            {line.status === 'Modification Requested' && line.rejectionComment && (
              <div className="mt-0.5 flex items-start gap-1 text-[10px] text-red-700">
                <MessageSquareWarning size={10} className="mt-0.5 shrink-0" />
                <span className="line-clamp-1">{line.rejectionComment}</span>
              </div>
            )}
          </div>
        );
      case 'assignee': {
        const eng = ENGINEERS.find((e) => e.id === line.assignedEngineerId);
        return <span className="text-slate-500">{eng?.name ?? '—'}</span>;
      }
      case 'estimatedDays':
        return <span className="text-slate-600">{formatDays(line.estimatedDays)}</span>;
      default: {
        const v = (line as unknown as Record<string, unknown>)[col.key];
        return <span className="text-slate-500">{v == null || v === '' ? '—' : String(v)}</span>;
      }
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            {showSelection && <th className="w-7 px-2 py-1.5" />}
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx('px-2 py-1.5 font-medium', col.align === 'right' ? 'text-right' : 'text-left')}
              >
                {t(col.labelKey)}
              </th>
            ))}
            {showKEuro && <th className="px-2 py-1.5 text-right font-medium">k€</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const selected = selectedIds.includes(line.id);
            return (
              <tr
                key={line.id}
                className={clsx(
                  'cursor-pointer border-t border-slate-100 hover:bg-slate-50',
                  selected && 'bg-brand-50/50',
                  line.status === 'Modification Requested' && 'bg-red-50/30',
                )}
                onClick={() => onRowClick(line.id)}
              >
                {showSelection && (
                  <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(line.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-2 py-1', col.align === 'right' && 'text-right')}>
                    {renderCell(col, line)}
                  </td>
                ))}
                {showKEuro && (
                  <td className="px-2 py-1 text-right font-medium text-slate-600">
                    {formatKEuro(line.estimatedKEuro)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
