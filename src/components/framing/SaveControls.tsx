import { Save } from 'lucide-react';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { useRoleStore } from '../../store/roleStore';
import { useFramingStore, dirtyPlNumbers } from '../../store/framingStore';

interface Props {
  plNumber: string | null;
}

/**
 * §8.1 — individual and global Save. Available to Admin, PMO and CPO; never
 * gated on any readiness state (Save is lenient, §8), and never shows an
 * estimation-consequence dialog (HIW-463 AC#18).
 */
export function SaveControls({ plNumber }: Props) {
  const canSave = useRoleStore((s) => s.can('save:framing-file'));
  const dirtyFields = useFramingStore((s) => s.dirtyFields);
  const saveLine = useFramingStore((s) => s.saveLine);
  const saveAll = useFramingStore((s) => s.saveAll);
  const t = useT();

  if (!canSave) return null;

  const dirty = dirtyPlNumbers({ dirtyFields });
  const lineIsDirty = plNumber !== null && dirty.includes(plNumber);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={!lineIsDirty} onClick={() => plNumber && saveLine(plNumber)}>
        <Save size={14} /> {t('framing.save.line')}
      </Button>
      <Button size="sm" variant="secondary" disabled={dirty.length === 0} onClick={saveAll}>
        <Save size={14} /> {t('framing.save.all')}
      </Button>
      <span data-testid="framing-dirty-count" className="text-xs text-slate-500">
        {dirty.length}
      </span>
    </div>
  );
}
