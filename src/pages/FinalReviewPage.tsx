import { useMemo, useState } from 'react';
import { Download, Send } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { formatDays, formatKEuro } from '../lib/format';
import { exportFinalReviewCsv } from '../lib/finalReviewCsv';
import { buildPlTree, filterPlTree } from '../lib/finalReviewAggregation';
import { exportPlToXlsx } from '../lib/finalReviewXlsx';
import { PLAccordion } from '../components/finalReview/PLAccordion';
import { useT } from '../i18n/useT';

export function FinalReviewPage() {
  return (
    <RoleGate permission="view:final-review">
      <FinalReviewContent />
    </RoleGate>
  );
}

function FinalReviewContent() {
  const lines = useDataStore((s) => s.lines);
  const cycles = useDataStore((s) => s.cycles);
  const allocations = useDataStore((s) => s.allocations);
  const can = useRoleStore((s) => s.can);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  const [search, setSearch] = useState('');

  const activeCycleId = useMemo(() => cycles.find((c) => c.is_active)?.id ?? 'export', [cycles]);
  const approvedLines = useMemo(
    () => lines.filter((l) => l.status === 'Approved' && l.cycleId === activeCycleId),
    [lines, activeCycleId],
  );

  // Mirror the join in finalReviewCsv.ts: allocByLine.get(line.id) → splits
  const rows = useMemo(() => {
    const allocByLine = new Map(allocations.map((a) => [a.lineId, a]));
    return approvedLines.flatMap((line) => {
      const alloc = allocByLine.get(line.id);
      return alloc?.splits ?? [];
    });
  }, [approvedLines, allocations]);

  const years = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r.fteByYear).forEach((y) => set.add(y)));
    return [...set].sort();
  }, [rows]);

  const tree = useMemo(() => buildPlTree(rows, years), [rows, years]);
  const visible = useMemo(() => filterPlTree(tree, search), [tree, search]);

  // Stat card totals derived from approvedLines (consistent with existing behaviour)
  const totals = useMemo(
    () =>
      approvedLines.reduce(
        (acc, l) => ({
          count: acc.count + 1,
          days: acc.days + (l.estimatedDays ?? 0),
          kEuro: acc.kEuro + (l.estimatedKEuro ?? 0),
        }),
        { count: 0, days: 0, kEuro: 0 },
      ),
    [approvedLines],
  );

  function handleSendStage3() {
    // FR-BR-06: non-blocking — sends even if allocation is incomplete
    // FR-BR-07: re-sendable — each send transmits current state
    // FR-BR-08: sends entire active cycle (approvedLines)
    pushToast(
      `Stage 3 enviado al HVT — ${approvedLines.length} línea(s) aprobadas del ciclo ${activeCycleId}`,
      'success',
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('finalReview.title')}</h1>
          <p className="text-sm text-slate-600">{t('finalReview.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {can('export:final-review') && (
            <Button
              variant="secondary"
              onClick={() => exportFinalReviewCsv(approvedLines, allocations, `final-review-${activeCycleId}.csv`)}
            >
              <Download size={14} /> {t('finalReview.exportCsv')}
            </Button>
          )}
          {can('send:stage3') && (
            <Button variant="primary" onClick={handleSendStage3}>
              <Send size={14} /> {t('finalReview.sendStage3')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Stat label={t('finalReview.estimated')} value={String(totals.count)} />
        <Stat label={t('finalReview.totalDays')} value={formatDays(totals.days)} />
        <Stat label="Total k€" value={formatKEuro(totals.kEuro)} />
      </div>

      <div className="space-y-2">
        <input
          type="search"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder={t('finalReview.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {visible.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            {t('finalReview.noRows')}
          </p>
        ) : (
          visible.map((pl) => (
            <PLAccordion
              key={pl.plNumber}
              pl={pl}
              years={years}
              canViewKeuro={can('view:k-euro-rates')}
              canExport={can('export:final-review')}
              onExport={(pl) => exportPlToXlsx(pl, years)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
