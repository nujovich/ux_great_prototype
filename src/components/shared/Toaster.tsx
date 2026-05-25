import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { clsx } from 'clsx';

export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'pointer-events-auto flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-md text-sm',
            t.kind === 'success' && 'border-emerald-200 text-emerald-800',
            t.kind === 'info' && 'border-sky-200 text-sky-800',
            t.kind === 'error' && 'border-red-200 text-red-800',
          )}
        >
          {t.kind === 'success' && <CheckCircle2 size={16} className="text-emerald-600" />}
          {t.kind === 'info' && <Info size={16} className="text-sky-600" />}
          {t.kind === 'error' && <XCircle size={16} className="text-red-600" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
