import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import type { ProjectLine } from '../../types';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';
import { useT } from '../../i18n/useT';
import { copyCandidates } from '../../lib/copyCandidates';
import { useRoleStore } from '../../store/roleStore';
import { LEGACY_ESTIMATIONS } from '../../fixtures/legacyEstimations';
import { mergeLegacyEstimation } from '../../lib/legacyCopy';
import { INDUCTORS } from '../../fixtures/inductors';

interface Props {
  sourceLine: ProjectLine;
  onClose: () => void;
}

export function CopyEstimationModal({ sourceLine, onClose }: Props) {
  const lines = useDataStore((s) => s.lines);
  const copyEstimation = useDataStore((s) => s.copyEstimation);
  const copyFromLegacy = useDataStore((s) => s.copyFromLegacy);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();
  const can = useRoleStore((s) => s.can);
  const activeEngineerId = useRoleStore((s) => s.activeEngineerId);
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState<'current' | 'legacy'>('current');
  const [legacyId, setLegacyId] = useState<string | null>(null);

  const candidates = useMemo(
    () => copyCandidates(lines, sourceLine, { ownOnly: can('view:own-lines-only'), activeEngineerId }),
    [lines, sourceLine, can, activeEngineerId],
  );

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function handleConfirm() {
    if (tab === 'current') {
      copyEstimation(sourceLine.id, selected);
      pushToast(t('copy.toastCopied', { n: selected.length }), 'success');
    } else {
      const leg = LEGACY_ESTIMATIONS.find((l) => l.id === legacyId);
      if (!leg) return;
      const { inductorSelections, customJUs } = mergeLegacyEstimation(leg.jus, INDUCTORS);
      copyFromLegacy(sourceLine.id, inductorSelections, customJUs);
      pushToast(t('copy.toastLegacyCopied', { label: leg.label }), 'success');
    }
    onClose();
  }

  const confirmDisabled = tab === 'current' ? selected.length === 0 : !legacyId;

  return (
    <Modal
      open
      onClose={onClose}
      title={t('copy.title', { id: sourceLine.id })}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('copy.cancel')}</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={confirmDisabled}>
            {tab === 'current'
              ? t('copy.confirm', { n: selected.length })
              : t('copy.tabLegacy')}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        {t('copy.subtitle', { id: sourceLine.id })}
      </p>

      {/* Tab strip */}
      <div className="mb-3 flex gap-1 border-b border-slate-200">
        <button
          className={clsx(
            'px-3 py-1.5 text-sm',
            tab === 'current'
              ? 'border-b-2 border-brand-600 font-medium text-brand-700'
              : 'text-slate-500',
          )}
          onClick={() => setTab('current')}
        >
          {t('copy.tabCurrent')}
        </button>
        <button
          className={clsx(
            'px-3 py-1.5 text-sm',
            tab === 'legacy'
              ? 'border-b-2 border-brand-600 font-medium text-brand-700'
              : 'text-slate-500',
          )}
          onClick={() => setTab('legacy')}
        >
          {t('copy.tabLegacy')}
        </button>
      </div>

      {/* Current cycle tab — existing candidates table */}
      {tab === 'current' && (
        candidates.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {t('copy.noCompatible')}
          </div>
        ) : (
          <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="w-8 px-3 py-2" />
                  <th className="px-3 py-2 text-left font-medium">{t('copy.colId')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('copy.colProjectLine')}</th>
                  <th className="px-3 py-2 text-left font-medium">{t('copy.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(l.id)}
                        onChange={() => toggle(l.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{l.id}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{l.lineName}</div>
                      <div className="text-xs text-slate-500">{l.projectName}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Legacy cycle tab — radio list of historical estimations */}
      {tab === 'legacy' && (
        <div className="space-y-2">
          {LEGACY_ESTIMATIONS.map((l) => (
            <label
              key={l.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 px-3 py-2.5 hover:bg-slate-50"
            >
              <input
                type="radio"
                name="legacy-est"
                checked={legacyId === l.id}
                onChange={() => setLegacyId(l.id)}
                className="mt-0.5 h-4 w-4 border-slate-300 text-brand-600"
              />
              <div>
                <div className="font-medium text-slate-800">{l.label}</div>
                <div className="text-xs text-slate-500">{l.cycleName}</div>
              </div>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
