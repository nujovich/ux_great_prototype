/**
 * MGMT-BR-06 — Active cycle only: lines from inactive cycles must not appear
 * in the Management View. Also covers the no-active-cycle edge case.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ManagementPage } from '../ManagementPage';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import type { ProjectLine, LineStatus, Metier } from '../../types';

const S = (s: string): LineStatus => s as LineStatus;
const M = (m: string): Metier => m as Metier;

function makeLine(id: string, cycleId: string, metier: Metier = M('H-DESIGN'), status: LineStatus = S('Draft')): ProjectLine {
  return {
    id,
    project_id: `P-${id}`,
    name: id,
    metier,
    status,
    updated_at: '2026-01-01T00:00:00Z',
    lineName: `Line ${id}`,
    projectName: 'Test Project',
    assignedEngineerId: null,
    estimatedDays: 5,
    estimatedKEuro: 4.0,
    lastUpdatedBy: 'test',
    lastUpdatedAt: '2026-01-01T00:00:00Z',
    cycleId,
    requestType: 'New Project',
    client: 'Renault',
    market: 'Europe',
    allianceCode: 'ALL-BR06',
    vehicleCode: 'VEH-BR06',
    energy: 'Petrol',
    estimateType: 'Full',
    engineering: 'Internal',
    pcDate: '2026-04-01',
    coDate: '2026-08-01',
    sopDate: '2026-12-01',
  };
}

const ACTIVE_CYCLE_ID = 'cyc-br06-active';
const INACTIVE_CYCLE_ID = 'cyc-br06-inactive';

describe('ManagementPage — MGMT-BR-06 (active cycle only)', () => {
  beforeEach(() => {
    cleanup();
    useRoleStore.getState().setRole('Admin');
  });

  it('shows only lines from the active cycle, not the inactive one', () => {
    useDataStore.setState({
      lines: [
        makeLine('BR06-A', ACTIVE_CYCLE_ID),    // active cycle — should appear
        makeLine('BR06-I', INACTIVE_CYCLE_ID),  // inactive cycle — must NOT appear
      ],
      cycles: [
        { id: ACTIVE_CYCLE_ID, name: 'Active', is_active: true, start_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' },
        { id: INACTIVE_CYCLE_ID, name: 'Inactive', is_active: false, start_date: '2025-01-01', created_at: '2025-01-01T00:00:00Z' },
      ],
    });

    render(<ManagementPage />);

    // The table must render (active cycle has data)
    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody');
    expect(tbody).not.toBeNull();

    // Exactly one data row (the active-cycle H-DESIGN line)
    const dataRows = tbody!.querySelectorAll('tr');
    expect(dataRows.length).toBe(1);
    // And the row total must be 1 (one line in "Draft")
    const lastCell = dataRows[0].cells[dataRows[0].cells.length - 1];
    expect(lastCell.textContent).toBe('1');
  });

  it('shows the no-active-cycle message when no cycle is active (MGMT-BR-06 edge case)', () => {
    useDataStore.setState({
      lines: [makeLine('BR06-X', INACTIVE_CYCLE_ID)],
      cycles: [
        { id: INACTIVE_CYCLE_ID, name: 'Inactive', is_active: false, start_date: '2025-01-01', created_at: '2025-01-01T00:00:00Z' },
      ],
    });

    render(<ManagementPage />);

    // No table should render
    expect(screen.queryByRole('table')).toBeNull();
    // The no-cycle message must appear
    expect(screen.getByTestId('mgmt-no-cycle')).toBeInTheDocument();
  });
});
