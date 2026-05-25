import { AlertTriangle, X, Layers, Users } from 'lucide-react';
import { Button } from '../shared/Button';
import type { CompatibilityResult } from '../../lib/compatibility';

interface Props {
  count: number;
  compatibility: CompatibilityResult;
  onClear: () => void;
  onBulkEstimate?: () => void;
  onBulkAssign?: () => void;
}

export function BulkActionsBar({ count, compatibility, onClear, onBulkEstimate, onBulkAssign }: Props) {
  if (count === 0) return null;
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm">
        <Layers size={16} className="text-brand-700" />
        <strong className="text-brand-900">{count} línea(s) seleccionada(s)</strong>
      </div>
      {!compatibility.compatible ? (
        <div className="flex flex-1 items-start gap-2 rounded-md bg-red-100 px-3 py-1.5 text-xs text-red-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <strong>Selección incompatible.</strong> {compatibility.reasons.join(' · ')}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-2 text-xs text-emerald-700">
          ✓ Selección compatible — podés aplicar acciones bulk
        </div>
      )}
      <div className="flex items-center gap-2">
        {onBulkEstimate && (
          <Button
            variant="primary"
            size="sm"
            disabled={!compatibility.compatible}
            onClick={onBulkEstimate}
          >
            <Layers size={14} /> Estimar en bulk
          </Button>
        )}
        {onBulkAssign && (
          <Button
            variant="secondary"
            size="sm"
            disabled={!compatibility.compatible}
            onClick={onBulkAssign}
          >
            <Users size={14} /> Asignar
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X size={14} /> Limpiar
        </Button>
      </div>
    </div>
  );
}
