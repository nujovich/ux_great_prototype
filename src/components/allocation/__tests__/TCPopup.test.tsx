import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TCPopup } from '../TCPopup';
import type { AllocationRow } from '../../../types';

function tcRow(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1', engineerId: 'eng-1', percentage: 100, days: 209, fte: 1.0, totalFte: 1.0,
    fteByYear: { '2025': 1.0, '2026': 3.0 }, keByYear: { '2025': 0, '2026': 0 },
    societe: 'Renault SAS-Paris', costType: 'TC', keuro: 0, isDirty: false,
    plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A',
    juCode: 'JU-001', juDescription: '', fmmDescription: '', organType: '', energy: '',
    allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
    ...overrides,
  };
}

describe('TCPopup', () => {
  it('pre-fills K€ proportionally to FTE share when total K€ is entered', () => {
    render(<TCPopup open row={tcRow()} onConfirm={() => {}} onCancel={() => {}} />);
    // fteByYear: 2025=1.0, 2026=3.0, total FTE=4.0
    // 1000 K€ total → 2025: 250, 2026: 750
    const totalInput = screen.getByLabelText(/Total K€/i);
    fireEvent.change(totalInput, { target: { value: '1000' } });
    expect((screen.getByLabelText('K€ 2025') as HTMLInputElement).value).toBe('250');
    expect((screen.getByLabelText('K€ 2026') as HTMLInputElement).value).toBe('750');
  });

  it('shows running total of yearly K€ values', () => {
    render(<TCPopup open row={tcRow()} onConfirm={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Total K€/i), { target: { value: '1000' } });
    expect(screen.getByText(/Running total.*1000/i)).toBeDefined();
  });

  it('calls onConfirm with keByYear on confirm click', () => {
    const onConfirm = vi.fn();
    render(<TCPopup open row={tcRow()} onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Total K€/i), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith({ '2025': 250, '2026': 750 });
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(<TCPopup open row={tcRow()} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables Confirm and shows error when societe is null', () => {
    render(<TCPopup open row={tcRow({ societe: null })} onConfirm={() => {}} onCancel={() => {}} />);
    expect((screen.getByRole('button', { name: /confirm/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/societe is required/i)).toBeDefined();
  });
});
