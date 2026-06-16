import { useState, useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { RoleGate } from '../components/shared/RoleGate';
import { AllocationFilters } from '../components/allocation/AllocationFilters';
import { AllocationGrid } from '../components/allocation/AllocationGrid';
import { TCPopup } from '../components/allocation/TCPopup';
import { SplitModal } from '../components/allocation/SplitModal';
import { Modal } from '../components/shared/Modal';
import type { AllocationRow, AllocationFilterState, CostType } from '../types';
import {
  applyAllocationFilters,
  sortAllocationRows,
  splitFteProportional,
  validateAllocationSave,
} from '../lib/allocationCalc';
import { SOCIETES } from '../fixtures/societes';

const EMPTY_FILTERS: AllocationFilterState = {
  plSearch: '',
  metier: '',
  ownerN2: '',
  societe: '',
  costType: '',
  unresolvedOnly: false,
};

const ACTIVE_YEARS = ['2025', '2026'];

function AllocationContent() {
  const can = useRoleStore((s) => s.can);
  const allocations = useDataStore((s) => s.allocations);
  const saveDirtyAllocations = useDataStore((s) => s.saveDirtyAllocations);

  // Single source of truth — includes split children inserted inline (not in the store)
  const [displayRows, setDisplayRows] = useState<AllocationRow[]>(() =>
    sortAllocationRows(allocations.flatMap((a) => a.splits)),
  );

  // Filters — preserved across in-page actions, reset on unmount (ALLOC-BR-14)
  const [filters, setFilters] = useState<AllocationFilterState>(EMPTY_FILTERS);
  const filteredRows = useMemo(
    () => applyAllocationFilters(displayRows, filters),
    [displayRows, filters],
  );

  // Bulk selection scoped to filteredRows (ALLOC-BR-25)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const handleSelectRow = (id: string, checked: boolean) =>
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  const handleSelectAll = (checked: boolean, ids: string[]) =>
    setSelectedIds((prev) =>
      checked
        ? [...new Set([...prev, ...ids])]
        : prev.filter((x) => !ids.includes(x)),
    );

  const updateRow = (id: string, patch: Partial<AllocationRow>) =>
    setDisplayRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, isDirty: true } : r)),
    );

  // Inline cell changes
  const handleChangeSociete = (rowId: string, societe: string) =>
    updateRow(rowId, { societe: societe || null });

  const handleChangeCostType = (rowId: string, costType: CostType) => {
    updateRow(rowId, { costType });
    if (costType === 'TC') {
      setTcTarget(displayRows.find((r) => r.id === rowId) ?? null);
    }
  };

  // TC popup (ALLOC-BR-20/21)
  const [tcTarget, setTcTarget] = useState<AllocationRow | null>(null);
  const handleTcConfirm = (keByYear: Record<string, number>) => {
    if (tcTarget) updateRow(tcTarget.id, { keByYear });
    setTcTarget(null);
  };
  const handleTcCancel = () => {
    if (tcTarget) {
      // Revert costType to its value before the TC change
      const original = allocations.flatMap((a) => a.splits).find((r) => r.id === tcTarget.id);
      if (original) updateRow(tcTarget.id, { costType: original.costType, isDirty: false });
    }
    setTcTarget(null);
  };

  // Split (ALLOC-BR-22/23/24)
  const [splitTarget, setSplitTarget] = useState<AllocationRow | null>(null);
  const handleSplitConfirm = (slots: Array<{ societe: string; percentage: number }>) => {
    if (!splitTarget) return;
    const childFteByYear = splitFteProportional(
      splitTarget.fteByYear,
      slots.map((s) => s.percentage),
    );
    const children: AllocationRow[] = slots.map((slot, i) => ({
      ...splitTarget,
      id: `${splitTarget.id}-split-${i}`,
      societe: slot.societe || null,
      percentage: slot.percentage,
      fteByYear: childFteByYear[i],
      keByYear: Object.fromEntries(Object.keys(splitTarget.fteByYear).map((y) => [y, 0])),
      isSplitChild: true,
      splitParentId: splitTarget.id,
      isDirty: true,
    }));
    // Replace parent row with child rows in place
    setDisplayRows((prev) => {
      const idx = prev.findIndex((r) => r.id === splitTarget.id);
      return [...prev.slice(0, idx), ...children, ...prev.slice(idx + 1)];
    });
    setSplitTarget(null);
  };

  // Undo split (ALLOC-BR-12): restore original row from store, remove all children
  const handleUndoSplit = (rowId: string) => {
    const row = displayRows.find((r) => r.id === rowId);
    if (!row?.splitParentId) return;
    const parentId = row.splitParentId;
    const original = allocations.flatMap((a) => a.splits).find((r) => r.id === parentId);
    if (!original) return;
    setDisplayRows((prev) => {
      const firstChildIdx = prev.findIndex((r) => r.splitParentId === parentId);
      const withoutChildren = prev.filter((r) => r.splitParentId !== parentId);
      return [
        ...withoutChildren.slice(0, firstChildIdx),
        { ...original, isDirty: false },
        ...withoutChildren.slice(firstChildIdx),
      ];
    });
  };

  // Bulk société (ALLOC-BR-09/10)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSociete, setBulkSociete] = useState('');
  const handleBulkApply = () => {
    setDisplayRows((prev) =>
      prev.map((r) =>
        selectedIds.includes(r.id) ? { ...r, societe: bulkSociete, isDirty: true } : r,
      ),
    );
    setSelectedIds([]);
    setShowBulkModal(false);
    setBulkSociete('');
  };

  // Save: group dirty rows by their parent Allocation lineId, then call saveDirtyAllocations per lineId
  const handleSave = () => {
    const dirty = displayRows.filter((r) => r.isDirty);
    const { valid, errors } = validateAllocationSave(dirty);
    if (!valid) {
      alert(errors.join('\n'));
      return;
    }

    // Build a map of rowId -> lineId using the store's allocations
    const rowToLineId = new Map<string, string>();
    allocations.forEach((a) => {
      a.splits.forEach((sp) => rowToLineId.set(sp.id, a.lineId));
    });

    // Group all displayRows by lineId; dirty row ids can come from splits or split children
    // Split children carry splitParentId which maps back to the store row
    const lineIdGroups = new Map<string, AllocationRow[]>();
    allocations.forEach((a) => {
      lineIdGroups.set(a.lineId, []);
    });

    displayRows.forEach((r) => {
      // Determine lineId: use direct mapping for store rows, or parent mapping for split children
      const originId = r.splitParentId ?? r.id;
      const lineId = rowToLineId.get(originId);
      if (lineId) {
        const group = lineIdGroups.get(lineId);
        if (group) group.push(r);
      }
    });

    lineIdGroups.forEach((rows, lineId) => {
      if (rows.some((r) => r.isDirty)) {
        saveDirtyAllocations(lineId, rows);
      }
    });

    setDisplayRows((prev) => prev.map((r) => ({ ...r, isDirty: false })));
  };

  // Derived filter dropdown options
  const metierOptions = useMemo(
    () => [...new Set(displayRows.map((r) => r.metier))].sort(),
    [displayRows],
  );
  const ownerN2Options = useMemo(
    () => [...new Set(displayRows.map((r) => r.ownerN2))].sort(),
    [displayRows],
  );
  // SOCIETES is readonly — spread to mutable string[]
  const societeOptions = [...SOCIETES];

  const dirtyCount = displayRows.filter((r) => r.isDirty).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Allocation</h1>
          <p className="text-sm text-gray-500">
            Assignment of approved job units to societes and cost types.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {can('edit:allocation') && filteredRows.length > 0 && (
            <label className="flex items-center gap-1 text-sm text-gray-600">
              <input
                type="checkbox"
                aria-label="Select all filtered"
                checked={
                  filteredRows.length > 0 &&
                  filteredRows.every((r) => selectedIds.includes(r.id))
                }
                onChange={(e) =>
                  handleSelectAll(e.target.checked, filteredRows.map((r) => r.id))
                }
              />
              Select all filtered ({filteredRows.length})
            </label>
          )}
          {can('edit:allocation') && selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Bulk assign société ({selectedIds.length})
            </button>
          )}
          {can('edit:allocation') && dirtyCount > 0 && (
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save ({dirtyCount} changed)
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <AllocationFilters
        filters={filters}
        onChange={setFilters}
        metierOptions={metierOptions}
        ownerN2Options={ownerN2Options}
        societeOptions={societeOptions}
      />

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <AllocationGrid
          rows={filteredRows}
          canEdit={can('edit:allocation')}
          selectedIds={selectedIds}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          onChangeSociete={handleChangeSociete}
          onChangeCostType={handleChangeCostType}
          onSplit={(id) => setSplitTarget(displayRows.find((r) => r.id === id) ?? null)}
          onUndoSplit={handleUndoSplit}
          activeYears={ACTIVE_YEARS}
          canViewKeuro={can('view:k-euro-rates')}
        />
      </div>

      {tcTarget && (
        <TCPopup open row={tcTarget} onConfirm={handleTcConfirm} onCancel={handleTcCancel} />
      )}
      {splitTarget && (
        <SplitModal
          open
          row={splitTarget}
          societeOptions={societeOptions}
          onConfirm={handleSplitConfirm}
          onClose={() => setSplitTarget(null)}
        />
      )}

      <Modal
        open={showBulkModal}
        title="Bulk assign société"
        onClose={() => setShowBulkModal(false)}
      >
        <p className="text-sm text-gray-600 mb-3">
          Assign société to {selectedIds.length} selected row
          {selectedIds.length !== 1 ? 's' : ''}. Cost type is not changed (ALLOC-BR-10).
        </p>
        <select
          value={bulkSociete}
          onChange={(e) => setBulkSociete(e.target.value)}
          className="border rounded px-2 py-1 text-sm w-full mb-4"
        >
          <option value="">— Select société —</option>
          {societeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowBulkModal(false)}
            className="px-3 py-1 text-sm border rounded"
          >
            Cancel
          </button>
          <button
            disabled={!bulkSociete}
            onClick={handleBulkApply}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-40"
          >
            Apply to selected
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function AllocationPage() {
  return (
    <RoleGate permission="view:allocation">
      <AllocationContent />
    </RoleGate>
  );
}
