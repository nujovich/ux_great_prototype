import { useState } from 'react';
import { Button } from '../shared/Button';
import type { PrototypeCategory, PrototypeEstimation } from '../../types';

const DEFAULT_CATEGORIES: PrototypeCategory[] = [
  { id: 'proto-cat-1', name: 'Greenfield',  description: 'Producto nuevo desde cero' },
  { id: 'proto-cat-2', name: 'Refactor',    description: 'Reescritura de módulo existente' },
  { id: 'proto-cat-3', name: 'Integration', description: 'Conexión con sistemas externos' },
  { id: 'proto-cat-4', name: 'Maintenance', description: 'Bugfixes y mejoras menores' },
];

interface Props {
  lineId: string;
  initial?: PrototypeEstimation;
  onSave: (est: PrototypeEstimation) => void;
  readOnly?: boolean;
}

export function PrototypeEstimationForm({ lineId, initial, onSave, readOnly }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    initial?.quantities ??
      Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, 0])),
  );
  const [comment, setComment] = useState(initial?.comment ?? '');

  const total = Object.values(quantities).reduce((a, b) => a + b, 0);

  function handleChange(catId: string, raw: string) {
    setQuantities((q) => ({ ...q, [catId]: Math.max(0, Number(raw) || 0) }));
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Estimación de Prototipo (BR-18) — No afecta FTE / BH / KM
      </h4>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DEFAULT_CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <label
              className="block text-xs font-medium text-slate-600 mb-1"
              title={cat.description}
            >
              {cat.name}
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={quantities[cat.id] ?? 0}
              onChange={(e) => handleChange(cat.id, e.target.value)}
              disabled={readOnly}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:bg-white disabled:opacity-60"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Total: <strong className="text-slate-700">{total}</strong> unidades de prototipo
      </p>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={readOnly}
        placeholder="Comentario sobre el prototipo (opcional)..."
        rows={2}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none disabled:bg-white disabled:opacity-60"
      />

      {!readOnly && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onSave({ lineId, quantities: { ...quantities }, comment })}
        >
          Guardar Prototipo
        </Button>
      )}
    </div>
  );
}
