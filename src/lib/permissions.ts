import type { Role } from '../types';
import { ROLE_PERMISSIONS, type Permission } from '../fixtures/roles';

export function hasPermission(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}

export interface NavItem {
  key: string;
  label: string;
  path: string;
  permission: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'pre-estimation', label: 'Pre-Estimation', path: '/pre-estimation', permission: 'view:pre-estimation' },
  { key: 'estimation-review', label: 'Estimation Review', path: '/estimation-review', permission: 'view:estimation-review' },
  { key: 'allocation', label: 'Allocation', path: '/allocation', permission: 'view:allocation' },
  { key: 'final-review', label: 'Final Review', path: '/final-review', permission: 'view:final-review' },
  { key: 'management', label: 'Management', path: '/management', permission: 'view:management' },
  { key: 'admin', label: 'Admin', path: '/admin', permission: 'view:admin' },
];

export function visibleNavFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((n) => hasPermission(role, n.permission));
}
