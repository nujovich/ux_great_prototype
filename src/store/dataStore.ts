import { create } from 'zustand';
import type { ProjectLine, LineStatus, Allocation, AllocationSplit, Estimation } from '../types';
import { PROJECT_LINES } from '../fixtures/projectLines';
import { ALLOCATIONS } from '../fixtures/allocations';

interface DataState {
  lines: ProjectLine[];
  allocations: Allocation[];
  estimations: Record<string, Estimation>; // by lineId
  updateLine: (id: string, patch: Partial<ProjectLine>) => void;
  setLineStatus: (id: string, status: LineStatus, extra?: Partial<ProjectLine>) => void;
  rejectLine: (id: string, comment: string) => void;
  setEstimation: (lineId: string, est: Estimation) => void;
  copyEstimation: (sourceId: string, targetIds: string[]) => void;
  setAllocation: (lineId: string, splits: AllocationSplit[]) => void;
  bulkAssign: (lineIds: string[], engineerId: string) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  lines: structuredClone(PROJECT_LINES),
  allocations: structuredClone(ALLOCATIONS),
  estimations: {},
  updateLine: (id, patch) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch, lastUpdatedAt: new Date().toISOString() } : l)),
    })),
  setLineStatus: (id, status, extra = {}) =>
    set((s) => ({
      lines: s.lines.map((l) =>
        l.id === id ? { ...l, status, ...extra, lastUpdatedAt: new Date().toISOString() } : l,
      ),
    })),
  rejectLine: (id, comment) =>
    set((s) => ({
      lines: s.lines.map((l) =>
        l.id === id
          ? { ...l, status: 'rejected', rejectionComment: comment, lastUpdatedAt: new Date().toISOString(), lastUpdatedBy: 'CPO' }
          : l,
      ),
    })),
  setEstimation: (lineId, est) =>
    set((s) => ({ estimations: { ...s.estimations, [lineId]: est } })),
  copyEstimation: (sourceId, targetIds) => {
    const src = get().estimations[sourceId];
    const srcLine = get().lines.find((l) => l.id === sourceId);
    if (!src || !srcLine) return;
    set((s) => {
      const updated = { ...s.estimations };
      const updatedLines = s.lines.map((l) => {
        if (!targetIds.includes(l.id)) return l;
        updated[l.id] = { ...src, lineId: l.id, status: 'draft' };
        return {
          ...l,
          status: 'draft' as LineStatus,
          estimatedDays: src.totalDays,
          estimatedKEuro: src.totalKEuro,
          lastUpdatedAt: new Date().toISOString(),
        };
      });
      return { estimations: updated, lines: updatedLines };
    });
  },
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
        lineIds.includes(l.id) ? { ...l, assignedEngineerId: engineerId, status: 'allocated' as LineStatus } : l,
      ),
    })),
}));
