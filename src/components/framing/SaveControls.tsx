import { Save } from 'lucide-react';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { useRoleStore } from '../../store/roleStore';
import { useFramingStore, dirtyPlNumbers } from '../../store/framingStore';

interface Props {
  plNumber: string | null;
}

/**
 * §8.1 — per-line Save. Available to Admin, PMO and CPO; never gated on any
 * readiness state (Save is lenient, §8), and never shows an
 * estimation-consequence dialog (HIW-463 AC#18).
 *
 * §8.1's global Save was removed from the header on reviewer request
 * (2026-08-31); the bulk selection control took its place. The store keeps
 * `saveAll`, covered by framingStore's own test, so the capability is intact —
 * only the affordance is gone. The dirty count stays: AC#16 asks for it
 * independently of how many controls sit next to it.
 */
export function SaveControls({ plNumber }: Props) {
  const canSave = useRoleStore((s) => s.can('save:framing-file'));
  const dirtyFields = useFramingStore((s) => s.dirtyFields);
  const saveLine = useFramingStore((s) => s.saveLine);
  const t = useT();

  if (!canSave) return null;

  const dirty = dirtyPlNumbers({ dirtyFields });
  const lineIsDirty = plNumber !== null && dirty.includes(plNumber);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={!lineIsDirty} onClick={() => plNumber && saveLine(plNumber)}>
        <Save size={14} /> {t('framing.save.line')}
      </Button>
      <span data-testid="framing-dirty-count" className="text-xs text-slate-500">
        {dirty.length}
      </span>
    </div>
  );
}
