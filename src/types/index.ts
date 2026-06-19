/**
 * GREAT System — Type definitions.
 *
 * Primary types are auto-generated from docs/pev-openapi.yaml via openapi-typescript.
 * Run: npx openapi-typescript docs/pev-openapi.yaml -o src/types/openapi.ts
 *
 * Legacy aliases are kept for backward compatibility during migration.
 */

import type { components } from './pev';

export type Schema = components['schemas'];

// ── Roles ─────────────────────────────────────────────────
export type Role = 'Engineer' | 'PMO' | 'Admin' | 'RCRC' | 'CPO';

// ── Enums ─────────────────────────────────────────────────
export type Metier = Schema['Metier'];
export type Status = Schema['Status'];
export type CostType = Schema['CostType'];

// ── Project Lines ─────────────────────────────────────────
export type ProjectLineListItem = Schema['ProjectLineListItem'];
export type ProjectLineDetail = Schema['ProjectLineDetail'];
export type ProjectLineListResponse = Schema['ProjectLineListResponse'];

// ── Estimation ────────────────────────────────────────────
export type JU = Schema['JU'];
export type Cran = Schema['Cran'];
export type Inductor = Schema['Inductor'];
export type EstimationPayload = Schema['EstimationPayload'];
export type PreSaveSummary = Schema['PreSaveSummary'];
export type SaveDraftResponse = Schema['SaveDraftResponse'];
export type CopyEstimationRequest = Schema['CopyEstimationRequest'];
export type BatchSaveRequest = Schema['BatchSaveRequest'];
export type BatchSaveResponse = Schema['BatchSaveResponse'];
export type WorkloadStandardResponse = Schema['WorkloadStandardResponse'];

// ── Prototype ─────────────────────────────────────────────
export type PrototypePayload = Schema['PrototypePayload'];
export type PrototypeCategoryEntry = Schema['PrototypeCategoryEntry'];
export type PrototypeCategory = Schema['PrototypeCategory'];

// ── Estimation Review (HVT) ──────────────────────────────
export type HvtCallbackItem = Schema['HvtCallbackItem'];
export type HvtCallbackRequest = Schema['HvtCallbackRequest'];
export type HvtCallbackResponse = Schema['HvtCallbackResponse'];

// ── Allocation ────────────────────────────────────────────
export type AllocationJU = Schema['AllocationJU'];
export type AllocationPutRequest = Schema['AllocationPutRequest'];
export type AllocationPatchRequest = Schema['AllocationPatchRequest'];
export type AllocationSaveResponse = Schema['AllocationSaveResponse'];
export type KEuroCalculated = Schema['KEuroCalculated'];
export type SplitEntry = Schema['SplitEntry'];
export type SplitRequest = Schema['SplitRequest'];
export type SplitUndoResponse = Schema['SplitUndoResponse'];
export type BulkAssignRequest = Schema['BulkAssignRequest'];
export type BulkAssignResponse = Schema['BulkAssignResponse'];
export type AllocationRuleEntry = Schema['AllocationRuleEntry'];
export type AllocationRulesUploadRequest = Schema['AllocationRulesUploadRequest'];
export type KEuroRateEntry = Schema['KEuroRateEntry'];
export type KEuroRatesUploadRequest = Schema['KEuroRatesUploadRequest'];
export type MetierDistributionEntry = Schema['MetierDistributionEntry'];
export type MetierDistributionUploadRequest = Schema['MetierDistributionUploadRequest'];

// ── Final Review ──────────────────────────────────────────
export type Stage3SendRequest = Schema['Stage3SendRequest'];
export type Stage3SendResponse = Schema['Stage3SendResponse'];

// ── Management View ───────────────────────────────────────
export type PieChartSlice = Schema['PieChartSlice'];
export type PieChartResponse = Schema['PieChartResponse'];
export type TimelineDataPoint = Schema['TimelineDataPoint'];
export type TimelineResponse = Schema['TimelineResponse'];

// ── Transversal ───────────────────────────────────────────
export type CycleResponse = Schema['CycleResponse'];
export type CreateCycleRequest = Schema['CreateCycleRequest'];
export type CyclesListResponse = Schema['CyclesListResponse'];
export type WorkloadStandardCurrentResponse = Schema['WorkloadStandardCurrentResponse'];
export type EmailLogItem = Schema['EmailLogItem'];
export type EmailLogResponse = Schema['EmailLogResponse'];

// ── Common ────────────────────────────────────────────────
export type ErrorResponse = Schema['ErrorResponse'];

// ── Legacy aliases (deprecated) ──────────────────────────
/**
 * Full project line type for the prototype.
 * Extends ProjectLineListItem (OpenAPI) with prototype-only fields.
 */
export interface ProjectLine extends Omit<ProjectLineListItem, 'status'> {
  status: LineStatus;
  lineName: string;
  projectName: string;
  /** PL Number this line belongs to (HIW-175: Estimation Review groups one table per PL Number). */
  plNumber?: string;
  /** Display name of the PL Number group. */
  plName?: string;
  assignedEngineerId: string | null;
  estimatedDays: number | null;
  estimatedKEuro: number | null;
  rejectionComment?: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  organType?: string;
  energyFuelType?: string;
  projectRanking?: string;
  injectionSystem?: string | null;
  spDate?: string;
  // ── PRD grid columns (HIW-174 Phase 2) ──────────────────
  requestType?: string;
  client?: string;
  market?: string;
  allianceCode?: string;
  vehicleCode?: string;
  standardEmissions?: string;
  energy?: string;
  estimateType?: string;
  engineering?: string;
  pcDate?: string;
  coDate?: string;
  sopDate?: string;
  durationMonths?: number;
  description?: string;
  cycleId: string;
}

/** @deprecated Use Status */
export type LineStatus = Schema["Status"];

/** @deprecated Use CycleResponse */
export type Cycle = Schema["CycleResponse"];

/** Legacy K€ rate entry (simplified for prototype). Metier is a string here for flexibility. */
export type KEuroRate = {
  metier: string;
  rate: number;
  cycleId: string;
};

// ── Legacy Prototype Types (no están en el API spec) ─────

export interface JUOccurrence {
  juId: string;
  occurrence: number;
  locked: boolean;
}

export interface InductorSelection {
  inductorId: string;
  selectedCranId: string | null;
  inductorOccurrence: number;
  juOccurrences: JUOccurrence[];
}

export interface CustomJU {
  id: string;
  name: string;
  variable: number;
  fixed: number;
  occurrence: number;
}


export interface EstimationComment {
  id: string;
  lineId: string;
  text: string;
  author: string;
  createdAt: string;
  metier: Metier;
}

export interface Estimation {
  lineId: string;
  inductorSelections: InductorSelection[];
  customJUs: CustomJU[];
  globalOccurrences: number;
  yearlyBreakdown: number[];
  totalDays: number;
  totalKEuro: number;
  status: LineStatus;
  draftedAt?: string;
  estimatedAt?: string;
  comments?: EstimationComment[];
}

export interface AllocationSplit {
  engineerId: string;
  percentage: number;
  days: number;
}

export interface AllocationRow extends AllocationSplit {
  id: string;
  // PL-level context (read-only in grid)
  plNumber: string;
  plName: string;
  metier: string;
  ownerN2: string;
  // JU-level identifiers (read-only)
  juCode: string;
  juDescription: string;
  fmmDescription: string;
  organType: string;
  energy: string;
  allianceCode: string;
  vehicleCode: string;
  standardEmissions: string;
  market: string;
  // FTE/K€ (read-only, from approved estimation)
  totalFte: number;
  fteByYear: Record<string, number>;
  keByYear: Record<string, number>;
  /** Estimation K€ baseline; restored when switching TC back to FTE/TSA. */
  baseKeByYear?: Record<string, number>;
  // Editable fields
  societe: string | null;
  costType: CostType;
  // Computed / state
  fte: number;
  keuro: number;
  isDirty: boolean;
  isSplitChild?: boolean;
  splitParentId?: string;
}

export interface Allocation {
  lineId: string;
  splits: AllocationRow[];
  /** Pre-split snapshot used to restore a row on undo (ALLOC-BR-12). */
  originalRow?: AllocationRow;
}

export interface AllocationFilterState {
  plSearch: string;
  metier: string;
  ownerN2: string;
  societe: string;       // '' = All, '__unassigned__' = no societe assigned
  costType: string;
  unresolvedOnly: boolean;
}

export interface PrototypeEstimation {
  lineId: string;
  quantities: Record<string, number>;
  comment: string;
}

/** Prototype Inductor with category grouping (not in API spec). */
export interface PrototypeInductor extends Inductor {
  category: string;
}

// ── Parent-Child Line Relationships (HIW-174 §5b) ─────────
export interface LineRelationship {
  parentLineId: string;
  childLineId: string;
  relationshipType: 'parent_child' | 'sibling';
}

/** Snapshot of the HVT-monitored attributes of a line as last seen by the estimator. */
export interface HvtSnapshot {
  organType?: string;
  energyFuelType?: string;
  projectRanking?: string;
  injectionSystem?: string | null;
  spDate?: string;
  allianceCode?: string;
  vehicleCode?: string;
  standardEmissions?: string;
  client?: string;
  market?: string;
}

export interface HvtChange {
  lineId: string;
  fields: Record<string, { old: unknown; new: unknown }>;
}

