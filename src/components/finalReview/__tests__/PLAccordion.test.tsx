import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
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
    render(<PLAccordion pl={pl} years={['2025']} canViewKeuro canExport={false} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /PL1/ }));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders the per-PL Excel export button disabled; clicking it does not expand', async () => {
    const user = userEvent.setup();
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    render(<PLAccordion pl={pl} years={['2025']} canViewKeuro canExport />);
    const exportBtn = screen.getByRole('button', { name: /Export Excel/i });
    expect(exportBtn).toBeDisabled();
    await user.click(exportBtn);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
