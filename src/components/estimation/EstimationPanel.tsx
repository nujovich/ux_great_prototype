import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Copy, X, ChevronDown, ChevronRight, Trash2, Search, Layers } from 'lucide-react';
import type { InductorSelection, JUOccurrence, CustomJU, ProjectLine, JU, Cran, Estimation } from '../../types';
import { isEstimationDirty } from '../../lib/estimationDirty';
import { INDUCTORS } from '../../fixtures/inductors';
import { calcEstimationTotals } from '../../lib/calc';
import { validateBeforeSave } from '../../lib/validation';
import { formatDays, formatKEuro, formatFTE, formatBenchHours, formatKm } from '../../lib/format';
import { juTotal, shouldShowCranDropdown } from '../../lib/juTotal';
import { preloadSelections } from '../../lib/preload';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import { useUIStore } from '../../store/uiStore';
import { CopyEstimationModal } from './CopyEstimationModal';
import { ManageInductorsModal } from './ManageInductorsModal';
import { PreSaveSummaryModal } from './PreSaveSummaryModal';
import { CommentSection } from './CommentSection';
import { PrototypeEstimationForm } from './PrototypeEstimationForm';
import { RelatedLinesBanner } from './RelatedLinesBanner';
import { useT } from '../../i18n/useT';
import { canSaveDraft } from '../../lib/saveGate';

const UNIT_LABEL: Record<string, string> = {
  man_day: 'MD', bench_hours: 'BH', kilometres: 'km', kiloeuros: 'k€',
};

function formatJuTotal(unit: string | undefined, value: number): string {
  switch (unit) {
    case 'bench_hours': return formatBenchHours(value);
    case 'kilometres': return formatKm(value);
    default: return formatDays(value);
  }
}

interface Props {
  line: ProjectLine | null;
  onClose: () => void;
  navLines?: ProjectLine[];
  onSwitchLine?: (id: string) => void;
  /** When estimating multiple compatible lines at once, all selected lines.
   *  When present and length > 1, Save-as-Draft applies the config to every line. */
  bulkLines?: ProjectLine[];
}

export function EstimationPanel({ line, onClose, navLines, onSwitchLine, bulkLines }: Props) {
  const can = useRoleStore((s) => s.can);
  const currentRole = useRoleStore((s) => s.currentRole);
  const activeEngineerId = useRoleStore((s) => s.activeEngineerId);
  const existing = useDataStore((s) => (line ? s.estimations[line.id] : undefined));
  const allLines = useDataStore((s) => s.lines);
  const setEstimation = useDataStore((s) => s.setEstimation);
  const setLineStatus = useDataStore((s) => s.setLineStatus);
  const addComment = useDataStore((s) => s.addComment);
  const protoEst = useDataStore((s) => (line ? s.prototypeEstimations[line.id] : undefined));
  const setPrototypeEstimation = useDataStore((s) => s.setPrototypeEstimation);
  const bulkSetEstimation = useDataStore((s) => s.bulkSetEstimation);
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
  const [hasDraftedThisSession, setHasDraftedThisSession] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'close' } | { type: 'switch'; id: string } | null>(null);
  // Tracks the line currently loaded so we can tell a genuine line switch (reset the
  // session) apart from an `existing` change caused by our own Save-as-Draft (re-seed only).
  const loadedLineId = useRef<string | null>(null);

  useEffect(() => {
    if (!line) {
      loadedLineId.current = null; // panel closed → next open re-arms the session resets
      return;
    }
    const isLineSwitch = loadedLineId.current !== line.id;
    // Batch state updates to avoid cascading renders
    Promise.resolve().then(() => {
      // Re-seed editable state from the persisted estimation (also runs after our own
      // save, where it is a no-op since current === saved — keeps the dirty memo correct).
      setSelections(existing?.inductorSelections ?? preloadSelections(INDUCTORS));
      setCustomJUs(existing?.customJUs ?? []);
      setGlobalOccurrences(existing?.globalOccurrences ?? 1);
      // Session-scoped UI state resets ONLY on a genuine line switch — NOT when `existing`
      // changes because we just saved a draft (that must keep the gate + summary open, BR-15).
      if (isLineSwitch) {
        setSearch('');
        setViewMode('inductors');
        setExpanded(new Set());
        setHasDraftedThisSession(false);
        setShowSummary(false);
        loadedLineId.current = line.id;
      }
    });
  }, [line, existing]);

  const locked = !line || line.status === 'Estimated' || line.status === 'Sent' || line.status === 'Approved';
  const canEdit = can('edit:estimation') && !locked;
  const canCopy = can('copy:estimation');
  const canEditCustomJU = can('edit:custom-jus') && !locked;

  const totals = useMemo(
    () => calcEstimationTotals(selections, INDUCTORS, customJUs, globalOccurrences),
    [selections, customJUs, globalOccurrences],
  );
  const totalDays = totals.manDays; // persisted in the Estimation record on save

  const addInductors = useCallback((ids: string[]) => {
    setSelections((prev) => {
      const existingIds = prev.map((s) => s.inductorId);
      const toAdd: InductorSelection[] = ids
        .filter((id) => !existingIds.includes(id))
        .map((id) => ({ inductorId: id, selectedCranId: null, inductorOccurrence: 1, juOccurrences: [] }));
      const toKeep = prev.filter((s) => ids.includes(s.inductorId));
      return [...toKeep, ...toAdd];
    });
  }, []);

  const removeInductor = useCallback((inductorId: string) => {
    setSelections((prev) => prev.filter((s) => s.inductorId !== inductorId));
  }, []);

  const selectCran = useCallback((inductorId: string, cranId: string) => {
    const cranJUs = INDUCTORS.find((i) => i.id === inductorId)?.crans.find((c) => c.id === cranId)?.jus ?? [];
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.inductorId !== inductorId) return sel;
        return {
          ...sel,
          selectedCranId: cranId,
          juOccurrences: cranJUs.map((ju) => ({
            juId: ju.id,
            occurrence: ju.occurrence,
            locked: false,
          })),
        };
      }),
    );
  }, []);

  const updateInductorOccurrence = useCallback((inductorId: string, occ: number) => {
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.inductorId !== inductorId) return sel;
        // Non-locked JUs mirror the inductor occurrence; locked JUs keep their
        // manually-set value (BR-09: occurrence_locked defaults to false).
        return {
          ...sel,
          inductorOccurrence: occ,
          juOccurrences: sel.juOccurrences.map((jo) =>
            jo.locked ? jo : { ...jo, occurrence: occ },
          ),
        };
      }),
    );
  }, []);

  const updateJUOccurrence = useCallback((inductorId: string, juId: string, occ: number) => {
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
  }, []);

  const toggleJULock = useCallback((inductorId: string, juId: string) => {
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
  }, []);

  const clearCran = useCallback((inductorId: string) => {
    setSelections((prev) => prev.map((sel) =>
      sel.inductorId === inductorId ? { ...sel, selectedCranId: null, juOccurrences: [] } : sel,
    ));
  }, []);

  const toggleExpanded = useCallback((inductorId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      const nextHasInductor = next.has(inductorId);
      const isNew = !nextHasInductor;
      if (isNew) {
        next.add(inductorId);
      } else {
        next.delete(inductorId);
      }
      return next;
    });
  }, []);

  const q = search.trim().toLowerCase();

  const filteredSelections = useMemo(() => {
    if (!q) return selections;
    return selections.filter((sel) => {
      const ind = INDUCTORS.find((i) => i.id === sel.inductorId);
      if (ind?.name.toLowerCase().includes(q)) return true;
      if (!sel.selectedCranId) return false;
      const cranJUs = INDUCTORS.find((i) => i.id === sel.inductorId)?.crans.find((c) => c.id === sel.selectedCranId)?.jus ?? [];
      return cranJUs.some(
        (ju) => ju.name.toLowerCase().includes(q) || ju.long_name?.toLowerCase().includes(q),
      );
    });
  }, [selections, q]);

  const flatJUs = useMemo(() => {
    const rows: Array<{ ju: JU; sel: InductorSelection; jo: JUOccurrence }> = [];
    for (const sel of selections) {
      if (!sel.selectedCranId) continue;
      const cranJUs = INDUCTORS.find((i) => i.id === sel.inductorId)?.crans.find((c) => c.id === sel.selectedCranId)?.jus ?? [];
      for (const jo of sel.juOccurrences) {
        const ju = cranJUs.find((j) => j.id === jo.juId);
        if (ju) rows.push({ ju, sel, jo });
      }
    }
    if (!q) return rows;
    return rows.filter(
      ({ ju }) =>
        ju.name.toLowerCase().includes(q) || ju.long_name?.toLowerCase().includes(q),
    );
  }, [selections, q]);

  function persist(status: 'Draft' | 'Estimated') {
    setEstimation(line!.id, {
      lineId: line!.id,
      inductorSelections: selections,
      customJUs,
      globalOccurrences,
      yearlyBreakdown: [],
      totalDays,
      totalKEuro: totals.keuro,
      status,
      ...(status === 'Draft'
        ? { draftedAt: new Date().toISOString() }
        : { estimatedAt: new Date().toISOString() }),
    });
    setLineStatus(line!.id, status, { estimatedDays: totalDays, estimatedKEuro: totals.keuro });
  }

  function handleSaveDraft() {
    const validation = validateBeforeSave(line!);
    if (!validation.valid) {
      pushToast(validation.errors.join(' '), 'error');
      return;
    }
    persist('Draft');
    if (bulkLines && bulkLines.length > 1) {
      const base: Omit<Estimation, 'lineId'> = {
        inductorSelections: selections,
        customJUs,
        globalOccurrences,
        yearlyBreakdown: [],
        totalDays,
        totalKEuro: totals.keuro,
        status: 'Draft',
        draftedAt: new Date().toISOString(),
      };
      bulkSetEstimation(bulkLines.filter((l) => l.id !== line!.id).map((l) => l.id), base);
    }
    setHasDraftedThisSession(true);
    pushToast(t('panel.toastDraftSaved', { id: line!.id }), 'success');
    setShowSummary(true);
  }

  function handlePromote() {
    const validation = validateBeforeSave(line!);
    if (!validation.valid) {
      pushToast(validation.errors.join(' '), 'error');
      setConfirmPromote(false);
      return;
    }
    persist('Estimated');
    pushToast(t('panel.toastPromoted', { id: line!.id }), 'success');
    setConfirmPromote(false);
    onClose();
  }

  const t = useT();

  const dirty = useMemo(
    () => isEstimationDirty(
      // Baseline = the saved estimation, or — for an unestimated line — the same
      // preloaded selections the open effect seeds, so a freshly-opened, untouched
      // panel is never considered dirty (preload would otherwise differ from PRISTINE).
      existing
        ? { inductorSelections: existing.inductorSelections, customJUs: existing.customJUs, globalOccurrences: existing.globalOccurrences }
        : { inductorSelections: preloadSelections(INDUCTORS), customJUs: [], globalOccurrences: 1 },
      { inductorSelections: selections, customJUs, globalOccurrences },
    ),
    [existing, selections, customJUs, globalOccurrences],
  );

  const requestClose = useCallback(() => {
    if (dirty) setPendingAction({ type: 'close' });
    else onClose();
  }, [dirty, onClose]);

  const requestSwitch = useCallback((id: string) => {
    if (id === line?.id) return;
    if (dirty) setPendingAction({ type: 'switch', id });
    else onSwitchLine?.(id);
  }, [dirty, line, onSwitchLine]);

  const confirmLeave = useCallback(() => {
    const a = pendingAction;
    setPendingAction(null);
    if (a?.type === 'close') onClose();
    else if (a?.type === 'switch') onSwitchLine?.(a.id);
  }, [pendingAction, onClose, onSwitchLine]);

  const hasMinimumForDraft = canSaveDraft(selections, customJUs);
  const hasMinimumForDefinitive =
    globalOccurrences > 0 &&
    selections.some((s) => s.selectedCranId !== null && s.juOccurrences.length > 0);

  if (!line) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={requestClose} />

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
              {bulkLines && bulkLines.length > 1 && (
                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-brand-700">
                  <Layers size={12} />
                  <span className="font-medium">{t('bulk.applyingTo', { n: bulkLines.length })}:</span>
                  {bulkLines.map((l) => (
                    <span key={l.id} className="rounded bg-brand-50 px-1.5 py-0.5">{l.lineName}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {navLines && navLines.length > 1 && (
                <select
                  value={line?.id ?? ''}
                  onChange={(e) => requestSwitch(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                  aria-label={t('unsaved.switchLabel')}
                >
                  {navLines.map((l) => (<option key={l.id} value={l.id}>{l.lineName}</option>))}
                </select>
              )}
              <button onClick={requestClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Rejection banner */}
          {line.status === 'Modification Requested' && line.rejectionComment && (
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
              {line && <RelatedLinesBanner line={line} allLines={allLines} />}
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
                  onClearCran={clearCran}
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
                      author: activeEngineerId ?? currentRole,
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
                  onClose={requestClose}
                  readOnly={locked || !can('edit:estimation')}
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

              <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalEtp')}</div>
                <div className="text-xl font-bold text-slate-900">{formatFTE(totals.fte)}</div>
              </div>
              <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalBh')}</div>
                <div className="text-lg font-bold text-slate-900">{formatBenchHours(totals.benchHours)}</div>
              </div>
              <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalKm')}</div>
                <div className="text-lg font-bold text-slate-900">{formatKm(totals.km)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">{t('panel.totalKeuro')}</div>
                <div className="text-lg font-bold text-slate-900">{formatKEuro(totals.keuro)}</div>
                <p className="mt-1 text-[9px] text-slate-400">{t('panel.keuroHint')}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
            <div>
              {existing && canCopy && (
                <Button size="sm" variant="secondary" onClick={() => setShowCopyModal(true)}>
                  <Copy size={14} /> {t('panel.copyToLines')}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="md" variant="ghost" onClick={requestClose}>{t('panel.close')}</Button>
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
          <li>• {t('panel.totalEtp')}: {formatFTE(totals.fte)}</li>
          <li>• {t('panel.totalBh')}: {formatBenchHours(totals.benchHours)}</li>
          <li>• {t('panel.totalKm')}: {formatKm(totals.km)}</li>
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

      {line && (
        <PreSaveSummaryModal
          open={showSummary}
          onClose={() => setShowSummary(false)}
          lineName={line.lineName}
          totals={totals}
          spDate={line.spDate}
          durationMonths={line.durationMonths}
          lines={bulkLines && bulkLines.length > 1
            ? bulkLines.map((l) => ({ id: l.id, lineName: l.lineName, spDate: l.spDate, durationMonths: l.durationMonths }))
            : undefined}
        />
      )}

      {/* Unsaved-changes guard dialog */}
      <Modal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title={t('unsaved.title')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPendingAction(null)}>{t('unsaved.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={confirmLeave}>{t('unsaved.discard')}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{t('unsaved.body')}</p>
      </Modal>
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
  onClearCran: (inductorId: string) => void;
}

function InductorTreeView({
  selections, expanded, canEdit,
  onToggleExpanded, onSelectCran, onUpdateInductorOccurrence,
  onUpdateJUOccurrence, onToggleJULock, onRemoveInductor, onClearCran,
}: TreeProps) {
  const t = useT();
  if (selections.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
        <div>{t('panel.noInductors')}</div>
        <div className="mt-1 text-slate-400">{t('panel.noWorkloadStandard')}</div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {selections.map((sel) => {
        const ind = INDUCTORS.find((i) => i.id === sel.inductorId)!;
        const availableCrans = ind?.crans ?? [];
        const isExpanded = expanded.has(sel.inductorId);
        const cranJUs = sel.selectedCranId
          ? (availableCrans.find((c) => c.id === sel.selectedCranId)?.jus ?? [])
          : [];

        const indDays = cranJUs.reduce((acc, ju) => {
          if ((ju.unit_type ?? 'man_day') !== 'man_day') return acc;
          const jo = sel.juOccurrences.find((o) => o.juId === ju.id);
          const occ = jo?.occurrence ?? ju.occurrence;
          return acc + juTotal(ju, occ);
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
              {!shouldShowCranDropdown(availableCrans.length) ? (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  {availableCrans[0]?.name ?? '—'}
                </span>
              ) : (
                <>
                  <select
                    value={sel.selectedCranId ?? ''}
                    onChange={(e) => e.target.value && onSelectCran(sel.inductorId, e.target.value)}
                    disabled={!canEdit}
                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs focus:border-brand-400 focus:outline-none disabled:bg-slate-50"
                  >
                    {!sel.selectedCranId && <option value="">{t('panel.selectCran')}</option>}
                    {availableCrans.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {canEdit && sel.selectedCranId && (
                    <button
                      onClick={() => onClearCran(sel.inductorId)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                    >
                      {t('panel.clearCran')}
                    </button>
                  )}
                </>
              )}
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

            {availableCrans.length === 0 || (sel.selectedCranId && cranJUs.length === 0) ? (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-1.5 text-[10px] text-slate-500">
                {t('panel.noWorkloadStandard')}
              </div>
            ) : !sel.selectedCranId ? (
              <div className="border-t border-amber-100 bg-amber-50 px-4 py-1.5 text-[10px] text-amber-700">
                {t('panel.selectCranWarning')}
              </div>
            ) : null}

            {sel.selectedCranId && isExpanded && cranJUs.map((ju) => {
              const jo = sel.juOccurrences.find((o) => o.juId === ju.id) ?? {
                juId: ju.id, occurrence: sel.inductorOccurrence, locked: false,
              };
              const total = juTotal(ju, jo.occurrence);
              return (
                <div
                  key={ju.id}
                  className={`flex items-center gap-2 border-t border-slate-100 px-3 py-1.5 pl-8 ${jo.locked ? 'bg-amber-50' : 'bg-white'}`}
                >
                  <span className="w-16 font-mono text-[10px] text-slate-400">{ju.name}</span>
                  <span className="flex-1 text-xs text-slate-700">{ju.long_name ?? ju.name}</span>
                  <span className="w-10 text-right text-[10px] text-slate-400" title="Variable">{(ju.variable ?? 0).toFixed(1)}</span>
                  <span className="w-10 text-right text-[10px] text-slate-400" title="Fixed">{(ju.fixed ?? 0).toFixed(1)}</span>
                  <span className="w-8 text-center text-[9px] uppercase text-slate-400" title={ju.unit_type}>{UNIT_LABEL[ju.unit_type ?? 'man_day']}</span>
                  <input
                    type="number"
                    min={0}
                    value={jo.occurrence}
                    onChange={(e) => onUpdateJUOccurrence(sel.inductorId, ju.id, Math.max(0, Number(e.target.value) || 0))}
                    disabled={!canEdit}
                    className={`w-12 rounded border px-1.5 py-0.5 text-right text-xs focus:outline-none disabled:opacity-60 ${
                      jo.locked ? 'border-amber-400 bg-amber-50 focus:border-amber-500' : 'border-blue-200 bg-blue-50 focus:border-brand-400'
                    }`}
                  />
                  <span className="w-14 text-right text-[10px] font-semibold text-brand-700 font-mono">{formatJuTotal(ju.unit_type, total)}</span>
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
  ju: JU;
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
            <th className="px-3 py-2 text-right font-medium">{t('panel.colVar')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('panel.colFixed')}</th>
            <th className="px-3 py-2 text-center font-medium">{t('panel.colUnit')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('panel.colOcc')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('panel.colDays')}</th>
            {canEdit && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ ju, sel, jo }) => {
            const ind = INDUCTORS.find((i) => i.id === sel.inductorId);
            const cran: Cran | undefined = INDUCTORS.find((i) => i.id === sel.inductorId)?.crans.find((c) => c.id === sel.selectedCranId);
            return (
              <tr
                key={ju.id}
                className={`border-t border-slate-100 ${jo.locked ? 'bg-amber-50' : ''}`}
              >
                <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400">{ju.name}</td>
                <td className="px-3 py-1.5 text-slate-700">{ju.long_name ?? ju.name}</td>
                <td className="px-3 py-1.5 text-[10px] text-slate-400">
                  {ind?.name} / {cran?.name}
                </td>
                <td className="px-3 py-1.5 text-right text-[10px] text-slate-400">{(ju.variable ?? 0).toFixed(1)}</td>
                <td className="px-3 py-1.5 text-right text-[10px] text-slate-400">{(ju.fixed ?? 0).toFixed(1)}</td>
                <td className="px-3 py-1.5 text-center text-[9px] uppercase text-slate-400">{UNIT_LABEL[ju.unit_type ?? 'man_day']}</td>
                <td className="px-3 py-1.5 text-right">
                  <input
                    type="number"
                    min={0}
                    value={jo.occurrence}
                    onChange={(e) => onUpdateOccurrence(sel.inductorId, ju.id, Math.max(0, Number(e.target.value) || 0))}
                    disabled={!canEdit}
                    className={`w-12 rounded border px-1.5 py-0.5 text-right text-xs focus:outline-none disabled:opacity-60 ${
                      jo.locked
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                  />
                </td>
                <td className="px-3 py-1.5 text-right font-semibold text-brand-700">{formatJuTotal(ju.unit_type, juTotal(ju, jo.occurrence))}</td>
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
  customJUs, canEditCustomJU, onChange,
}: {
  customJUs: CustomJU[];
  canEditCustomJU: boolean;
  onChange: React.Dispatch<React.SetStateAction<CustomJU[]>>;
}) {
  const t = useT();
  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Custom JUs</span>
        {canEditCustomJU && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onChange((j) => [...j, { id: `ju-${Date.now()}`, name: '', variable: 1, fixed: 0, occurrence: 1 }])}
          >
            + Add JU
          </Button>
        )}
      </div>
      {customJUs.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 p-3 text-center text-[10px] text-slate-400">
          {canEditCustomJU ? 'No custom JUs.' : 'Only Admin and Engineer can add Custom JUs.'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {customJUs.map((ju, idx) => (
            <div key={ju.id} className="flex items-center gap-2">
              <input value={ju.name} placeholder={t('panel.customName')} disabled={!canEditCustomJU}
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50" />
              <input type="number" min={0} step={0.5} value={ju.variable} disabled={!canEditCustomJU} title={t('panel.colVar')}
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, variable: Math.max(0, Number(e.target.value) || 0) } : x)))}
                className="w-14 rounded border border-slate-300 px-2 py-1 text-right text-xs disabled:bg-slate-50" />
              <input type="number" min={0} step={0.5} value={ju.fixed} disabled={!canEditCustomJU} title={t('panel.colFixed')}
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, fixed: Math.max(0, Number(e.target.value) || 0) } : x)))}
                className="w-14 rounded border border-slate-300 px-2 py-1 text-right text-xs disabled:bg-slate-50" />
              <input type="number" min={0} value={ju.occurrence} disabled={!canEditCustomJU} title={t('panel.colOcc')}
                onChange={(e) => onChange((j) => j.map((x, i) => (i === idx ? { ...x, occurrence: Math.max(0, Number(e.target.value) || 0) } : x)))}
                className="w-14 rounded border border-slate-300 px-2 py-1 text-right text-xs disabled:bg-slate-50" />
              <span className="w-14 text-right text-[10px] font-mono text-brand-700">{formatDays(juTotal({ variable: ju.variable, fixed: ju.fixed } as JU, ju.occurrence))}</span>
              {canEditCustomJU && (
                <button onClick={() => onChange((j) => j.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
