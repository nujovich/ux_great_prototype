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
 * Follows the shape BulkActionsBar established for Pre-Estimation and
 * Allocation — count, action, clear — but not its `CompatibilityResult`, which
 * encodes whether lines can share one estimation. That question does not exist
 * here: sending is per line, so there is nothing for lines to be compatible
 * about. Renders nothing with an empty selection rather than a dead button.
 */
export function FramingBulkBar({ count, onSend, onClear }: Props) {
  const t = useT();
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
      <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
        <Layers size={15} className="text-brand-700" />
        {t('bulk.selected', { n: count })}
      </span>
      <Button size="sm" onClick={onSend}>
        <Send size={14} /> {t('framing.bulk.send')}
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        <X size={14} /> {t('bulk.clear')}
      </Button>
    </div>
  );
}
