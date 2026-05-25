import { useEffect, useMemo, useState } from 'react';
import { Lock, Copy, Plus, Trash2, X } from 'lucide-react';
import type { CustomJU, InductorValue, ProjectLine } from '../../types';
import { INDUCTORS } from '../../fixtures/inductors';
import { calcKEuro, calcTotalDays, yearlyBreakdown } from '../../lib/calc';
import { formatDays, formatKEuro } from '../../lib/format';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';
import { CopyEstimationModal } from './CopyEstimationModal';

interface Props {
  line: ProjectLine | null;
  onClose: () => void;
}

export function EstimationPanel({ line, onClose }: Props) {
  const can = useRoleStore((s) => s.can);
  const existing = useDataStore((s) => (line ? s.estimations[line.id] : undefined));
  const setEstimation = useDataStore((s) => s.setEstimation);
  const setLineStatus = useDataStore((s) => s.setLineStatus);
  const pushToast = useUIStore((s) => s.pushToast);

  const [occurrences, setOccurrences] = useState(1);
  const [values, setValues] = useState<InductorValue[]>([]);
  const [customJUs, setCustomJUs] = useState<CustomJU[]>([]);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState(false);

  useEffect(() => {
    if (!line) return;
    if (existing) {
      setOccurrences(existing.occurrences);
      setValues(existing.inductorValues);
      setCustomJUs(existing.customJUs);
    } else {
      setOccurrences(1);
      setValues([]);
      setCustomJUs([]);
    }
  }, [line?.id]);

  const locked = !line || line.status === 'estimated' || line.status === 'approved' || line.status === 'allocated';
  const canEdit = can('edit:estimation') && !locked;
  const canEditCustomJU = can('edit:custom-jus');

  const totalDays = useMemo(() => calcTotalDays(values, customJUs, occurrences), [values, customJUs, occurrences]);
  const totalKEuro = useMemo(() => (line ? calcKEuro(totalDays, line.metier) : 0), [totalDays, line]);
  const breakdown = useMemo(() => yearlyBreakdown(totalDays), [totalDays]);

  if (!line) return null;

  const hasMinimumForDraft = occurrences > 0;
  const hasMinimumForDefinitive = occurrences > 0 && (values.some((v) => v.quantity > 0) || customJUs.length > 0);

  function addInductor(id: string) {
    if (values.some((v) => v.inductorId === id)) return;
    const ind = INDUCTORS.find((i) => i.id === id);
    if (!ind) return;
    setValues((v) => [...v, { inductorId: id, quantity: 1, factor: ind.defaultFactor }]);
  }

  function updateInductor(idx: number, patch: Partial<InductorValue>) {
    setValues((v) => v.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }

  function removeInductor(idx: number) {
    setValues((v) => v.filter((_, i) => i !== idx));
  }

  function persist(status: 'draft' | 'estimated') {
    setEstimation(line!.id, {
      lineId: line!.id,
      inductorValues: values,
      customJUs,
      occurrences,
      yearlyBreakdown: breakdown,
      totalDays,
      totalKEuro,
      status,
      ...(status === 'draft' ? { draftedAt: new Date().toISOString() } : { estimatedAt: new Date().toISOString() }),
    });
    setLineStatus(line!.id, status, { estimatedDays: totalDays, estimatedKEuro: totalKEuro });
  }

  function handleSaveDraft() {
    persist('draft');
    pushToast(`Borrador guardado para ${line!.id}`, 'success');
    onClose();
  }

  function handlePromote() {
    persist('estimated');
    pushToast(`${line!.id} promovida a estimación definitiva`, 'success');
    setConfirmPromote(false);
    onClose();
  }

  const availableInductors = INDUCTORS.filter((i) => !values.some((v) => v.inductorId === i.id));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">{line.lineName}</h2>
              {locked && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  <Lock size={12} /> Bloqueada
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {line.id} · {line.projectName} · {line.metier}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {line.status === 'rejected' && line.rejectionComment && (
          <div className="mx-6 mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">Comentario del CPO (rechazo)</div>
            <p className="mt-1">{line.rejectionComment}</p>
            <p className="mt-2 text-xs text-amber-700">Editá los inductores y guardá como borrador para re-someter.</p>
          </div>
        )}

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <section>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ocurrencias anuales
            </label>
            <input
              type="number"
              min={1}
              value={occurrences}
              onChange={(e) => setOccurrences(Math.max(1, Number(e.target.value)))}
              disabled={!canEdit}
              className="mt-1 w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 focus:border-brand-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">Multiplicador aplicado al total estimado.</p>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inductores</label>
              {canEdit && availableInductors.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) addInductor(e.target.value);
                    e.target.value = '';
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>+ Agregar inductor…</option>
                  {availableInductors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.category})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {values.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                Sin inductores. Agregá al menos uno para promover a definitiva.
              </div>
            ) : (
              <table className="w-full overflow-hidden rounded-md border border-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Inductor</th>
                    <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                    <th className="px-3 py-2 text-right font-medium">Factor (d/u)</th>
                    <th className="px-3 py-2 text-right font-medium">Días</th>
                    {canEdit && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody>
                  {values.map((iv, idx) => {
                    const ind = INDUCTORS.find((i) => i.id === iv.inductorId)!;
                    return (
                      <tr key={iv.inductorId} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800">{ind.name}</div>
                          <div className="text-xs text-slate-500">{ind.unit}</div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            value={iv.quantity}
                            onChange={(e) => updateInductor(idx, { quantity: Number(e.target.value) })}
                            disabled={!canEdit}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-100"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={iv.factor}
                            onChange={(e) => updateInductor(idx, { factor: Number(e.target.value) })}
                            disabled={!canEdit}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-100"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {(iv.quantity * iv.factor).toFixed(1)}
                        </td>
                        {canEdit && (
                          <td className="px-2">
                            <button
                              onClick={() => removeInductor(idx)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Custom JUs
              </label>
              {canEdit && canEditCustomJU && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setCustomJUs((j) => [
                      ...j,
                      { id: `ju-${Date.now()}`, description: '', days: 1 },
                    ])
                  }
                >
                  <Plus size={14} /> Agregar JU
                </Button>
              )}
            </div>
            {!canEditCustomJU && customJUs.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
                Solo PMO/Admin pueden agregar Custom JUs.
              </div>
            ) : customJUs.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
                Sin JUs custom.
              </div>
            ) : (
              <div className="space-y-2">
                {customJUs.map((ju, idx) => (
                  <div key={ju.id} className="flex items-center gap-2">
                    <input
                      value={ju.description}
                      placeholder="Descripción"
                      onChange={(e) =>
                        setCustomJUs((j) => j.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
                      }
                      disabled={!canEdit || !canEditCustomJU}
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={ju.days}
                      onChange={(e) =>
                        setCustomJUs((j) => j.map((x, i) => (i === idx ? { ...x, days: Number(e.target.value) } : x)))
                      }
                      disabled={!canEdit || !canEditCustomJU}
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-100"
                    />
                    {canEdit && canEditCustomJU && (
                      <button
                        onClick={() => setCustomJUs((j) => j.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Total días</div>
                <div className="text-2xl font-bold text-slate-900">{formatDays(totalDays)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total k€</div>
                <div className="text-2xl font-bold text-slate-900">{formatKEuro(totalKEuro)}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Distribución anual</div>
              <div className="flex items-end gap-1">
                {breakdown.map((m, i) => {
                  const max = Math.max(...breakdown, 0.01);
                  const h = (m / max) * 56;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center">
                      <div
                        className="w-full rounded-t bg-brand-500"
                        style={{ height: `${Math.max(h, 2)}px` }}
                        title={`Mes ${i + 1}: ${m.toFixed(1)}d`}
                      />
                      <div className="mt-1 text-[10px] text-slate-400">
                        {['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-2">
            {existing && canEdit && (
              <Button size="sm" variant="secondary" onClick={() => setShowCopyModal(true)}>
                <Copy size={14} /> Copiar a otras líneas
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="md" variant="ghost" onClick={onClose}>Cerrar</Button>
            {canEdit && (
              <>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={!hasMinimumForDraft}
                >
                  Guardar borrador
                </Button>
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => setConfirmPromote(true)}
                  disabled={!hasMinimumForDefinitive}
                >
                  Promover a definitiva
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>

      <Modal
        open={confirmPromote}
        onClose={() => setConfirmPromote(false)}
        title="Promover a estimación definitiva"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmPromote(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handlePromote}>Promover</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          La línea <strong>{line.id}</strong> pasará a estado <strong>Estimada</strong> y quedará
          bloqueada hasta que un CPO la apruebe o rechace.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          <li>• Total días: <strong>{formatDays(totalDays)}</strong></li>
          <li>• Total k€: <strong>{formatKEuro(totalKEuro)}</strong></li>
          <li>• Inductores: <strong>{values.length}</strong> + {customJUs.length} JU custom</li>
        </ul>
      </Modal>

      {showCopyModal && (
        <CopyEstimationModal
          sourceLine={line}
          onClose={() => setShowCopyModal(false)}
        />
      )}
    </>
  );
}
