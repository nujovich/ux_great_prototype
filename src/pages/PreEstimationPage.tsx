import { useMemo, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { GridFiltersBar } from '../components/grid/GridFilters';
import { applyGridFilters, shouldShowOwnerFilters, type GridFilters } from '../lib/gridFilter';
import { ProjectLineGrid } from '../components/grid/ProjectLineGrid';
import { BulkActionsBar } from '../components/grid/BulkActionsBar';
import { EstimationPanel } from '../components/estimation/EstimationPanel';
import { EmptyState } from '../components/shared/EmptyState';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { checkCompatibility } from '../lib/compatibility';
import { groupByCompatibility } from '../lib/grouping';
import { useT } from '../i18n/useT';

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
  const [filters, setFilters] = useState<GridFilters>({ status: 'all', metier: 'all', assignee: 'all', search: '' });
  const [compatibleMode, setCompatibleMode] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(false);

  const visibleLines = useMemo(
    () => applyGridFilters(lines, filters, { ownOnly: can('view:own-lines-only'), activeEngineerId }),
    [lines, filters, can, activeEngineerId],
  );

  const selectedLines = useMemo(
    () => lines.filter((l) => selectedLineIds.includes(l.id)),
    [lines, selectedLineIds],
  );
  const compatibility = useMemo(() => checkCompatibility(selectedLines), [selectedLines]);

  const showSelection = role !== 'RCRC';
  const showKEuro = can('view:k-euro-rates') || role === 'Engineer';

  const currentLine = lines.find((l) => l.id === estimationPanelLineId) ?? null;

  const compatibleGroups = useMemo(
    () => (compatibleMode ? groupByCompatibility(visibleLines) : null),
    [visibleLines, compatibleMode],
  );

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
        <div className="flex items-center gap-2">
          <Button
            variant={showAllColumns ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowAllColumns((v) => !v)}
          >
            {t('showAllColumns')}
          </Button>
          <Button
            variant={compatibleMode ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setCompatibleMode((v) => !v)}
          >
            <LayoutGrid size={14} />
            {t('preEst.compatibleMode')}
          </Button>
        </div>
      </div>

      <GridFiltersBar value={filters} onChange={setFilters} showOwnerFilters={shouldShowOwnerFilters(can('view:own-lines-only'))} />

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
          {compatibleGroups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {group.key}
                </span>
                <span className="text-xs text-slate-400">({t('preEst.lines', { n: group.lines.length })})</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>
              <ProjectLineGrid
                lines={group.lines}
                selectedIds={selectedLineIds}
                onToggleSelect={toggleSelect}
                onRowClick={(id) => openEstimationPanel(id)}
                showSelection={showSelection}
                showKEuro={showKEuro}
                showAllColumns={showAllColumns}
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
          showAllColumns={showAllColumns}
        />
      )}

      {currentLine && (
        <EstimationPanel line={currentLine} onClose={() => openEstimationPanel(null)} />
      )}
    </div>
  );
}
