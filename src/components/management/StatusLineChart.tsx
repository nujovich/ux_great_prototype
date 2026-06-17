import { useT } from '../../i18n/useT';
import { statusI18nKey } from '../../lib/stateMachine';
import { STATUS_COLORS } from './statusColors';
import { TIMELINE_STATUSES, type TimelinePoint } from '../../lib/timeline';

interface Props {
  data: TimelinePoint[];
  title?: string;
}

const W = 640;
const H = 260;
const M = { top: 12, right: 12, bottom: 28, left: 36 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

function xAt(i: number, n: number): number {
  if (n <= 1) return M.left + PLOT_W / 2;
  return M.left + (PLOT_W * i) / (n - 1);
}

export function StatusLineChart({ data, title }: Props) {
  const t = useT();

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {title && <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>}
        <p className="text-sm text-slate-400">{t('mgmt.noData')}</p>
      </div>
    );
  }

  const maxY = Math.max(
    1,
    ...data.flatMap((p) => TIMELINE_STATUSES.map((s) => p.status_counts[s] ?? 0)),
  );
  const yAt = (v: number) => M.top + PLOT_H * (1 - v / maxY);
  const latest = data[data.length - 1].status_counts;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {title && <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>}
      <div className="flex flex-wrap items-center gap-8">
        <svg data-testid="status-timeline" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title ?? t('mgmt.timelineTitle')}>
          <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + PLOT_H} stroke="#e2e8f0" />
          <line x1={M.left} y1={M.top + PLOT_H} x2={M.left + PLOT_W} y2={M.top + PLOT_H} stroke="#e2e8f0" />
          <text x={M.left - 6} y={yAt(0)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#94a3b8">0</text>
          <text x={M.left - 6} y={yAt(maxY)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#94a3b8">{maxY}</text>
          <text x={xAt(0, data.length)} y={H - 8} textAnchor="start" fontSize="10" fill="#94a3b8">{data[0].date}</text>
          <text x={xAt(data.length - 1, data.length)} y={H - 8} textAnchor="end" fontSize="10" fill="#94a3b8">{data[data.length - 1].date}</text>
          {TIMELINE_STATUSES.map((status) => {
            const points = data
              .map((p, i) => `${xAt(i, data.length)},${yAt(p.status_counts[status] ?? 0)}`)
              .join(' ');
            return (
              <polyline
                key={status}
                data-status={status}
                points={points}
                fill="none"
                stroke={STATUS_COLORS[status]}
                strokeWidth={2}
              >
                <title>{t(statusI18nKey(status))}</title>
              </polyline>
            );
          })}
        </svg>
        <ul className="space-y-1.5">
          {TIMELINE_STATUSES.map((status) => (
            <li key={status} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ background: STATUS_COLORS[status] }}
              />
              <span className="text-slate-700">{t(statusI18nKey(status))}</span>
              <span data-testid={`timeline-count-${status}`} className="font-mono text-slate-500">
                {latest[status] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
