import { create } from 'zustand';
import type { FramingLine, FramingTrack, FramingUpload } from '../types/framing';
import { FRAMING_LINES } from '../fixtures/framingLines';
import { composePlName } from '../lib/framing/plName';

export type FramingFieldKey = keyof FramingLine;
export type FramingEdits = Partial<Record<FramingFieldKey, unknown>>;

export interface UploadSummary {
  fileName: string;
  /**
   * Lines this upload actually put in the store, not rows it was handed.
   * Upsert on pl_number means the two can differ, and the notice these feed
   * ("N RFQ and M RFI lines loaded") must never claim more than the table shows.
   */
  rfqCount: number;
  rfiCount: number;
  /** I4 — how many of the uploaded PL numbers had unsaved edits that were discarded. */
  discardedEditsCount: number;
}

export interface FramingState {
  /** Persisted rows — the prototype's framing_file_line + rfi_line. */
  lines: FramingLine[];
  /** Task 6 — one entry per upload, in upload order, so a bad upload can be undone. */
  uploads: FramingUpload[];
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
  deleteUpload(uploadId: string): void;
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
  uploads: [] as FramingUpload[],
  edits: {} as Record<string, FramingEdits>,
  dirtyFields: {} as Record<string, FramingFieldKey[]>,
  lastUpload: null as UploadSummary | null,
};

export const useFramingStore = create<FramingState>((set, get) => ({
  ...structuredClone(initialState),

  /** §4.1 — uploads accumulate: upsert on pl_number, latest upload wins. */
  ingestRows: (rows, fileName) => {
    let discardedEditsCount = 0;
    // The rows as the store will hold them: last row wins per pl_number, which
    // is what both the upload record and the counts below have to describe.
    const deduped = [...new Map(rows.map((r) => [r.plNumber, r])).values()];
    // Task 6 — one FramingUpload entry records this call's provenance so a
    // later deleteUpload can identify exactly which rows it carried.
    const upload: FramingUpload = {
      id: `upl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fileName,
      uploadedAt: new Date().toISOString(),
      plNumbers: deduped.map((r) => r.plNumber),
    };

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

      return { lines: [...byPl.values()], edits, dirtyFields, uploads: [...s.uploads, upload] };
    });
    const summary: UploadSummary = {
      fileName,
      rfqCount: deduped.filter((r) => r.track === 'RFQ').length,
      rfiCount: deduped.filter((r) => r.track === 'RFI').length,
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

  /**
   * §8 — lenient: completeness never blocks Save; §6 gates Generate instead.
   *
   * I5 — the patch is built by buildSavePayload, the single encoding of
   * ADR-022's partial-field rule (only dirty fields, plus parentRanking when
   * parentPlNumber itself was submitted). plName is the one exception: it's
   * derived alongside the payload, not inside it, because the table renders
   * straight from the persisted rows rather than re-deriving on read — if it
   * stopped being persisted here, the table would show a stale name after a
   * save. buildSavePayload's own contract (which keys it emits) is untouched.
   */
  saveLine: (plNumber) =>
    set((s) => {
      const changed = s.dirtyFields[plNumber] ?? [];
      if (changed.length === 0) return s;
      const merged = effectiveLine(s, plNumber);
      if (!merged) return s;

      const patch: Partial<FramingLine> = {
        ...buildSavePayload(s, plNumber),
        plName: merged.plName,
      };

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

  /**
   * Task 6 — removing an upload deletes only the rows it *exclusively*
   * supplied. A PL number re-supplied by a later upload now belongs to that
   * later upload, so it must survive deleting the earlier one. "Later" is
   * array order: ingestRows only ever appends, so an upload's index in
   * `uploads` is its chronology, and the check is always against the
   * *current* uploads list (not a fixed record from upload time) so an
   * already-deleted later upload no longer counts as a claimant.
   *
   * This is one-directional: deleting a PL number's current (most recent, or
   * only) upload removes that row outright, even if a still-earlier upload
   * once supplied it too — ingestRows upserts on PL number, so the row's
   * live field values already came from the later upload and there is no
   * per-upload historical snapshot to fall back to.
   *
   * Also clears page-state edits/dirty flags for every row actually removed
   * (ADR-008: a deleted row cannot have pending page state).
   */
  deleteUpload: (uploadId) =>
    set((s) => {
      const idx = s.uploads.findIndex((u) => u.id === uploadId);
      if (idx === -1) return s;
      const target = s.uploads[idx];
      const laterPlNumbers = new Set(s.uploads.slice(idx + 1).flatMap((u) => u.plNumbers));
      const toRemove = new Set(target.plNumbers.filter((pl) => !laterPlNumbers.has(pl)));

      const edits = { ...s.edits };
      const dirtyFields = { ...s.dirtyFields };
      for (const plNumber of toRemove) {
        delete edits[plNumber];
        delete dirtyFields[plNumber];
      }

      return {
        lines: s.lines.filter((l) => !toRemove.has(l.plNumber)),
        uploads: s.uploads.filter((u) => u.id !== uploadId),
        edits,
        dirtyFields,
      };
    }),
}));
