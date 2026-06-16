import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ManagementPage } from '../ManagementPage';
import { useRoleStore } from '../../store/roleStore';
import type { Role } from '../../types';

// HIW-178: Management View is read-only for Admin, PMO and RCRC; CPO and Engineer
// have no access. Allowed roles render the dashboard (status matrix table); denied
// roles get the RoleGate fallback (no table).
function renderAs(role: Role) {
  useRoleStore.getState().setRole(role);
  return render(<ManagementPage />);
}

describe('ManagementPage access (HIW-178)', () => {
  beforeEach(() => cleanup());

  it.each(['Admin', 'PMO', 'RCRC'] as Role[])('renders the dashboard for %s', (role) => {
    renderAs(role);
    expect(screen.queryByRole('table')).toBeTruthy();
  });

  it.each(['CPO', 'Engineer'] as Role[])('blocks %s with the access gate', (role) => {
    renderAs(role);
    expect(screen.queryByRole('table')).toBeNull();
  });
});
