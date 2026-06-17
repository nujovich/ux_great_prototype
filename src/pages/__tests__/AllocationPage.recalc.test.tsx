import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — K€ recalc on cost-type/societe change', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO'); // can edit + view K€
  });

  it('recomputes K€ from the rate table when a known societe is assigned on an FTE row', async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // Row alloc-1-a is FTE, fteByYear {2025:0.5, 2026:0.5}. Assign Oyak Horse (FTE rate 75/68).
    const societeSelect = screen.getByLabelText('Société for alloc-1-a');
    await user.selectOptions(societeSelect, 'Oyak Horse');

    // K€ cells for this row should now read 0.5×75=38 (2025) and 0.5×68=34 (2026), rounded.
    const row = societeSelect.closest('tr')!;
    const cells = within(row).getAllByRole('cell').map((c) => c.textContent);
    expect(cells).toContain('38');
    expect(cells).toContain('34');
  });
});
