import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TCPopup } from '../TCPopup';
import type { AllocationRow } from '../../../types';

function tcRow(over: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1', engineerId: 'e', percentage: 100, days: 209, fte: 1, keuro: 0,
    societe: 'Oyak Horse', costType: 'TC', isDirty: false,
    plNumber: 'PL-1', plName: 'P', metier: 'H-DESIGN', ownerN2: 'Z',
    juCode: 'JU-1', juDescription: '', fmmDescription: '', organType: '', energy: '',
    allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
    totalFte: 1, fteByYear: { '2025': 0.5, '2026': 0.5 },
    keByYear: { '2025': 100, '2026': 200 }, ...over,
  };
}

describe('TCPopup', () => {
  it('pre-fills yearly K€ from the row when values already exist', () => {
    render(<TCPopup open row={tcRow()} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect((screen.getByLabelText('K€ 2025') as HTMLInputElement).value).toBe('100');
    expect((screen.getByLabelText('K€ 2026') as HTMLInputElement).value).toBe('200');
  });

  it('warns before cancelling when values were changed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TCPopup open row={tcRow({ keByYear: { '2025': 0, '2026': 0 } })} onConfirm={vi.fn()} onCancel={onCancel} />);

    await user.type(screen.getByLabelText('K€ 2025'), '5');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByText(/leave without saving/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /discard/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels immediately when nothing was changed', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TCPopup open row={tcRow()} onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables Confirm when the row has no societe (ALLOC-BR-13)', () => {
    render(<TCPopup open row={tcRow({ societe: null })} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^confirm$/i })).toBeDisabled();
    expect(screen.getByText(/societe is required/i)).toBeInTheDocument();
  });
});
