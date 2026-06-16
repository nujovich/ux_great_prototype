import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('PLGroupedTable', () => {
  it('renders JU rows and a PL total row with aggregated FTE', () => {
    const [pl] = buildPlTree(
      [mk({ id: 'a' }), mk({ id: 'b', totalFte: 2, fteByYear: { '2025': 2 } })],
      ['2025'],
    );
    render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    expect(screen.getAllByText('JU1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/PL total/i)).toBeInTheDocument();
    expect(screen.getByText('3.00')).toBeInTheDocument(); // total FTE 1+2
  });

  it('renders subtotal rows at cost type, société and métier levels', () => {
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    expect(screen.getByText(/cost type subtotal/i)).toBeInTheDocument();
    expect(screen.getByText(/société subtotal/i)).toBeInTheDocument();
    expect(screen.getByText(/métier subtotal/i)).toBeInTheDocument();
  });

  it('hides K€ columns when canViewKeuro is false', () => {
    const [pl] = buildPlTree([mk({ id: 'a' })], ['2025']);
    const { rerender } = render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    expect(screen.getByText('K€ 2025')).toBeInTheDocument();
    rerender(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro={false} />);
    expect(screen.queryByText('K€ 2025')).not.toBeInTheDocument();
  });

  it('renders multiple métier groups without key collisions', () => {
    const [pl] = buildPlTree([
      mk({ id: 'a', metier: 'BE' }),
      mk({ id: 'b', metier: 'EE', juCode: 'JU2' }),
    ], ['2025']);
    render(<PLGroupedTable pl={pl} years={['2025']} canViewKeuro />);
    expect(screen.getAllByText(/métier subtotal/i).length).toBe(2);
    expect(screen.getByText('JU1')).toBeInTheDocument();
    expect(screen.getByText('JU2')).toBeInTheDocument();
  });
});
