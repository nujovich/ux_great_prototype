import { AlertTriangle, Link2 } from 'lucide-react';
import type { ProjectLine } from '../../types';
import { getRelatedLineIds, checkHvtAttributeChanged } from '../../lib/relationships';
import { LINE_RELATIONSHIPS, ORIGINAL_HVT_SNAPSHOTS } from '../../fixtures/relationships';
import { useT } from '../../i18n/useT';

interface Props {
  line: ProjectLine;
  allLines: ProjectLine[];
}

/** Shows lines related to the current one (§5b) and warns when a related line's
 *  HVT attributes have drifted from the estimator's last-acknowledged snapshot. */
export function RelatedLinesBanner({ line, allLines }: Props) {
  const t = useT();
  const relatedIds = getRelatedLineIds(line.id, LINE_RELATIONSHIPS);
  if (relatedIds.length === 0) return null;

  const related = allLines.filter((l) => relatedIds.includes(l.id));
  const changes = related
    .map((l) => {
      const snap = ORIGINAL_HVT_SNAPSHOTS[l.id];
      return snap ? checkHvtAttributeChanged(l, snap) : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-slate-700">
        <Link2 size={14} /> {t('related.title', { n: related.length })}
      </div>
      <ul className="ml-5 list-disc text-slate-600">
        {related.map((l) => (
          <li key={l.id}><span className="font-mono text-[10px] text-slate-400">{l.id}</span> {l.lineName}</li>
        ))}
      </ul>
      {changes.map((c) => (
        <div key={c.lineId} className="mt-2 flex items-start gap-1.5 rounded bg-amber-100 px-2 py-1.5 text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{t('related.hvtChanged', { id: c.lineId, fields: Object.keys(c.fields).join(', ') })}</span>
        </div>
      ))}
    </div>
  );
}
