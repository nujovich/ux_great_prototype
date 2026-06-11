import { describe, it, expect } from 'vitest';
import { getRelatedLineIds, checkHvtAttributeChanged } from '../relationships';
import type { LineRelationship, HvtSnapshot, ProjectLine } from '../../types';

const rels: LineRelationship[] = [
  { parentLineId: 'A', childLineId: 'B', relationshipType: 'parent_child' },
  { parentLineId: 'A', childLineId: 'C', relationshipType: 'parent_child' },
];

describe('getRelatedLineIds (HIW-174 §5b)', () => {
  it('returns children when given the parent', () => {
    expect(getRelatedLineIds('A', rels).sort()).toEqual(['B', 'C']);
  });
  it('returns the parent when given a child', () => {
    expect(getRelatedLineIds('B', rels)).toEqual(['A']);
  });
  it('returns empty for an unrelated line', () => {
    expect(getRelatedLineIds('Z', rels)).toEqual([]);
  });
});

const line = (over: Partial<ProjectLine>): ProjectLine =>
  ({ id: 'B', injectionSystem: 'Direct', client: 'Renault', ...over } as ProjectLine);

describe('checkHvtAttributeChanged (HIW-174 §5b)', () => {
  it('returns null when nothing changed', () => {
    const snap: HvtSnapshot = { injectionSystem: 'Direct', client: 'Renault' };
    expect(checkHvtAttributeChanged(line({}), snap)).toBeNull();
  });
  it('reports changed fields with old/new values', () => {
    const snap: HvtSnapshot = { injectionSystem: 'Indirect', client: 'Renault' };
    const res = checkHvtAttributeChanged(line({}), snap);
    expect(res).not.toBeNull();
    expect(res!.lineId).toBe('B');
    expect(res!.fields.injectionSystem).toEqual({ old: 'Indirect', new: 'Direct' });
    expect(res!.fields.client).toBeUndefined();
  });
});
