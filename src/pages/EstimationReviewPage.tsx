import { useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { RoleGate } from '../components/shared/RoleGate';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';
import { formatDays, formatKEuro, formatDate } from '../lib/format';
import { useT } from '../i18n/useT';
import { useSortable } from '../lib/useSortable';
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
  const currentRole = useRoleStore((s) => s.currentRole);
  const activeEngineerId = useRoleStore((s) => s.activeEngineerId);
  const t = useT();


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
    rejected:  visibleLines.filter((l) => l.status === 'Modification Requested'),
    approved:  visibleLines.filter((l) => l.status === 'Approved'),
  }), [visibleLines]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('estReview.title')}</h1>
        <p className="text-sm text-slate-600">{t('estReview.subtitle')}</p>
      </div>

      {/* HIW-175: Send to HVT button removed — sending is now automatic via HVT integration */}

      <Section
        title={t('estReview.pending')}
        description={t('estReview.pendingDesc')}
        lines={groups.estimated}
        emptyText={t('estReview.noPending')}
      />

      <Section
        title={t('estReview.sent')}
        description={t('estReview.sentDesc')}
        lines={groups.sent}
        emptyText={t('estReview.noSent')}
      />

      {/* HIW-175: CPO rejection section removed — CPO is read-only, rejection comes from HVT callback only */}

      {/* ERev-BR-07: rejection comments are not shown in the Estimation Review grid */}
      <Section
        title={t('estReview.rejected')}
        description={t('estReview.rejectedDesc')}
        lines={groups.rejected}
        emptyText={t('estReview.noRejected')}
      />

      <Section
        title={t('estReview.approved')}
        description={t('estReview.approvedDesc')}
        lines={groups.approved}
        emptyText={t('estReview.noApproved')}
      />

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
  const { sorted, requestSort, getSortIcon } = useSortable(lines);
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
                <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('lineName')}>
                  {t('estReview.colLine')} {getSortIcon('lineName')}
                </th>
                <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('assignedEngineerId')}>
                  {t('estReview.colEngineer')} {getSortIcon('assignedEngineerId')}
                </th>
                <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('status')}>
                  {t('estReview.colStatus')} {getSortIcon('status')}
                </th>
                <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('estimatedDays')}>
                  {t('estReview.colDays')} {getSortIcon('estimatedDays')}
                </th>
                <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('estimatedKEuro')}>
                  {t('estReview.colKeuro')} {getSortIcon('estimatedKEuro')}
                </th>
                <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('lastUpdatedAt')}>
                  {t('estReview.colUpdated')} {getSortIcon('lastUpdatedAt')}
                </th>
                {renderActions && <th className="px-3 py-2 text-right font-medium">{t('estReview.colActions')}</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((l) => {
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
