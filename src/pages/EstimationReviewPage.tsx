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
  const pushToast = useUIStore((s) => s.pushToast);

  const [rejectTarget, setRejectTarget] = useState<ProjectLine | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const groups = useMemo(() => {
    return {
      estimated: lines.filter((l) => l.status === 'estimated'),
      rejected: lines.filter((l) => l.status === 'rejected'),
      approved: lines.filter((l) => l.status === 'approved'),
    };
  }, [lines]);

  function handleApprove(line: ProjectLine) {
    setLineStatus(line.id, 'approved');
    pushToast(`${line.id} aprobada`, 'success');
  }

  function handleSendToCPO(line: ProjectLine) {
    pushToast(`${line.id} enviada al CPO para aprobación final`, 'info');
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

      <Section
        title="Pendientes de revisión"
        description="Líneas con estimación definitiva esperando aprobación."
        lines={groups.estimated}
        emptyText="No hay estimaciones pendientes de revisión."
        renderActions={(l) => (
          <div className="flex gap-2">
            {can('approve:estimation') && (
              <Button size="sm" variant="primary" onClick={() => handleApprove(l)}>
                <CheckCircle2 size={14} /> Aprobar
              </Button>
            )}
            {can('send:hvt') && (
              <Button size="sm" variant="secondary" onClick={() => handleSendToCPO(l)}>
                <Send size={14} /> Enviar a CPO
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
