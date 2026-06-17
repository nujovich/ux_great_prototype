import type { ProjectLine, Allocation, AllocationRow } from '../types';

/**
 * Predicate: returns only approved lines for the active cycle.
 * Extracted from FinalReviewPage for testability (FR-BR-09).
 */
export function filterApprovedLines(lines: ProjectLine[], activeCycleId: string): ProjectLine[] {
  return lines.filter((l) => l.status === 'Approved' && l.cycleId === activeCycleId);
}

/**
 * Builds the flat list of AllocationRow entries for on-screen / XLSX rendering.
 *
 * Mirrors the join in finalReviewCsv.ts: an approved line with NO allocation splits
 * emits a single zero-placeholder row (FR spec: incomplete-allocation lines must be
 * INCLUDED with zero K€ so PMO has visibility).
 */
export function buildApprovedRows(lines: ProjectLine[], allocations: Allocation[]): AllocationRow[] {
  const allocByLine = new Map(allocations.map((a) => [a.lineId, a]));
  const rows: AllocationRow[] = [];

  for (const line of lines) {
    const alloc = allocByLine.get(line.id);
    const splits = alloc?.splits ?? [];

    if (splits.length === 0) {
      // Zero-placeholder row — matches the CSV zero-row emitted by finalReviewCsv.ts
      rows.push({
        id: `${line.id}__placeholder`,
        plNumber: line.id,
        plName: line.lineName,
        metier: line.metier ?? '',
        ownerN2: '',
        juCode: '—',
        juDescription: '—',
        fmmDescription: '—',
        organType: '',
        energy: '',
        allianceCode: '',
        vehicleCode: '',
        standardEmissions: '',
        market: '',
        totalFte: 0,
        fteByYear: {},
        keByYear: {},
        societe: null,
        costType: 'FTE',
        fte: 0,
        keuro: 0,
        engineerId: '',
        percentage: 0,
        days: 0,
        isDirty: false,
      });
    } else {
      rows.push(...splits);
    }
  }

  return rows;
}
