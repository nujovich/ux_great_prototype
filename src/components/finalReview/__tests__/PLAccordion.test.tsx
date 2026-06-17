import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PLAccordion } from '../PLAccordion';
import { buildPlTree } from '../../../lib/finalReviewAggregation';
import type { AllocationRow } from '../../../types';

const mk = (o: Partial<AllocationRow>): AllocationRow => ({
  id: 'x', plNumber: 'PL1', plName: 'Alpha', metier: 'BE', ownerN2: 'O1', juCode: 'JU1',
  juDescription: 'd', fmmDescription: 'f', organType: '', energy: '', allianceCode: '',
  vehicleCode: '', standardEmissions: '', market: '', totalFte: 1,
  fteByYear: { '2025': 1 }, keByYear: { '2025': 100 }, societe: 'S1', costType: 'FTE',
  fte: 1, keuro: 100, engineerId: 'e', percentage: 100, days: 0, isDirty: false, ...o,
});

describe('PLAccordion', () => {
  it('is collapsed by default and expands on click', async () => {
    const user = userEvent.setup();
    const [pl] = buildPlTree([mk({})], ['2025']);
    render(<PLAccordion pl={pl} years={['2025']} canViewKeuro canExport={false} onExport={() => {}} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /PL1/ }));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('does not fire onExport when export button is clicked (button is disabled)', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    const [pl] = buildPlTree([mk({})], ['2025']);
    render(<PLAccordion pl={pl} years={['2025']} canViewKeuro canExport onExport={onExport} />);
    const exportBtn = screen.getByRole('button', { name: /export excel/i });
    expect(exportBtn).toBeDisabled();
    await user.click(exportBtn);
    expect(onExport).not.toHaveBeenCalled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument(); // accordion did not expand
  });

  it('renders the per-PL Excel export button disabled', () => {
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    render(<PLAccordion pl={pl} years={['2025']} canViewKeuro canExport onExport={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Export Excel/i })).toBeDisabled();
  });
});
