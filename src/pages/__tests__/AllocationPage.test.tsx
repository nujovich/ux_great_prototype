import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — global select-all filtered', () => {
  beforeEach(() => {
    // PMO can edit:allocation
    useRoleStore.getState().setRole('PMO');
  });

  it('selects every filtered row with one control and enables bulk assign', async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // The global control is labelled "Select all filtered"
    const selectAll = screen.getByLabelText(/select all filtered/i);
    await user.click(selectAll);

    // Bulk button now reflects the full filtered count (> any single PL group)
    const bulkBtn = screen.getByRole('button', { name: /bulk assign société/i });
    expect(bulkBtn).toBeEnabled();
    // count in the label equals number of row checkboxes rendered
    const rowChecks = screen.getAllByLabelText(/select row/i);
    expect(bulkBtn.textContent).toContain(String(rowChecks.length));
  });
});
