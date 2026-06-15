import { useMemo, useState } from 'react';
import { Save, Users } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';
import { Modal } from '../components/shared/Modal';
import { formatKEuro } from '../lib/format';
import { validateAllocationSave, calcRowKeuro, calcRowFte, rowNeedsWarning } from '../lib/allocationCalc';
import { K_EURO_RATES } from '../fixtures/cycles';
import { SOCIETES } from '../fixtures/societes';
import { useT } from '../i18n/useT';
import type { AllocationRow, Metier } from '../types';

export function AllocationPage() {
  return (
    <RoleGate permission="view:allocation">
      <AllocationContent />
    </RoleGate>
  );
}

function AllocationContent() {
  const lines = useDataStore((s) => s.lines);
  const allocations = useDataStore((s) => s.allocations);
  const cycles = useDataStore((s) => s.cycles);
  const saveDirtyAllocations = useDataStore((s) => s.saveDirtyAllocations);
  const can = useRoleStore((s) => s.can);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  // ALLOC-BR-15: active cycle only
  const activeCycleId = cycles.find((c) => c.is_active)?.id;

  // ALLOC-BR-01: only Approved lines from active cycle
  const allocatableLines = useMemo(
    () => lines.filter((l) => l.status === 'Approved' && l.cycleId === activeCycleId),
    [lines, activeCycleId],
  );

  // ALLOC-BR-14: filter by métier
  const [metierFilter, setMetierFilter] = useState<Metier | 'all'>('all');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [bulkSociete, setBulkSociete] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Local editable state (ALLOC-BR-05: dirty-row tracking)
  const [localRows, setLocalRows] = useState<Record<string, AllocationRow[]>>(() => {
    const init: Record<string, AllocationRow[]> = {};
    allocatableLines.forEach((l) => {
      const alloc = allocations.find((a) => a.lineId === l.id);
      init[l.id] = alloc?.splits ?? [];
    });
    return init;
  });

  const filteredLines = useMemo(
    () => allocatableLines.filter((l) => metierFilter === 'all' || l.metier === metierFilter),
    [allocatableLines, metierFilter],
  );

  const allMetiers = useMemo(
    () => [...new Set(allocatableLines.map((l) => l.metier))] as Metier[],
    [allocatableLines],
  );

  function getRateForMetier(metier: Metier): number {
    return K_EURO_RATES.find((r) => r.metier === metier)?.rate ?? 0;
  }

  function updateRow(lineId: string, rowId: string, patch: Partial<AllocationRow>) {
    setLocalRows((prev) => ({
      ...prev,
      [lineId]: (prev[lineId] ?? []).map((r) =>
        r.id === rowId
          ? {
              ...r,
              ...patch,
              isDirty: true,    // ALLOC-BR-05
            }
          : r,
      ),
    }));
  }

  function handleSave(lineId: string) {
    const rows = localRows[lineId] ?? [];
    const rate = getRateForMetier(lines.find((l) => l.id === lineId)!.metier);

    // ALLOC-BR-11: percentages must sum to 100%
    if (rows.length > 0) {
      const totalPct = rows.reduce((acc, r) => acc + r.percentage, 0);
      if (totalPct !== 100) {
        pushToast(`Split percentages must sum to 100% — currently ${totalPct}% (ALLOC-BR-11)`, 'error');
        return;
      }
    }

    // ALLOC-BR-04: recalculate K€ for dirty rows only
    const withKeuro = rows.map((r) =>
      r.isDirty ? { ...r, keuro: calcRowKeuro(r.days, rate) } : r,
    );

    const validation = validateAllocationSave(withKeuro);
    if (!validation.valid) {
      pushToast(t('alloc.saveFailed', { n: String(validation.errors.length) }), 'error');
      return;
    }

    const dirtyCount = withKeuro.filter((r) => r.isDirty).length;
    saveDirtyAllocations(lineId, withKeuro);
    setLocalRows((prev) => ({ ...prev, [lineId]: withKeuro.map((r) => ({ ...r, isDirty: false })) }));
    pushToast(t('alloc.saveSuccess', { n: String(dirtyCount) }), 'success');
  }

  // ALLOC-BR-12: split undo — collapses to single row restoring 100% (full delete of split)
  function handleUndoSplit(lineId: string) {
    setLocalRows((prev) => {
      const rows = prev[lineId] ?? [];
      if (rows.length <= 1) return prev;
      const first = { ...rows[0], percentage: 100, isDirty: true };
      return { ...prev, [lineId]: [first] };
    });
  }

  function handleBulkAssign() {
    if (!bulkSociete) return;
    // ALLOC-BR-09: bulk assign overwrites societe on selected rows
    // ALLOC-BR-10: never changes costType
    setLocalRows((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((lineId) => {
        updated[lineId] = updated[lineId].map((r) =>
          selectedRowIds.includes(r.id)
            ? { ...r, societe: bulkSociete, isDirty: true }
            : r,
        );
      });
      return updated;
    });
    setSelectedRowIds([]);
    setBulkSociete('');
    setShowBulkModal(false);
    pushToast(`Société asignada a ${selectedRowIds.length} fila(s)`, 'success');
  }

  if (!activeCycleId) {
    return <EmptyState title={t('alloc.noCycle')} />;
  }

  if (allocatableLines.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">{t('alloc.title')}</h1>
        <EmptyState title={t('alloc.noLines')} description={t('alloc.noLinesDesc')} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('alloc.title')}</h1>
          <p className="text-sm text-slate-600">{t('alloc.subtitle')}</p>
        </div>
        {can('edit:allocation') && selectedRowIds.length > 0 && (
          <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
            <Users size={14} /> {t('alloc.bulkSociete')} ({selectedRowIds.length})
          </Button>
        )}
      </div>

      {/* ALLOC-BR-14: filters — persist across in-page actions */}
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500">{t('alloc.filterMetier')}</label>
          <select
            value={metierFilter}
            onChange={(e) => setMetierFilter(e.target.value as Metier | 'all')}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="all">All</option>
            {allMetiers.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredLines.map((line) => {
          const rows = localRows[line.id] ?? [];
          const rate = getRateForMetier(line.metier);
          const hasDirty = rows.some((r) => r.isDirty);
          const hasBlocker = validateAllocationSave(rows).valid === false;

          return (
            <div key={line.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{line.lineName}</span>
                  <span className="text-xs text-slate-500">{line.id} · {line.metier}</span>
                  <StatusBadge status={line.status} />
                </div>
                <div className="flex gap-2">
                  {/* ALLOC-BR-12: undo split — only shown when multiple rows exist */}
                  {can('edit:allocation') && rows.length > 1 && (
                    <Button size="sm" variant="secondary" onClick={() => handleUndoSplit(line.id)}>
                      Undo split
                    </Button>
                  )}
                  {can('edit:allocation') && hasDirty && (
                    <Button
                      size="sm"
                      variant={hasBlocker ? 'secondary' : 'primary'}
                      onClick={() => handleSave(line.id)}
                    >
                      <Save size={14} /> {t('alloc.saveAll')}
                      {hasDirty && <span className="ml-1 text-xs opacity-70">({t('alloc.unsaved')})</span>}
                    </Button>
                  )}
                </div>
              </div>

              {rows.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">{t('alloc.unassigned')}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      {can('edit:allocation') && <th className="w-8 px-2 py-1.5 text-left" />}
                      <th className="px-3 py-1.5 text-right font-medium">{t('alloc.colFte')}</th>
                      <th className="px-3 py-1.5 text-left font-medium">{t('alloc.colSociete')}</th>
                      <th className="px-3 py-1.5 text-left font-medium">{t('alloc.colCostType')}</th>
                      {can('view:k-euro-rates') && <th className="px-3 py-1.5 text-right font-medium">{t('alloc.colKeuro')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const warn = rowNeedsWarning(row);  // ALLOC-BR-07
                      return (
                        <tr
                          key={row.id}
                          className={`border-t border-slate-100 ${row.isDirty ? 'bg-amber-50' : ''} ${warn ? 'bg-orange-50' : ''}`}
                        >
                          {can('edit:allocation') && (
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={selectedRowIds.includes(row.id)}
                                onChange={(e) =>
                                  setSelectedRowIds((ids) =>
                                    e.target.checked ? [...ids, row.id] : ids.filter((id) => id !== row.id),
                                  )
                                }
                              />
                            </td>
                          )}
                          {/* ALLOC-BR-03: FTE read-only */}
                          <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                            {calcRowFte(row.days).toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            {can('edit:allocation') ? (
                              <select
                                value={row.societe ?? ''}
                                onChange={(e) =>
                                  updateRow(line.id, row.id, { societe: e.target.value || null })
                                }
                                className={`w-full rounded border px-2 py-1 text-sm ${
                                  warn
                                    ? 'border-orange-300 bg-orange-50'
                                    : !row.societe && (row.costType === 'TSA' || row.costType === 'TC')
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-slate-300'
                                }`}
                              >
                                <option value="">— select —</option>
                                {SOCIETES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <span>{row.societe ?? <span className="text-slate-400">—</span>}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {can('edit:allocation') ? (
                              <select
                                value={row.costType}
                                onChange={(e) =>
                                  updateRow(line.id, row.id, { costType: e.target.value as 'FTE' | 'TSA' | 'TC' })
                                }
                                className="rounded border border-slate-300 px-2 py-1 text-sm"
                              >
                                <option value="FTE">FTE</option>
                                <option value="TSA">TSA</option>
                                <option value="TC">TC</option>
                              </select>
                            ) : (
                              <span>{row.costType}</span>
                            )}
                          </td>
                          {can('view:k-euro-rates') && (
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.isDirty ? (
                                <span className="text-xs text-amber-600">
                                  ≈{formatKEuro(calcRowKeuro(row.days, rate))}
                                </span>
                              ) : (
                                formatKEuro(row.keuro)
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk societe modal (ALLOC-BR-09/10) */}
      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title={t('alloc.bulkSociete')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkModal(false)}>{t('alloc.cancel')}</Button>
            <Button variant="primary" onClick={handleBulkAssign} disabled={!bulkSociete}>
              {t('alloc.bulkSocieteApply')}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Assigning société to {selectedRowIds.length} row(s). Cost type will not change (ALLOC-BR-10).
        </p>
        <select
          value={bulkSociete}
          onChange={(e) => setBulkSociete(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— select société —</option>
          {SOCIETES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Modal>
    </div>
  );
}
