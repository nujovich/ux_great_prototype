import { useMemo, useState } from 'react';
import { Users, Split, Plus, Trash2 } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';
import { formatDays, formatKEuro } from '../lib/format';
import { ENGINEERS } from '../fixtures/engineers';
import type { AllocationSplit, ProjectLine } from '../types';

export function AllocationPage() {
  return (
    <RoleGate permission="view:allocation">
      <AllocationContent />
    </RoleGate>
  );
}

function AllocationContent() {
  const lines = useDataStore((s) => s.lines);
  const allocations = useDataStore((s) => s.allocations);
  const setAllocation = useDataStore((s) => s.setAllocation);
  const can = useRoleStore((s) => s.can);
  const pushToast = useUIStore((s) => s.pushToast);

  const [splitTarget, setSplitTarget] = useState<ProjectLine | null>(null);

  const allocatable = useMemo(
    () => lines.filter((l) => l.status === 'approved'),
    [lines],
  );

  if (allocatable.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Allocation</h1>
        <EmptyState
          title="No hay líneas listas para allocation"
          description="Las líneas aparecen acá una vez aprobadas en Estimation Review."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Allocation</h1>
        <p className="text-sm text-slate-600">
          Asignación de líneas aprobadas a engineers. Soporta split entre múltiples engineers.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Línea</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Días</th>
              {can('view:k-euro-rates') && <th className="px-3 py-2 text-right font-medium">k€</th>}
              <th className="px-3 py-2 text-left font-medium">Asignación</th>
              {can('edit:allocation') && <th className="px-3 py-2 text-right font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {allocatable.map((l) => {
              const alloc = allocations.find((a) => a.lineId === l.id);
              return (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{l.lineName}</div>
                    <div className="text-xs text-slate-500">{l.id} · {l.metier}</div>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={l.status} /></td>
                  <td className="px-3 py-2.5 text-right">{formatDays(l.estimatedDays)}</td>
                  {can('view:k-euro-rates') && (
                    <td className="px-3 py-2.5 text-right font-medium">{formatKEuro(l.estimatedKEuro)}</td>
                  )}
                  <td className="px-3 py-2.5">
                    {alloc ? (
                      <div className="space-y-0.5">
                        {alloc.splits.map((s, i) => {
                          const eng = ENGINEERS.find((e) => e.id === s.engineerId);
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <Users size={12} className="text-slate-400" />
                              <span className="font-medium text-slate-700">{eng?.name ?? s.engineerId}</span>
                              <span className="text-slate-500">{s.percentage}% · {s.days}d</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sin asignar</span>
                    )}
                  </td>
                  {can('edit:allocation') && (
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setSplitTarget(l)}>
                        <Split size={14} /> Editar split
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {splitTarget && (
        <SplitModal
          line={splitTarget}
          currentSplits={allocations.find((a) => a.lineId === splitTarget.id)?.splits ?? []}
          onClose={() => setSplitTarget(null)}
          onSave={(splits) => {
            setAllocation(splitTarget.id, splits);
            pushToast(`Allocation actualizada para ${splitTarget.id}`, 'success');
            setSplitTarget(null);
          }}
        />
      )}
    </div>
  );
}

interface SplitProps {
  line: ProjectLine;
  currentSplits: AllocationSplit[];
  onClose: () => void;
  onSave: (splits: AllocationSplit[]) => void;
}

function SplitModal({ line, currentSplits, onClose, onSave }: SplitProps) {
  const [splits, setSplits] = useState<AllocationSplit[]>(
    currentSplits.length > 0 ? currentSplits : [{ engineerId: '', percentage: 100, days: line.estimatedDays ?? 0 }],
  );
  const candidateEngs = ENGINEERS.filter((e) => e.metier === line.metier);
  const totalPct = splits.reduce((acc, s) => acc + s.percentage, 0);

  function update(idx: number, patch: Partial<AllocationSplit>) {
    setSplits((s) =>
      s.map((x, i) =>
        i === idx
          ? {
              ...x,
              ...patch,
              days: patch.percentage != null ? ((line.estimatedDays ?? 0) * patch.percentage) / 100 : x.days,
            }
          : x,
      ),
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Split allocation — ${line.id}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onSave(splits)} disabled={splits.some((s) => !s.engineerId)}>
            Guardar
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        Total línea: <strong>{formatDays(line.estimatedDays)}</strong> · métier <strong>{line.metier}</strong>
      </p>
      <div className="space-y-2">
        {splits.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              value={s.engineerId}
              onChange={(e) => update(idx, { engineerId: e.target.value })}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Seleccionar engineer…</option>
              {candidateEngs.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={100}
              value={s.percentage}
              onChange={(e) => update(idx, { percentage: Number(e.target.value) })}
              className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-right text-sm"
            />
            <span className="text-sm text-slate-500">%</span>
            <span className="w-20 text-right text-sm text-slate-600">{s.days.toFixed(1)}d</span>
            <button
              onClick={() => setSplits((x) => x.filter((_, i) => i !== idx))}
              disabled={splits.length === 1}
              className="text-slate-400 hover:text-red-600 disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSplits((s) => [...s, { engineerId: '', percentage: 0, days: 0 }])}
        >
          <Plus size={14} /> Agregar engineer
        </Button>
        <div className={`text-sm font-medium ${totalPct === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
          Total: {totalPct}%
        </div>
      </div>
    </Modal>
  );
}
