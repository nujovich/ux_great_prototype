import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AllocationFilters } from '../AllocationFilters';
import type { AllocationFilterState } from '../../../types';

const emptyFilters: AllocationFilterState = {
  plSearch: '', metier: '', ownerN2: '', societe: '', costType: '', unresolvedOnly: false,
};

const options = {
  metierOptions: ['H-DESIGN', 'H-TESTING'],
  ownerN2Options: ['Zone-A', 'Zone-B'],
  societeOptions: ['Renault SAS-Paris', 'RNBV-Amsterdam'],
};

describe('AllocationFilters', () => {
  it('renders all 6 filter controls', () => {
    render(<AllocationFilters filters={emptyFilters} onChange={() => {}} {...options} />);
    expect(screen.getByPlaceholderText(/PL Number/i)).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Métier/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Owner N2/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Société/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Cost Type/i })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: /unresolved/i })).toBeDefined();
  });

  it('calls onChange with updated plSearch', () => {
    const onChange = vi.fn();
    render(<AllocationFilters filters={emptyFilters} onChange={onChange} {...options} />);
    fireEvent.change(screen.getByPlaceholderText(/PL Number/i), { target: { value: 'PL-01' } });
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, plSearch: 'PL-01' });
  });

  it('calls onChange with __unassigned__ for Unassigned societe option', () => {
    const onChange = vi.fn();
    render(<AllocationFilters filters={emptyFilters} onChange={onChange} {...options} />);
    fireEvent.change(screen.getByRole('combobox', { name: /Société/i }), {
      target: { value: '__unassigned__' },
    });
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, societe: '__unassigned__' });
  });

  it('calls onChange with unresolvedOnly toggled', () => {
    const onChange = vi.fn();
    render(<AllocationFilters filters={emptyFilters} onChange={onChange} {...options} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /unresolved/i }));
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, unresolvedOnly: true });
  });
});
