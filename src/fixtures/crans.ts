import type { PrototypeCran } from '../types';

// inductorId derivado del patrón cr-X-Y → ind-X
const indOf = (id: string): string => `ind-${id.split('-')[1]}`;
const make = (id: string, name: string): PrototypeCran => ({ id, name, inductorId: indOf(id), jus: [] });

export const CRANS: PrototypeCran[] = [
  // ind-1: API endpoints
  make('cr-1-1', 'REST Standard'),
  make('cr-1-2', 'REST + Auth'),
  make('cr-1-3', 'GraphQL'),
  // ind-2: DB tables
  make('cr-2-1', 'PostgreSQL'),
  make('cr-2-2', 'MySQL'),
  // ind-3: External integrations
  make('cr-3-1', 'HTTP REST'),
  make('cr-3-2', 'SOAP'),
  make('cr-3-3', 'Event-Driven'),
  // ind-4: UI screens
  make('cr-4-1', 'Basic'),
  make('cr-4-2', 'Rich / Interactive'),
  // ind-5: Reusable components
  make('cr-5-1', 'Simple'),
  make('cr-5-2', 'Complex'),
  // ind-6: ETL pipelines
  make('cr-6-1', 'Batch'),
  make('cr-6-2', 'Streaming'),
  // ind-7: Reports / dashboards
  make('cr-7-1', 'Static'),
  make('cr-7-2', 'Interactive'),
  // ind-8: Infra deployments
  make('cr-8-1', 'Standard'),
  make('cr-8-2', 'Blue-Green'),
  // ind-9: E2E test cases
  make('cr-9-1', 'Selenium'),
  make('cr-9-2', 'Playwright'),
  // ind-10: Mobile views
  make('cr-10-1', 'Native iOS/Android'),
  make('cr-10-2', 'React Native'),
  // ind-11: Data migrations
  make('cr-11-1', 'Simple (CSV/flat)'),
  make('cr-11-2', 'Complex (relational)'),
  // ind-12: Technical documentation
  make('cr-12-1', 'Standard'),
  make('cr-12-2', 'Extended'),
];
