import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { FramingTrack } from '../types/framing';
import { RoleGate } from '../components/shared/RoleGate';
import { EmptyState } from '../components/shared/EmptyState';
import { FramingFileUpload } from '../components/framing/FramingFileUpload';
import { FramingLineTable } from '../components/framing/FramingLineTable';
import { FramingDetailForm } from '../components/framing/FramingDetailForm';
import { SaveControls } from '../components/framing/SaveControls';
import { useFramingStore, linesForTrack } from '../store/framingStore';
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
  const t = useT();

  const [track, setTrack] = useState<FramingTrack>('RFQ');
  const [selected, setSelected] = useState<string | null>(null);

  const visible = useMemo(() => linesForTrack({ lines }, track), [lines, track]);

  // A PL number belongs to exactly one track, so switching tabs drops the selection.
  function switchTrack(next: FramingTrack) {
    setTrack(next);
    setSelected(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('framing.title')}</h1>
          <p className="text-sm text-slate-600">{t('framing.desc')}</p>
        </div>
        <SaveControls plNumber={selected} />
      </div>

      <FramingFileUpload />

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
        <FramingLineTable lines={visible} selectedPlNumber={selected} onSelect={setSelected} />
      )}

      {selected && <FramingDetailForm plNumber={selected} />}
    </div>
  );
}
