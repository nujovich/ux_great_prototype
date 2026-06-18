import '@testing-library/jest-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FinalReviewPage } from '../FinalReviewPage';
import { useRoleStore } from '../../store/roleStore';
import type { Role } from '../../types';

// Mirrors the SDD kit FINAL_REVIEW_PERMISSIONS.can_send_stage3
const CAN_SEND: Record<Role, boolean> = {
  Admin: true, PMO: true, CPO: false, Engineer: false, RCRC: false,
};

afterEach(() => useRoleStore.getState().setRole('Engineer'));

describe('FinalReviewPage — Send Stage 3 gating matches SDD kit', () => {
  (Object.keys(CAN_SEND) as Role[]).forEach((role) => {
    it(`${role}: Send Stage 3 button ${CAN_SEND[role] ? 'visible' : 'hidden'}`, () => {
      useRoleStore.getState().setRole(role);
      render(<FinalReviewPage />);
      const btn = screen.queryByRole('button', { name: /Send Stage 3/i });
      if (CAN_SEND[role]) expect(btn).toBeInTheDocument();
      else expect(btn).not.toBeInTheDocument();
    });
  });

  // Regression: switching role AFTER mount must re-gate the button (no stale subscription).
  it('hides the button when switching from a sender role to a non-sender role after mount', () => {
    useRoleStore.getState().setRole('Admin');
    render(<FinalReviewPage />);
    expect(screen.getByRole('button', { name: /Send Stage 3/i })).toBeInTheDocument();
    act(() => useRoleStore.getState().setRole('RCRC'));
    expect(screen.queryByRole('button', { name: /Send Stage 3/i })).not.toBeInTheDocument();
  });
});
