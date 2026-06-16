import { describe, it, expect } from 'vitest';
import { hasPermission, visibleNavFor } from '../permissions';
import type { Role } from '../../types';

describe('PMO is read-only over estimation content (HIW-174 §2 / BR-20)', () => {
  const denied = ['edit:estimation', 'save:draft', 'save:definitive', 'copy:estimation', 'edit:custom-jus'] as const;
  it.each(denied)('PMO must NOT have %s', (perm) => {
    expect(hasPermission('PMO', perm)).toBe(false);
  });
  it('PMO can still view pre-estimation', () => {
    expect(hasPermission('PMO', 'view:pre-estimation')).toBe(true);
  });
  it('Engineer CAN edit and save', () => {
    expect(hasPermission('Engineer', 'edit:estimation')).toBe(true);
    expect(hasPermission('Engineer', 'save:draft')).toBe(true);
  });
});

describe('visibleNavFor — Management visibility (HIW-178)', () => {
  const hasManagement = (role: Role) =>
    visibleNavFor(role).some((n) => n.key === 'management');

  it('PMO, Admin and RCRC see Management in the nav', () => {
    expect(hasManagement('PMO')).toBe(true);
    expect(hasManagement('Admin')).toBe(true);
    expect(hasManagement('RCRC')).toBe(true);
  });

  it('CPO and Engineer do not see Management in the nav', () => {
    expect(hasManagement('CPO')).toBe(false);
    expect(hasManagement('Engineer')).toBe(false);
  });
});
