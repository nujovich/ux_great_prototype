import type { Inductor } from '../types';

export const INDUCTORS: Inductor[] = [
  { id: 'ind-1', name: 'API endpoints', category: 'Backend', defaultFactor: 1.5, unit: 'endpoint' },
  { id: 'ind-2', name: 'DB tables', category: 'Backend', defaultFactor: 0.8, unit: 'table' },
  { id: 'ind-3', name: 'External integrations', category: 'Backend', defaultFactor: 3, unit: 'integration' },
  { id: 'ind-4', name: 'UI screens', category: 'Frontend', defaultFactor: 2, unit: 'screen' },
  { id: 'ind-5', name: 'Reusable components', category: 'Frontend', defaultFactor: 1, unit: 'component' },
  { id: 'ind-6', name: 'ETL pipelines', category: 'Data', defaultFactor: 4, unit: 'pipeline' },
  { id: 'ind-7', name: 'Reports / dashboards', category: 'Data', defaultFactor: 2.5, unit: 'report' },
  { id: 'ind-8', name: 'Infra deployments', category: 'DevOps', defaultFactor: 1.5, unit: 'environment' },
  { id: 'ind-9', name: 'E2E test cases', category: 'QA', defaultFactor: 0.3, unit: 'test' },
  { id: 'ind-10', name: 'Mobile views', category: 'Mobile', defaultFactor: 2.5, unit: 'view' },
  { id: 'ind-11', name: 'Data migrations', category: 'Data', defaultFactor: 2, unit: 'migration' },
  { id: 'ind-12', name: 'Technical documentation', category: 'General', defaultFactor: 0.5, unit: 'doc' },
];
