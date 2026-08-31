import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { FramingLine, FramingTrack } from '../types/framing';
import type { ProjectLine } from '../types';
import { RoleGate } from '../components/shared/RoleGate';
import { EmptyState } from '../components/shared/EmptyState';
import { FramingFileUpload } from '../components/framing/FramingFileUpload';
import { FramingUploadList } from '../components/framing/FramingUploadList';
import { FramingLineTable, type FramingTableSelection } from '../components/framing/FramingLineTable';
import { FramingDetailForm } from '../components/framing/FramingDetailForm';
import { FramingBulkBar } from '../components/framing/FramingBulkBar';
import { SaveControls } from '../components/framing/SaveControls';
import { useFramingStore, linesForTrack, effectiveLine } from '../store/framingStore';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { framingLineToProjectLine, isSendableToPreEstimation } from '../lib/framing/toProjectLine';
import { useT } from '../i18n/useT';

const TRACKS: FramingTrack[] = ['RFQ', 'RFI'];

export function FramingFilePage() {
  return (
    <RoleGate permission="view:framing-file">
      <FramingFileContent />
    </RoleGate>
  );
}

function FramingFileContent() {
  const lines = useFramingStore((s) => s.lines);
  const edits = useFramingStore((s) => s.edits);
  const t = useT();

  // §9 — the send writes project lines, so it needs the target store, the
  // acting role (recorded as lastUpdatedBy) and the active cycle.
  const canSend = useRoleStore((s) => s.can('generate:project-lines'));
  const currentRole = useRoleStore((s) => s.currentRole);
  const projectLines = useDataStore((s) => s.lines);
  const addProjectLines = useDataStore((s) => s.addProjectLines);
  const activeCycleId = useDataStore((s) => s.cycles.find((c) => c.is_active)?.id);
  const pushToast = useUIStore((s) => s.pushToast);

  const [track, setTrack] = useState<FramingTrack>('RFQ');
  const [selected, setSelected] = useState<string | null>(null);
  /** PL numbers ticked for the send. Not the same thing as `selected`, which
   *  is the one row whose detail form is open. */
  const [checked, setChecked] = useState<string[]>([]);

  const visible = useMemo(() => linesForTrack({ lines }, track), [lines, track]);
  const selectedLine = selected ? effectiveLine({ lines, edits }, selected) : undefined;

  // A repeat send must not duplicate: project_id (pl_number + metier) is the
  // identity, so a line already there is shown as unavailable rather than
  // silently skipped at send time.
  const sentProjectIds = useMemo(
    () => new Set(projectLines.map((l) => l.project_id)),
    [projectLines],
  );
  const cannotSend = useCallback(
    (line: FramingLine) =>
      !isSendableToPreEstimation(line)
      || sentProjectIds.has(`${line.plNumber.trim()}-${line.ownerN2.trim().toUpperCase()}`),
    [sentProjectIds],
  );

  // A PL number belongs to exactly one track, so switching tabs drops both
  // the open row and the ticked set.
  function switchTrack(next: FramingTrack) {
    setTrack(next);
    setSelected(null);
    setChecked([]);
  }

  function sendToPreEstimation() {
    const rows = checked
      .map((pl) => lines.find((l) => l.plNumber === pl))
      .filter((line): line is FramingLine => line !== undefined)
      .map((line) => framingLineToProjectLine(line, {
        cycleId: activeCycleId ?? '',
        actor: currentRole,
      }))
      .filter((line): line is ProjectLine => line !== null);

    const { created, skipped } = addProjectLines(rows);
    // Unmappable rows never became project lines at all, so they are skipped
    // too — the message counts what happened, not what was asked for.
    const totalSkipped = skipped + (checked.length - rows.length);
    let message = t('framing.bulk.sent', { created });
    if (totalSkipped > 0) message += ` ${t('framing.bulk.skipped', { skipped: totalSkipped })}`;
    pushToast(message, created > 0 ? 'success' : 'info');
    setChecked([]);
  }

  const selection: FramingTableSelection | undefined = canSend && track === 'RFQ'
    ? {
      checked,
      isDisabled: cannotSend,
      onToggle: (plNumber) => setChecked((c) => (
        c.includes(plNumber) ? c.filter((p) => p !== plNumber) : [...c, plNumber]
      )),
      onToggleAll: (plNumbers, next) => setChecked((c) => (
        next
          ? [...new Set([...c, ...plNumbers])]
          : c.filter((p) => !plNumbers.includes(p))
      )),
    }
    : undefined;

  // Task 6 — a deleted upload can take the selected row with it (only the
  // rows it exclusively supplied; see framingStore's deleteUpload). Drop a
  // selection that no longer points at a live row. Adjusted during render
  // (React's documented pattern for reacting to a changed prop/store value)
  // rather than in an effect, so it never causes an extra render pass.
  const [prevLines, setPrevLines] = useState(lines);
  if (lines !== prevLines) {
    setPrevLines(lines);
    if (selected && !lines.some((l) => l.plNumber === selected)) setSelected(null);
    // Same reason for the ticked set: a deleted upload can take its rows away.
    const live = new Set(lines.map((l) => l.plNumber));
    if (checked.some((pl) => !live.has(pl))) setChecked((c) => c.filter((pl) => live.has(pl)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('framing.title')}</h1>
          <p className="text-sm text-slate-600">{t('framing.desc')}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Exactly where the selection column is: RFQ, and a role that may
              send. The bar itself stays put once mounted, disabling its actions
              on an empty selection rather than vanishing. */}
          {selection && (
            <FramingBulkBar
              count={checked.length}
              onSend={sendToPreEstimation}
              onClear={() => setChecked([])}
            />
          )}
          <SaveControls plNumber={selected} />
        </div>
      </div>

      <FramingFileUpload />
      <FramingUploadList />

      <div role="tablist" aria-label={t('framing.title')} className="flex gap-1 border-b border-slate-200">
        {TRACKS.map((candidate) => (
          <button
            key={candidate}
            role="tab"
            type="button"
            aria-selected={track === candidate}
            onClick={() => switchTrack(candidate)}
            className={clsx(
              'px-4 py-2 text-sm font-medium',
              track === candidate
                ? 'border-b-2 border-sky-600 text-sky-700'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t(`framing.tab.${candidate.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title={t('framing.empty.title')} description={t('framing.empty.desc')} />
      ) : (
        <FramingLineTable
          lines={visible}
          selectedPlNumber={selected}
          onSelect={setSelected}
          selection={selection}
        />
      )}

      {selected && selectedLine && (
        <p className="text-sm font-semibold text-slate-800">
          {t('framing.editingHeading', {
            plNumber: selectedLine.plNumber,
            projectName: selectedLine.projectName,
          })}
        </p>
      )}
      {selected && <FramingDetailForm plNumber={selected} />}
    </div>
  );
}
