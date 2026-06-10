import { useState, useMemo } from 'react';

export type SortDir = 'asc' | 'desc' | null;

export interface SortState<K extends string> {
  key: K | null;
  dir: SortDir;
}

export function sortItems<T>(
  items: T[],
  key: keyof T | null,
  dir: SortDir,
): T[] {
  if (!key || !dir) return items;
  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    const cmp = av < bv ? -1 : 1;
    return dir === 'asc' ? cmp : -cmp;
  });
}

export function useSortable<T>(items: T[]) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  function requestSort(key: keyof T) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    if (sortDir === 'desc') { setSortKey(null); setSortDir(null); return; }
    setSortDir('asc');
  }

  function getSortIcon(key: keyof T): '↑' | '↓' | '↕' {
    if (sortKey !== key) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  }

  const sorted = useMemo(() => sortItems(items, sortKey, sortDir), [items, sortKey, sortDir]);

  return { sorted, requestSort, getSortIcon };
}
