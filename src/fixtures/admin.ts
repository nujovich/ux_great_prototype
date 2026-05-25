import type { WorkloadStandard, PrototypeCategory, AllocationRule } from '../types';

export const WORKLOAD_STANDARDS: WorkloadStandard[] = [
  { id: 'ws-1', metier: 'Backend', fileName: 'backend-standards-2026h1.xlsx', uploadedAt: '2026-01-15T10:00:00Z', rowCount: 142 },
  { id: 'ws-2', metier: 'Frontend', fileName: 'frontend-standards-2026h1.xlsx', uploadedAt: '2026-01-15T10:00:00Z', rowCount: 98 },
  { id: 'ws-3', metier: 'Data', fileName: 'data-standards-2026h1.xlsx', uploadedAt: '2026-01-16T10:00:00Z', rowCount: 76 },
];

export const PROTOTYPE_CATEGORIES: PrototypeCategory[] = [
  { id: 'cat-1', name: 'Greenfield', description: 'Producto nuevo desde cero' },
  { id: 'cat-2', name: 'Refactor', description: 'Reescritura de módulo existente' },
  { id: 'cat-3', name: 'Integration', description: 'Conexión con sistemas externos' },
  { id: 'cat-4', name: 'Maintenance', description: 'Bugfixes y mejoras menores' },
];

export const ALLOCATION_RULES: AllocationRule[] = [
  { id: 'ar-1', name: 'Backend default', metier: 'Backend', rule: 'Si días > 15, considerar split entre 2 engineers' },
  { id: 'ar-2', name: 'Frontend bulk', metier: 'Frontend', rule: 'Líneas de UI agruparse en sprints de 2 semanas' },
  { id: 'ar-3', name: 'Data ETL', metier: 'Data', rule: 'Pipelines ETL siempre 1 senior + 1 mid' },
];
