import { useMemo, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { GridFiltersBar, type GridFilters } from '../components/grid/GridFilters';
import { ProjectLineGrid } from '../components/grid/ProjectLineGrid';
import { BulkActionsBar } from '../components/grid/BulkActionsBar';
import { EstimationPanel } from '../components/estimation/EstimationPanel';
import { EmptyState } from '../components/shared/EmptyState';
import { RoleGate } from '../components/shared/RoleGate';
import { checkCompatibility } from '../lib/compatibility';

export function PreEstimationPage() {
  return (
    <RoleGate permission="view:pre-estimation">
      <PreEstimationContent />
    </RoleGate>
  );
}

function PreEstimationContent() {
  const role = useRoleStore((s) => s.currentRole);
  const activeEngineerId = useRoleStore((s) => s.activeEngineerId);
  const can = useRoleStore((s) => s.can);
  const lines = useDataStore((s) => s.lines);
  const {
    selectedLineIds,
    toggleSelect,
    clearSelection,
    estimationPanelLineId,
    openEstimationPanel,
    openBulkEstimation,
  } = useUIStore();

  const [filters, setFilters] = useState<GridFilters>({ status: 'all', metier: 'all', search: '' });

  const visibleLines = useMemo(() => {
    let list = lines;
    if (can('view:own-lines-only') && activeEngineerId) {
      list = list.filter((l) => l.assignedEngineerId === activeEngineerId);
    }
    if (filters.status !== 'all') list = list.filter((l) => l.status === filters.status);
    if (filters.metier !== 'all') list = list.filter((l) => l.metier === filters.metier);
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.lineName.toLowerCase().includes(q) ||
          l.projectName.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [lines, filters, can, activeEngineerId]);

  const selectedLines = useMemo(
    () => lines.filter((l) => selectedLineIds.includes(l.id)),
    [lines, selectedLineIds],
  );
  const compatibility = useMemo(() => checkCompatibility(selectedLines), [selectedLines]);

  const showSelection = role !== 'RCRC';
  const showKEuro = can('view:k-euro-rates') || role === 'Engineer';

  const currentLine = lines.find((l) => l.id === estimationPanelLineId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pre-Estimation</h1>
          <p className="text-sm text-slate-600">
            {can('view:own-lines-only')
              ? 'Tus project lines asignadas. Click en una fila para estimar.'
              : 'Todas las project lines del portfolio. Filtros, multi-line y bulk actions habilitados.'}
          </p>
        </div>
      </div>

      <GridFiltersBar value={filters} onChange={setFilters} />

      {showSelection && (
        <BulkActionsBar
          count={selectedLineIds.length}
          compatibility={compatibility}
          onClear={clearSelection}
          onBulkEstimate={role !== 'Engineer' ? () => openBulkEstimation(selectedLineIds) : undefined}
        />
      )}

      {visibleLines.length === 0 ? (
        <EmptyState
          title="No hay project lines"
          description={
            can('view:own-lines-only')
              ? 'No tenés líneas asignadas con los filtros actuales.'
              : 'Sin resultados para los filtros aplicados.'
          }
        />
      ) : (
        <ProjectLineGrid
          lines={visibleLines}
          selectedIds={selectedLineIds}
          onToggleSelect={toggleSelect}
          onRowClick={(id) => openEstimationPanel(id)}
          showSelection={showSelection}
          showKEuro={showKEuro}
        />
      )}

      {currentLine && (
        <EstimationPanel line={currentLine} onClose={() => openEstimationPanel(null)} />
      )}
    </div>
  );
}
