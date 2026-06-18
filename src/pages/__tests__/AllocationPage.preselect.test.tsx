import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — unassigned rows pre-selected for bulk assignment', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO'); // can edit:allocation
  });

  it('checks rows without a societe on load and surfaces the bulk-assign action', () => {
    render(<AllocationPage />);

    // alloc-unassigned has no societe → its checkbox is checked by default.
    const unassigned = screen.getByLabelText('Select row alloc-unassigned') as HTMLInputElement;
    expect(unassigned.checked).toBe(true);

    // A row that already has a societe is NOT pre-selected.
    const assigned = screen.getByLabelText('Select row alloc-1-a') as HTMLInputElement;
    expect(assigned.checked).toBe(false);

    // The bulk-assign action is available immediately for the pre-selected rows.
    expect(screen.getByRole('button', { name: /bulk assign société/i })).toBeInTheDocument();
  });
});
