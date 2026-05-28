import { useMemo, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { GridFiltersBar, type GridFilters } from '../components/grid/GridFilters';
import { ProjectLineGrid } from '../components/grid/ProjectLineGrid';
import { BulkActionsBar } from '../components/grid/BulkActionsBar';
import { EstimationPanel } from '../components/estimation/EstimationPanel';
import { EmptyState } from '../components/shared/EmptyState';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { checkCompatibility } from '../lib/compatibility';
import { useT } from '../i18n/useT';
import type { Metier } from '../types';

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
  } = useUIStore();

  const t = useT();
  const [filters, setFilters] = useState<GridFilters>({ status: 'all', metier: 'all', search: '' });
  const [compatibleMode, setCompatibleMode] = useState(false);

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

  const compatibleGroups = useMemo(() => {
    if (!compatibleMode) return null;
    const groups = new Map<Metier, typeof visibleLines>();
    for (const line of visibleLines) {
      const group = groups.get(line.metier) ?? [];
      group.push(line);
      groups.set(line.metier, group);
    }
    return [...groups.entries()].map(([metier, groupLines]) => ({ metier, lines: groupLines }));
  }, [visibleLines, compatibleMode]);

  function handleBulkEstimate() {
    if (selectedLineIds.length > 0) {
      openEstimationPanel(selectedLineIds[0]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('preEst.title')}</h1>
          <p className="text-sm text-slate-600">
            {can('view:own-lines-only') ? t('preEst.descOwn') : t('preEst.descAll')}
          </p>
        </div>
        <Button
          variant={compatibleMode ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setCompatibleMode((v) => !v)}
        >
          <LayoutGrid size={14} />
          {t('preEst.compatibleMode')}
        </Button>
      </div>

      <GridFiltersBar value={filters} onChange={setFilters} />

      {showSelection && (
        <BulkActionsBar
          count={selectedLineIds.length}
          compatibility={compatibility}
          onClear={clearSelection}
          onBulkEstimate={role !== 'Engineer' ? handleBulkEstimate : undefined}
        />
      )}

      {visibleLines.length === 0 ? (
        <EmptyState
          title={t('preEst.noLines')}
          description={can('view:own-lines-only') ? t('preEst.noLinesOwn') : t('preEst.noLinesAll')}
        />
      ) : compatibleGroups ? (
        <div className="space-y-6">
          {compatibleGroups.map(({ metier, lines: groupLines }) => (
            <div key={metier}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {metier}
                </span>
                <span className="text-xs text-slate-400">({t('preEst.lines', { n: groupLines.length })})</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>
              <ProjectLineGrid
                lines={groupLines}
                selectedIds={selectedLineIds}
                onToggleSelect={toggleSelect}
                onRowClick={(id) => openEstimationPanel(id)}
                showSelection={showSelection}
                showKEuro={showKEuro}
              />
            </div>
          ))}
        </div>
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
