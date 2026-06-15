import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AllocationGrid } from '../AllocationGrid';
import type { AllocationRow } from '../../../types';

function row(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1', engineerId: 'eng-1', percentage: 100, days: 209, fte: 1.0, totalFte: 1.0,
    fteByYear: { '2025': 0.5, '2026': 0.5 }, keByYear: { '2025': 425, '2026': 425 },
    societe: null, costType: 'FTE', keuro: 850, isDirty: false,
    plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A',
    juCode: 'JU-001', juDescription: 'Test JU', fmmDescription: 'FMM', organType: 'INT',
    energy: 'BEV', allianceCode: 'AC-01', vehicleCode: 'VC-01', standardEmissions: 'EU7', market: 'EU',
    ...overrides,
  };
}

const noop = () => {};
const defaultProps = {
  rows: [row()],
  canEdit: true,
  selectedIds: [],
  onSelectRow: noop,
  onSelectAll: noop,
  onChangeSociete: noop,
  onChangeCostType: noop,
  onSplit: noop,
  onUndoSplit: noop,
  activeYears: ['2025', '2026'],
  canViewKeuro: true,
};

describe('AllocationGrid', () => {
  it('renders JU Code cell', () => {
    render(<AllocationGrid {...defaultProps} />);
    expect(screen.getByText('JU-001')).toBeDefined();
  });

  it('renders FTE per year column headers', () => {
    render(<AllocationGrid {...defaultProps} />);
    expect(screen.getByText('FTE 2025')).toBeDefined();
    expect(screen.getByText('FTE 2026')).toBeDefined();
  });

  it('renders K€ per year when canViewKeuro=true', () => {
    render(<AllocationGrid {...defaultProps} />);
    expect(screen.getByText('K€ 2025')).toBeDefined();
  });

  it('hides K€ columns when canViewKeuro=false', () => {
    render(<AllocationGrid {...defaultProps} canViewKeuro={false} />);
    expect(screen.queryByText('K€ 2025')).toBeNull();
  });

  it('check-all checkbox calls onSelectAll(true)', () => {
    const onSelectAll = vi.fn();
    render(<AllocationGrid {...defaultProps} onSelectAll={onSelectAll} />);
    const checkAll = screen.getByRole('checkbox', { name: /select all/i });
    fireEvent.click(checkAll);
    expect(onSelectAll).toHaveBeenCalledWith(true);
  });

  it('row checkbox calls onSelectRow', () => {
    const onSelectRow = vi.fn();
    render(<AllocationGrid {...defaultProps} onSelectRow={onSelectRow} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is the "select all"; second is the row checkbox
    fireEvent.click(checkboxes[1]);
    expect(onSelectRow).toHaveBeenCalledWith('r1', true);
  });

  it('split-child row shows Undo button, not Split', () => {
    render(<AllocationGrid {...defaultProps} rows={[row({ isSplitChild: true, splitParentId: 'r0' })]} />);
    expect(screen.queryByText('Split')).toBeNull();
    expect(screen.getByText('Undo')).toBeDefined();
  });

  it('non-split row shows Split button', () => {
    render(<AllocationGrid {...defaultProps} />);
    expect(screen.getByText('Split')).toBeDefined();
    expect(screen.queryByText('Undo')).toBeNull();
  });
});
