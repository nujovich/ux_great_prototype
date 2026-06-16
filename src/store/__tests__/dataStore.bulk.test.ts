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
