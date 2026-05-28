import { useEffect, useMemo, useState } from 'react';
import { Lock, Copy, X, ChevronDown, ChevronRight, Trash2, Search } from 'lucide-react';
import type { InductorSelection, JUOccurrence, CustomJU, ProjectLine } from '../../types';
import { INDUCTORS } from '../../fixtures/inductors';
import { CRANS } from '../../fixtures/crans';
import { JOB_UNITS } from '../../fixtures/jobUnits';
import { calcTotalDays, calcKEuro, yearlyBreakdown } from '../../lib/calc';
import { validateBeforeSave } from '../../lib/validation';
import { formatDays, formatKEuro } from '../../lib/format';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';
import { CopyEstimationModal } from './CopyEstimationModal';
import { ManageInductorsModal } from './ManageInductorsModal';
import { CommentSection } from './CommentSection';
import { PrototypeEstimationForm } from './PrototypeEstimationForm';
import { useT } from '../../i18n/useT';

interface Props {
  line: ProjectLine | null;
  onClose: () => void;
}

export function EstimationPanel({ line, onClose }: Props) {
  const can = useRoleStore((s) => s.can);
  const currentRole = useRoleStore((s) => s.currentRole);
  const activeEngineerId = useRoleStore((s) => s.activeEngineerId);
  const existing = useDataStore((s) => (line ? s.estimations[line.id] : undefined));
  const setEstimation = useDataStore((s) => s.setEstimation);
  const setLineStatus = useDataStore((s) => s.setLineStatus);
  const addComment = useDataStore((s) => s.addComment);
  const protoEst = useDataStore((s) => (line ? s.prototypeEstimations[line.id] : undefined));
  const setPrototypeEstimation = useDataStore((s) => s.setPrototypeEstimation);
  const pushToast = useUIStore((s) => s.pushToast);

  const [selections, setSelections] = useState<InductorSelection[]>([]);
  const [customJUs, setCustomJUs] = useState<CustomJU[]>([]);
  const [globalOccurrences, setGlobalOccurrences] = useState(1);
  const [viewMode, setViewMode] = useState<'inductors' | 'flat'>('inductors');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showManage, setShowManage] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState(false);
  const [hasDraftedThisSession, setHasDraftedThisSession] = useState<boolean>(
    line?.status === 'draft' || line?.status === 'estimated' || line?.status === 'rejected',
  );

  useEffect(() => {
    if (!line) return;
    if (existing) {
      setSelections(existing.inductorSelections);
      setCustomJUs(existing.customJUs);
      setGlobalOccurrences(existing.globalOccurrences);
    } else {
      setSelections([]);
      setCustomJUs([]);
      setGlobalOccurrences(1);
    }
    setSearch('');
    setViewMode('inductors');
    setExpanded(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line?.id]);

  const locked = !line || line.status === 'estimated' || line.status === 'sent' || line.status === 'approved';
  const canEdit = can('edit:estimation') && !locked;
  const canEditCustomJU = can('edit:custom-jus');

  const totalDays = useMemo(
    () => calcTotalDays(selections, JOB_UNITS, customJUs, globalOccurrences),
    [selections, customJUs, globalOccurrences],
  );
  const totalKEuro = useMemo(() => (line ? calcKEuro(totalDays, line.metier) : 0), [totalDays, line]);
  const breakdown = useMemo(() => yearlyBreakdown(totalDays), [totalDays]);

  function addInductors(ids: string[]) {
    setSelections((prev) => {
      const existingIds = prev.map((s) => s.inductorId);
      const toAdd: InductorSelection[] = ids
        .filter((id) => !existingIds.includes(id))
        .map((id) => ({ inductorId: id, selectedCranId: null, inductorOccurrence: 1, juOccurrences: [] }));
      const toKeep = prev.filter((s) => ids.includes(s.inductorId));
      return [...toKeep, ...toAdd];
    });
  }

  function removeInductor(inductorId: string) {
    setSelections((prev) => prev.filter((s) => s.inductorId !== inductorId));
  }

  function selectCran(inductorId: string, cranId: string) {
    const cranJUs = JOB_UNITS.filter((ju) => ju.cranId === cranId);
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.inductorId !== inductorId) return sel;
        return {
          ...sel,
          selectedCranId: cranId,
          juOccurrences: cranJUs.map((ju) => ({
            juId: ju.id,
            occurrence: sel.inductorOccurrence,
            locked: false,
          })),
        };
      }),
    );
  }

  function updateInductorOccurrence(inductorId: string, occ: number) {
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.inductorId !== inductorId) return sel;
        return {
          ...sel,
          inductorOccurrence: occ,
          juOccurrences: sel.juOccurrences.map((jo) =>
            jo.locked ? jo : { ...jo, occurrence: occ },
          ),
        };
      }),
    );
  }

  function updateJUOccurrence(inductorId: string, juId: string, occ: number) {
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.inductorId !== inductorId) return sel;
        return {
          ...sel,
          juOccurrences: sel.juOccurrences.map((jo) =>
            jo.juId === juId ? { ...jo, occurrence: occ } : jo,
          ),
        };
      }),
    );
  }

  function toggleJULock(inductorId: string, juId: string) {
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.inductorId !== inductorId) return sel;
        return {
          ...sel,
          juOccurrences: sel.juOccurrences.map((jo) =>
            jo.juId === juId ? { ...jo, locked: !jo.locked } : jo,
          ),
        };
      }),
    );
  }

  function toggleExpanded(inductorId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(inductorId) ? next.delete(inductorId) : next.add(inductorId);
      return next;
    });
  }

  const q = search.trim().toLowerCase();

  const filteredSelections = useMemo(() => {
    if (!q) return selections;
    return selections.filter((sel) => {
      const ind = INDUCTORS.find((i) => i.id === sel.inductorId);
      if (ind?.name.toLowerCase().includes(q)) return true;
      if (!sel.selectedCranId) return false;
      const cranJUs = JOB_UNITS.filter((ju) => ju.cranId === sel.selectedCranId);
      return cranJUs.some(
        (ju) => ju.shortName.toLowerCase().includes(q) || ju.description.toLowerCase().includes(q),
      );
    });
  }, [selections, q]);

  const flatJUs = useMemo(() => {
    const rows: Array<{ ju: (typeof JOB_UNITS)[0]; sel: InductorSelection; jo: JUOccurrence }> = [];
    for (const sel of selections) {
      if (!sel.selectedCranId) continue;
      for (const jo of sel.juOccurrences) {
        const ju = JOB_UNITS.find((j) => j.id === jo.juId);
        if (ju) rows.push({ ju, sel, jo });
      }
    }
    if (!q) return rows;
    return rows.filter(
      ({ ju }) =>
        ju.shortName.toLowerCase().includes(q) || ju.description.toLowerCase().includes(q),
    );
  }, [selections, q]);

  function persist(status: 'draft' | 'estimated') {
    setEstimation(line!.id, {
      lineId: line!.id,
      inductorSelections: selections,
      customJUs,
      globalOccurrences,
      yearlyBreakdown: breakdown,
      totalDays,
      totalKEuro,
      status,
      ...(status === 'draft'
        ? { draftedAt: new Date().toISOString() }
        : { estimatedAt: new Date().toISOString() }),
    });
    setLineStatus(line!.id, status, { estimatedDays: totalDays, estimatedKEuro: totalKEuro });
  }

  function handleSaveDraft() {
    const validation = validateBeforeSave(line!);
    if (!validation.valid) {
      pushToast(validation.errors.join(' '), 'error');
      return;
    }
    persist('draft');
    setHasDraftedThisSession(true);
    pushToast(t('panel.toastDraftSaved', { id: line!.id }), 'success');
    onClose();
  }

  function handlePromote() {
    const validation = validateBeforeSave(line!);
    if (!validation.valid) {
      pushToast(validation.errors.join(' '), 'error');
      setConfirmPromote(false);
      return;
    }
    persist('estimated');
    pushToast(t('panel.toastPromoted', { id: line!.id }), 'success');
    setConfirmPromote(false);
    onClose();
  }

  const t = useT();
  const hasMinimumForDraft = globalOccurrences > 0;
  const hasMinimumForDefinitive =
    globalOccurrences > 0 &&
    selections.some((s) => s.selectedCranId !== null && s.juOccurrences.length > 0);

  if (!line) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Centered modal */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
        <div className="flex h-full w-full max-w-[90vw] flex-col rounded-xl bg-white shadow-2xl" style={{ maxHeight: '88vh' }}>

          {/* Header */}
          <div className="flex flex-shrink-0 items-start justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">{line.lineName}</h2>
                {locked && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    <Lock size={12} /> {t('panel.locked')}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {line.id} · {line.projectName} · {line.metier}
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {/* Rejection banner */}
          {line.status === 'rejected' && line.rejectionComment && (
            <div className="mx-6 mt-3 flex-shrink-0 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">{t('panel.rejectionBanner')}</div>
              <p className="mt-1">{line.rejectionComment}</p>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-2">
            <div className="flex overflow-hidden rounded-md border border-slate-200">
              <button
                onClick={() => setViewMode('inductors')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'inductors' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {t('panel.inductors')}
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={`border-l border-slate-200 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'flat' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {t('panel.jobUnits')}
              </button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('panel.searchPlaceholder')}
                className="w-52 rounded-md border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div className="flex-1" />
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => setShowManage(true)}>
                {selections.length > 0
                  ? t('panel.editInductors', { n: selections.length })
                  : t('panel.loadInductors')}
              </Button>
            )}
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1">
            {/* Left: inductor tree or flat JU table */}
            <div className="flex-1 overflow-y-auto border-r border-slate-100 px-6 py-4">
              {viewMode === 'inductors' ? (
                <InductorTreeView
                  selections={filteredSelections}
                  expanded={expanded}
                  canEdit={canEdit}
                  onToggleExpanded={toggleExpanded}
                  onSelectCran={selectCran}
                  onUpdateInductorOccurrence={updateInductorOccurrence}
                  onUpdateJUOccurrence={updateJUOccurrence}
                  onToggleJULock={toggleJULock}
                  onRemoveInductor={removeInductor}
                />
              ) : (
                <FlatJUView
                  rows={flatJUs}
                  canEdit={canEdit}
                  onUpdateOccurrence={updateJUOccurrence}
                  onToggleLock={toggleJULock}
                />
              )}

              <CustomJUSection
                customJUs={customJUs}
                canEdit={canEdit}
                canEditCustomJU={canEditCustomJU}
                onChange={setCustomJUs}
              />

              {existing && line && (
                <CommentSection
                  comments={existing.comments ?? []}
                  metier={line.metier}
                  onAdd={(text) =>
                    addComment({
                      lineId: line.id,
                      metier: line.metier,
                      text,
                      authorId: activeEngineerId ?? currentRole,
                    })
                  }
                  readOnly={locked}
                />
              )}

              {line && (
                <PrototypeEstimationForm
                  lineId={line.id}
                  initial={protoEst}
                  onSave={(est) => setPrototypeEstimation(line.id, est)}
                  onClose={onClose}
                  readOnly={locked}
                />
              )}
            </div>

            {/* Right: summary */}
            <div className="w-52 flex-shrink-0 overflow-y-auto px-4 py-4">
              <div className="mb-3">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {t('panel.globalOccurrence')}
                </label>
                <input
                  type="number"
                  min={1}
                  value={globalOccurrences}
                  onChange={(e) => setGlobalOccurrences(Math.max(1, Number(e.target.value) || 1))}
                  disabled={!canEdit}
                  className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50 focus:border-brand-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-slate-400">{t('panel.globalOccurrenceHint')}</p>
              </div>

              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalDays')}</div>
                <div className="text-xl font-bold text-slate-900">{formatDays(totalDays)}</div>
              </div>
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalKeuro')}</div>
                <div className="text-xl font-bold text-slate-900">{formatKEuro(totalKEuro)}</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1.5 text-[10px] font-semibold uppercase text-slate-500">{t('panel.yearlyDist')}</div>
                <div className="flex items-end gap-0.5" style={{ height: 48 }}>
                  {breakdown.map((m, i) => {
                    const max = Math.max(...breakdown, 0.01);
                    const h = (m / max) * 44;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center">
                        <div
                          className="w-full rounded-t bg-brand-500"
                          style={{ height: `${Math.max(h, 2)}px` }}
                          title={`Mes ${i + 1}: ${m.toFixed(1)}d`}
                        />
                        <div className="mt-0.5 text-[8px] text-slate-400">
                          {['E','F','M','A','M','J','J','A','S','O','N','D'][i]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="h-2.5 w-2.5 rounded-sm border border-blue-300 bg-blue-100" />
                  {t('panel.legendInherits')}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="h-2.5 w-2.5 rounded-sm border border-amber-400 bg-amber-100" />
                  {t('panel.legendLocked')}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
            <div>
              {existing && canEdit && (
                <Button size="sm" variant="secondary" onClick={() => setShowCopyModal(true)}>
                  <Copy size={14} /> {t('panel.copyToLines')}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="md" variant="ghost" onClick={onClose}>{t('panel.close')}</Button>
              {canEdit && (
                <>
                  <Button size="md" variant="secondary" onClick={handleSaveDraft} disabled={!hasMinimumForDraft}>
                    {t('panel.saveDraft')}
                  </Button>
                  <Button
                    size="md"
                    variant="primary"
                    onClick={() => setConfirmPromote(true)}
                    disabled={!hasMinimumForDefinitive || !hasDraftedThisSession}
                    title={!hasDraftedThisSession ? t('panel.draftBtnTitle') : undefined}
                  >
                    {t('panel.promote')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm promote modal */}
      <Modal
        open={confirmPromote}
        onClose={() => setConfirmPromote(false)}
        title={t('panel.confirmTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmPromote(false)}>{t('panel.confirmCancel')}</Button>
            <Button variant="primary" onClick={handlePromote}>{t('panel.confirmPromote')}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {t('panel.confirmBody', { id: line.id })}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          <li>• {t('panel.confirmDays', { n: formatDays(totalDays) })}</li>
          <li>• {t('panel.confirmKeuro', { n: formatKEuro(totalKEuro) })}</li>
        </ul>
      </Modal>

      {showCopyModal && <CopyEstimationModal sourceLine={line} onClose={() => setShowCopyModal(false)} />}
      {showManage && (
        <ManageInductorsModal
          activeInductorIds={selections.map((s) => s.inductorId)}
          onApply={(ids: string[]) => { addInductors(ids); setShowManage(false); }}
          onClose={() => setShowManage(false)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// InductorTreeView
// ─────────────────────────────────────────────
interface TreeProps {
  selections: InductorSelection[];
  expanded: Set<string>;
  canEdit: boolean;
  onToggleExpanded: (id: string) => void;
  onSelectCran: (inductorId: string, cranId: string) => void;
  onUpdateInductorOccurrence: (inductorId: string, occ: number) => void;
  onUpdateJUOccurrence: (inductorId: string, juId: string, occ: number) => void;
  onToggleJULock: (inductorId: string, juId: string) => void;
  onRemoveInductor: (inductorId: string) => void;
}

function InductorTreeView({
  selections, expanded, canEdit,
  onToggleExpanded, onSelectCran, onUpdateInductorOccurrence,
  onUpdateJUOccurrence, onToggleJULock, onRemoveInductor,
}: TreeProps) {
  const t = useT();
  if (selections.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
        {t('panel.noInductors')}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {selections.map((sel) => {
        const ind = INDUCTORS.find((i) => i.id === sel.inductorId)!;
        const availableCrans = CRANS.filter((c) => c.inductorId === sel.inductorId);
        const isExpanded = expanded.has(sel.inductorId);
        const cranJUs = sel.selectedCranId
          ? JOB_UNITS.filter((ju) => ju.cranId === sel.selectedCranId)
          : [];

        const indDays = cranJUs.reduce((acc, ju) => {
          const jo = sel.juOccurrences.find((o) => o.juId === ju.id);
          const occ = jo?.occurrence ?? sel.inductorOccurrence;
          return acc + occ * ju.variable + ju.fixed;
        }, 0);

        return (
          <div key={sel.inductorId} className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
              <button
                onClick={() => onToggleExpanded(sel.inductorId)}
                className="text-slate-400 hover:text-slate-600"
                disabled={!sel.selectedCranId}
              >
                {isExpanded && sel.selectedCranId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-800">{ind.name}</span>
                <span className="ml-2 text-[10px] text-slate-400">{ind.category}</span>
              </div>
              <span className="text-[10px] text-slate-400">{t('panel.cranLabel')}</span>
              <select
                value={sel.selectedCranId ?? ''}
                onChange={(e) => e.target.value && onSelectCran(sel.inductorId, e.target.value)}
                disabled={!canEdit}
                className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs focus:border-brand-400 focus:outline-none disabled:bg-slate-50"
              >
                <option value="">{t('panel.selectCran')}</option>
                {availableCrans.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">{t('panel.occLabel')}</span>
              <input
                type="number"
                min={1}
                value={sel.inductorOccurrence}
                onChange={(e) => onUpdateInductorOccurrence(sel.inductorId, Math.max(1, Number(e.target.value) || 1))}
                disabled={!canEdit}
                className="w-12 rounded border border-slate-300 px-1.5 py-0.5 text-right text-xs disabled:bg-slate-50 focus:border-brand-400 focus:outline-none"
              />
              <span className="w-14 text-right text-xs font-semibold text-brand-700">{formatDays(indDays)}</span>
              {canEdit && (
                <button onClick={() => onRemoveInductor(sel.inductorId)} className="text-slate-300 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {!sel.selectedCranId && (
              <div className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-[10px] text-amber-700">
                {t('panel.selectCranWarning')}
              </div>
            )}

            {sel.selectedCranId && isExpanded && cranJUs.map((ju) => {
              const jo = sel.juOccurrences.find((o) => o.juId === ju.id) ?? {
                juId: ju.id, occurrence: sel.inductorOccurrence, locked: false,
              };
              const juDays = jo.occurrence * ju.variable + ju.fixed;
              return (
                <div
                  key={ju.id}
                  className={`flex items-center gap-2 border-t border-slate-100 px-3 py-1.5 pl-8 ${jo.locked ? 'bg-amber-50' : 'bg-white'}`}
                >
                  <span className="w-16 font-mono text-[10px] text-slate-400">{ju.shortName}</span>
                  <span className="flex-1 text-xs text-slate-700">{ju.description}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {ju.variable > 0 ? `×${ju.variable}` : ''}{ju.fixed > 0 ? `+${ju.fixed}` : ''}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={jo.occurrence}
                    onChange={(e) => onUpdateJUOccurrence(sel.inductorId, ju.id, Math.max(1, Number(e.target.value) || 1))}
                    disabled={!canEdit}
                    className={`w-12 rounded border px-1.5 py-0.5 text-right text-xs focus:outline-none disabled:opacity-60 ${
                      jo.locked
                        ? 'border-amber-400 bg-amber-50 focus:border-amber-500'
                        : 'border-blue-200 bg-blue-50 focus:border-brand-400'
                    }`}
                  />
                  <span className="w-12 text-right text-[10px] font-semibold text-brand-700 font-mono">{formatDays(juDays)}</span>
                  {canEdit && (
                    <button
                      onClick={() => onToggleJULock(sel.inductorId, ju.id)}
                      className={`rounded p-0.5 text-xs transition-colors ${jo.locked ? 'text-amber-600' : 'text-slate-300 hover:text-slate-500'}`}
                      title={jo.locked ? t('panel.unlockTitle') : t('panel.lockTitle')}
                    >
                      <Lock size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {sel.selectedCranId && !isExpanded && (
              <div
                className="cursor-pointer border-t border-slate-100 bg-white px-4 py-1 text-[10px] text-slate-400 hover:text-slate-600"
                onClick={() => onToggleExpanded(sel.inductorId)}
              >
                {t('panel.expandHint', { n: cranJUs.length, s: cranJUs.length !== 1 ? 's' : '' })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// FlatJUView
// ─────────────────────────────────────────────
interface FlatRow {
  ju: (typeof JOB_UNITS)[0];
  sel: InductorSelection;
  jo: JUOccurrence;
}

function FlatJUView({
  rows, canEdit, onUpdateOccurrence, onToggleLock,
}: {
  rows: FlatRow[];
  canEdit: boolean;
  onUpdateOccurrence: (inductorId: string, juId: string, occ: number) => void;
  onToggleLock: (inductorId: string, juId: string) => void;
}) {
  const t = useT();
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
        {t('panel.noJobUnits')}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{t('panel.colShort')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('panel.colJobUnit')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('panel.colInductorCran')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('panel.colOcc')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('panel.colVar')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('panel.colFixed')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('panel.colDays')}</th>
            {canEdit && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ ju, sel, jo }) => {
            const ind = INDUCTORS.find((i) => i.id === sel.inductorId);
            const cran = CRANS.find((c) => c.id === sel.selectedCranId);
            const juDays = jo.occurrence * ju.variable + ju.fixed;
            return (
              <tr
                key={ju.id}
                className={`border-t border-slate-100 ${jo.locked ? 'bg-amber-50' : ''}`}
              >
                <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400">{ju.shortName}</td>
                <td className="px-3 py-1.5 text-slate-700">{ju.description}</td>
                <td className="px-3 py-1.5 text-[10px] text-slate-400">
                  {ind?.name} / {cran?.name}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <input
                    type="number"
                    min={1}
                    value={jo.occurrence}
                    onChange={(e) => onUpdateOccurrence(sel.inductorId, ju.id, Math.max(1, Number(e.target.value) || 1))}
                    disabled={!canEdit}
                    className={`w-12 rounded border px-1.5 py-0.5 text-right text-xs focus:outline-none disabled:opacity-60 ${
                      jo.locked
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                  />
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-[10px] text-slate-400">{ju.variable}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[10px] text-slate-400">{ju.fixed}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-brand-700">{formatDays(juDays)}</td>
                {canEdit && (
                  <td className="px-2">
                    <button
                      onClick={() => onToggleLock(sel.inductorId, ju.id)}
                      className={`rounded p-0.5 ${jo.locked ? 'text-amber-600' : 'text-slate-300 hover:text-slate-500'}`}
                      title={jo.locked ? t('panel.unlockTitle') : t('panel.lockTitle')}
                    >
                      <Lock size={12} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// CustomJUSection
// ─────────────────────────────────────────────
function CustomJUSection({
  customJUs, canEdit, canEditCustomJU, onChange,
}: {
  customJUs: CustomJU[];
  canEdit: boolean;
  canEditCustomJU: boolean;
  onChange: React.Dispatch<React.SetStateAction<CustomJU[]>>;
}) {
  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Custom JUs</span>
        {canEdit && canEditCustomJU && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onChange((j) => [...j, { id: `ju-${Date.now()}`, description: '', days: 1 }])}
          >
            + Agregar JU
          </Button>
        )}
      </div>
      {customJUs.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 p-3 text-center text-[10px] text-slate-400">
          {canEditCustomJU ? 'Sin JUs custom.' : 'Solo PMO/Admin pueden agregar Custom JUs.'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {customJUs.map((ju, idx) => (
            <div key={ju.id} className="flex items-center gap-2">
              <input
                value={ju.description}
                placeholder="Descripción"
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))}
                disabled={!canEdit || !canEditCustomJU}
                className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
              />
              <input
                type="number"
                min={0}
                step={0.5}
                value={ju.days}
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, days: Number(e.target.value) } : x)))}
                disabled={!canEdit || !canEditCustomJU}
                className="w-16 rounded border border-slate-300 px-2 py-1 text-right text-xs disabled:bg-slate-50"
              />
              {canEdit && canEditCustomJU && (
                <button onClick={() => onChange((j) => j.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
