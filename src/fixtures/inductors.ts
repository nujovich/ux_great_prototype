import type { Inductor } from '../types';

export const INDUCTORS: Inductor[] = [
  { id: 'ind-1', name: 'API endpoints', category: 'Backend', defaultFactor: 1.5, unit: 'endpoint' },
  { id: 'ind-2', name: 'DB tables', category: 'Backend', defaultFactor: 0.8, unit: 'tabla' },
  { id: 'ind-3', name: 'Integraciones externas', category: 'Backend', defaultFactor: 3, unit: 'integración' },
  { id: 'ind-4', name: 'Pantallas UI', category: 'Frontend', defaultFactor: 2, unit: 'pantalla' },
  { id: 'ind-5', name: 'Componentes reutilizables', category: 'Frontend', defaultFactor: 1, unit: 'componente' },
  { id: 'ind-6', name: 'Pipelines ETL', category: 'Data', defaultFactor: 4, unit: 'pipeline' },
  { id: 'ind-7', name: 'Reportes / dashboards', category: 'Data', defaultFactor: 2.5, unit: 'reporte' },
  { id: 'ind-8', name: 'Despliegues infra', category: 'DevOps', defaultFactor: 1.5, unit: 'entorno' },
  { id: 'ind-9', name: 'Test cases E2E', category: 'QA', defaultFactor: 0.3, unit: 'test' },
  { id: 'ind-10', name: 'Vistas mobile', category: 'Mobile', defaultFactor: 2.5, unit: 'vista' },
  { id: 'ind-11', name: 'Migraciones de datos', category: 'Data', defaultFactor: 2, unit: 'migración' },
  { id: 'ind-12', name: 'Documentación técnica', category: 'General', defaultFactor: 0.5, unit: 'doc' },
];
