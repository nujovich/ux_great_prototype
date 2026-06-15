import type { LineStatus, Metier, ProjectLine } from '../types';

export interface GridFilters {
  status: LineStatus | 'all';
  metier: Metier | 'all';
  assignee: string | 'all';
  search: string;
}

export interface OwnerScope {
  ownOnly: boolean;
  activeEngineerId: string | null;
}

export const DEFAULT_FILTERS: GridFilters = {
  status: 'all',
  metier: 'all',
  assignee: 'all',
  search: '',
};

/** Applies only the owner-scope gate (Engineer sees own lines only). */
export function applyOwnerScope(lines: ProjectLine[], scope: OwnerScope): ProjectLine[] {
  if (scope.ownOnly && scope.activeEngineerId) {
    return lines.filter((l) => l.assignedEngineerId === scope.activeEngineerId);
  }
  return lines;
}

/** Applies UI filter controls (status, métier, assignee, search) — no owner scoping. */
export function applyUiFilters(lines: ProjectLine[], f: GridFilters): ProjectLine[] {
  let list = lines;
  if (f.status !== 'all') list = list.filter((l) => l.status === f.status);
  if (f.metier !== 'all') list = list.filter((l) => l.metier === f.metier);
  if (f.assignee !== 'all') list = list.filter((l) => l.assignedEngineerId === f.assignee);
  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    list = list.filter(
      (l) =>
        l.lineName.toLowerCase().includes(q) ||
        l.projectName.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q),
    );
  }
  return list;
}

/** Convenience: owner scope + UI filters combined (backwards-compatible). */
export function applyGridFilters(lines: ProjectLine[], f: GridFilters, scope: OwnerScope): ProjectLine[] {
  return applyUiFilters(applyOwnerScope(lines, scope), f);
}

/** Engineers (own-lines-only) do not get Assignee/Métier filter controls. */
export function shouldShowOwnerFilters(canOwnOnly: boolean): boolean {
  return !canOwnOnly;
}
