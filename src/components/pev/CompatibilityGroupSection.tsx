import { useState } from 'react';
import { GridFiltersBar } from '../grid/GridFilters';
import { ProjectLineGrid } from '../grid/ProjectLineGrid';
import { applyUiFilters, DEFAULT_FILTERS, type GridFilters } from '../../lib/gridFilter';
import type { CompatibilityGroup } from '../../lib/grouping';
import { useT } from '../../i18n/useT';

interface Props {
  group: CompatibilityGroup;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onRowClick: (id: string) => void;
  showSelection: boolean;
  showKEuro: boolean;
  showAllColumns: boolean;
  showOwnerFilters: boolean;
}

export function CompatibilityGroupSection({
  group,
  selectedIds,
  onToggleSelect,
  onRowClick,
  showSelection,
  showKEuro,
  showAllColumns,
  showOwnerFilters,
}: Props) {
  const [filters, setFilters] = useState<GridFilters>(DEFAULT_FILTERS);
  const t = useT();
  const visibleLines = applyUiFilters(group.lines, filters);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {group.key}
        </span>
        <span className="text-xs text-slate-400">
          {visibleLines.length === group.lines.length
            ? `(${t('preEst.lines', { n: group.lines.length })})`
            : `(${visibleLines.length} / ${t('preEst.lines', { n: group.lines.length })})`}
        </span>
        <div className="flex-1 border-t border-slate-200" />
      </div>
      <GridFiltersBar value={filters} onChange={setFilters} showOwnerFilters={showOwnerFilters} />
      <ProjectLineGrid
        lines={visibleLines}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onRowClick={onRowClick}
        showSelection={showSelection}
        showKEuro={showKEuro}
        showAllColumns={showAllColumns}
      />
    </div>
  );
}
