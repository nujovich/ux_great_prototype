import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — edit TC K€ from grid', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('opens the TC popup pre-filled when editing an existing TC row', async () => {
    const user = userEvent.setup();
    render(<AllocationPage />);

    // alloc-3-a is TC with keByYear {2025:255, 2026:595}.
    const row = screen.getByLabelText('Société for alloc-3-a').closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /edit k€/i }));

    expect((screen.getByLabelText('K€ 2025') as HTMLInputElement).value).toBe('255');
    expect((screen.getByLabelText('K€ 2026') as HTMLInputElement).value).toBe('595');
  });
});
