import { clsx } from 'clsx';
import type { LineStatus } from '../../types';

const labels: Record<LineStatus, string> = {
  to_do:     'Sin estimar',
  draft:     'Borrador',
  estimated: 'Estimada',
  sent:      'Enviada',
  rejected:  'Rechazada',
  approved:  'Aprobada',
};

const classes: Record<LineStatus, string> = {
  to_do:     'bg-slate-100 text-slate-600 border-slate-200',
  draft:     'bg-amber-50 text-amber-700 border-amber-200',
  estimated: 'bg-blue-50 text-blue-700 border-blue-200',
  sent:      'bg-purple-50 text-purple-700 border-purple-200',
  rejected:  'bg-red-50 text-red-700 border-red-200',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function StatusBadge({ status }: { status: LineStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        classes[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
