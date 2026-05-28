import type { ProjectLine } from '../types';

// 26 líneas con mix de status y campos de compatibilidad SDD Kit.
// Los campos organType, energyFuelType, projectRanking, injectionSystem
// determinan la compatibilidad multi-línea (BR-06, BR-07 del SDD Kit).
export const PROJECT_LINES: ProjectLine[] = [
  // ── Empty (8) ──────────────────────────────────────────────
  // Auth Platform - Backend (Thermal Engine, Gasoline, Mother, Direct Injection)
  {
    id: 'PL-001', projectId: 'P-AUTH', projectName: 'Auth Platform', lineName: 'Authentication API refactor',
    metier: 'Backend', status: 'to_do', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-1',
    estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-10T09:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-01-01', durationMonths: 6,
    description: 'Refactor the authentication API to support OAuth2.0 with JWT tokens',
  },
  {
    id: 'PL-002', projectId: 'P-AUTH', projectName: 'Auth Platform', lineName: 'OAuth provider integration',
    metier: 'Backend', status: 'to_do', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-1',
    estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-10T09:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-02-01', durationMonths: 4,
    description: 'Integrate Google, GitHub, and Microsoft OAuth providers for SSO login',
  },
  {
    id: 'PL-003', projectId: 'P-PAY', projectName: 'Payments', lineName: 'Stripe webhook',
    metier: 'Backend', status: 'to_do', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-2',
    estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-09T10:00:00Z',
    organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child',
    injectionSystem: null, spDate: '2026-03-01', durationMonths: 3,
  },
  {
    id: 'PL-004', projectId: 'P-MKT', projectName: 'Marketing Tools', lineName: 'Landing builder UI',
    metier: 'Frontend', status: 'to_do', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-3',
    estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-09T10:00:00Z',
    organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child',
    injectionSystem: null, spDate: '2026-04-01', durationMonths: 5,
  },
  {
    id: 'PL-005', projectId: 'P-MKT', projectName: 'Marketing Tools', lineName: 'A/B test dashboard',
    metier: 'Frontend', status: 'to_do', cycleId: 'cyc-2026h1', assignedEngineerId: null,
    estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-08T11:00:00Z',
    organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child',
    injectionSystem: null, spDate: '2026-05-01', durationMonths: 4,
  },
  {
    id: 'PL-006', projectId: 'P-DATA', projectName: 'Data Platform', lineName: 'Event pipeline',
    metier: 'Data', status: 'to_do', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-5',
    estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-08T11:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-06-01', durationMonths: 6,
  },
  {
    id: 'PL-007', projectId: 'P-MOB', projectName: 'Mobile App', lineName: 'Onboarding screens',
    metier: 'Mobile', status: 'to_do', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-9',
    estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-08T11:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: null, spDate: '2026-07-01', durationMonths: 3,
  },
  {
    id: 'PL-008', projectId: 'P-INFRA', projectName: 'Infra', lineName: 'Kubernetes migration',
    metier: 'DevOps', status: 'to_do', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-7',
    estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-07T11:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-08-01', durationMonths: 4,
  },

  // ── Draft (6) ──────────────────────────────────────────────
  {
    id: 'PL-009', projectId: 'P-AUTH', projectName: 'Auth Platform', lineName: 'SAML SSO',
    metier: 'Backend', status: 'draft', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-1',
    estimatedDays: 18, estimatedKEuro: 15.3, lastUpdatedBy: 'Ana Martinez', lastUpdatedAt: '2026-05-20T15:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-03-01', durationMonths: 3,
    description: 'Implement SAML-based Single Sign-On for enterprise clients',
  },
  {
    id: 'PL-010', projectId: 'P-PAY', projectName: 'Payments', lineName: 'Accounting reports',
    metier: 'Backend', status: 'draft', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-2',
    estimatedDays: 12, estimatedKEuro: 10.2, lastUpdatedBy: 'Bruno Silva', lastUpdatedAt: '2026-05-19T15:00:00Z',
    organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child',
    injectionSystem: null, spDate: '2026-04-01', durationMonths: 4,
  },
  {
    id: 'PL-011', projectId: 'P-MKT', projectName: 'Marketing Tools', lineName: 'Email templates editor',
    metier: 'Frontend', status: 'draft', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-3',
    estimatedDays: 22, estimatedKEuro: 17.6, lastUpdatedBy: 'Carla Rossi', lastUpdatedAt: '2026-05-19T14:00:00Z',
    organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child',
    injectionSystem: null, spDate: '2026-05-01', durationMonths: 5,
  },
  {
    id: 'PL-012', projectId: 'P-DATA', projectName: 'Data Platform', lineName: 'BI dashboards Q3',
    metier: 'Data', status: 'draft', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-5',
    estimatedDays: 25, estimatedKEuro: 23.75, lastUpdatedBy: 'Elena Costa', lastUpdatedAt: '2026-05-18T12:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-06-01', durationMonths: 4,
  },
  {
    id: 'PL-013', projectId: 'P-MOB', projectName: 'Mobile App', lineName: 'Push notifications',
    metier: 'Mobile', status: 'draft', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-9',
    estimatedDays: 14, estimatedKEuro: 11.9, lastUpdatedBy: 'Inés Vega', lastUpdatedAt: '2026-05-17T12:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: null, spDate: '2026-07-01', durationMonths: 3,
  },
  {
    id: 'PL-014', projectId: 'P-QA', projectName: 'QA Automation', lineName: 'Suite E2E checkout',
    metier: 'QA', status: 'draft', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-8',
    estimatedDays: 10, estimatedKEuro: 7.0, lastUpdatedBy: 'Hugo Romero', lastUpdatedAt: '2026-05-15T12:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-08-01', durationMonths: 2,
  },

  // ── Estimated (6) ──────────────────────────────────────────
  {
    id: 'PL-015', projectId: 'P-AUTH', projectName: 'Auth Platform', lineName: 'MFA with TOTP',
    metier: 'Backend', status: 'estimated', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-1',
    estimatedDays: 20, estimatedKEuro: 17.0, lastUpdatedBy: 'Ana Martinez', lastUpdatedAt: '2026-05-14T10:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-04-01', durationMonths: 5,
    description: 'Add multi-factor authentication using Time-based One-Time Passwords',
  },
  {
    id: 'PL-016', projectId: 'P-PAY', projectName: 'Payments', lineName: 'Refund API',
    metier: 'Backend', status: 'estimated', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-2',
    estimatedDays: 8, estimatedKEuro: 6.8, lastUpdatedBy: 'Bruno Silva', lastUpdatedAt: '2026-05-14T10:00:00Z',
    organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child',
    injectionSystem: null, spDate: '2026-05-01', durationMonths: 3,
  },
  {
    id: 'PL-017', projectId: 'P-MKT', projectName: 'Marketing Tools', lineName: 'User segmentation',
    metier: 'Frontend', status: 'estimated', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-4',
    estimatedDays: 16, estimatedKEuro: 12.8, lastUpdatedBy: 'Diego Pérez', lastUpdatedAt: '2026-05-13T11:00:00Z',
    organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child',
    injectionSystem: null, spDate: '2026-06-01', durationMonths: 4,
  },
  {
    id: 'PL-018', projectId: 'P-DATA', projectName: 'Data Platform', lineName: 'ML feature store',
    metier: 'Data', status: 'estimated', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-6',
    estimatedDays: 30, estimatedKEuro: 28.5, lastUpdatedBy: 'Felipe Núñez', lastUpdatedAt: '2026-05-13T11:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-07-01', durationMonths: 6,
  },
  {
    id: 'PL-019', projectId: 'P-INFRA', projectName: 'Infra', lineName: 'Disaster recovery setup',
    metier: 'DevOps', status: 'estimated', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-7',
    estimatedDays: 15, estimatedKEuro: 15.0, lastUpdatedBy: 'Gabriela Ortiz', lastUpdatedAt: '2026-05-12T11:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-08-01', durationMonths: 3,
  },
  {
    id: 'PL-020', projectId: 'P-MOB', projectName: 'Mobile App', lineName: 'In-app payment',
    metier: 'Mobile', status: 'estimated', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-10',
    estimatedDays: 22, estimatedKEuro: 18.7, lastUpdatedBy: 'Joaquín Díaz', lastUpdatedAt: '2026-05-12T11:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: null, spDate: '2026-09-01', durationMonths: 4,
  },

  // ── Rejected (3) ────────────────────────────────────────────
  {
    id: 'PL-021', projectId: 'P-AUTH', projectName: 'Auth Platform', lineName: 'Password recovery v2',
    metier: 'Backend', status: 'rejected', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-1',
    estimatedDays: 6, estimatedKEuro: 5.1,
    rejectionComment: 'Missing transactional emails and rate limiting. Review and re-estimate including those inductors.',
    lastUpdatedBy: 'CPO', lastUpdatedAt: '2026-05-21T16:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-05-01', durationMonths: 2,
    description: 'Redesign password recovery flow with transactional emails and rate limiting',
  },
  {
    id: 'PL-022', projectId: 'P-MKT', projectName: 'Marketing Tools', lineName: 'CRM connector',
    metier: 'Frontend', status: 'rejected', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-3',
    estimatedDays: 9, estimatedKEuro: 7.2,
    rejectionComment: 'Estimation too low vs. previous cycle. Review external integration inductors.',
    lastUpdatedBy: 'CPO', lastUpdatedAt: '2026-05-21T16:00:00Z',
    organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child',
    injectionSystem: null, spDate: '2026-06-01', durationMonths: 3,
  },
  {
    id: 'PL-023', projectId: 'P-DATA', projectName: 'Data Platform', lineName: 'Data lineage tooling',
    metier: 'Data', status: 'rejected', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-5',
    estimatedDays: 18, estimatedKEuro: 17.1,
    rejectionComment: 'Define scope with DataGov first. Pause and re-estimate.',
    lastUpdatedBy: 'CPO', lastUpdatedAt: '2026-05-20T16:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-07-01', durationMonths: 4,
  },

  // ── Approved + Allocated (3) ────────────────────────────────
  {
    id: 'PL-024', projectId: 'P-AUTH', projectName: 'Auth Platform', lineName: 'Audit log v1',
    metier: 'Backend', status: 'approved', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-2',
    estimatedDays: 10, estimatedKEuro: 8.5, lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-22T09:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-08-01', durationMonths: 3,
  },
  {
    id: 'PL-025', projectId: 'P-MKT', projectName: 'Marketing Tools', lineName: 'Public site redesign',
    metier: 'Frontend', status: 'approved', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-4',
    estimatedDays: 35, estimatedKEuro: 28.0, lastUpdatedBy: 'PMO', lastUpdatedAt: '2026-05-22T09:00:00Z',
    organType: 'Electric Motor', energyFuelType: 'Electric', projectRanking: 'Child',
    injectionSystem: null, spDate: '2026-09-01', durationMonths: 6,
  },
  {
    id: 'PL-026', projectId: 'P-INFRA', projectName: 'Infra', lineName: 'Monitoring stack',
    metier: 'DevOps', status: 'approved', cycleId: 'cyc-2026h1', assignedEngineerId: 'eng-7',
    estimatedDays: 12, estimatedKEuro: 12.0, lastUpdatedBy: 'CPO', lastUpdatedAt: '2026-05-22T09:00:00Z',
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Direct Injection', spDate: '2026-10-01', durationMonths: 3,
  },
];