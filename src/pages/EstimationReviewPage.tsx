import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Send, MessageSquare } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';
import { formatDays, formatKEuro, formatDate } from '../lib/format';
import { ENGINEERS } from '../fixtures/engineers';
import type { ProjectLine } from '../types';

export function EstimationReviewPage() {
  return (
    <RoleGate permission="view:estimation-review">
      <ReviewContent />
    </RoleGate>
  );
}

function ReviewContent() {
  const lines = useDataStore((s) => s.lines);
  const setLineStatus = useDataStore((s) => s.setLineStatus);
  const rejectLine = useDataStore((s) => s.rejectLine);
  const can = useRoleStore((s) => s.can);
  const currentRole = useRoleStore((s) => s.currentRole);
  const activeEngineerId = useRoleStore((s) => s.activeEngineerId);
  const pushToast = useUIStore((s) => s.pushToast);

  const [rejectTarget, setRejectTarget] = useState<ProjectLine | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const visibleLines = useMemo(() => {
    if (currentRole === 'Engineer' && activeEngineerId) {
      return lines.filter((l) => l.assignedEngineerId === activeEngineerId);
    }
    return lines;
  }, [lines, currentRole, activeEngineerId]);

  const groups = useMemo(() => ({
    estimated: visibleLines.filter((l) => l.status === 'estimated'),
    sent:      visibleLines.filter((l) => l.status === 'sent'),
    rejected:  visibleLines.filter((l) => l.status === 'rejected'),
    approved:  visibleLines.filter((l) => l.status === 'approved'),
  }), [visibleLines]);

  function handleSendToHVT(line: ProjectLine) {
    setLineStatus(line.id, 'sent');
    pushToast(`${line.lineName} enviada al HVT — estado: Enviada (BR-16)`, 'info');
  }

  function handleSendAllToHVT() {
    groups.estimated.forEach((l) => setLineStatus(l.id, 'sent'));
    pushToast(`${groups.estimated.length} línea(s) enviadas al HVT`, 'success');
  }

  function submitReject() {
    if (!rejectTarget || !rejectComment.trim()) return;
    rejectLine(rejectTarget.id, rejectComment.trim());
    pushToast(`${rejectTarget.id} rechazada y devuelta al engineer`, 'info');
    setRejectTarget(null);
    setRejectComment('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Estimation Review</h1>
        <p className="text-sm text-slate-600">
          Revisión de estimaciones definitivas. Aprobá, enviá al CPO o rechazá con comentario.
        </p>
      </div>

      {groups.estimated.length > 0 && can('send:hvt') && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
          <span className="text-sm text-blue-700">
            {groups.estimated.length} estimación(es) elegibles para enviar al HVT.
          </span>
          <Button size="sm" variant="primary" onClick={handleSendAllToHVT}>
            <Send size={14} /> Enviar todas ({groups.estimated.length})
          </Button>
        </div>
      )}

      <Section
        title="Pendientes de revisión"
        description="Líneas con estimación definitiva esperando aprobación."
        lines={groups.estimated}
        emptyText="No hay estimaciones pendientes de revisión."
        renderActions={(l) => (
          <div className="flex gap-2">
            {can('send:hvt') && (
              <Button size="sm" variant="secondary" onClick={() => handleSendToHVT(l)}>
                <Send size={14} /> Enviar a HVT
              </Button>
            )}
            {can('reject:estimation') && (
              <Button size="sm" variant="danger" onClick={() => setRejectTarget(l)}>
                <XCircle size={14} /> Rechazar
              </Button>
            )}
          </div>
        )}
      />

      <Section
        title="Enviadas al HVT — Esperando CPO"
        description="Bloqueadas en GREAT hasta respuesta del CPO (BR-16). No se puede cancelar ni editar."
        lines={groups.sent}
        emptyText="Ninguna línea esperando al CPO."
      />

      {can('reject:estimation') && groups.sent.length > 0 && (
        <Section
          title="[CPO] Respuesta a líneas enviadas"
          description="En producción, esto llega vía callback de HVT. Visible solo para CPO en el prototipo."
          lines={groups.sent}
          renderActions={(l) => (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => { setLineStatus(l.id, 'approved'); pushToast(`${l.lineName} aprobada por CPO`, 'success'); }}
              >
                <CheckCircle2 size={14} /> Aprobar
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setRejectTarget(l)}
              >
                <XCircle size={14} /> Rechazar
              </Button>
            </div>
          )}
        />
      )}

      <Section
        title="Rechazadas (en rework)"
        description="Devueltas al engineer con comentario."
        lines={groups.rejected}
        emptyText="Sin líneas rechazadas."
        renderActions={(l) => (
          <div className="flex items-start gap-2 text-xs text-red-700 max-w-md">
            <MessageSquare size={14} className="mt-0.5 shrink-0" />
            <span>{l.rejectionComment}</span>
          </div>
        )}
      />

      <Section
        title="Aprobadas"
        description="Listas para allocation."
        lines={groups.approved}
        emptyText="Aún no hay aprobaciones."
      />

      <Modal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title={`Rechazar ${rejectTarget?.id ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={submitReject} disabled={!rejectComment.trim()}>
              Rechazar y devolver
            </Button>
          </>
        }
      >
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Motivo del rechazo *
        </label>
        <textarea
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          rows={4}
          placeholder="Explicá qué hay que ajustar para que el engineer pueda re-estimar…"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <p className="mt-2 text-xs text-slate-500">El engineer verá este comentario en el panel de estimación.</p>
      </Modal>
    </div>
  );
}

interface SectionProps {
  title: string;
  description: string;
  lines: ProjectLine[];
  emptyText: string;
  renderActions?: (l: ProjectLine) => React.ReactNode;
}

function Section({ title, description, lines, emptyText, renderActions }: SectionProps) {
  return (
    <section>
      <div className="mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title} <span className="ml-1 text-slate-400">({lines.length})</span>
        </h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {lines.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Línea</th>
                <th className="px-3 py-2 text-left font-medium">Engineer</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Días</th>
                <th className="px-3 py-2 text-right font-medium">k€</th>
                <th className="px-3 py-2 text-left font-medium">Actualizada</th>
                {renderActions && <th className="px-3 py-2 text-right font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const eng = ENGINEERS.find((e) => e.id === l.assignedEngineerId);
                return (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">{l.lineName}</div>
                      <div className="text-xs text-slate-500">{l.id} · {l.projectName} · {l.metier}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{eng?.name ?? '—'}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={l.status} /></td>
                    <td className="px-3 py-2.5 text-right">{formatDays(l.estimatedDays)}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{formatKEuro(l.estimatedKEuro)}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{formatDate(l.lastUpdatedAt)}</td>
                    {renderActions && <td className="px-3 py-2.5">{renderActions(l)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
