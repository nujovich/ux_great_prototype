import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — split K€ is proportional', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('child rows keep proportional K€ instead of 0', async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // alloc-1-a: keByYear {2025:425, 2026:425}. Split 60/40 → child A K€ 2025 = 255.
    const row = screen.getByLabelText('Société for alloc-1-a').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /split/i }));

    // Selector adaptation: Modal renders a plain div (no role="dialog").
    // Find the modal container via the split modal heading, then traverse up.
    const heading = screen.getByRole('heading', { name: /Split — JU-D-001/i });
    const modalContainer = heading.closest('div.rounded-lg') as HTMLElement;

    const pctInputs = within(modalContainer).getAllByRole('spinbutton');
    await user.clear(pctInputs[0]);
    await user.type(pctInputs[0], '60');
    await user.clear(pctInputs[1]);
    await user.type(pctInputs[1], '40');

    const selects = within(modalContainer).getAllByRole('combobox');
    await user.selectOptions(selects[0], 'Renault SAS-Paris');
    await user.selectOptions(selects[1], 'RNBV-Amsterdam');

    await user.click(within(modalContainer).getByRole('button', { name: /confirm/i }));

    // First child K€ 2025 = 425 × 0.6 = 255 (not 0).
    // Selector adaptation: find the first child row via its aria-label (id: alloc-1-a-split-0).
    const firstChildRow = screen.getByLabelText('Société for alloc-1-a-split-0').closest('tr')!;
    const cells = within(firstChildRow).getAllByRole('cell').map((c) => c.textContent);
    expect(cells).toContain('255');
  });

  it("a split child's Total FTE matches the sum of its per-year FTE", async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // alloc-1-a: totalFte 1.00, fteByYear {2025:0.5, 2026:0.5}. Split 60/40 →
    // child A fteByYear {2025:0.3, 2026:0.3}, so its Total FTE must be 0.60, not the parent's 1.00.
    const row = screen.getByLabelText('Société for alloc-1-a').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /split/i }));

    const heading = screen.getByRole('heading', { name: /Split — JU-D-001/i });
    const modalContainer = heading.closest('div.rounded-lg') as HTMLElement;

    const pctInputs = within(modalContainer).getAllByRole('spinbutton');
    await user.clear(pctInputs[0]);
    await user.type(pctInputs[0], '60');
    await user.clear(pctInputs[1]);
    await user.type(pctInputs[1], '40');

    const selects = within(modalContainer).getAllByRole('combobox');
    await user.selectOptions(selects[0], 'Renault SAS-Paris');
    await user.selectOptions(selects[1], 'RNBV-Amsterdam');

    await user.click(within(modalContainer).getByRole('button', { name: /confirm/i }));

    const firstChildRow = screen.getByLabelText('Société for alloc-1-a-split-0').closest('tr')!;
    const cells = within(firstChildRow).getAllByRole('cell').map((c) => c.textContent);
    // Total FTE column shows 0.60 (0.30 + 0.30), matching the per-year breakdown.
    expect(cells).toContain('0.60');
    expect(cells).not.toContain('1.00');
  });
});
