import { useMemo, useState } from 'react';
import type { ProjectLine } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';

interface Props {
  sourceLine: ProjectLine;
  onClose: () => void;
}

export function CopyEstimationModal({ sourceLine, onClose }: Props) {
  const lines = useDataStore((s) => s.lines);
  const copyEstimation = useDataStore((s) => s.copyEstimation);
  const pushToast = useUIStore((s) => s.pushToast);
  const [selected, setSelected] = useState<string[]>([]);

  const candidates = useMemo(
    () =>
      lines.filter(
        (l) =>
          l.id !== sourceLine.id &&
          l.metier === sourceLine.metier &&
          l.cycleId === sourceLine.cycleId &&
          (l.status === 'to_do' || l.status === 'draft'),
      ),
    [lines, sourceLine],
  );

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function handleConfirm() {
    copyEstimation(sourceLine.id, selected);
    pushToast(`Estimación copiada a ${selected.length} línea(s)`, 'success');
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Copiar estimación de ${sourceLine.id}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={selected.length === 0}>
            Copiar a {selected.length} línea(s)
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        Solo se muestran líneas compatibles (mismo métier <strong>{sourceLine.metier}</strong>,
        mismo cycle, status sin estimación definitiva).
      </p>
      {candidates.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay líneas compatibles para copiar.
        </div>
      ) : (
        <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2 text-left font-medium">ID</th>
                <th className="px-3 py-2 text-left font-medium">Proyecto / Línea</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((l) => (
                <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(l.id)}
                      onChange={() => toggle(l.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{l.id}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{l.lineName}</div>
                    <div className="text-xs text-slate-500">{l.projectName}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
