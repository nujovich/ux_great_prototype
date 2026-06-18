import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SplitModal } from '../SplitModal';
import type { AllocationRow } from '../../../types';

function splitRow(overrides: Partial<AllocationRow> = {}): AllocationRow {
  return {
    id: 'r1', engineerId: 'eng-1', percentage: 100, days: 209, fte: 1.0, totalFte: 1.0,
    fteByYear: { '2025': 1.0, '2026': 2.0 }, keByYear: { '2025': 850, '2026': 1700 },
    societe: null, costType: 'FTE', keuro: 2550, isDirty: false,
    plNumber: 'PL-01', plName: 'Project Alpha', metier: 'H-DESIGN', ownerN2: 'Zone-A',
    juCode: 'JU-001', juDescription: '', fmmDescription: '', organType: '', energy: '',
    allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
    ...overrides,
  };
}

const societeOptions = ['Renault SAS-Paris', 'RNBV-Amsterdam', 'Renault Korea'];

describe('SplitModal', () => {
  it('starts with exactly 2 société slots (ALLOC-BR-22)', () => {
    render(<SplitModal open row={splitRow()} societeOptions={societeOptions} onConfirm={() => {}} onClose={() => {}} />);
    const pctInputs = screen.getAllByRole('spinbutton');
    expect(pctInputs).toHaveLength(2);
  });

  it('Confirm disabled when percentages do not sum to 100 (ALLOC-BR-11)', () => {
    render(<SplitModal open row={splitRow()} societeOptions={societeOptions} onConfirm={() => {}} onClose={() => {}} />);
    const [pct1] = screen.getAllByRole('spinbutton');
    fireEvent.change(pct1, { target: { value: '30' } });
    const confirmBtn = screen.getByRole('button', { name: /confirm/i }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it('Confirm enabled when percentages sum to 100', () => {
    render(<SplitModal open row={splitRow()} societeOptions={societeOptions} onConfirm={() => {}} onClose={() => {}} />);
    const [pct1, pct2] = screen.getAllByRole('spinbutton');
    fireEvent.change(pct1, { target: { value: '40' } });
    fireEvent.change(pct2, { target: { value: '60' } });
    const confirmBtn = screen.getByRole('button', { name: /confirm/i }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
  });

  it('live preview shows FTE per year updating as percentage changes (ALLOC-BR-24)', () => {
    render(<SplitModal open row={splitRow()} societeOptions={societeOptions} onConfirm={() => {}} onClose={() => {}} />);
    const [pct1] = screen.getAllByRole('spinbutton');
    fireEvent.change(pct1, { target: { value: '50' } });
    // Row 1 should show FTE 2025 = 0.50 (50% of 1.0) — multiple cells may show 0.50
    expect(screen.getAllByText('0.50')[0]).toBeDefined();
  });

  it('calls onConfirm with societe+percentage pairs', () => {
    const onConfirm = vi.fn();
    render(<SplitModal open row={splitRow()} societeOptions={societeOptions} onConfirm={onConfirm} onClose={() => {}} />);
    const [pct1, pct2] = screen.getAllByRole('spinbutton');
    fireEvent.change(pct1, { target: { value: '60' } });
    fireEvent.change(pct2, { target: { value: '40' } });
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Renault SAS-Paris' } });
    fireEvent.change(selects[1], { target: { value: 'RNBV-Amsterdam' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith([
      { societe: 'Renault SAS-Paris', percentage: 60 },
      { societe: 'RNBV-Amsterdam', percentage: 40 },
    ]);
  });

  it('shows K€ preview columns proportional to percentage when canViewKeuro', () => {
    const row = {
      id: 'r1', plNumber: 'PL1', plName: 'Line', metier: 'BE', ownerN2: 'X',
      juCode: 'JU1', juDescription: 'd', fmmDescription: 'f', organType: '', energy: '',
      allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
      totalFte: 2, fteByYear: { '2025': 1, '2026': 1 },
      keByYear: { '2025': 100, '2026': 200 },
      societe: null, costType: 'FTE' as const, fte: 2, keuro: 300,
      engineerId: 'e', percentage: 100, days: 0, isDirty: false,
    };
    render(
      <SplitModal open row={row} societeOptions={['S1', 'S2']} canViewKeuro
        onConfirm={() => {}} onClose={() => {}} />,
    );
    // header has K€ columns per year
    expect(screen.getByText('K€ 2025')).toBeInTheDocument();
    expect(screen.getByText('K€ 2026')).toBeInTheDocument();
    // default 50/50 split → 2025 K€ preview = 50 in each of the two slot rows
    expect(screen.getAllByText('50')).toHaveLength(2);
  });
});

function row(): AllocationRow {
  return {
    id: 'r1', engineerId: 'e', percentage: 100, days: 209, fte: 1, keuro: 0,
    societe: null, costType: 'FTE', isDirty: false,
    plNumber: 'PL-1', plName: 'P', metier: 'H-DESIGN', ownerN2: 'Z',
    juCode: 'JU-1', juDescription: '', fmmDescription: '', organType: '', energy: '',
    allianceCode: '', vehicleCode: '', standardEmissions: '', market: '',
    totalFte: 1, fteByYear: { '2025': 0.5, '2026': 0.5 }, keByYear: { '2025': 50, '2026': 50 },
  };
}

describe('SplitModal — remove slot', () => {
  it('shows a disabled Remove per slot at the 2-slot minimum, enabled once a 3rd is added (ALLOC-BR-22)', async () => {
    const user = userEvent.setup();
    render(<SplitModal open row={row()} societeOptions={['A', 'B']} onConfirm={vi.fn()} onClose={vi.fn()} />);

    // The Remove affordance is always visible (discoverable) but disabled at the minimum.
    const initial = screen.getAllByRole('button', { name: /remove société/i });
    expect(initial).toHaveLength(2);
    initial.forEach((btn) => expect(btn).toBeDisabled());

    // Add a third slot → all three Remove buttons become enabled.
    await user.click(screen.getByRole('button', { name: /add société/i }));
    const removeButtons = screen.getAllByRole('button', { name: /remove société/i });
    expect(removeButtons).toHaveLength(3);
    removeButtons.forEach((btn) => expect(btn).toBeEnabled());

    // Remove one → back to 2 slots, Remove disabled again.
    await user.click(removeButtons[0]);
    const afterRemove = screen.getAllByRole('button', { name: /remove société/i });
    expect(afterRemove).toHaveLength(2);
    afterRemove.forEach((btn) => expect(btn).toBeDisabled());
  });
});
