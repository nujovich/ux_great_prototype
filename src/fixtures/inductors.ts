import type { PrototypeInductor, Metier, JU, Cran } from '../types';

const ju = (
  id: string,
  name: string,
  variable: number,
  metier: Metier = 'H-DESIGN',
  fixed = 0,
  unit_type: JU['unit_type'] = 'man_day',
): JU => ({
  id, name, long_name: name,
  variable, fixed, unit_type,
  occurrence: 1,
  occurrence_locked: false, fmm: '', smm: '', dmm: '',
  generic_profile: '', custom: false, metier,
});

const cr = (id: string, name: string, jus: JU[]): Cran => ({ id, name, jus });

export const INDUCTORS: PrototypeInductor[] = [
  {
    id: 'ind-1', name: 'API endpoints', category: 'Backend',
    crans: [
      cr('cr-1-1', 'REST Standard', [
        ju('ju-1-1-1', 'API-S01 Setup & scaffolding', 1.0),
        ju('ju-1-1-2', 'API-S02 CRUD endpoints', 1.5),
        ju('ju-1-1-3', 'API-S03 Integration tests', 0.5),
      ]),
      cr('cr-1-2', 'REST + Auth', [
        ju('ju-1-2-1', 'API-A01 Auth middleware', 2.0),
        ju('ju-1-2-2', 'API-A02 CRUD endpoints', 1.5),
        ju('ju-1-2-3', 'API-A03 Token & session mgmt', 1.5),
      ]),
      cr('cr-1-3', 'GraphQL', [
        ju('ju-1-3-1', 'API-G01 Schema definition', 1.8),
        ju('ju-1-3-2', 'API-G02 Resolvers per type', 2.0),
        ju('ju-1-3-3', 'API-G03 Subscriptions', 2.0),
      ]),
    ],
  },
  {
    id: 'ind-2', name: 'DB tables', category: 'Backend',
    crans: [
      cr('cr-2-1', 'PostgreSQL', [
        ju('ju-2-1-1', 'DB-P01 Table schema & migrations', 0.8),
        ju('ju-2-1-2', 'DB-P02 Indexes & constraints', 0.5),
      ]),
      cr('cr-2-2', 'MySQL', [
        ju('ju-2-2-1', 'DB-M01 Table schema & migrations', 0.8),
        ju('ju-2-2-2', 'DB-M02 Indexes & constraints', 0.5),
      ]),
    ],
  },
  {
    id: 'ind-3', name: 'External integrations', category: 'Backend',
    crans: [
      cr('cr-3-1', 'HTTP REST', [
        ju('ju-3-1-1', 'INT-R01 HTTP client setup', 1.0),
        ju('ju-3-1-2', 'INT-R02 Endpoint integration', 3.0),
        // G2/K11: kilometres unit JU so KM rendering is exercised in the panel
        ju('ju-3-1-3', 'INT-R03 Data transfer volume', 2.0, 'H-DESIGN', 0, 'kilometres'),
      ]),
      cr('cr-3-2', 'SOAP', [
        ju('ju-3-2-1', 'INT-S01 WSDL parsing', 2.5),
        ju('ju-3-2-2', 'INT-S02 Operation mapping', 3.0),
      ]),
      cr('cr-3-3', 'Event-Driven', [
        ju('ju-3-3-1', 'INT-E01 Message broker setup', 2.0),
        ju('ju-3-3-2', 'INT-E02 Event handler', 1.5),
      ]),
    ],
  },
  {
    id: 'ind-4', name: 'UI screens', category: 'Frontend',
    crans: [
      cr('cr-4-1', 'Basic', [
        ju('ju-4-1-1', 'UI-B01 Layout & navigation', 1.5, 'H-SOFTWARE'),
        ju('ju-4-1-2', 'UI-B02 Form screens', 1.3, 'H-SOFTWARE'),
      ]),
      cr('cr-4-2', 'Rich / Interactive', [
        ju('ju-4-2-1', 'UI-R01 Layout & navigation', 1.8, 'H-SOFTWARE'),
        ju('ju-4-2-2', 'UI-R02 Complex form screens', 2.0, 'H-SOFTWARE'),
        ju('ju-4-2-3', 'UI-R03 Charts & data viz', 2.5, 'H-SOFTWARE'),
      ]),
    ],
  },
  {
    id: 'ind-5', name: 'Reusable components', category: 'Frontend',
    crans: [
      cr('cr-5-1', 'Simple', [
        ju('ju-5-1-1', 'CMP-S01 Component design', 0.8, 'H-SOFTWARE'),
        ju('ju-5-1-2', 'CMP-S02 Storybook / docs', 0.8, 'H-SOFTWARE'),
      ]),
      cr('cr-5-2', 'Complex', [
        ju('ju-5-2-1', 'CMP-C01 Component & state mgmt', 1.5, 'H-SOFTWARE'),
        ju('ju-5-2-2', 'CMP-C02 Testing & docs', 1.0, 'H-SOFTWARE'),
      ]),
    ],
  },
  {
    id: 'ind-6', name: 'ETL pipelines', category: 'Data',
    crans: [
      cr('cr-6-1', 'Batch', [
        ju('ju-6-1-1', 'ETL-B01 Extract & transform', 3.5, 'H-TUNING'),
        ju('ju-6-1-2', 'ETL-B02 Load & orchestration', 3.0, 'H-TUNING'),
      ]),
      cr('cr-6-2', 'Streaming', [
        ju('ju-6-2-1', 'ETL-S01 Stream processor', 5.0, 'H-TUNING'),
        ju('ju-6-2-2', 'ETL-S02 Error handling & replay', 2.0, 'H-TUNING'),
      ]),
    ],
  },
  {
    id: 'ind-7', name: 'Reports / dashboards', category: 'Data',
    crans: [
      cr('cr-7-1', 'Static', [
        ju('ju-7-1-1', 'RPT-S01 Data query & model', 2.0, 'H-TUNING'),
        ju('ju-7-1-2', 'RPT-S02 Report layout & export', 1.5, 'H-TUNING'),
      ]),
      cr('cr-7-2', 'Interactive', [
        ju('ju-7-2-1', 'RPT-I01 Data query & model', 2.5, 'H-TUNING'),
        ju('ju-7-2-2', 'RPT-I02 Interactive charts', 2.5, 'H-TUNING'),
        ju('ju-7-2-3', 'RPT-I03 Filter & drill-down', 1.5, 'H-TUNING'),
      ]),
    ],
  },
  {
    id: 'ind-8', name: 'Infra deployments', category: 'DevOps',
    crans: [
      cr('cr-8-1', 'Standard', [
        ju('ju-8-1-1', 'INF-S01 Environment provisioning', 2.0, 'H-PROJECT'),
        ju('ju-8-1-2', 'INF-S02 CI/CD pipeline setup', 2.0, 'H-PROJECT'),
        // G2/K11: kiloeuros unit JU so K€ rendering is exercised in the panel
        ju('ju-8-1-3', 'INF-S03 Cloud resource costs', 5.0, 'H-PROJECT', 0, 'kiloeuros'),
      ]),
      cr('cr-8-2', 'Blue-Green', [
        ju('ju-8-2-1', 'INF-B01 Blue-green setup', 3.0, 'H-PROJECT'),
        ju('ju-8-2-2', 'INF-B02 Traffic routing & rollback', 1.5, 'H-PROJECT'),
      ]),
    ],
  },
  {
    id: 'ind-9', name: 'E2E test cases', category: 'QA',
    crans: [
      cr('cr-9-1', 'Selenium', [
        ju('ju-9-1-1', 'QA-SE01 Selenium framework setup', 1.0, 'H-TESTING', 0, 'bench_hours'),
        ju('ju-9-1-2', 'QA-SE02 Test case implementation', 0.5, 'H-TESTING', 0, 'bench_hours'),
      ]),
      cr('cr-9-2', 'Playwright', [
        ju('ju-9-2-1', 'QA-PW01 Playwright framework setup', 0.5, 'H-TESTING', 0, 'bench_hours'),
        ju('ju-9-2-2', 'QA-PW02 Test case implementation', 0.4, 'H-TESTING', 0, 'bench_hours'),
      ]),
    ],
  },
  {
    id: 'ind-10', name: 'Mobile views', category: 'Mobile',
    crans: [
      cr('cr-10-1', 'Native iOS/Android', [
        ju('ju-10-1-1', 'MOB-N01 Screen layout & nav', 2.5, 'H-CUSTOMER'),
        ju('ju-10-1-2', 'MOB-N02 Platform-specific logic', 2.0, 'H-CUSTOMER'),
      ]),
      cr('cr-10-2', 'React Native', [
        ju('ju-10-2-1', 'MOB-R01 Screen layout & nav', 2.0, 'H-CUSTOMER'),
        ju('ju-10-2-2', 'MOB-R02 Native module bridge', 2.0, 'H-CUSTOMER', 0, 'kilometres'),
      ]),
    ],
  },
  {
    id: 'ind-11', name: 'Data migrations', category: 'Data',
    crans: [
      cr('cr-11-1', 'Simple (CSV/flat)', [
        ju('ju-11-1-1', 'MIG-S01 Data mapping', 2.0, 'H-TUNING'),
        ju('ju-11-1-2', 'MIG-S02 Validation & errors', 1.0, 'H-TUNING'),
      ]),
      cr('cr-11-2', 'Complex (relational)', [
        ju('ju-11-2-1', 'MIG-C01 Relational mapping', 3.5, 'H-TUNING'),
        ju('ju-11-2-2', 'MIG-C02 Rollback & audit', 2.0, 'H-TUNING'),
      ]),
    ],
  },
  {
    id: 'ind-12', name: 'Technical documentation', category: 'General',
    crans: [
      cr('cr-12-1', 'Standard', [
        ju('ju-12-1-1', 'DOC-S01 Technical spec', 0.5),
        ju('ju-12-1-2', 'DOC-S02 API documentation', 0.5),
      ]),
      cr('cr-12-2', 'Extended', [
        ju('ju-12-2-1', 'DOC-E01 Architecture & design', 1.3),
        ju('ju-12-2-2', 'DOC-E02 Runbook & ops guide', 1.5),
        // G2: non-zero fixed so (Var×Occ)+Fixed formula is visually exercised; variable=2 fixed=3 occ=2 → (2×2)+3=7
        ju('ju-12-2-3', 'DOC-E03 Stakeholder review & sign-off', 2.0, 'H-DESIGN', 3.0),
      ]),
    ],
  },
  // Single-cran inductor (HIW-174 §7): exercises the "fixed label" case where only
  // one cran exists and the cran selector is hidden / label is shown statically.
  {
    id: 'ind-14', name: 'Security audit', category: 'General',
    crans: [
      cr('cr-14-1', 'Standard', [
        ju('ju-14-1-1', 'SEC-S01 Threat modelling', 1.5),
        ju('ju-14-1-2', 'SEC-S02 Pen-test & report', 2.0),
      ]),
    ],
  },
  // Edge case (QA): inductor with no cran → no workload standard available for it.
  // Exercises the "Sin estándar de carga para esta combinación" message in the panel.
  {
    id: 'ind-13', name: 'R&D spike', category: 'General',
    crans: [],
  },
];
