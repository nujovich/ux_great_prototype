import { describe, it, expect } from 'vitest';
import { sortItems } from '../useSortable';

interface Item { name: string; age: number }

describe('sortItems (TABLE-BR-01)', () => {
  const items: Item[] = [
    { name: 'Charlie', age: 30 },
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 35 },
  ];

  it('sorts ascending by string field', () => {
    const result = sortItems(items, 'name', 'asc');
    expect(result.map((i) => i.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts descending by number field', () => {
    const result = sortItems(items, 'age', 'desc');
    expect(result.map((i) => i.age)).toEqual([35, 30, 25]);
  });

  it('no-op when sortDir is null', () => {
    const result = sortItems(items, 'name', null);
    expect(result).toEqual(items);
  });

  it('returns a new array (does not mutate)', () => {
    const result = sortItems(items, 'name', 'asc');
    expect(result).not.toBe(items);
  });
});
