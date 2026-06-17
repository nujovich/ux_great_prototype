// src/pages/EstimationReviewPage.tsx
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useRoleStore } from '../store/roleStore';
import { useUIStore } from '../store/uiStore';
import { RoleGate } from '../components/shared/RoleGate';
import { Button } from '../components/shared/Button';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';
import { useT } from '../i18n/useT';
import { useSortable } from '../lib/useSortable';
import { deriveGridRow } from '../lib/estimationReviewRows';
import { generateCsv, downloadCsv } from '../lib/estimationReviewCsv';
import { groupRowsByAssignee } from '../lib/estimationReviewGrouping';
import { ENGINEERS } from '../fixtures/engineers';
import { INDUCTORS } from '../fixtures/inductors';
import type { LineStatus, Metier } from '../types';

export function EstimationReviewPage() {
  return (
    <RoleGate permission="view:estimation-review">
      <ReviewContent />
    </RoleGate>
  );
}

function ReviewContent() {
  const lines = useDataStore((s) => s.lines);
  const estimations = useDataStore((s) => s.estimations);
  const activeCycle = useDataStore((s) => s.cycles.find((c) => c.is_active));
  const currentRole = useRoleStore((s) => s.currentRole);
  const activeEngineerId = useRoleStore((s) => s.activeEngineerId);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  // Derive cycle years for yearly K€ columns from start_date (e.g. "2026-01-01" → 2026)
  const cycleYears = useMemo<string[]>(() => {
    if (!activeCycle) return [];
    const start = Number(activeCycle.start_date.slice(0, 4));
    if (!Number.isFinite(start)) return [];
    return Array.from({ length: 4 }, (_, i) => String(start + i));
  }, [activeCycle]);

  // ERev-BR-09: active cycle only; ERev-BR-06: engineers see own rows
  const cycleLines = useMemo(() => {
    let result = activeCycle
      ? lines.filter((l) => l.cycleId === activeCycle.id)
      : lines;
    if (currentRole === 'Engineer' && activeEngineerId) {
      result = result.filter((l) => l.assignedEngineerId === activeEngineerId);
    }
    return result;
  }, [lines, activeCycle, currentRole, activeEngineerId]);

  // Derive grid rows (FTE/BH/KM + approval cols)
  const allRows = useMemo(
    () => cycleLines.map((l) => deriveGridRow(l, estimations[l.id], INDUCTORS, cycleYears)),
    [cycleLines, estimations, cycleYears],
  );

  // ── Filter state ──────────────────────────────────────────
  const [searchPl, setSearchPl] = useState('');
  const [filterMetier, setFilterMetier] = useState<string>('');
  const [filterStatuses, setFilterStatuses] = useState<LineStatus[]>([]);
  const [filterAssignee, setFilterAssignee] = useState('');

  const availableMetiers = useMemo(
    () => [...new Set(allRows.map((r) => r.metier).filter(Boolean))] as Metier[],
    [allRows],
  );
  const availableStatuses: LineStatus[] = [
    'To do', 'Draft', 'Estimated', 'Sent', 'Approved', 'Modification Requested',
  ];
  const availableEngineers = useMemo(
    // ENGINEERS is a static fixture (never changes at runtime)
    () => ENGINEERS.filter((e) => allRows.some((r) => r.assignedEngineerId === e.id)),
    [allRows],
  );

  const filteredRows = useMemo(() => {
    const plLower = searchPl.toLowerCase();
    return allRows.filter((r) => {
      if (plLower && !r.id.toLowerCase().includes(plLower) && !r.lineName.toLowerCase().includes(plLower)) return false;
      if (filterMetier && r.metier !== filterMetier) return false;
      if (filterStatuses.length > 0 && !filterStatuses.includes(r.status)) return false;
      if (filterAssignee && r.assignedEngineerId !== filterAssignee) return false;
      return true;
    });
  }, [allRows, searchPl, filterMetier, filterStatuses, filterAssignee]);

  function clearFilters() {
    setSearchPl('');
    setFilterMetier('');
    setFilterStatuses([]);
    setFilterAssignee('');
  }
  const hasActiveFilters = Boolean(searchPl || filterMetier || filterStatuses.length || filterAssignee);

  // ── Row selection ─────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Derive visible selection: only selected IDs that exist in current filtered view
  const visibleSelectedIds = useMemo(
    () => selectedIds.filter((id) => filteredRows.some((r) => r.id === id)),
    [selectedIds, filteredRows],
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  // ── Sorting ───────────────────────────────────────────────
  const { sorted, requestSort, getSortIcon } = useSortable(filteredRows);

  // ── Grouping ──────────────────────────────────────────────
  const groups = useMemo(
    () =>
      groupRowsByAssignee(
        sorted,
        (id) => (id ? (ENGINEERS.find((e) => e.id === id)?.name ?? id) : t('estReview.unassigned')),
        cycleYears,
      ),
    [sorted, cycleYears, t],
  );

  // ── CSV export ────────────────────────────────────────────
  function handleExportSelected() {
    if (visibleSelectedIds.length === 0) {
      pushToast(t('estReview.exportNoneSelected'), 'info');
      return;
    }
    const csv = generateCsv(filteredRows, visibleSelectedIds, cycleYears);
    downloadCsv(csv, 'estimation-review-selected.csv');
  }

  function handleExportAllFiltered() {
    const csv = generateCsv(filteredRows, [], cycleYears);
    downloadCsv(csv, 'estimation-review-all.csv');
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('estReview.title')}</h1>
        <p className="text-sm text-slate-600">{t('estReview.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder={t('estReview.filterPlSearch')}
          value={searchPl}
          onChange={(e) => setSearchPl(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
        <select
          value={filterMetier}
          onChange={(e) => setFilterMetier(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">{t('estReview.filterMetierAll')}</option>
          {availableMetiers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          multiple
          value={filterStatuses}
          onChange={(e) =>
            setFilterStatuses(
              Array.from(e.target.selectedOptions, (o) => o.value as LineStatus),
            )
          }
          size={1}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          title={t('estReview.filterStatus')}
        >
          {availableStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {(currentRole === 'PMO' || currentRole === 'Admin') && (
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">{t('estReview.filterAssigneeAll')}</option>
            {availableEngineers.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-slate-500 underline hover:text-slate-700"
          >
            {t('estReview.clearFilters')}
          </button>
        )}
      </div>

      {/* Toolbar: selection + export */}
      <div className="flex items-center justify-between">
        {visibleSelectedIds.length > 0 && (
          <span className="text-xs text-slate-500">
            {t('estReview.selectedCount', { n: visibleSelectedIds.length })}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleExportSelected}>
            <Download size={14} /> {t('estReview.exportSelected')}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleExportAllFiltered}>
            <Download size={14} /> {t('estReview.exportAllFiltered')}
          </Button>
        </div>
      </div>

      {/* Grid — one subtable per assignee */}
      {filteredRows.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? t('estReview.noLinesFiltered') : t('estReview.noLines')}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.assigneeId ?? '__unassigned__'} className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm font-semibold text-slate-700">{group.assigneeName}</span>
                <span className="text-xs text-slate-400">
                  {t('estReview.groupLineCount', { n: group.rows.length })}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="w-8 px-3 py-2 text-left" />
                    <th className="cursor-pointer px-3 py-2 text-left font-medium min-w-[80px]" onClick={() => requestSort('id')}>
                      {t('estReview.colPlNumber')} {getSortIcon('id')}
                    </th>
                    <th className="cursor-pointer px-3 py-2 text-left font-medium min-w-[120px]" onClick={() => requestSort('lineName')}>
                      {t('estReview.colPlName')} {getSortIcon('lineName')}
                    </th>
                    <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('metier')}>
                      {t('estReview.colMetier')} {getSortIcon('metier')}
                    </th>
                    <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => requestSort('status')}>
                      {t('estReview.colStatus')} {getSortIcon('status')}
                    </th>
                    <th className="px-3 py-2 text-left font-medium">{t('estReview.colEngineerApproval')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('estReview.colCpoApproval')}</th>
                    <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('totalFte')}>
                      {t('estReview.colTotalFte')} {getSortIcon('totalFte')}
                    </th>
                    <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('totalBh')}>
                      {t('estReview.colTotalBh')} {getSortIcon('totalBh')}
                    </th>
                    <th className="cursor-pointer px-3 py-2 text-right font-medium" onClick={() => requestSort('totalKm')}>
                      {t('estReview.colTotalKm')} {getSortIcon('totalKm')}
                    </th>
                    {cycleYears.flatMap((y) => [
                      <th key={`fte-${y}`} className="px-3 py-2 text-right font-medium whitespace-nowrap">FTE {y}</th>,
                      <th key={`bh-${y}`}  className="px-3 py-2 text-right font-medium whitespace-nowrap">BH {y}</th>,
                      <th key={`km-${y}`}  className="px-3 py-2 text-right font-medium whitespace-nowrap">KM {y}</th>,
                      <th key={`ke-${y}`}  className="px-3 py-2 text-right font-medium whitespace-nowrap">K€ {y}</th>,
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => {
                    const isSelected = selectedIds.includes(row.id);
                    return (
                      <tr key={row.id} className={`border-t border-slate-100 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(row.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{row.id}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-slate-900">{row.lineName}</div>
                          <div className="text-xs text-slate-500">{row.projectName}</div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{row.metier ?? '—'}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                        <td className="px-3 py-2.5 text-slate-600">{row.engineerApproval}</td>
                        <td className="px-3 py-2.5 text-slate-600">{row.cpoApproval}</td>
                        <td className="px-3 py-2.5 text-right">{row.totalFte.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right">{row.totalBh.toFixed(1)}</td>
                        <td className="px-3 py-2.5 text-right">{row.totalKm.toFixed(0)}</td>
                        {cycleYears.flatMap((y) => [
                          <td key={`fte-${y}`} className="px-3 py-2.5 text-right text-slate-400">{(row.yearlyFte[y] ?? 0).toFixed(2)}</td>,
                          <td key={`bh-${y}`}  className="px-3 py-2.5 text-right text-slate-400">{(row.yearlyBh[y]  ?? 0).toFixed(1)}</td>,
                          <td key={`km-${y}`}  className="px-3 py-2.5 text-right text-slate-400">{(row.yearlyKm[y]  ?? 0).toFixed(0)}</td>,
                          <td key={`ke-${y}`}  className="px-3 py-2.5 text-right">{(row.yearlyKEuro[y] ?? 0).toFixed(1)}</td>,
                        ])}
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-700">
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" colSpan={6}>{t('estReview.subtotal')}</td>
                    <td className="px-3 py-2 text-right">{group.subtotal.totalFte.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{group.subtotal.totalBh.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right">{group.subtotal.totalKm.toFixed(0)}</td>
                    {cycleYears.flatMap((y) => [
                      <td key={`fte-${y}`} className="px-3 py-2 text-right">{group.subtotal.yearlyFte[y].toFixed(2)}</td>,
                      <td key={`bh-${y}`}  className="px-3 py-2 text-right">{group.subtotal.yearlyBh[y].toFixed(1)}</td>,
                      <td key={`km-${y}`}  className="px-3 py-2 text-right">{group.subtotal.yearlyKm[y].toFixed(0)}</td>,
                      <td key={`ke-${y}`}  className="px-3 py-2 text-right">{group.subtotal.yearlyKEuro[y].toFixed(1)}</td>,
                    ])}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
