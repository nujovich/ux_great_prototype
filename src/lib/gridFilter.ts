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

export function applyGridFilters(lines: ProjectLine[], f: GridFilters, scope: OwnerScope): ProjectLine[] {
  let list = lines;
  if (scope.ownOnly && scope.activeEngineerId) {
    list = list.filter((l) => l.assignedEngineerId === scope.activeEngineerId);
  }
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

/** Engineers (own-lines-only) do not get Assignee/Métier filter controls. */
export function shouldShowOwnerFilters(canOwnOnly: boolean): boolean {
  return !canOwnOnly;
}
