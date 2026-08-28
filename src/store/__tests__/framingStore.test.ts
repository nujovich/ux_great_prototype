import { describe, it, expect, beforeEach } from 'vitest';
import {
  useFramingStore, effectiveLine, dirtyPlNumbers, parentOptions,
  buildSavePayload, linesForTrack,
} from '../framingStore';

const reset = () => useFramingStore.setState(useFramingStore.getInitialState(), true);

describe('framingStore', () => {
  beforeEach(reset);

  it('seeds from the fixture with no edits and nothing dirty', () => {
    const s = useFramingStore.getState();
    expect(s.lines.length).toBeGreaterThan(0);
    expect(s.edits).toEqual({});
    expect(dirtyPlNumbers(s)).toEqual([]);
  });

  it('splits lines by track (§15)', () => {
    const s = useFramingStore.getState();
    expect(linesForTrack(s, 'RFQ').every((l) => l.track === 'RFQ')).toBe(true);
    expect(linesForTrack(s, 'RFI').every((l) => l.track === 'RFI')).toBe(true);
  });

  it('holds edits in page state without touching the persisted row (ADR-008)', () => {
    useFramingStore.getState().editField('AA00', 'cluster', 'CL-99');
    const s = useFramingStore.getState();
    expect(s.lines.find((l) => l.plNumber === 'AA00')!.cluster).toBe('CL-01');
    expect(effectiveLine(s, 'AA00')!.cluster).toBe('CL-99');
    expect(dirtyPlNumbers(s)).toEqual(['AA00']);
  });

  it('recomposes PL Name live when a component field changes (§5.3)', () => {
    useFramingStore.getState().editField('AA00', 'vehicleCode', 'ZZ99');
    const line = effectiveLine(useFramingStore.getState(), 'AA00')!;
    expect(line.plName).toContain('ZZ99');
    expect(line.plName).not.toContain('X67');
  });

  it('derives parentRanking from the selected parent and clears it (§5.5)', () => {
    const store = useFramingStore.getState();
    store.editField('00AA', 'parentPlNumber', 'AA00');
    expect(effectiveLine(useFramingStore.getState(), '00AA')!.parentRanking).toBe('M');

    useFramingStore.getState().editField('00AA', 'parentPlNumber', '');
    expect(effectiveLine(useFramingStore.getState(), '00AA')!.parentRanking).toBe('');
  });

  it('excludes the row own PL number from parent options (§5.5)', () => {
    const options = parentOptions(useFramingStore.getState(), 'AA00');
    expect(options).not.toContain('AA00');
    expect(options).toContain('AA01');
  });

  it('builds a payload of only the edited fields (ADR-022)', () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA00', 'partFactory', 'ZF');
    const payload = buildSavePayload(useFramingStore.getState(), 'AA00');
    expect(Object.keys(payload).sort()).toEqual(['cluster', 'partFactory', 'plNumber']);
  });

  it('carries only field B on the second save — HIW-463 AC#13', () => {
    useFramingStore.getState().editField('AA00', 'cluster', 'CL-99');
    useFramingStore.getState().saveLine('AA00');
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual([]);

    useFramingStore.getState().editField('AA00', 'partFactory', 'ZF');
    const payload = buildSavePayload(useFramingStore.getState(), 'AA00');
    expect(Object.keys(payload).sort()).toEqual(['partFactory', 'plNumber']);
    expect(payload).not.toHaveProperty('cluster');
  });

  it('persists the saved fields and leaves the rest at their stored value', () => {
    useFramingStore.getState().editField('AA00', 'cluster', 'CL-99');
    useFramingStore.getState().saveLine('AA00');
    const line = useFramingStore.getState().lines.find((l) => l.plNumber === 'AA00')!;
    expect(line.cluster).toBe('CL-99');
    expect(line.partFactory).toBe('BARI (Getrag)');
  });

  it('leaves a non-dirty field untouched even when the merged view recomputes a different value — I5 partial-write guard', () => {
    // AA01 is seeded with parentPlNumber 'AA00' and a stored parentRanking of
    // 'M' — consistent with AA00's fixture projectRanking. Change AA00's
    // projectRanking directly on the stored rows (no edit/save involved) so
    // AA01's stored parentRanking is now stale relative to what effectiveLine
    // would recompute from the live parent. parentPlNumber itself stays
    // non-dirty, so a correct partial-field save must leave parentRanking
    // alone — a full-row write (spreading the whole merged view) would
    // silently overwrite it with the recomputed value instead.
    useFramingStore.setState((s) => ({
      lines: s.lines.map((l) => (l.plNumber === 'AA00' ? { ...l, projectRanking: 'GM' } : l)),
    }));

    useFramingStore.getState().editField('AA01', 'cluster', 'CL-99');
    useFramingStore.getState().saveLine('AA01');

    const line = useFramingStore.getState().lines.find((l) => l.plNumber === 'AA01')!;
    expect(line.cluster).toBe('CL-99');
    expect(line.parentRanking).toBe('M');
  });

  it('keeps per-line payloads separate on global save — HIW-463 AC#12', () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-A');
    store.editField('AA01', 'partFactory', 'ZF');
    const s = useFramingStore.getState();
    expect(Object.keys(buildSavePayload(s, 'AA00')).sort()).toEqual(['cluster', 'plNumber']);
    expect(Object.keys(buildSavePayload(s, 'AA01')).sort()).toEqual(['partFactory', 'plNumber']);

    useFramingStore.getState().saveAll();
    const after = useFramingStore.getState();
    expect(dirtyPlNumbers(after)).toEqual([]);
    expect(after.lines.find((l) => l.plNumber === 'AA00')!.cluster).toBe('CL-A');
    expect(after.lines.find((l) => l.plNumber === 'AA01')!.partFactory).toBe('ZF');
  });

  it('persists derived parentRanking on save (§5.5)', () => {
    useFramingStore.getState().editField('00AA', 'parentPlNumber', 'AA00');
    useFramingStore.getState().saveLine('00AA');
    const line = useFramingStore.getState().lines.find((l) => l.plNumber === '00AA')!;
    expect(line.parentPlNumber).toBe('AA00');
    expect(line.parentRanking).toBe('M');
  });

  it('saves rows regardless of completeness — Save is lenient (§8.1)', () => {
    useFramingStore.getState().editField('AA00', 'frameworkComment', '');
    useFramingStore.getState().saveLine('AA00');
    expect(useFramingStore.getState().lines.find((l) => l.plNumber === 'AA00')!.frameworkComment).toBe('');
  });

  it('drops an edit that returns a field to its stored value', () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA00', 'cluster', 'CL-01');
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual([]);
  });

  it('resetLine discards that line edits only', () => {
    const store = useFramingStore.getState();
    store.editField('AA00', 'cluster', 'CL-99');
    store.editField('AA01', 'cluster', 'CL-88');
    useFramingStore.getState().resetLine('AA00');
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual(['AA01']);
  });

  it('accumulates uploads, upserting on pl_number (§4.1)', () => {
    const before = useFramingStore.getState().lines.length;
    const existing = useFramingStore.getState().lines[0];
    useFramingStore.getState().ingestRows(
      [
        { ...existing, cluster: 'FROM-UPLOAD', lastUpdatedByFile: 'second.xlsx' },
        { ...existing, id: 'new-1', plNumber: 'ZZ98', cluster: 'BRAND-NEW' },
      ],
      'second.xlsx',
    );
    const after = useFramingStore.getState();
    expect(after.lines).toHaveLength(before + 1);
    expect(after.lines.find((l) => l.plNumber === existing.plNumber)!.cluster).toBe('FROM-UPLOAD');
    expect(after.lastUpload?.fileName).toBe('second.xlsx');
  });

  it('never writes project_line — no dataStore import', async () => {
    const src = await import('fs/promises').then((fs) =>
      fs.readFile('src/store/framingStore.ts', 'utf8'));
    expect(src).not.toContain('dataStore');
  });

  it('discards unsaved edits for a re-uploaded line (latest upload wins)', () => {
    const existing = useFramingStore.getState().lines[0];
    useFramingStore.getState().editField(existing.plNumber, 'cluster', 'STALE-EDIT');
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual([existing.plNumber]);

    useFramingStore.getState().ingestRows(
      [{ ...existing, cluster: 'FROM-REUPLOAD' }],
      'second.xlsx',
    );

    const s = useFramingStore.getState();
    expect(dirtyPlNumbers(s)).toEqual([]);
    expect(effectiveLine(s, existing.plNumber)!.cluster).toBe('FROM-REUPLOAD');
  });

  it('reports how many uploaded lines had pending edits discarded — I4', () => {
    const [a, b] = useFramingStore.getState().lines;
    useFramingStore.getState().editField(a.plNumber, 'cluster', 'STALE-A');
    useFramingStore.getState().editField(b.plNumber, 'cluster', 'STALE-B');

    // Only `a` is re-uploaded — its pending edit is discarded, `b`'s is not.
    const summary = useFramingStore.getState().ingestRows(
      [{ ...a, cluster: 'FROM-UPLOAD' }],
      'second.xlsx',
    );

    expect(summary.discardedEditsCount).toBe(1);
    expect(dirtyPlNumbers(useFramingStore.getState())).toEqual([b.plNumber]);
  });

  it('reports zero discarded edits when the uploaded lines had no pending edits', () => {
    const existing = useFramingStore.getState().lines[0];
    const summary = useFramingStore.getState().ingestRows(
      [{ ...existing, cluster: 'FROM-UPLOAD' }],
      'second.xlsx',
    );
    expect(summary.discardedEditsCount).toBe(0);
  });

  it('keeps unsaved edits on lines the upload does not carry', () => {
    const [a, b] = useFramingStore.getState().lines;
    useFramingStore.getState().editField(b.plNumber, 'cluster', 'KEEP-ME');

    useFramingStore.getState().ingestRows([{ ...a, cluster: 'X' }], 'second.xlsx');

    const s = useFramingStore.getState();
    expect(dirtyPlNumbers(s)).toEqual([b.plNumber]);
    expect(effectiveLine(s, b.plNumber)!.cluster).toBe('KEEP-ME');
  });

  describe('per-file management — Task 6 (HIW-452 remediation)', () => {
    it('records one upload entry per ingestRows call, in order', () => {
      const template = useFramingStore.getState().lines[0];
      useFramingStore.getState().ingestRows([{ ...template, plNumber: 'ZZ90' }], 'fileA.xlsx');
      useFramingStore.getState().ingestRows([{ ...template, plNumber: 'ZZ91' }], 'fileB.xlsx');

      const { uploads } = useFramingStore.getState();
      expect(uploads).toHaveLength(2);
      expect(uploads[0]).toMatchObject({ fileName: 'fileA.xlsx', plNumbers: ['ZZ90'] });
      expect(uploads[1]).toMatchObject({ fileName: 'fileB.xlsx', plNumbers: ['ZZ91'] });
      expect(uploads[0].id).not.toBe(uploads[1].id);
    });

    it('deleting an upload removes only the rows it exclusively supplied', () => {
      const template = useFramingStore.getState().lines[0];
      useFramingStore.getState().ingestRows(
        [{ ...template, plNumber: 'ZZ90' }, { ...template, plNumber: 'ZZ91' }],
        'fileA.xlsx',
      );
      // fileB re-supplies only ZZ91 — it now belongs to fileB, not fileA.
      useFramingStore.getState().ingestRows(
        [{ ...template, plNumber: 'ZZ91', cluster: 'FROM-B' }],
        'fileB.xlsx',
      );

      const [uploadA] = useFramingStore.getState().uploads;
      useFramingStore.getState().deleteUpload(uploadA.id);

      const s = useFramingStore.getState();
      expect(s.lines.some((l) => l.plNumber === 'ZZ90')).toBe(false); // exclusive to fileA — gone
      expect(s.lines.some((l) => l.plNumber === 'ZZ91')).toBe(true); // re-supplied by fileB — survives
      expect(s.lines.find((l) => l.plNumber === 'ZZ91')!.cluster).toBe('FROM-B');
      expect(s.uploads.map((u) => u.fileName)).toEqual(['fileB.xlsx']);
    });

    it('a PL number re-supplied by a later upload survives deleting the earlier one', () => {
      const template = useFramingStore.getState().lines[0];
      useFramingStore.getState().ingestRows([{ ...template, plNumber: 'ZZ95' }], 'fileA.xlsx');
      useFramingStore.getState().ingestRows(
        [{ ...template, plNumber: 'ZZ95', cluster: 'LATEST' }],
        'fileB.xlsx',
      );

      const [uploadA] = useFramingStore.getState().uploads;
      useFramingStore.getState().deleteUpload(uploadA.id);

      const line = useFramingStore.getState().lines.find((l) => l.plNumber === 'ZZ95');
      expect(line).toBeDefined();
      expect(line!.cluster).toBe('LATEST');
    });

    it('deleting an upload clears page-state edits and dirty flags for the rows it removes', () => {
      const template = useFramingStore.getState().lines[0];
      useFramingStore.getState().ingestRows([{ ...template, plNumber: 'ZZ96' }], 'fileA.xlsx');
      useFramingStore.getState().editField('ZZ96', 'cluster', 'EDITED');
      expect(dirtyPlNumbers(useFramingStore.getState())).toContain('ZZ96');

      const [uploadA] = useFramingStore.getState().uploads;
      useFramingStore.getState().deleteUpload(uploadA.id);

      const s = useFramingStore.getState();
      expect(s.edits['ZZ96']).toBeUndefined();
      expect(s.dirtyFields['ZZ96']).toBeUndefined();
      expect(dirtyPlNumbers(s)).not.toContain('ZZ96');
    });

    it('leaves edits and dirty flags for unrelated rows untouched', () => {
      const template = useFramingStore.getState().lines[0];
      useFramingStore.getState().ingestRows([{ ...template, plNumber: 'ZZ97' }], 'fileA.xlsx');
      useFramingStore.getState().editField('AA00', 'cluster', 'KEEP-ME');

      const [uploadA] = useFramingStore.getState().uploads;
      useFramingStore.getState().deleteUpload(uploadA.id);

      expect(dirtyPlNumbers(useFramingStore.getState())).toEqual(['AA00']);
    });

    it('deleting an unknown upload id is a no-op', () => {
      const before = useFramingStore.getState();
      useFramingStore.getState().deleteUpload('does-not-exist');
      const after = useFramingStore.getState();
      expect(after.lines).toEqual(before.lines);
      expect(after.uploads).toEqual(before.uploads);
    });

    it('deleting the current (most recent) upload of a PL number removes it outright, even though an earlier upload once supplied it too', () => {
      // ingestRows upserts on PL number, so once fileB re-supplies ZZ98 the
      // row's live values are fileB's — there is no per-upload snapshot to
      // fall back to, so deleting fileB (nothing later reclaims ZZ98) simply
      // removes the row rather than reverting to fileA's superseded data.
      const template = useFramingStore.getState().lines[0];
      useFramingStore.getState().ingestRows([{ ...template, plNumber: 'ZZ98' }], 'fileA.xlsx');
      useFramingStore.getState().ingestRows(
        [{ ...template, plNumber: 'ZZ98', cluster: 'FROM-B' }],
        'fileB.xlsx',
      );
      const [, uploadB] = useFramingStore.getState().uploads;

      useFramingStore.getState().deleteUpload(uploadB.id);
      expect(useFramingStore.getState().lines.some((l) => l.plNumber === 'ZZ98')).toBe(false);
    });
  });
});
