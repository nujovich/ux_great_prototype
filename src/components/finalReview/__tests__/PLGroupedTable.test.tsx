import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PLGroupedTable } from '../PLGroupedTable';
import { buildPlTree } from '../../../lib/finalReviewAggregation';
import type { AllocationRow } from '../../../types';

const mk = (o: Partial<AllocationRow>): AllocationRow => ({
  id: 'x', plNumber: 'PL1', plName: 'L', metier: 'BE', ownerN2: 'O1', juCode: 'JU1',
  juDescription: 'd', fmmDescription: 'f', organType: '', energy: '', allianceCode: '',
  vehicleCode: '', standardEmissions: '', market: '', totalFte: 1,
  fteByYear: { '2025': 1 }, keByYear: { '2025': 100 }, societe: 'S1', costType: 'FTE',
  fte: 1, keuro: 100, engineerId: 'e', percentage: 100, days: 0, isDirty: false, ...o,
});

describe('PLGroupedTable (tree-grid)', () => {
  it('shows métier rows and PL total, with sociétés collapsed by default', () => {
    const [pl] = buildPlTree(
      [mk({ id: 'a' }), mk({ id: 'b', totalFte: 2, fteByYear: { '2025': 2 } })],
      ['2025'],
    );
    render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    expect(screen.getByText('BE (1)')).toBeInTheDocument();
    expect(screen.getByText(/PL total/i)).toBeInTheDocument();
    // 3.00 (= 1 + 2) appears in the métier subtotal and the PL-total rows.
    expect(screen.getAllByText('3.00').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('S1 (1)')).not.toBeInTheDocument();
  });

  it('expands métier to reveal société, then société to reveal the cost type leaf', () => {
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    fireEvent.click(screen.getByRole('button', { name: /BE \(1\)/ }));
    expect(screen.getByText('S1 (1)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /S1 \(1\)/ }));
    expect(screen.getByText('FTE')).toBeInTheDocument();
  });

  it('renders the reduced column set and drops the old detail columns', () => {
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Total FTE')).toBeInTheDocument();
    expect(screen.getByText('Total K€')).toBeInTheDocument();
    expect(screen.getByText('FTE 2025')).toBeInTheDocument();
    expect(screen.getByText('K€ 2025')).toBeInTheDocument();
    expect(screen.queryByText('Owner N2')).not.toBeInTheDocument();
    expect(screen.queryByText('JU Code')).not.toBeInTheDocument();
    expect(screen.queryByText('Total BH')).not.toBeInTheDocument();
  });

  it('hides K€ columns when canViewKeuro is false', () => {
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    const { rerender } = render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    expect(screen.getByText('K€ 2025')).toBeInTheDocument();
    rerender(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro={false} />);
    expect(screen.queryByText('K€ 2025')).not.toBeInTheDocument();
  });
});
