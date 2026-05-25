import type { Role } from '../types';

export const ROLES: Role[] = ['Engineer', 'PMO', 'Admin', 'RCRC', 'CPO'];

export type Permission =
  | 'view:pre-estimation'
  | 'edit:estimation'
  | 'view:own-lines-only'
  | 'save:draft'
  | 'save:definitive'
  | 'copy:estimation'
  | 'edit:custom-jus'
  | 'view:estimation-review'
  | 'approve:estimation'
  | 'reject:estimation'
  | 'send:cpo'
  | 'view:allocation'
  | 'edit:allocation'
  | 'view:k-euro-rates'
  | 'view:final-review'
  | 'export:final-review'
  | 'view:management'
  | 'view:admin';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Engineer: [
    'view:pre-estimation',
    'view:own-lines-only',
    'edit:estimation',
    'save:draft',
    'save:definitive',
    'copy:estimation',
  ],
  PMO: [
    'view:pre-estimation',
    'edit:estimation',
    'save:draft',
    'save:definitive',
    'copy:estimation',
    'edit:custom-jus',
    'view:estimation-review',
    'approve:estimation',
    'reject:estimation',
    'send:cpo',
    'view:allocation',
    'edit:allocation',
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    'view:management',
  ],
  Admin: [
    'view:pre-estimation',
    'edit:estimation',
    'save:draft',
    'save:definitive',
    'copy:estimation',
    'edit:custom-jus',
    'view:estimation-review',
    'approve:estimation',
    'reject:estimation',
    'send:cpo',
    'view:allocation',
    'edit:allocation',
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    'view:management',
    'view:admin',
  ],
  RCRC: [
    'view:pre-estimation',
    'view:estimation-review',
    'view:final-review',
    'view:management',
  ],
  CPO: [
    'view:pre-estimation',
    'view:estimation-review',
    'approve:estimation',
    'reject:estimation',
    'view:allocation',
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    'view:management',
  ],
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Engineer: 'Estima sus propias project lines',
  PMO: 'Gestiona portfolio y revisa estimaciones',
  Admin: 'Súper-usuario con acceso a configuración',
  RCRC: 'Revisor read-only con comentarios',
  CPO: 'Aprobación final y visión ejecutiva',
};
