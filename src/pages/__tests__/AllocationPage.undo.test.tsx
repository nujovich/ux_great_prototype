import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — undo restores the original pre-split row', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('collapses the two seeded split children back into one row on undo', async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // line-2 starts as two children (Renault SAS / Renault Korea split). At least one Undo button.
    const undoButtons = screen.getAllByRole('button', { name: /^undo$/i });
    expect(undoButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(undoButtons[0]);

    // After undo, the JU-T-001 thermal campaign appears as a single row again:
    // exactly one cell with JU code 'JU-T-001'.
    const juCells = screen.getAllByText('JU-T-001');
    expect(juCells.length).toBe(1);
  });
});
