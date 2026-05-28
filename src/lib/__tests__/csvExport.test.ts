import { describe, it, expect } from 'vitest';
import { buildCsvRows } from '../csvExport';
import type { ProjectLine } from '../../types';

const baseLine: ProjectLine = {
  id: 'L1',
  projectId: 'P1',
  projectName: 'PROJ-ALPHA',
  lineName: 'Line 1',
  metier: 'Backend',
  status: 'approved',
  cycleId: 'cyc-2026h1',
  assignedEngineerId: 'eng-1',
  estimatedDays: 100,
  estimatedKEuro: 50,
  lastUpdatedBy: 'PMO',
  lastUpdatedAt: '2026-01-15T10:00:00Z',
};

describe('buildCsvRows', () => {
  it('returns header + one row for one line', () => {
    const rows = buildCsvRows([baseLine]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('Project Name');
    expect(rows[0]).toContain('Métier');
    expect(rows[1]).toContain('PROJ-ALPHA');
    expect(rows[1]).toContain('Backend');
  });

  it('returns only header when lines array is empty', () => {
    const rows = buildCsvRows([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('Project Name');
  });

  it('escapes commas inside cell values', () => {
    const rows = buildCsvRows([{ ...baseLine, projectName: 'PROJ, COMMA' }]);
    expect(rows[1]).toContain('"PROJ, COMMA"');
  });

  it('escapes double-quotes inside cell values', () => {
    const rows = buildCsvRows([{ ...baseLine, projectName: 'PROJ "ALPHA"' }]);
    expect(rows[1]).toContain('"PROJ ""ALPHA"""');
  });

  it('handles null estimatedDays gracefully', () => {
    const rows = buildCsvRows([{ ...baseLine, estimatedDays: null }]);
    expect(rows[1]).toContain('0');
  });
});
