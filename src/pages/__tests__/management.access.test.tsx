import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ManagementPage } from '../ManagementPage';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import { PROJECT_LINES, CYCLES } from '../../fixtures';
import type { Role, ProjectLine, LineStatus, Metier } from '../../types';

// HIW-178: Management View is read-only for Admin, PMO and RCRC; CPO and Engineer
// have no access. Allowed roles render the dashboard (status matrix table); denied
// roles get the RoleGate fallback (no table).

const S = (s: string): LineStatus => s as LineStatus;
const M = (m: string): Metier => m as Metier;

// Seed one visible line so the matrix renders at least one data row for allowed roles.
// This lets us assert that content was rendered, not just that the <table> shell exists.
const ACCESS_CYCLE = 'cyc-access-test';
const ACCESS_LINES: ProjectLine[] = [
  {
    id: 'A-001', project_id: 'P-ACCESS', name: 'Access test line',
    metier: M('H-SOFTWARE'), status: S('Draft'), updated_at: '2026-01-01T00:00:00Z',
    lineName: 'Access test line', projectName: 'Access Project',
    assignedEngineerId: null, estimatedDays: 5, estimatedKEuro: 4.0,
    lastUpdatedBy: 'test', lastUpdatedAt: '2026-01-01T00:00:00Z',
    cycleId: ACCESS_CYCLE,
    requestType: 'New Project', client: 'Renault', market: 'Europe',
    allianceCode: 'ALL-A01', vehicleCode: 'VEH-A01', energy: 'Petrol',
    estimateType: 'Full', engineering: 'Internal',
    pcDate: '2026-04-01', coDate: '2026-08-01', sopDate: '2026-12-01',
  },
];

function renderAs(role: Role) {
  useRoleStore.getState().setRole(role);
  return render(<ManagementPage />);
}

describe('ManagementPage access (HIW-178)', () => {
  beforeEach(() => {
    cleanup();
    useDataStore.setState({
      lines: ACCESS_LINES,
      cycles: [{ id: ACCESS_CYCLE, name: 'Access Test Active', is_active: true, start_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' }],
    });
  });

  // Restore the default store after each test to prevent cross-test store contamination.
  // Note: Vitest isolates module state between FILES by default (isolate: true), so
  // inter-file contamination is not a risk. However, within a single describe block,
  // zustand store state persists across tests. This afterEach is cheap defensive hygiene
  // that makes the suite order-independent.
  afterEach(() => {
    useDataStore.setState({
      lines: structuredClone(PROJECT_LINES),
      cycles: structuredClone(CYCLES),
    });
  });

  it.each(['Admin', 'PMO', 'RCRC'] as Role[])('renders the dashboard with data for %s', (role) => {
    renderAs(role);
    const table = screen.queryByRole('table');
    // The table shell must exist
    expect(table).not.toBeNull();
    // AND it must contain at least one data row in the tbody (not just the header).
    // A blank-page bug would pass the old `toBeTruthy()` check but fail this one.
    const tbody = table!.querySelector('tbody');
    expect(tbody).not.toBeNull();
    const dataRows = tbody!.querySelectorAll('tr');
    expect(dataRows.length).toBeGreaterThan(0);
  });

  it.each(['CPO', 'Engineer'] as Role[])('blocks %s with the access gate', (role) => {
    renderAs(role);
    expect(screen.queryByRole('table')).toBeNull();
  });
});
