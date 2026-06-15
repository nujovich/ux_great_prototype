import { describe, it, expect } from 'vitest';
import { applyOwnerScope, applyUiFilters, DEFAULT_FILTERS } from '../gridFilter';
import type { ProjectLine } from '../../types';

const line = (overrides: Partial<ProjectLine> = {}): ProjectLine => ({
  id: 'l1',
  lineName: 'Test Line',
  projectName: 'Test Project',
  metier: 'H-DESIGN',
  status: 'To do',
  cycleId: 'c1',
  assignedEngineerId: null,
  estimatedDays: null,
  estimatedKEuro: null,
  lastUpdatedBy: 'u1',
  lastUpdatedAt: '2026-01-01',
  ...overrides,
} as ProjectLine);

describe('DEFAULT_FILTERS', () => {
  it('has status all', () => expect(DEFAULT_FILTERS.status).toBe('all'));
  it('has metier all', () => expect(DEFAULT_FILTERS.metier).toBe('all'));
  it('has assignee all', () => expect(DEFAULT_FILTERS.assignee).toBe('all'));
  it('has empty search', () => expect(DEFAULT_FILTERS.search).toBe(''));
});

describe('applyOwnerScope', () => {
  it('returns all lines when ownOnly is false', () => {
    const lines = [line({ id: 'l1' }), line({ id: 'l2', assignedEngineerId: 'eng-1' })];
    expect(applyOwnerScope(lines, { ownOnly: false, activeEngineerId: 'eng-1' })).toHaveLength(2);
  });

  it('filters to own lines only when ownOnly is true and activeEngineerId is set', () => {
    const lines = [
      line({ id: 'l1', assignedEngineerId: 'eng-1' }),
      line({ id: 'l2', assignedEngineerId: 'eng-2' }),
    ];
    const result = applyOwnerScope(lines, { ownOnly: true, activeEngineerId: 'eng-1' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l1');
  });

  it('returns all lines when ownOnly is true but activeEngineerId is null (preserves original behaviour)', () => {
    const lines = [line({ id: 'l1', assignedEngineerId: 'eng-1' })];
    expect(applyOwnerScope(lines, { ownOnly: true, activeEngineerId: null })).toHaveLength(1);
  });
});

describe('applyUiFilters', () => {
  it('returns all lines when all filters are default', () => {
    const lines = [line({ id: 'l1' }), line({ id: 'l2' })];
    expect(applyUiFilters(lines, DEFAULT_FILTERS)).toHaveLength(2);
  });

  it('filters by status', () => {
    const lines = [line({ id: 'l1', status: 'To do' }), line({ id: 'l2', status: 'Draft' })];
    const result = applyUiFilters(lines, { ...DEFAULT_FILTERS, status: 'Draft' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l2');
  });

  it('filters by metier', () => {
    const lines = [line({ id: 'l1', metier: 'H-DESIGN' }), line({ id: 'l2', metier: 'H-SOFTWARE' })];
    const result = applyUiFilters(lines, { ...DEFAULT_FILTERS, metier: 'H-DESIGN' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l1');
  });

  it('filters by assignee', () => {
    const lines = [
      line({ id: 'l1', assignedEngineerId: 'eng-1' }),
      line({ id: 'l2', assignedEngineerId: 'eng-2' }),
    ];
    const result = applyUiFilters(lines, { ...DEFAULT_FILTERS, assignee: 'eng-1' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l1');
  });

  it('filters by search on lineName (case-insensitive)', () => {
    const lines = [line({ id: 'l1', lineName: 'Auth API' }), line({ id: 'l2', lineName: 'Billing' })];
    const result = applyUiFilters(lines, { ...DEFAULT_FILTERS, search: 'auth' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l1');
  });

  it('filters by search on projectName', () => {
    const lines = [line({ id: 'l1', projectName: 'Phoenix' }), line({ id: 'l2', projectName: 'Atlas' })];
    expect(applyUiFilters(lines, { ...DEFAULT_FILTERS, search: 'phoenix' })).toHaveLength(1);
  });

  it('filters by search on id', () => {
    const lines = [line({ id: 'PL-001' }), line({ id: 'PL-002' })];
    expect(applyUiFilters(lines, { ...DEFAULT_FILTERS, search: 'PL-001' })).toHaveLength(1);
  });

  it('applies multiple active filters simultaneously', () => {
    const lines = [
      line({ id: 'l1', status: 'Draft', metier: 'H-DESIGN', assignedEngineerId: 'eng-1', lineName: 'Auth API' }),
      line({ id: 'l2', status: 'Draft', metier: 'H-SOFTWARE', assignedEngineerId: 'eng-1', lineName: 'Auth API' }),
      line({ id: 'l3', status: 'To do', metier: 'H-DESIGN', assignedEngineerId: 'eng-1', lineName: 'Auth API' }),
    ];
    const result = applyUiFilters(lines, { status: 'Draft', metier: 'H-DESIGN', assignee: 'all', search: 'Auth' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l1');
  });
});
