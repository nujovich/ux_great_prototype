import type { LineStatus } from '../../types';
import { useT } from '../../i18n/useT';

const STATUS_COLORS: Record<LineStatus, string> = {
  'To do':    '#94a3b8',
  'Draft':    '#f59e0b',
  'Estimated': '#3b82f6',
  'Sent':     '#a855f7',
  'Rejected': '#ef4444',
  'Approved': '#22c55e',
};

interface Props {
  data: Partial<Record<LineStatus, number>>;
  title?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(cx: number, cy: number, r: number, start: number, end: number) {
  if (end - start >= 360) end = start + 359.99;
  const s = polarToCartesian(cx, cy, r, end);
  const e = polarToCartesian(cx, cy, r, start);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${e.x} ${e.y} A ${r} ${r} 0 ${large} 0 ${s.x} ${s.y} Z`;
}

export function StatusPieChart({ data, title }: Props) {
  const t = useT();
  const entries = (Object.entries(data) as [LineStatus, number][]).filter(([, v]) => v > 0);
  const total = entries.reduce((acc, [, v]) => acc + v, 0);

  if (total === 0) {
    return <p className="text-sm text-slate-400">{t('mgmt.noData')}</p>;
  }

  let angle = 0;
  const slices = entries.map(([status, count]) => {
    const frac = count / total;
    const start = angle;
    angle += frac * 360;
    return { status, count, frac, start, end: angle };
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {title && <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>}
      <div className="flex flex-wrap items-center gap-8">
        <svg width={160} height={160} viewBox="0 0 160 160">
          {slices.map(({ status, start, end }) => (
            <path
              key={status}
              d={describeSlice(80, 80, 72, start, end)}
              fill={STATUS_COLORS[status]}
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </svg>
        <ul className="space-y-1.5">
          {slices.map(({ status, count, frac }) => (
            <li key={status} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ background: STATUS_COLORS[status] }}
              />
              <span className="text-slate-700">{t(`status.${status}`)}</span>
              <span className="font-mono text-slate-500">
                {count} ({Math.round(frac * 100)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
