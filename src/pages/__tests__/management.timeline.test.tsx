import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ManagementPage } from '../ManagementPage';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';
import type { TimelineSnapshot } from '../../fixtures/timeline';

const ACTIVE = 'cyc-x';

const timeline: TimelineSnapshot[] = [
  {
    date: '2026-01-01',
    cycleId: ACTIVE,
    byMetier: { 'H-DESIGN': { 'To do': 3 }, 'H-SOFTWARE': { 'To do': 2 } },
  },
  {
    date: '2026-06-01',
    cycleId: ACTIVE,
    byMetier: { 'H-DESIGN': { 'Approved': 3 }, 'H-SOFTWARE': { 'Approved': 2 } },
  },
];

function seed() {
  useRoleStore.getState().setRole('Admin');
  useDataStore.setState({
    lines: [],
    cycles: [{ id: ACTIVE, name: 'X', is_active: true, start_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' }],
    timeline,
  });
}

describe('ManagementPage — Status Evolution timeline (PRD §7)', () => {
  beforeEach(() => {
    cleanup();
    seed();
  });

  it('renders the timeline chart with all 6 status lines (MGMT-BR-03)', () => {
    const { container } = render(<ManagementPage />);
    expect(screen.getByTestId('status-timeline')).toBeInTheDocument();
    expect(container.querySelectorAll('polyline[data-status]')).toHaveLength(6);
  });

  it('aggregates across métiers by default and narrows when the métier filter changes (MGMT-BR-05)', () => {
    render(<ManagementPage />);
    expect(screen.getByTestId('timeline-count-Approved')).toHaveTextContent('5');

    // FilterSelect renders <label> and <select> as siblings without htmlFor/id,
    // so query by combobox role: [0] = status filter, [1] = métier filter.
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'H-DESIGN' } });

    expect(screen.getByTestId('timeline-count-Approved')).toHaveTextContent('3');
  });

  it('does not change the timeline when the status filter changes (PRD §7 — métier filter only)', () => {
    render(<ManagementPage />);
    const before = screen.getByTestId('timeline-count-Approved').textContent;
    // selects[0] = status filter, selects[1] = métier filter
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Approved' } });
    expect(screen.getByTestId('timeline-count-Approved')).toHaveTextContent(before!);
  });

  it('does not render the timeline chart when there is no active cycle (MGMT-BR-06)', () => {
    cleanup();
    useRoleStore.getState().setRole('Admin');
    useDataStore.setState({ lines: [], cycles: [], timeline });
    render(<ManagementPage />);
    expect(screen.queryByTestId('status-timeline')).not.toBeInTheDocument();
    expect(screen.getByTestId('mgmt-no-cycle')).toBeInTheDocument();
  });
});
