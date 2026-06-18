import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — TC→FTE restores the K€ baseline (point 6)', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO'); // can edit + view K€
  });

  it('restores the original FTE K€ after customizing via TC then switching back', async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // alloc-1-a is FTE with a 425 / 425 K€ baseline and a societe already assigned.
    const costSelect = screen.getByLabelText('Cost Type for alloc-1-a');

    // Switch to TC → popup opens; override total to 100 (distributes 50 / 50) and confirm.
    await user.selectOptions(costSelect, 'TC');
    await user.type(screen.getByLabelText('Total K€'), '100');
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));

    // The override is now visible on the row.
    let cells = within(costSelect.closest('tr')!).getAllByRole('cell').map((c) => c.textContent);
    expect(cells).toContain('50');

    // Switch back to FTE → K€ returns to the 425 baseline, the TC override is discarded.
    await user.selectOptions(costSelect, 'FTE');
    cells = within(costSelect.closest('tr')!).getAllByRole('cell').map((c) => c.textContent);
    expect(cells).toContain('425');
    expect(cells).not.toContain('50');
  });
});
