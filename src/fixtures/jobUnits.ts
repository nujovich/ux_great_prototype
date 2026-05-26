import type { JobUnit } from '../types';

export const JOB_UNITS: JobUnit[] = [
  // ── cr-1-1: API endpoints / REST Standard ──
  { id: 'ju-1-1-1', cranId: 'cr-1-1', inductorId: 'ind-1', shortName: 'API-S01', description: 'Setup & scaffolding', variable: 0, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-1-1-2', cranId: 'cr-1-1', inductorId: 'ind-1', shortName: 'API-S02', description: 'CRUD endpoints per resource', variable: 1.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-1-1-3', cranId: 'cr-1-1', inductorId: 'ind-1', shortName: 'API-S03', description: 'Integration tests', variable: 0.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-1-2: API endpoints / REST + Auth ──
  { id: 'ju-1-2-1', cranId: 'cr-1-2', inductorId: 'ind-1', shortName: 'API-A01', description: 'Auth middleware & guards', variable: 0, fixed: 2.0, unitType: 'ManDay' },
  { id: 'ju-1-2-2', cranId: 'cr-1-2', inductorId: 'ind-1', shortName: 'API-A02', description: 'CRUD endpoints per resource', variable: 1.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-1-2-3', cranId: 'cr-1-2', inductorId: 'ind-1', shortName: 'API-A03', description: 'Token & session management', variable: 0, fixed: 1.5, unitType: 'ManDay' },

  // ── cr-1-3: API endpoints / GraphQL ──
  { id: 'ju-1-3-1', cranId: 'cr-1-3', inductorId: 'ind-1', shortName: 'API-G01', description: 'Schema definition', variable: 0.8, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-1-3-2', cranId: 'cr-1-3', inductorId: 'ind-1', shortName: 'API-G02', description: 'Resolvers per type', variable: 2.0, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-1-3-3', cranId: 'cr-1-3', inductorId: 'ind-1', shortName: 'API-G03', description: 'Subscriptions', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-2-1: DB tables / PostgreSQL ──
  { id: 'ju-2-1-1', cranId: 'cr-2-1', inductorId: 'ind-2', shortName: 'DB-P01', description: 'Table schema & migrations', variable: 0.5, fixed: 0.3, unitType: 'ManDay' },
  { id: 'ju-2-1-2', cranId: 'cr-2-1', inductorId: 'ind-2', shortName: 'DB-P02', description: 'Indexes & constraints', variable: 0.3, fixed: 0.2, unitType: 'ManDay' },

  // ── cr-2-2: DB tables / MySQL ──
  { id: 'ju-2-2-1', cranId: 'cr-2-2', inductorId: 'ind-2', shortName: 'DB-M01', description: 'Table schema & migrations', variable: 0.5, fixed: 0.3, unitType: 'ManDay' },
  { id: 'ju-2-2-2', cranId: 'cr-2-2', inductorId: 'ind-2', shortName: 'DB-M02', description: 'Indexes & constraints', variable: 0.3, fixed: 0.2, unitType: 'ManDay' },

  // ── cr-3-1: Integraciones externas / HTTP REST ──
  { id: 'ju-3-1-1', cranId: 'cr-3-1', inductorId: 'ind-3', shortName: 'INT-R01', description: 'HTTP client setup & auth', variable: 0, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-3-1-2', cranId: 'cr-3-1', inductorId: 'ind-3', shortName: 'INT-R02', description: 'Endpoint integration per service', variable: 3.0, fixed: 0, unitType: 'ManDay' },

  // ── cr-3-2: Integraciones externas / SOAP ──
  { id: 'ju-3-2-1', cranId: 'cr-3-2', inductorId: 'ind-3', shortName: 'INT-S01', description: 'WSDL parsing & client generation', variable: 0, fixed: 2.5, unitType: 'ManDay' },
  { id: 'ju-3-2-2', cranId: 'cr-3-2', inductorId: 'ind-3', shortName: 'INT-S02', description: 'Operation mapping per service', variable: 2.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-3-3: Integraciones externas / Event-Driven ──
  { id: 'ju-3-3-1', cranId: 'cr-3-3', inductorId: 'ind-3', shortName: 'INT-E01', description: 'Message broker setup', variable: 0, fixed: 2.0, unitType: 'ManDay' },
  { id: 'ju-3-3-2', cranId: 'cr-3-3', inductorId: 'ind-3', shortName: 'INT-E02', description: 'Event handler per topic', variable: 1.5, fixed: 0, unitType: 'ManDay' },

  // ── cr-4-1: Pantallas UI / Basic ──
  { id: 'ju-4-1-1', cranId: 'cr-4-1', inductorId: 'ind-4', shortName: 'UI-B01', description: 'Layout & navigation', variable: 1.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-4-1-2', cranId: 'cr-4-1', inductorId: 'ind-4', shortName: 'UI-B02', description: 'Form screens', variable: 0.8, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-4-2: Pantallas UI / Rich Interactive ──
  { id: 'ju-4-2-1', cranId: 'cr-4-2', inductorId: 'ind-4', shortName: 'UI-R01', description: 'Layout & navigation', variable: 1.8, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-4-2-2', cranId: 'cr-4-2', inductorId: 'ind-4', shortName: 'UI-R02', description: 'Complex form screens', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-4-2-3', cranId: 'cr-4-2', inductorId: 'ind-4', shortName: 'UI-R03', description: 'Charts & data visualizations', variable: 2.5, fixed: 0, unitType: 'ManDay' },

  // ── cr-5-1: Componentes / Simple ──
  { id: 'ju-5-1-1', cranId: 'cr-5-1', inductorId: 'ind-5', shortName: 'CMP-S01', description: 'Component design & implementation', variable: 0.8, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-5-1-2', cranId: 'cr-5-1', inductorId: 'ind-5', shortName: 'CMP-S02', description: 'Storybook / documentation', variable: 0.3, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-5-2: Componentes / Complex ──
  { id: 'ju-5-2-1', cranId: 'cr-5-2', inductorId: 'ind-5', shortName: 'CMP-C01', description: 'Component design & state management', variable: 1.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-5-2-2', cranId: 'cr-5-2', inductorId: 'ind-5', shortName: 'CMP-C02', description: 'Testing & documentation', variable: 0.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-6-1: Pipelines ETL / Batch ──
  { id: 'ju-6-1-1', cranId: 'cr-6-1', inductorId: 'ind-6', shortName: 'ETL-B01', description: 'Extract & transform logic', variable: 3.0, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-6-1-2', cranId: 'cr-6-1', inductorId: 'ind-6', shortName: 'ETL-B02', description: 'Load & orchestration', variable: 2.0, fixed: 1.0, unitType: 'ManDay' },

  // ── cr-6-2: Pipelines ETL / Streaming ──
  { id: 'ju-6-2-1', cranId: 'cr-6-2', inductorId: 'ind-6', shortName: 'ETL-S01', description: 'Stream processor implementation', variable: 4.0, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-6-2-2', cranId: 'cr-6-2', inductorId: 'ind-6', shortName: 'ETL-S02', description: 'Error handling & replay', variable: 0, fixed: 2.0, unitType: 'ManDay' },

  // ── cr-7-1: Reportes / Static ──
  { id: 'ju-7-1-1', cranId: 'cr-7-1', inductorId: 'ind-7', shortName: 'RPT-S01', description: 'Data query & model', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-7-1-2', cranId: 'cr-7-1', inductorId: 'ind-7', shortName: 'RPT-S02', description: 'Report layout & export', variable: 1.0, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-7-2: Reportes / Interactive ──
  { id: 'ju-7-2-1', cranId: 'cr-7-2', inductorId: 'ind-7', shortName: 'RPT-I01', description: 'Data query & model', variable: 2.0, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-7-2-2', cranId: 'cr-7-2', inductorId: 'ind-7', shortName: 'RPT-I02', description: 'Interactive charts', variable: 2.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-7-2-3', cranId: 'cr-7-2', inductorId: 'ind-7', shortName: 'RPT-I03', description: 'Filter & drill-down logic', variable: 0.5, fixed: 1.0, unitType: 'ManDay' },

  // ── cr-8-1: Despliegues infra / Standard ──
  { id: 'ju-8-1-1', cranId: 'cr-8-1', inductorId: 'ind-8', shortName: 'INF-S01', description: 'Environment provisioning', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-8-1-2', cranId: 'cr-8-1', inductorId: 'ind-8', shortName: 'INF-S02', description: 'CI/CD pipeline setup', variable: 0, fixed: 2.0, unitType: 'ManDay' },

  // ── cr-8-2: Despliegues infra / Blue-Green ──
  { id: 'ju-8-2-1', cranId: 'cr-8-2', inductorId: 'ind-8', shortName: 'INF-B01', description: 'Blue-green environment setup', variable: 0, fixed: 3.0, unitType: 'ManDay' },
  { id: 'ju-8-2-2', cranId: 'cr-8-2', inductorId: 'ind-8', shortName: 'INF-B02', description: 'Traffic routing & rollback config', variable: 0, fixed: 1.5, unitType: 'ManDay' },

  // ── cr-9-1: Test cases E2E / Selenium ──
  { id: 'ju-9-1-1', cranId: 'cr-9-1', inductorId: 'ind-9', shortName: 'QA-SE01', description: 'Selenium framework setup', variable: 0, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-9-1-2', cranId: 'cr-9-1', inductorId: 'ind-9', shortName: 'QA-SE02', description: 'Test case implementation', variable: 0.3, fixed: 0, unitType: 'ManDay' },

  // ── cr-9-2: Test cases E2E / Playwright ──
  { id: 'ju-9-2-1', cranId: 'cr-9-2', inductorId: 'ind-9', shortName: 'QA-PW01', description: 'Playwright framework setup', variable: 0, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-9-2-2', cranId: 'cr-9-2', inductorId: 'ind-9', shortName: 'QA-PW02', description: 'Test case implementation', variable: 0.25, fixed: 0, unitType: 'ManDay' },

  // ── cr-10-1: Vistas mobile / Native ──
  { id: 'ju-10-1-1', cranId: 'cr-10-1', inductorId: 'ind-10', shortName: 'MOB-N01', description: 'Screen layout & navigation', variable: 2.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-10-1-2', cranId: 'cr-10-1', inductorId: 'ind-10', shortName: 'MOB-N02', description: 'Platform-specific logic', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-10-2: Vistas mobile / React Native ──
  { id: 'ju-10-2-1', cranId: 'cr-10-2', inductorId: 'ind-10', shortName: 'MOB-R01', description: 'Screen layout & navigation', variable: 2.0, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-10-2-2', cranId: 'cr-10-2', inductorId: 'ind-10', shortName: 'MOB-R02', description: 'Native module bridge', variable: 0, fixed: 2.0, unitType: 'ManDay' },

  // ── cr-11-1: Migraciones / Simple ──
  { id: 'ju-11-1-1', cranId: 'cr-11-1', inductorId: 'ind-11', shortName: 'MIG-S01', description: 'Data mapping & transformation', variable: 1.5, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-11-1-2', cranId: 'cr-11-1', inductorId: 'ind-11', shortName: 'MIG-S02', description: 'Validation & error reporting', variable: 0.5, fixed: 0.5, unitType: 'ManDay' },

  // ── cr-11-2: Migraciones / Complex ──
  { id: 'ju-11-2-1', cranId: 'cr-11-2', inductorId: 'ind-11', shortName: 'MIG-C01', description: 'Relational mapping & joins', variable: 2.5, fixed: 1.0, unitType: 'ManDay' },
  { id: 'ju-11-2-2', cranId: 'cr-11-2', inductorId: 'ind-11', shortName: 'MIG-C02', description: 'Rollback & audit trail', variable: 0, fixed: 2.0, unitType: 'ManDay' },

  // ── cr-12-1: Documentación / Standard ──
  { id: 'ju-12-1-1', cranId: 'cr-12-1', inductorId: 'ind-12', shortName: 'DOC-S01', description: 'Technical spec document', variable: 0.5, fixed: 0, unitType: 'ManDay' },
  { id: 'ju-12-1-2', cranId: 'cr-12-1', inductorId: 'ind-12', shortName: 'DOC-S02', description: 'API / interface documentation', variable: 0.3, fixed: 0, unitType: 'ManDay' },

  // ── cr-12-2: Documentación / Extended ──
  { id: 'ju-12-2-1', cranId: 'cr-12-2', inductorId: 'ind-12', shortName: 'DOC-E01', description: 'Architecture & design docs', variable: 0.8, fixed: 0.5, unitType: 'ManDay' },
  { id: 'ju-12-2-2', cranId: 'cr-12-2', inductorId: 'ind-12', shortName: 'DOC-E02', description: 'Runbook & ops guide', variable: 0, fixed: 1.5, unitType: 'ManDay' },
];
