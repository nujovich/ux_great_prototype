import { clsx } from 'clsx';
import { MessageSquareWarning } from 'lucide-react';
import type { ProjectLine } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDays, formatKEuro } from '../../lib/format';
import { ENGINEERS } from '../../fixtures/engineers';

interface Props {
  lines: ProjectLine[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onRowClick: (id: string) => void;
  showSelection: boolean;
  showKEuro: boolean;
}

export function ProjectLineGrid({
  lines,
  selectedIds,
  onToggleSelect,
  onRowClick,
  showSelection,
  showKEuro,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            {showSelection && <th className="w-8 px-3 py-2.5" />}
            <th className="px-3 py-2.5 text-left font-medium">ID</th>
            <th className="px-3 py-2.5 text-left font-medium">Proyecto / Línea</th>
            <th className="px-3 py-2.5 text-left font-medium">Métier</th>
            <th className="px-3 py-2.5 text-left font-medium">Engineer</th>
            <th className="px-3 py-2.5 text-left font-medium">Status</th>
            <th className="px-3 py-2.5 text-right font-medium">Días</th>
            {showKEuro && <th className="px-3 py-2.5 text-right font-medium">k€</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const eng = ENGINEERS.find((e) => e.id === line.assignedEngineerId);
            const selected = selectedIds.includes(line.id);
            return (
              <tr
                key={line.id}
                className={clsx(
                  'cursor-pointer border-t border-slate-100 hover:bg-slate-50',
                  selected && 'bg-brand-50/50',
                  line.status === 'rejected' && 'bg-red-50/30',
                )}
                onClick={() => onRowClick(line.id)}
              >
                {showSelection && (
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(line.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                )}
                <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{line.id}</td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-slate-900">{line.lineName}</div>
                  <div className="text-xs text-slate-500">{line.projectName}</div>
                  {line.status === 'rejected' && line.rejectionComment && (
                    <div className="mt-1 flex items-start gap-1 text-xs text-red-700">
                      <MessageSquareWarning size={12} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{line.rejectionComment}</span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-slate-600">{line.metier}</td>
                <td className="px-3 py-2.5 text-slate-600">{eng?.name ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={line.status} />
                </td>
                <td className="px-3 py-2.5 text-right text-slate-700">{formatDays(line.estimatedDays)}</td>
                {showKEuro && (
                  <td className="px-3 py-2.5 text-right font-medium text-slate-700">
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
