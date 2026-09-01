import { Save, SaveAll } from 'lucide-react';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { useRoleStore } from '../../store/roleStore';
import { useUIStore } from '../../store/uiStore';
import { useFramingStore, dirtyPlNumbers } from '../../store/framingStore';

interface Props {
  plNumber: string | null;
}

/**
 * §8.1 — Save. Available to Admin, PMO and CPO; never gated on any readiness
 * state (Save is lenient, §8), and never shows an estimation-consequence
 * dialog (HIW-463 AC#18).
 *
 * Two controls, and the split is deliberate:
 *
 * - **Save line** submits the row the detail form has open. That is the whole
 *   story while one line is dirty, which is the ordinary case.
 * - **Save all** is AC#12's save, and appears only from the second dirty line
 *   onwards. §8.1's *always-on* global Save was removed from the header on
 *   reviewer request (2026-08-31) and stays removed — the bulk selection
 *   control owns that slot. What that removal did not intend is the state it
 *   left behind: only the open row is reachable from the form, so every other
 *   dirty line had no control at all and the count next to Save line could
 *   read "2" with no way to act on the second.
 *
 * Contextual keeps both properties — the header carries no permanently
 * disabled button, and no edit is ever stranded. The dirty count stays either
 * way: AC#16 asks for it independently of how many controls sit next to it.
 */
export function SaveControls({ plNumber }: Props) {
  const canSave = useRoleStore((s) => s.can('save:framing-file'));
  const dirtyFields = useFramingStore((s) => s.dirtyFields);
  const saveLine = useFramingStore((s) => s.saveLine);
  const saveAll = useFramingStore((s) => s.saveAll);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  if (!canSave) return null;

  const dirty = dirtyPlNumbers({ dirtyFields });
  const lineIsDirty = plNumber !== null && dirty.includes(plNumber);

  function saveEverything() {
    // Counted before the call, because saveAll empties the dirty map.
    const count = dirty.length;
    saveAll();
    pushToast(t('framing.save.done', { count }), 'success');
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={!lineIsDirty} onClick={() => plNumber && saveLine(plNumber)}>
        <Save size={14} /> {t('framing.save.line')}
      </Button>
      {/* AC#12 — saveAll walks the dirty lines one at a time, so each payload
          still carries only its own changed fields, never a union. */}
      {dirty.length > 1 && (
        <Button size="sm" variant="secondary" onClick={saveEverything}>
          <SaveAll size={14} /> {t('framing.save.all', { count: dirty.length })}
        </Button>
      )}
      <span data-testid="framing-dirty-count" className="text-xs text-slate-500">
        {dirty.length}
      </span>
    </div>
  );
}
