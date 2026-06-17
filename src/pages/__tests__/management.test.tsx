/**
 * MGMT-BR-04 — H-NP and H-PROJECT must be excluded from the Management View.
 *
 * These are REAL rendering tests: they seed the data store with lines from excluded
 * métiers, then assert that no corresponding data row appears in the matrix tbody.
 *
 * The primary guard is `dataRows.length === 1`: the tbody must contain ONLY the
 * H-DESIGN row, which proves that the H-PROJECT and H-NP lines produced no rows.
 *
 * Note on the production guard: ManagementPage iterates the METIERS constant (which
 * excludes H-NP and H-PROJECT) to build tbody rows. Removing the METIERS filter
 * would not cause H-NP/H-PROJECT rows to silently appear — it would throw a runtime
 * error when the matrix lookup indexed `m['H-NP']` (undefined). The dataRows.length
 * assertion catches both the silent-render and the runtime-error failure modes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ManagementPage } from '../ManagementPage';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import type { ProjectLine, LineStatus, Metier } from '../../types';

// Helper casts — same pattern as fixtures/projectLines.ts
const S = (s: string): LineStatus => s as LineStatus;
const M = (m: string): Metier => m as Metier;

// Base shape for a minimal ProjectLine that satisfies the interface
function makeLine(overrides: Partial<ProjectLine> & { id: string; metier: Metier; cycleId: string }): ProjectLine {
  return {
    project_id: overrides.project_id ?? `P-${overrides.id}`,
    name: overrides.name ?? overrides.id,
    status: overrides.status ?? S('To do'),
    updated_at: '2026-01-01T00:00:00Z',
    lineName: overrides.lineName ?? overrides.id,
    projectName: overrides.projectName ?? 'Test Project',
    assignedEngineerId: null,
    estimatedDays: null,
    estimatedKEuro: null,
    lastUpdatedBy: 'test',
    lastUpdatedAt: '2026-01-01T00:00:00Z',
    requestType: 'New Project',
    client: 'Renault',
    market: 'Europe',
    allianceCode: 'ALL-T01',
    vehicleCode: 'VEH-T01',
    energy: 'Petrol',
    estimateType: 'Full',
    engineering: 'Internal',
    pcDate: '2026-04-01',
    coDate: '2026-08-01',
    sopDate: '2026-12-01',
    ...overrides,
  };
}

// Seed lines: one H-DESIGN (should appear), one H-PROJECT (excluded), one H-NP (excluded)
const ACTIVE_CYCLE = 'cyc-test-active';

const testLines: ProjectLine[] = [
  makeLine({ id: 'T-001', metier: M('H-DESIGN'), cycleId: ACTIVE_CYCLE, lineName: 'Design Line Alpha', status: S('To do') }),
  makeLine({ id: 'T-002', metier: M('H-PROJECT'), cycleId: ACTIVE_CYCLE, lineName: 'Project Line Beta', status: S('To do') }),
  makeLine({ id: 'T-003', metier: M('H-NP'), cycleId: ACTIVE_CYCLE, lineName: 'NP Line Gamma', status: S('To do') }),
];

describe('ManagementPage — MGMT-BR-04 (real render test)', () => {
  beforeEach(() => {
    cleanup();
    useRoleStore.getState().setRole('Admin');
    // Seed store with a controlled active cycle and test lines
    useDataStore.setState({
      lines: testLines,
      cycles: [{ id: ACTIVE_CYCLE, name: 'Test Active', is_active: true, start_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' }],
    });
  });

  it('renders the H-DESIGN row in the matrix table', () => {
    render(<ManagementPage />);
    // H-DESIGN has 1 line in "To do" — its total is 1, so the row renders
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    // The tbody must contain exactly one data row (H-DESIGN only; H-PROJECT and H-NP are excluded)
    const tbody = table.querySelector('tbody');
    expect(tbody).not.toBeNull();
    const dataRows = tbody!.querySelectorAll('tr');
    expect(dataRows.length).toBe(1);
    // The first cell must read "H-DESIGN"
    expect(dataRows[0].cells[0].textContent).toBe('H-DESIGN');
  });

  it('does NOT render an H-PROJECT row in the matrix table (MGMT-BR-04)', () => {
    render(<ManagementPage />);
    // Scope to tbody so a future filter/dropdown containing "H-PROJECT" cannot
    // produce a false negative. Only data rows live in tbody.
    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody')!;
    expect(within(tbody).queryByText('H-PROJECT')).not.toBeInTheDocument();
  });

  it('does NOT render an H-NP row in the matrix table (MGMT-BR-04)', () => {
    render(<ManagementPage />);
    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody')!;
    expect(within(tbody).queryByText('H-NP')).not.toBeInTheDocument();
  });
});
