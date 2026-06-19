import { describe, it, expect, beforeEach } from 'vitest';
import { useDataStore } from '../dataStore';

const base = {
  inductorSelections: [],
  customJUs: [],
  globalOccurrences: 1,
  yearlyBreakdown: [],
  totalDays: 5,
  totalKEuro: 0,
  status: 'Draft' as const,
  draftedAt: '2026-06-16T00:00:00.000Z',
};

describe('bulkSetEstimation', () => {
  let draftable: string;
  let approved: string;
  beforeEach(() => {
    const lines = useDataStore.getState().lines;
    draftable = lines[0].id;
    approved = lines.find((l) => l.id !== draftable)!.id;
    useDataStore.setState({
      lines: useDataStore.getState().lines.map((l) =>
        l.id === draftable ? { ...l, status: 'To do' }
        : l.id === approved ? { ...l, status: 'Approved' }
        : l,
      ),
      estimations: {},
    });
  });

  it('skips lines whose status cannot transition to Draft (HIW-174 K4)', () => {
    useDataStore.getState().bulkSetEstimation([draftable, approved], base);
    const lines = useDataStore.getState().lines;
    expect(lines.find((l) => l.id === draftable)!.status).toBe('Draft');
    expect(lines.find((l) => l.id === approved)!.status).toBe('Approved');
    expect(useDataStore.getState().estimations[approved]).toBeUndefined();
  });
});

describe('bulkPromote (HIW-174 retest2)', () => {
  let a: string;
  let b: string;
  let approved: string;
  beforeEach(() => {
    const lines = useDataStore.getState().lines;
    a = lines[0].id;
    b = lines[1].id;
    approved = lines.find((l) => l.id !== a && l.id !== b)!.id;
    useDataStore.setState({
      lines: useDataStore.getState().lines.map((l) =>
        l.id === a || l.id === b ? { ...l, status: 'Draft' }
        : l.id === approved ? { ...l, status: 'Approved' }
        : l,
      ),
      estimations: {
        [a]: { ...base, lineId: a },
        [b]: { ...base, lineId: b },
      },
    });
  });

  it('promotes every selected Draft line to Estimated, not just the first', () => {
    useDataStore.getState().bulkPromote([a, b]);
    const lines = useDataStore.getState().lines;
    expect(lines.find((l) => l.id === a)!.status).toBe('Estimated');
    expect(lines.find((l) => l.id === b)!.status).toBe('Estimated');
    expect(useDataStore.getState().estimations[a].status).toBe('Estimated');
    expect(useDataStore.getState().estimations[b].status).toBe('Estimated');
  });

  it('skips lines whose status cannot transition to Estimated', () => {
    useDataStore.getState().bulkPromote([a, approved]);
    const lines = useDataStore.getState().lines;
    expect(lines.find((l) => l.id === a)!.status).toBe('Estimated');
    expect(lines.find((l) => l.id === approved)!.status).toBe('Approved');
  });
});
