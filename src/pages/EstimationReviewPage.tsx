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
import { useT } from '../i18n/useT';
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
  const activeCycleId = useDataStore((s) => s.cycles.find((c) => c.is_active)?.id);
  const setLineStatus = useDataStore((s) => s.setLineStatus);
  const rejectLine = useDataStore((s) => s.rejectLine);
  const can = useRoleStore((s) => s.can);
  const currentRole = useRoleStore((s) => s.currentRole);
  const activeEngineerId = useRoleStore((s) => s.activeEngineerId);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  const [rejectTarget, setRejectTarget] = useState<ProjectLine | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  // ERev-BR-09: only show lines from the active cycle
  const visibleLines = useMemo(() => {
    let result = activeCycleId ? lines.filter((l) => l.cycleId === activeCycleId) : lines;
    if (currentRole === 'Engineer' && activeEngineerId) {
      result = result.filter((l) => l.assignedEngineerId === activeEngineerId);
    }
    return result;
  }, [lines, activeCycleId, currentRole, activeEngineerId]);

  const groups = useMemo(() => ({
    estimated: visibleLines.filter((l) => l.status === 'Estimated'),
    sent:      visibleLines.filter((l) => l.status === 'Sent'),
    rejected:  visibleLines.filter((l) => l.status === 'Rejected'),
    approved:  visibleLines.filter((l) => l.status === 'Approved'),
  }), [visibleLines]);

  function handleSendToHVT(line: ProjectLine) {
    setLineStatus(line.id, 'Sent');
    pushToast(`${line.lineName} enviada al HVT — estado: Enviada (BR-16)`, 'info');
  }

  function handleSendAllToHVT() {
    groups.estimated.forEach((l) => setLineStatus(l.id, 'Sent'));
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
        <h1 className="text-xl font-bold text-slate-900">{t('estReview.title')}</h1>
        <p className="text-sm text-slate-600">{t('estReview.subtitle')}</p>
      </div>

      {groups.estimated.length > 0 && can('send:hvt') && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
          <span className="text-sm text-blue-700">
            {t('estReview.bulkBar', { n: groups.estimated.length })}
          </span>
          <Button size="sm" variant="primary" onClick={handleSendAllToHVT}>
            <Send size={14} /> {t('estReview.sendAll', { n: groups.estimated.length })}
          </Button>
        </div>
      )}

      <Section
        title={t('estReview.pending')}
        description={t('estReview.pendingDesc')}
        lines={groups.estimated}
        emptyText={t('estReview.noPending')}
        renderActions={(l) => (
          <div className="flex gap-2">
            {can('send:hvt') && (
              <Button size="sm" variant="secondary" onClick={() => handleSendToHVT(l)}>
                <Send size={14} /> {t('estReview.sendToHvt')}
              </Button>
            )}
            {can('reject:estimation') && (
              <Button size="sm" variant="danger" onClick={() => setRejectTarget(l)}>
                <XCircle size={14} /> {t('estReview.reject')}
              </Button>
            )}
          </div>
        )}
      />

      <Section
        title={t('estReview.sent')}
        description={t('estReview.sentDesc')}
        lines={groups.sent}
        emptyText={t('estReview.noSent')}
      />

      {can('reject:estimation') && groups.sent.length > 0 && (
        <Section
          title={t('estReview.cpoPanel')}
          description={t('estReview.cpoPanelDesc')}
          emptyText={t('estReview.noSent')}
          lines={groups.sent}
          renderActions={(l) => (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => { setLineStatus(l.id, 'Approved'); pushToast(`${l.lineName} aprobada por CPO`, 'success'); }}
              >
                <CheckCircle2 size={14} /> {t('estReview.approve')}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setRejectTarget(l)}
              >
                <XCircle size={14} /> {t('estReview.reject')}
              </Button>
            </div>
          )}
        />
      )}

      <Section
        title={t('estReview.rejected')}
        description={t('estReview.rejectedDesc')}
        lines={groups.rejected}
        emptyText={t('estReview.noRejected')}
        renderActions={(l) => (
          <div className="flex items-start gap-2 text-xs text-red-700 max-w-md">
            <MessageSquare size={14} className="mt-0.5 shrink-0" />
            <span>{l.rejectionComment}</span>
          </div>
        )}
      />

      <Section
        title={t('estReview.approved')}
        description={t('estReview.approvedDesc')}
        lines={groups.approved}
        emptyText={t('estReview.noApproved')}
      />

      <Modal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title={t('estReview.rejectModalTitle', { id: rejectTarget?.id ?? '' })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>{t('estReview.cancel')}</Button>
            <Button variant="danger" onClick={submitReject} disabled={!rejectComment.trim()}>
              {t('estReview.rejectConfirm')}
            </Button>
          </>
        }
      >
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t('estReview.rejectReason')}
        </label>
        <textarea
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          rows={4}
          placeholder={t('estReview.rejectPlaceholder')}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <p className="mt-2 text-xs text-slate-500">{t('estReview.rejectNote')}</p>
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
  const t = useT();
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
                <th className="px-3 py-2 text-left font-medium">{t('estReview.colLine')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('estReview.colEngineer')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('estReview.colStatus')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('estReview.colDays')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('estReview.colKeuro')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('estReview.colUpdated')}</th>
                {renderActions && <th className="px-3 py-2 text-right font-medium">{t('estReview.colActions')}</th>}
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
