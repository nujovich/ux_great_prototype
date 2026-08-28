import { create } from 'zustand';
import type { FramingLine, FramingTrack } from '../types/framing';
import { FRAMING_LINES } from '../fixtures/framingLines';
import { composePlName } from '../lib/framing/plName';

export type FramingFieldKey = keyof FramingLine;
export type FramingEdits = Partial<Record<FramingFieldKey, unknown>>;

export interface UploadSummary {
  fileName: string;
  rfqCount: number;
  rfiCount: number;
  /** I4 — how many of the uploaded PL numbers had unsaved edits that were discarded. */
  discardedEditsCount: number;
}

export interface FramingState {
  /** Persisted rows — the prototype's framing_file_line + rfi_line. */
  lines: FramingLine[];
  /** ADR-008 — page state, keyed by pl_number. Not persisted until Save. */
  edits: Record<string, FramingEdits>;
  /** ADR-022 — field-granular dirty tracking, so a Save payload carries exactly the changes. */
  dirtyFields: Record<string, FramingFieldKey[]>;
  lastUpload: UploadSummary | null;

  ingestRows(rows: FramingLine[], fileName: string): UploadSummary;
  editField(plNumber: string, field: FramingFieldKey, value: unknown): void;
  resetLine(plNumber: string): void;
  saveLine(plNumber: string): void;
  saveAll(): void;
}

/** Fields the user never edits directly — recomputed by effectiveLine. */
const DERIVED_FIELDS = new Set<FramingFieldKey>(['plName', 'parentRanking']);

function findStored(lines: FramingLine[], plNumber: string): FramingLine | undefined {
  return lines.find((l) => l.plNumber === plNumber);
}

/** §5.5 — parentRanking is the selected parent's raw project_ranking, empty with no parent. */
function deriveParentRanking(lines: FramingLine[], parentPlNumber: string): string {
  const parent = (parentPlNumber ?? '').trim();
  if (parent === '') return '';
  return findStored(lines, parent)?.projectRanking ?? '';
}

/** The row as the form shows it: stored values + page-state edits + derived fields. */
export function effectiveLine(
  state: Pick<FramingState, 'lines' | 'edits'>,
  plNumber: string,
): FramingLine | undefined {
  const stored = findStored(state.lines, plNumber);
  if (!stored) return undefined;
  const merged = { ...stored, ...(state.edits[plNumber] ?? {}) } as FramingLine;
  return {
    ...merged,
    parentRanking: deriveParentRanking(state.lines, merged.parentPlNumber),
    plName: composePlName(merged),
  };
}

export function dirtyPlNumbers(state: Pick<FramingState, 'dirtyFields'>): string[] {
  return Object.keys(state.dirtyFields)
    .filter((pl) => (state.dirtyFields[pl] ?? []).length > 0)
    .sort();
}

/** §5.5 — the active cycle's PL numbers, excluding the row's own. */
export function parentOptions(
  state: Pick<FramingState, 'lines'>,
  plNumber: string,
): string[] {
  return state.lines.map((l) => l.plNumber).filter((pl) => pl !== plNumber);
}

/**
 * ADR-022 — only this session's changed fields for this one line, plus `plNumber`
 * to address the row. Never the full row, never a union across lines.
 */
export function buildSavePayload(
  state: Pick<FramingState, 'lines' | 'edits' | 'dirtyFields'>,
  plNumber: string,
): Record<string, unknown> {
  const changed = state.dirtyFields[plNumber] ?? [];
  const merged = effectiveLine(state, plNumber);
  if (!merged || changed.length === 0) return {};

  const payload: Record<string, unknown> = { plNumber };
  for (const field of changed) {
    payload[field as string] = merged[field];
  }
  // §5.5/§8.1 — parentRanking rides along only when the parent itself was submitted.
  if (changed.includes('parentPlNumber')) payload.parentRanking = merged.parentRanking;
  return payload;
}

export function linesForTrack(
  state: Pick<FramingState, 'lines'>,
  track: FramingTrack,
): FramingLine[] {
  return state.lines.filter((l) => l.track === track);
}

const initialState = {
  lines: structuredClone(FRAMING_LINES),
  edits: {} as Record<string, FramingEdits>,
  dirtyFields: {} as Record<string, FramingFieldKey[]>,
  lastUpload: null as UploadSummary | null,
};

export const useFramingStore = create<FramingState>((set, get) => ({
  ...structuredClone(initialState),

  /** §4.1 — uploads accumulate: upsert on pl_number, latest upload wins. */
  ingestRows: (rows, fileName) => {
    let discardedEditsCount = 0;
    set((s) => {
      const byPl = new Map(s.lines.map((l) => [l.plNumber, l]));
      for (const row of rows) {
        const existing = byPl.get(row.plNumber);
        // §15.1 — classification is fixed at upload; a re-upload may reclassify.
        byPl.set(row.plNumber, existing ? { ...existing, ...row, id: existing.id } : row);
      }

      // The upload is authoritative for the rows it carries — any unsaved edit on
      // one of those pl_numbers is now stale and must be discarded, not merged on
      // top of the fresh data. Edits on pl_numbers this upload doesn't touch are
      // untouched, still-legitimate unsaved work.
      const uploaded = new Set(rows.map((r) => r.plNumber));
      const edits = { ...s.edits };
      const dirtyFields = { ...s.dirtyFields };
      for (const plNumber of uploaded) {
        // I4 — count what's about to be discarded so the caller can tell the user.
        if ((s.dirtyFields[plNumber] ?? []).length > 0) discardedEditsCount += 1;
        delete edits[plNumber];
        delete dirtyFields[plNumber];
      }

      return { lines: [...byPl.values()], edits, dirtyFields };
    });
    const summary: UploadSummary = {
      fileName,
      rfqCount: rows.filter((r) => r.track === 'RFQ').length,
      rfiCount: rows.filter((r) => r.track === 'RFI').length,
      discardedEditsCount,
    };
    set({ lastUpload: summary });
    return summary;
  },

  editField: (plNumber, field, value) =>
    set((s) => {
      if (DERIVED_FIELDS.has(field)) return s;
      const stored = findStored(s.lines, plNumber);
      if (!stored) return s;

      const nextEdits: FramingEdits = { ...(s.edits[plNumber] ?? {}) };
      const nextDirty = new Set(s.dirtyFields[plNumber] ?? []);

      if (value === stored[field]) {
        // Back to the stored value — no longer a change to submit.
        delete nextEdits[field];
        nextDirty.delete(field);
      } else {
        nextEdits[field] = value;
        nextDirty.add(field);
      }

      return {
        edits: { ...s.edits, [plNumber]: nextEdits },
        dirtyFields: { ...s.dirtyFields, [plNumber]: [...nextDirty] },
      };
    }),

  resetLine: (plNumber) =>
    set((s) => {
      const edits = { ...s.edits };
      const dirtyFields = { ...s.dirtyFields };
      delete edits[plNumber];
      delete dirtyFields[plNumber];
      return { edits, dirtyFields };
    }),

  /** §8 — lenient: completeness never blocks Save; §6 gates Generate instead. */
  saveLine: (plNumber) =>
    set((s) => {
      const changed = s.dirtyFields[plNumber] ?? [];
      if (changed.length === 0) return s;
      const merged = effectiveLine(s, plNumber);
      if (!merged) return s;

      const patch: Partial<FramingLine> = {};
      for (const field of changed) {
        (patch as Record<string, unknown>)[field as string] = merged[field];
      }
      if (changed.includes('parentPlNumber')) patch.parentRanking = merged.parentRanking;
      patch.plName = merged.plName;

      const edits = { ...s.edits };
      const dirtyFields = { ...s.dirtyFields };
      delete edits[plNumber];
      delete dirtyFields[plNumber];

      return {
        lines: s.lines.map((l) => (l.plNumber === plNumber ? { ...l, ...patch } : l)),
        edits,
        dirtyFields,
      };
    }),

  saveAll: () => {
    for (const plNumber of dirtyPlNumbers(get())) get().saveLine(plNumber);
  },
}));
