import type { Role } from '../types';

export const ROLES: Role[] = ['Engineer', 'PMO', 'Admin', 'RCRC', 'CPO'];

export type Permission =
  | 'view:framing-file'
  | 'upload:framing-file'
  | 'edit:framing-file'
  | 'save:framing-file'
  /** §9 — send RFQ framing lines to Pre-Estimation as project lines. */
  | 'generate:project-lines'
  | 'view:pre-estimation'
  | 'edit:estimation'
  | 'view:own-lines-only'
  | 'save:draft'
  | 'save:definitive'
  | 'copy:estimation'
  | 'edit:custom-jus'
  | 'view:estimation-review'
  | 'export:estimation-review'
  | 'approve:estimation'
  | 'view:allocation'
  | 'edit:allocation'
  | 'view:k-euro-rates'
  | 'view:final-review'
  | 'export:final-review'
  | 'send:stage3'
  | 'upload:workload-standards'
  | 'view:management'
  | 'view:admin'
  | 'simulate:hvt-approval';  // Admin-only: simulate HVT sending approval back (ERev-BR-10)

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Engineer: [
    'view:pre-estimation',
    'view:own-lines-only',
    'edit:estimation',
    'save:draft',
    'save:definitive',
    'copy:estimation',
    'edit:custom-jus',
    'view:estimation-review',
    'export:estimation-review',
    'view:final-review',
    'export:final-review',
  ],
  PMO: [
    'view:framing-file',
    'upload:framing-file',
    'edit:framing-file',
    'save:framing-file',
    'generate:project-lines',
    'view:pre-estimation',
    'view:estimation-review',
    'export:estimation-review',
    'view:allocation',
    'edit:allocation',
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    'send:stage3',
    'view:management',
  ],
  Admin: [
    'view:framing-file',
    'upload:framing-file',
    'edit:framing-file',
    'save:framing-file',
    'generate:project-lines',
    'view:pre-estimation',
    'edit:estimation',
    'save:draft',
    'save:definitive',
    'copy:estimation',
    'edit:custom-jus',
    'view:estimation-review',
    'export:estimation-review',
    'view:allocation',
    'edit:allocation',
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    'send:stage3',
    'view:management',
    'view:admin',
    'upload:workload-standards',
    'simulate:hvt-approval',
  ],
  RCRC: [
    'view:pre-estimation',
    'view:estimation-review',
    'export:estimation-review',
    'view:allocation',
    'edit:allocation',
    'view:k-euro-rates',
    'view:final-review',
    'export:final-review',
    'upload:workload-standards',
    'view:management',
  ],
  CPO: [
    // §2.1: CPO reviews, corrects and saves but never introduces new files.
    'view:framing-file',
    'edit:framing-file',
    'save:framing-file',
    'view:estimation-review',
    'export:estimation-review',
    // ERev-BR-10: CPO cannot approve or reject directly — approval/rejection comes from HVT only
    'view:final-review',
    'export:final-review',
  ],
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Engineer: 'Estima sus propias project lines',
  PMO: 'Gestiona portfolio y revisa estimaciones',
  Admin: 'Súper-usuario con acceso a configuración',
  RCRC: 'Revisor read-only con comentarios',
  CPO: 'Aprobación final y visión ejecutiva',
};
