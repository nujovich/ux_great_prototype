import type { JobUnit, Metier } from '../types';

// cranId derivado del patrón ju-X-Y-Z → cr-X-Y
const cranOf = (id: string): string => {
  const parts = id.split('-');
  return `cr-${parts[1]}-${parts[2]}`;
};

const makeJU = (id: string, name: string, variable: number, metier: Metier = 'H-DESIGN', fixed = 0): JobUnit => ({
  id, cranId: cranOf(id), shortName: name, description: name,
  variable, fixed, unitType: 'man_day',
  fmm: '', smm: '', dmm: '', genericProfile: '',
  metier,
});

export const JOB_UNITS: JobUnit[] = [
  // ── API endpoints ──
  makeJU('ju-1-1-1', 'API-S01 Setup & scaffolding', 1.0),
  makeJU('ju-1-1-2', 'API-S02 CRUD endpoints', 1.5),
  makeJU('ju-1-1-3', 'API-S03 Integration tests', 0.5),
  makeJU('ju-1-2-1', 'API-A01 Auth middleware', 2.0),
  makeJU('ju-1-2-2', 'API-A02 CRUD endpoints', 1.5),
  makeJU('ju-1-2-3', 'API-A03 Token & session mgmt', 1.5),
  makeJU('ju-1-3-1', 'API-G01 Schema definition', 1.8),
  makeJU('ju-1-3-2', 'API-G02 Resolvers per type', 2.0),
  makeJU('ju-1-3-3', 'API-G03 Subscriptions', 2.0),

  // ── DB tables ──
  makeJU('ju-2-1-1', 'DB-P01 Table schema & migrations', 0.8),
  makeJU('ju-2-1-2', 'DB-P02 Indexes & constraints', 0.5),
  makeJU('ju-2-2-1', 'DB-M01 Table schema & migrations', 0.8),
  makeJU('ju-2-2-2', 'DB-M02 Indexes & constraints', 0.5),

  // ── External integrations ──
  makeJU('ju-3-1-1', 'INT-R01 HTTP client setup', 1.0),
  makeJU('ju-3-1-2', 'INT-R02 Endpoint integration', 3.0),
  makeJU('ju-3-2-1', 'INT-S01 WSDL parsing', 2.5),
  makeJU('ju-3-2-2', 'INT-S02 Operation mapping', 3.0),
  makeJU('ju-3-3-1', 'INT-E01 Message broker setup', 2.0),
  makeJU('ju-3-3-2', 'INT-E02 Event handler', 1.5),

  // ── UI screens ──
  makeJU('ju-4-1-1', 'UI-B01 Layout & navigation', 1.5, 'H-SOFTWARE'),
  makeJU('ju-4-1-2', 'UI-B02 Form screens', 1.3, 'H-SOFTWARE'),
  makeJU('ju-4-2-1', 'UI-R01 Layout & navigation', 1.8, 'H-SOFTWARE'),
  makeJU('ju-4-2-2', 'UI-R02 Complex form screens', 2.0, 'H-SOFTWARE'),
  makeJU('ju-4-2-3', 'UI-R03 Charts & data viz', 2.5, 'H-SOFTWARE'),

  // ── Reusable components ──
  makeJU('ju-5-1-1', 'CMP-S01 Component design', 0.8, 'H-SOFTWARE'),
  makeJU('ju-5-1-2', 'CMP-S02 Storybook / docs', 0.8, 'H-SOFTWARE'),
  makeJU('ju-5-2-1', 'CMP-C01 Component & state mgmt', 1.5, 'H-SOFTWARE'),
  makeJU('ju-5-2-2', 'CMP-C02 Testing & docs', 1.0, 'H-SOFTWARE'),

  // ── ETL pipelines ──
  makeJU('ju-6-1-1', 'ETL-B01 Extract & transform', 3.5, 'H-TUNING'),
  makeJU('ju-6-1-2', 'ETL-B02 Load & orchestration', 3.0, 'H-TUNING'),
  makeJU('ju-6-2-1', 'ETL-S01 Stream processor', 5.0, 'H-TUNING'),
  makeJU('ju-6-2-2', 'ETL-S02 Error handling & replay', 2.0, 'H-TUNING'),

  // ── Reports / dashboards ──
  makeJU('ju-7-1-1', 'RPT-S01 Data query & model', 2.0, 'H-TUNING'),
  makeJU('ju-7-1-2', 'RPT-S02 Report layout & export', 1.5, 'H-TUNING'),
  makeJU('ju-7-2-1', 'RPT-I01 Data query & model', 2.5, 'H-TUNING'),
  makeJU('ju-7-2-2', 'RPT-I02 Interactive charts', 2.5, 'H-TUNING'),
  makeJU('ju-7-2-3', 'RPT-I03 Filter & drill-down', 1.5, 'H-TUNING'),

  // ── Infra deployments ──
  makeJU('ju-8-1-1', 'INF-S01 Environment provisioning', 2.0, 'H-PROJECT'),
  makeJU('ju-8-1-2', 'INF-S02 CI/CD pipeline setup', 2.0, 'H-PROJECT'),
  makeJU('ju-8-2-1', 'INF-B01 Blue-green setup', 3.0, 'H-PROJECT'),
  makeJU('ju-8-2-2', 'INF-B02 Traffic routing & rollback', 1.5, 'H-PROJECT'),

  // ── E2E test cases (H-TESTING) ──
  makeJU('ju-9-1-1', 'QA-SE01 Selenium framework setup', 1.0, 'H-TESTING'),
  makeJU('ju-9-1-2', 'QA-SE02 Test case implementation', 0.5, 'H-TESTING'),
  makeJU('ju-9-2-1', 'QA-PW01 Playwright framework setup', 0.5, 'H-TESTING'),
  makeJU('ju-9-2-2', 'QA-PW02 Test case implementation', 0.4, 'H-TESTING'),

  // ── Mobile views ──
  makeJU('ju-10-1-1', 'MOB-N01 Screen layout & nav', 2.5, 'H-CUSTOMER'),
  makeJU('ju-10-1-2', 'MOB-N02 Platform-specific logic', 2.0, 'H-CUSTOMER'),
  makeJU('ju-10-2-1', 'MOB-R01 Screen layout & nav', 2.0, 'H-CUSTOMER'),
  makeJU('ju-10-2-2', 'MOB-R02 Native module bridge', 2.0, 'H-CUSTOMER'),

  // ── Data migrations ──
  makeJU('ju-11-1-1', 'MIG-S01 Data mapping', 2.0, 'H-TUNING'),
  makeJU('ju-11-1-2', 'MIG-S02 Validation & errors', 1.0, 'H-TUNING'),
  makeJU('ju-11-2-1', 'MIG-C01 Relational mapping', 3.5, 'H-TUNING'),
  makeJU('ju-11-2-2', 'MIG-C02 Rollback & audit', 2.0, 'H-TUNING'),

  // ── Technical documentation ──
  makeJU('ju-12-1-1', 'DOC-S01 Technical spec', 0.5),
  makeJU('ju-12-1-2', 'DOC-S02 API documentation', 0.5),
  makeJU('ju-12-2-1', 'DOC-E01 Architecture & design', 1.3),
  makeJU('ju-12-2-2', 'DOC-E02 Runbook & ops guide', 1.5),
];
