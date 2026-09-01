import { create } from 'zustand';
import type { ProjectLine, LineStatus, Allocation, AllocationRow, Estimation, EstimationComment, PrototypeEstimation, Cycle } from '../types';
import { PROJECT_LINES } from '../fixtures/projectLines';
import { ALLOCATIONS } from '../fixtures/allocations';
import { CYCLES } from '../fixtures/cycles';
import { TIMELINE_SNAPSHOTS, type TimelineSnapshot } from '../fixtures/timeline';
import { canTransition } from '../lib/stateMachine';
import { buildBulkEstimations } from '../lib/bulkSave';

interface DataState {
  lines: ProjectLine[];
  allocations: Allocation[];
  estimations: Record<string, Estimation>; // by lineId
  cycles: Cycle[];
  timeline: TimelineSnapshot[];
  updateLine: (id: string, patch: Partial<ProjectLine>) => void;
  setLineStatus: (id: string, status: LineStatus, extra?: Partial<ProjectLine>) => void;
  rejectLine: (id: string, comment: string) => void;
  setEstimation: (lineId: string, est: Estimation) => void;
  copyEstimation: (sourceId: string, targetIds: string[]) => void;
  bulkSetEstimation: (lineIds: string[], base: Omit<Estimation, 'lineId'>) => void;
  bulkPromote: (lineIds: string[]) => void;
  addProjectLines: (lines: ProjectLine[]) => { created: number; skipped: number };
  addComment: (comment: Omit<EstimationComment, 'id' | 'createdAt'>) => void;
  createCycle: (name: string, startDate: string, endDate: string) => void;
  prototypeEstimations: Record<string, PrototypeEstimation>;
  setPrototypeEstimation: (lineId: string, est: PrototypeEstimation) => void;
  setAllocation: (lineId: string, splits: AllocationRow[]) => void;
  bulkAssign: (lineIds: string[], engineerId: string) => void;
  bulkAssignSociete: (lineIds: string[], societe: string) => void;
  saveDirtyAllocations: (lineId: string, splits: AllocationRow[]) => void;
  simulateHvtApproval: (lineIds: string[]) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  lines: structuredClone(PROJECT_LINES),
  allocations: structuredClone(ALLOCATIONS),
  estimations: {},
  cycles: structuredClone(CYCLES),
  timeline: structuredClone(TIMELINE_SNAPSHOTS),
  prototypeEstimations: {},
  /**
   * §9 Generate — appends project lines produced from framing lines.
   *
   * `project_id` is the identity (pl_number + metier), so a line already held
   * is SKIPPED, not overwritten: sending the same framing row twice must not
   * duplicate it, and must not silently discard whatever has happened to the
   * existing row since. The counts come back so the caller can say what really
   * happened instead of claiming everything landed.
   */
  addProjectLines: (incoming) => {
    if (incoming.length === 0) return { created: 0, skipped: 0 };
    const held = new Set(get().lines.map((l) => l.project_id));
    const fresh: ProjectLine[] = [];
    let skipped = 0;
    for (const line of incoming) {
      // Also guards duplicates *within* one call, not just against the store.
      if (held.has(line.project_id)) {
        skipped += 1;
        continue;
      }
      held.add(line.project_id);
      fresh.push(line);
    }
    if (fresh.length > 0) set((s) => ({ lines: [...s.lines, ...fresh] }));
    return { created: fresh.length, skipped };
  },
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
      const eligible = lineIds.filter((id) => {
        const line = s.lines.find((l) => l.id === id);
        return line ? canTransition(line.status, 'Draft') : false;
      });
      const built = buildBulkEstimations(eligible, base);
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
  bulkPromote: (lineIds) =>
    set((s) => {
      const now = new Date().toISOString();
      const eligible = new Set(
        lineIds.filter((id) => {
          const line = s.lines.find((l) => l.id === id);
          return line ? canTransition(line.status, 'Estimated') : false;
        }),
      );
      const estimations = { ...s.estimations };
      for (const id of eligible) {
        const est = estimations[id];
        if (est) estimations[id] = { ...est, status: 'Estimated', estimatedAt: now };
      }
      const lines = s.lines.map((l) =>
        eligible.has(l.id)
          ? { ...l, status: 'Estimated' as LineStatus, estimatedAt: now, lastUpdatedAt: now }
          : l,
      );
      return { estimations, lines };
    }),
  copyEstimation: (sourceId, targetIds) => {
    const src = get().estimations[sourceId];
    const srcLine = get().lines.find((l) => l.id === sourceId);
    if (!src || !srcLine) return;
    const srcProto = get().prototypeEstimations[sourceId];
    set((s) => {
      const updated = { ...s.estimations };
      const updatedProto = { ...s.prototypeEstimations };
      const updatedLines = s.lines.map((l) => {
        if (!targetIds.includes(l.id)) return l;
        updated[l.id] = { ...src, lineId: l.id, status: 'Draft' as LineStatus };
        if (srcProto) updatedProto[l.id] = { ...srcProto, lineId: l.id };
        return {
          ...l,
          status: 'Draft' as LineStatus,
          estimatedDays: src.totalDays,
          estimatedKEuro: src.totalKEuro,
          lastUpdatedAt: new Date().toISOString(),
        };
      });
      return { estimations: updated, lines: updatedLines, prototypeEstimations: updatedProto };
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
}));
