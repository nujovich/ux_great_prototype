import type { Cran } from '../types';

export const CRANS: Cran[] = [
  // ind-1: API endpoints
  { id: 'cr-1-1', inductorId: 'ind-1', name: 'REST Standard' },
  { id: 'cr-1-2', inductorId: 'ind-1', name: 'REST + Auth' },
  { id: 'cr-1-3', inductorId: 'ind-1', name: 'GraphQL' },
  // ind-2: DB tables
  { id: 'cr-2-1', inductorId: 'ind-2', name: 'PostgreSQL' },
  { id: 'cr-2-2', inductorId: 'ind-2', name: 'MySQL' },
  // ind-3: Integraciones externas
  { id: 'cr-3-1', inductorId: 'ind-3', name: 'HTTP REST' },
  { id: 'cr-3-2', inductorId: 'ind-3', name: 'SOAP' },
  { id: 'cr-3-3', inductorId: 'ind-3', name: 'Event-Driven' },
  // ind-4: Pantallas UI
  { id: 'cr-4-1', inductorId: 'ind-4', name: 'Basic' },
  { id: 'cr-4-2', inductorId: 'ind-4', name: 'Rich / Interactive' },
  // ind-5: Componentes reutilizables
  { id: 'cr-5-1', inductorId: 'ind-5', name: 'Simple' },
  { id: 'cr-5-2', inductorId: 'ind-5', name: 'Complex' },
  // ind-6: Pipelines ETL
  { id: 'cr-6-1', inductorId: 'ind-6', name: 'Batch' },
  { id: 'cr-6-2', inductorId: 'ind-6', name: 'Streaming' },
  // ind-7: Reportes / dashboards
  { id: 'cr-7-1', inductorId: 'ind-7', name: 'Static' },
  { id: 'cr-7-2', inductorId: 'ind-7', name: 'Interactive' },
  // ind-8: Despliegues infra
  { id: 'cr-8-1', inductorId: 'ind-8', name: 'Standard' },
  { id: 'cr-8-2', inductorId: 'ind-8', name: 'Blue-Green' },
  // ind-9: Test cases E2E
  { id: 'cr-9-1', inductorId: 'ind-9', name: 'Selenium' },
  { id: 'cr-9-2', inductorId: 'ind-9', name: 'Playwright' },
  // ind-10: Vistas mobile
  { id: 'cr-10-1', inductorId: 'ind-10', name: 'Native iOS/Android' },
  { id: 'cr-10-2', inductorId: 'ind-10', name: 'React Native' },
  // ind-11: Migraciones de datos
  { id: 'cr-11-1', inductorId: 'ind-11', name: 'Simple (CSV/flat)' },
  { id: 'cr-11-2', inductorId: 'ind-11', name: 'Complex (relational)' },
  // ind-12: Documentación técnica
  { id: 'cr-12-1', inductorId: 'ind-12', name: 'Standard' },
  { id: 'cr-12-2', inductorId: 'ind-12', name: 'Extended' },
];
