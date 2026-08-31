import clsx from 'clsx';
import { Layers, Send, X } from 'lucide-react';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';

interface Props {
  count: number;
  onSend(): void;
  onClear(): void;
}

/**
 * The header's bulk selection control, which replaced §8.1's global Save
 * (reviewer request, 2026-08-31).
 *
 * It stays rendered with an empty selection and disables its actions instead,
 * because that is how the control it replaced behaved: global Save was always
 * there, disabled until something was dirty. An earlier version copied
 * BulkActionsBar and returned null at zero — which left the header, in the state
 * the page opens in, having lost a control and gained nothing.
 *
 * It does not copy BulkActionsBar's `CompatibilityResult` either. That encodes
 * whether lines can share one estimation; sending is per line, so there is
 * nothing for lines to be compatible about. Only the highlight is conditional —
 * a live selection is worth calling out, an empty one is not.
 */
export function FramingBulkBar({ count, onSend, onClear }: Props) {
  const t = useT();
  const empty = count === 0;

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-2 rounded-lg px-3 py-2',
        empty ? 'border border-transparent' : 'border border-brand-200 bg-brand-50',
      )}
    >
      <span
        className={clsx(
          'flex items-center gap-1.5 text-sm',
          empty ? 'text-slate-500' : 'font-semibold text-brand-900',
        )}
      >
        <Layers size={15} className={empty ? 'text-slate-400' : 'text-brand-700'} />
        {t('bulk.selected', { n: count })}
      </span>
      <Button size="sm" disabled={empty} onClick={onSend}>
        <Send size={14} /> {t('framing.bulk.send')}
      </Button>
      <Button size="sm" variant="ghost" disabled={empty} onClick={onClear}>
        <X size={14} /> {t('bulk.clear')}
      </Button>
    </div>
  );
}
