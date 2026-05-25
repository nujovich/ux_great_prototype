import { create } from 'zustand';
import type { Role } from '../types';
import { ACTIVE_ENGINEER_ID } from '../fixtures/engineers';
import { ROLE_PERMISSIONS, type Permission } from '../fixtures/roles';

interface RoleState {
  currentRole: Role;
  activeEngineerId: string | null;
  setRole: (r: Role) => void;
  can: (p: Permission) => boolean;
}

export const useRoleStore = create<RoleState>((set, get) => ({
  currentRole: 'Engineer',
  activeEngineerId: ACTIVE_ENGINEER_ID,
  setRole: (r) =>
    set({
      currentRole: r,
      activeEngineerId: r === 'Engineer' ? ACTIVE_ENGINEER_ID : null,
    }),
  can: (p) => ROLE_PERMISSIONS[get().currentRole].includes(p),
}));
