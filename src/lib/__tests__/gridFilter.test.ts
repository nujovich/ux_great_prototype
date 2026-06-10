import { describe, it, expect } from 'vitest';
import { applyGridFilters, shouldShowOwnerFilters, type GridFilters } from '../gridFilter';
import type { ProjectLine } from '../../types';

const base = (over: Partial<ProjectLine>): ProjectLine => ({
  id: 'PL-x', project_id: 'P', name: 'n', metier: 'H-DESIGN', status: 'To do',
  updated_at: '', lineName: 'Line', projectName: 'Proj', assignedEngineerId: 'eng-1',
  estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: '', lastUpdatedAt: '',
  cycleId: 'c', ...over,
} as ProjectLine);

const ALL: GridFilters = { status: 'all', metier: 'all', assignee: 'all', search: '' };

describe('applyGridFilters (HIW-174 §4)', () => {
  const lines = [
    base({ id: 'A', status: 'Draft', metier: 'H-DESIGN', assignedEngineerId: 'eng-1', lineName: 'Alpha' }),
    base({ id: 'B', status: 'To do', metier: 'H-SOFTWARE', assignedEngineerId: 'eng-2', lineName: 'Beta' }),
  ];

  it('returns all lines with the all-filter and no owner restriction', () => {
    expect(applyGridFilters(lines, ALL, { ownOnly: false, activeEngineerId: null }).map((l) => l.id)).toEqual(['A', 'B']);
  });
  it('owner restriction keeps only the active engineer lines', () => {
    expect(applyGridFilters(lines, ALL, { ownOnly: true, activeEngineerId: 'eng-2' }).map((l) => l.id)).toEqual(['B']);
  });
  it('filters by status, metier, assignee, and search (case-insensitive)', () => {
    expect(applyGridFilters(lines, { ...ALL, status: 'Draft' }, { ownOnly: false, activeEngineerId: null }).map((l) => l.id)).toEqual(['A']);
    expect(applyGridFilters(lines, { ...ALL, metier: 'H-SOFTWARE' }, { ownOnly: false, activeEngineerId: null }).map((l) => l.id)).toEqual(['B']);
    expect(applyGridFilters(lines, { ...ALL, assignee: 'eng-1' }, { ownOnly: false, activeEngineerId: null }).map((l) => l.id)).toEqual(['A']);
    expect(applyGridFilters(lines, { ...ALL, search: 'beta' }, { ownOnly: false, activeEngineerId: null }).map((l) => l.id)).toEqual(['B']);
  });
});

describe('shouldShowOwnerFilters', () => {
  it('hides assignee/metier filters for own-lines-only (Engineer)', () => {
    expect(shouldShowOwnerFilters(true)).toBe(false);
  });
  it('shows them otherwise (PMO/Admin/RCRC)', () => {
    expect(shouldShowOwnerFilters(false)).toBe(true);
  });
});
