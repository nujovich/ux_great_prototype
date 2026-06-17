import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllocationPage } from '../AllocationPage';
import { useRoleStore } from '../../store/roleStore';

describe('AllocationPage — unresolved rows flagged on first render', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('marks a freshly loaded Unassigned row without any edit', () => {
    render(<AllocationPage />);
    const select = screen.getByLabelText('Société for alloc-unassigned');
    const row = select.closest('tr')!;
    expect(row.className).toMatch(/bg-red-50/);
  });
});
