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
});
