import { create } from 'zustand';
import type { ProjectLine, LineStatus, Allocation, AllocationRow, Estimation, EstimationComment, PrototypeEstimation, Cycle, InductorSelection, CustomJU } from '../types';
import { PROJECT_LINES } from '../fixtures/projectLines';
import { ALLOCATIONS } from '../fixtures/allocations';
import { CYCLES } from '../fixtures/cycles';
import { canTransition } from '../lib/stateMachine';
import { buildBulkEstimations } from '../lib/bulkSave';
import { calcEstimationTotals } from '../lib/calc';
import { INDUCTORS } from '../fixtures/inductors';

interface DataState {
  lines: ProjectLine[];
  allocations: Allocation[];
  estimations: Record<string, Estimation>; // by lineId
  cycles: Cycle[];
  updateLine: (id: string, patch: Partial<ProjectLine>) => void;
  setLineStatus: (id: string, status: LineStatus, extra?: Partial<ProjectLine>) => void;
  rejectLine: (id: string, comment: string) => void;
  setEstimation: (lineId: string, est: Estimation) => void;
  copyEstimation: (sourceId: string, targetIds: string[]) => void;
  bulkSetEstimation: (lineIds: string[], base: Omit<Estimation, 'lineId'>) => void;
  addComment: (comment: Omit<EstimationComment, 'id' | 'createdAt'>) => void;
  createCycle: (name: string, startDate: string, endDate: string) => void;
  prototypeEstimations: Record<string, PrototypeEstimation>;
  setPrototypeEstimation: (lineId: string, est: PrototypeEstimation) => void;
  setAllocation: (lineId: string, splits: AllocationRow[]) => void;
  bulkAssign: (lineIds: string[], engineerId: string) => void;
  bulkAssignSociete: (lineIds: string[], societe: string) => void;
  saveDirtyAllocations: (lineId: string, splits: AllocationRow[]) => void;
  simulateHvtApproval: (lineIds: string[]) => void;
  copyFromLegacy: (targetLineId: string, inductorSelections: InductorSelection[], customJUs: CustomJU[]) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  lines: structuredClone(PROJECT_LINES),
  allocations: structuredClone(ALLOCATIONS),
  estimations: {},
  cycles: structuredClone(CYCLES),
  prototypeEstimations: {},
  updateLine: (id, patch) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch, lastUpdatedAt: new Date().toISOString() } : l)),
    })),
  setLineStatus: (id, status, extra = {}) =>
    set((s) => {
      const line = s.lines.find((l) => l.id === id);
      if (!line) return s;
      if (!canTransition(line.status, status)) {
        console.warn(`[GREAT] Illegal transition ${line.status} → ${status} on line ${id} — ignored`);
        return s;
      }
      return {
        lines: s.lines.map((l) =>
          l.id === id ? { ...l, status, ...extra, lastUpdatedAt: new Date().toISOString() } : l,
        ),
      };
    }),
  rejectLine: (id, comment) =>
    set((s) => {
      const line = s.lines.find((l) => l.id === id);
      if (!line || !canTransition(line.status, 'Modification Requested')) return s;
      return {
        lines: s.lines.map((l) =>
          l.id === id
            ? { ...l, status: 'Modification Requested' as LineStatus, rejectionComment: comment, lastUpdatedAt: new Date().toISOString(), lastUpdatedBy: 'CPO' }
            : l,
        ),
      };
    }),
  setEstimation: (lineId, est) =>
    set((s) => ({ estimations: { ...s.estimations, [lineId]: est } })),
  bulkSetEstimation: (lineIds, base) =>
    set((s) => {
      const built = buildBulkEstimations(lineIds, base);
      const estimations = { ...s.estimations, ...built };
      const lines = s.lines.map((l) =>
        built[l.id]
          ? {
              ...l,
              status: 'Draft' as LineStatus,
              estimatedDays: base.totalDays,
              estimatedKEuro: base.totalKEuro,
              lastUpdatedAt: new Date().toISOString(),
            }
          : l,
      );
      return { estimations, lines };
    }),
  copyEstimation: (sourceId, targetIds) => {
    const src = get().estimations[sourceId];
    const srcLine = get().lines.find((l) => l.id === sourceId);
    if (!src || !srcLine) return;
    set((s) => {
      const updated = { ...s.estimations };
      const updatedLines = s.lines.map((l) => {
        if (!targetIds.includes(l.id)) return l;
        updated[l.id] = { ...src, lineId: l.id, status: 'Draft' as LineStatus };
        return {
          ...l,
          status: 'Draft' as LineStatus,
          estimatedDays: src.totalDays,
          estimatedKEuro: src.totalKEuro,
          lastUpdatedAt: new Date().toISOString(),
        };
      });
      return { estimations: updated, lines: updatedLines };
    });
  },
  addComment: (comment) =>
    set((s) => {
      const existing = s.estimations[comment.lineId];
      if (!existing) return s;
      const newComment: EstimationComment = {
        ...comment,
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
      };
      return {
        estimations: {
          ...s.estimations,
          [comment.lineId]: {
            ...existing,
            comments: [...(existing.comments ?? []), newComment],
          },
        },
      };
    }),
  createCycle: (name, startDate) =>
    set((s) => ({
      cycles: [
        ...s.cycles.map((c) => ({ ...c, is_active: false })), // CYCLE-BR-04: deactivate all existing
        { id: `cyc-${Date.now()}`, name, is_active: true, start_date: startDate, created_at: new Date().toISOString() },
      ],
    })),
  setPrototypeEstimation: (lineId, est) =>
    set((s) => ({
      prototypeEstimations: { ...s.prototypeEstimations, [lineId]: est },
    })),
  setAllocation: (lineId, splits) =>
    set((s) => {
      const exists = s.allocations.find((a) => a.lineId === lineId);
      if (exists) {
        return { allocations: s.allocations.map((a) => (a.lineId === lineId ? { ...a, splits } : a)) };
      }
      return { allocations: [...s.allocations, { lineId, splits }] };
    }),
  bulkAssign: (lineIds, engineerId) =>
    set((s) => ({
      lines: s.lines.map((l) =>
        lineIds.includes(l.id) ? { ...l, assignedEngineerId: engineerId, lastUpdatedAt: new Date().toISOString() } : l,
      ),
    })),
  bulkAssignSociete: (lineIds, societe) =>
    set((s) => ({
      allocations: s.allocations.map((a) => {
        if (!lineIds.includes(a.lineId)) return a;
        return {
          ...a,
          splits: a.splits.map((sp) => ({ ...sp, societe, isDirty: true })),
        };
      }),
    })),
  saveDirtyAllocations: (lineId, splits) =>
    set((s) => {
      const cleaned = splits.map((sp) => ({ ...sp, isDirty: false }));
      const exists = s.allocations.find((a) => a.lineId === lineId);
      if (exists) {
        return { allocations: s.allocations.map((a) => (a.lineId === lineId ? { ...a, splits: cleaned } : a)) };
      }
      return { allocations: [...s.allocations, { lineId, splits: cleaned }] };
    }),
  simulateHvtApproval: (lineIds) =>
    set((s) => ({
      lines: s.lines.map((l) =>
        lineIds.includes(l.id) && l.status === 'Sent'
          ? { ...l, status: 'Approved' as LineStatus, lastUpdatedAt: new Date().toISOString() }
          : l,
      ),
    })),
  copyFromLegacy: (targetLineId, inductorSelections, customJUs) =>
    set((s) => {
      const totals = calcEstimationTotals(inductorSelections, INDUCTORS, customJUs, 1);
      const est: Estimation = {
        lineId: targetLineId,
        inductorSelections,
        customJUs,
        globalOccurrences: 1,
        yearlyBreakdown: [],
        totalDays: totals.manDays,
        totalKEuro: totals.keuro,
        status: 'Draft',
      };
      return {
        estimations: { ...s.estimations, [targetLineId]: est },
        lines: s.lines.map((l) =>
          l.id === targetLineId
            ? { ...l, status: 'Draft' as LineStatus, estimatedDays: totals.manDays, estimatedKEuro: totals.keuro, lastUpdatedAt: new Date().toISOString() }
            : l,
        ),
      };
    }),
}));
