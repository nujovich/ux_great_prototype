import type { Metier } from '../types';

export type WorkloadStandard = {
  id: string;
  metier: Metier;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
};

export type PrototypeCategory = {
  id: string;
  name: string;
  description: string;
};

export type AllocationRule = {
  id: string;
  name: string;
  metier: Metier;
  rule: string;
};

export const WORKLOAD_STANDARDS: WorkloadStandard[] = [
  { id: 'ws-1', metier: 'H-DESIGN', fileName: 'backend-standards-2026h1.xlsx', uploadedAt: '2026-01-15T10:00:00Z', rowCount: 142 },
  { id: 'ws-2', metier: 'H-SOFTWARE', fileName: 'frontend-standards-2026h1.xlsx', uploadedAt: '2026-01-15T10:00:00Z', rowCount: 98 },
  { id: 'ws-3', metier: 'H-TUNING', fileName: 'data-standards-2026h1.xlsx', uploadedAt: '2026-01-16T10:00:00Z', rowCount: 76 },
];

export const PROTOTYPE_CATEGORIES: PrototypeCategory[] = [
  { id: 'cat-1', name: 'proto1', description: 'New product from scratch' },
  { id: 'cat-2', name: 'proto2', description: 'Rewrite of existing module' },
  { id: 'cat-3', name: 'proto3', description: 'Connection with external systems' },
  { id: 'cat-4', name: 'proto4', description: 'Bugfixes and minor improvements' },
];

export const ALLOCATION_RULES: AllocationRule[] = [
  { id: 'ar-1', name: 'H-DESIGN default', metier: 'H-DESIGN', rule: 'If days > 15, consider split between 2 engineers' },
  { id: 'ar-2', name: 'H-SOFTWARE bulk', metier: 'H-SOFTWARE', rule: 'UI lines should be grouped in 2-week sprints' },
  { id: 'ar-3', name: 'H-TUNING ETL', metier: 'H-TUNING', rule: 'ETL pipelines always 1 senior + 1 mid' },
];
