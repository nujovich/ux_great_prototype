/**
 * MGMT-BR-03 — Full status model: the frontend STATUSES constant must match
 * the 6 statuses defined in management_view_specs.py (MGMT_STATUSES = list(LineStatus)).
 *
 * MGMT-BR-02 — (PL, Métier) pair counting: the matrix cell for a known (métier, status)
 * combination must count the exact number of matching lines.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ManagementPage } from '../ManagementPage';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import type { ProjectLine, LineStatus, Metier } from '../../types';

// ── MGMT-BR-03: the 6 spec statuses ────────────────────────────────────────

// These are the MGMT_STATUSES from management_view_specs.py (= list(LineStatus)):
const SPEC_STATUSES: LineStatus[] = [
  'To do', 'Draft', 'Estimated', 'Sent', 'Modification Requested', 'Approved',
];

describe('ManagementPage — MGMT-BR-03 (full status model)', () => {
  // The frontend STATUSES array is a module-level constant in ManagementPage.tsx.
  // We can't import it directly (it's not exported), so we validate it by rendering
  // the page and checking that the table header contains exactly the 6 spec statuses.

  beforeEach(() => {
    cleanup();
    useRoleStore.getState().setRole('Admin');
    useDataStore.setState({
      lines: [],
      cycles: [{ id: 'cyc-br03', name: 'BR03', is_active: true, start_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' }],
    });
  });

  it('table header renders exactly the 6 statuses from the spec (MGMT-BR-03)', () => {
    render(<ManagementPage />);
    const table = screen.getByRole('table');
    const thead = table.querySelector('thead tr');
    expect(thead).not.toBeNull();

    // Cells: [Metier, ...6 statuses, Total] → 8 total header cells
    const headerCells = thead!.querySelectorAll('th');
    // Extract just the status column headers (cells 1..6)
    const renderedStatusTexts = Array.from(headerCells)
      .slice(1, headerCells.length - 1) // skip first (Metier) and last (Total)
      .map((th) => th.textContent?.trim());

    // Exact deep equality: catches column reordering, label padding, or missing statuses.
    // The rendered order must match the spec order exactly (MGMT-BR-03).
    expect(renderedStatusTexts).toEqual(SPEC_STATUSES);
  });
});

// ── MGMT-BR-02: (PL, Métier) pair counting ─────────────────────────────────

const S = (s: string): LineStatus => s as LineStatus;
const M = (m: string): Metier => m as Metier;

function makeLine(id: string, metier: Metier, status: LineStatus, cycleId: string): ProjectLine {
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
    allianceCode: 'ALL-BR02',
    vehicleCode: 'VEH-BR02',
    energy: 'Petrol',
    estimateType: 'Full',
    engineering: 'Internal',
    pcDate: '2026-04-01',
    coDate: '2026-08-01',
    sopDate: '2026-12-01',
  };
}

describe('ManagementPage — MGMT-BR-02 ((PL × Métier) pair counting)', () => {
  const CYCLE = 'cyc-br02';

  beforeEach(() => {
    cleanup();
    useRoleStore.getState().setRole('Admin');
    // Seed: 3 H-TUNING/Estimated + 1 H-SOFTWARE/Draft
    useDataStore.setState({
      lines: [
        makeLine('BR02-1', M('H-TUNING'), S('Estimated'), CYCLE),
        makeLine('BR02-2', M('H-TUNING'), S('Estimated'), CYCLE),
        makeLine('BR02-3', M('H-TUNING'), S('Estimated'), CYCLE),
        makeLine('BR02-4', M('H-SOFTWARE'), S('Draft'), CYCLE),
      ],
      cycles: [{ id: CYCLE, name: 'BR02', is_active: true, start_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' }],
    });
  });

  it('H-TUNING row total equals 3 (three Estimated lines)', () => {
    render(<ManagementPage />);
    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody');
    const rows = tbody!.querySelectorAll('tr');

    // Find the H-TUNING row
    const tuningRow = Array.from(rows).find((r) => r.cells[0].textContent === 'H-TUNING');
    expect(tuningRow).toBeDefined();
    // Last cell is the row total
    const total = tuningRow!.cells[tuningRow!.cells.length - 1].textContent;
    expect(total).toBe('3');
  });

  it('H-SOFTWARE row total equals 1 (one Draft line)', () => {
    render(<ManagementPage />);
    const table = screen.getByRole('table');
    const tbody = table.querySelector('tbody');
    const rows = tbody!.querySelectorAll('tr');

    const softwareRow = Array.from(rows).find((r) => r.cells[0].textContent === 'H-SOFTWARE');
    expect(softwareRow).toBeDefined();
    const total = softwareRow!.cells[softwareRow!.cells.length - 1].textContent;
    expect(total).toBe('1');
  });
});
