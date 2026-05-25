export type Role = 'Engineer' | 'PMO' | 'Admin' | 'RCRC' | 'CPO';

export type LineStatus =
  | 'empty'
  | 'draft'
  | 'estimated'
  | 'rejected'
  | 'approved'
  | 'allocated';

export type Metier =
  | 'Backend'
  | 'Frontend'
  | 'Data'
  | 'DevOps'
  | 'QA'
  | 'Mobile';

export interface ProjectLine {
  id: string;
  projectId: string;
  projectName: string;
  lineName: string;
  metier: Metier;
  status: LineStatus;
  cycleId: string;
  assignedEngineerId: string | null;
  estimatedDays: number | null;
  estimatedKEuro: number | null;
  rejectionComment?: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface Inductor {
  id: string;
  name: string;
  category: string;
  defaultFactor: number;
  unit: string;
}

export interface InductorValue {
  inductorId: string;
  quantity: number;
  factor: number;
}

export interface CustomJU {
  id: string;
  description: string;
  days: number;
}

export interface Estimation {
  lineId: string;
  inductorValues: InductorValue[];
  customJUs: CustomJU[];
  occurrences: number;
  yearlyBreakdown: number[];
  totalDays: number;
  totalKEuro: number;
  status: LineStatus;
  draftedAt?: string;
  estimatedAt?: string;
}

export interface AllocationSplit {
  engineerId: string;
  percentage: number;
  days: number;
}

export interface Allocation {
  lineId: string;
  splits: AllocationSplit[];
}

export interface Cycle {
  id: string;
  name: string;
  status: 'open' | 'closed' | 'draft';
  startDate: string;
  endDate: string;
}

export interface Engineer {
  id: string;
  name: string;
  metier: Metier;
  capacityDays: number;
}

export interface WorkloadStandard {
  id: string;
  metier: Metier;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
}

export interface KEuroRate {
  metier: Metier;
  rate: number;
  cycleId: string;
}

export interface PrototypeCategory {
  id: string;
  name: string;
  description: string;
}

export interface AllocationRule {
  id: string;
  name: string;
  metier: Metier;
  rule: string;
}
