import { describe, it, expect, beforeEach } from 'vitest';
import { useDataStore } from '../dataStore';

describe('copyEstimation', () => {
  beforeEach(() => {
    // Reset store state between tests
    useDataStore.setState({
      estimations: {},
      prototypeEstimations: {},
      lines: useDataStore.getInitialState?.()?.lines ?? useDataStore.getState().lines,
    });
  });

  it('copies the prototype estimation to targets (HIW-174 G3)', () => {
    const lines = useDataStore.getState().lines;
    const source = lines[0].id;
    const target = lines[1].id;

    useDataStore.getState().setEstimation(source, {
      lineId: source, inductorSelections: [], customJUs: [], globalOccurrences: 1,
      yearlyBreakdown: [], totalDays: 4, totalKEuro: 0, status: 'Draft',
    });
    useDataStore.getState().setPrototypeEstimation(source, {
      lineId: source, quantities: { proto1: 3 }, comment: 'from source',
    });

    useDataStore.getState().copyEstimation(source, [target]);

    expect(useDataStore.getState().prototypeEstimations[target]?.quantities).toEqual({ proto1: 3 });
  });

  it('does not copy prototype estimation when source has none', () => {
    const lines = useDataStore.getState().lines;
    const source = lines[0].id;
    const target = lines[1].id;

    useDataStore.getState().setEstimation(source, {
      lineId: source, inductorSelections: [], customJUs: [], globalOccurrences: 1,
      yearlyBreakdown: [], totalDays: 4, totalKEuro: 0, status: 'Draft',
    });
    // No prototype estimation on source

    useDataStore.getState().copyEstimation(source, [target]);

    expect(useDataStore.getState().prototypeEstimations[target]).toBeUndefined();
  });

  it('preserves comments when copying estimation (existing behavior unchanged)', () => {
    const lines = useDataStore.getState().lines;
    const source = lines[0].id;
    const target = lines[1].id;

    useDataStore.getState().setEstimation(source, {
      lineId: source, inductorSelections: [], customJUs: [], globalOccurrences: 1,
      yearlyBreakdown: [], totalDays: 4, totalKEuro: 0, status: 'Draft',
      comments: [{ id: 'c1', lineId: source, author: 'Bob', text: 'test comment', createdAt: '2024-01-01T00:00:00Z', metier: 'H-SOFTWARE' as const }],
    });

    useDataStore.getState().copyEstimation(source, [target]);

    const targetEst = useDataStore.getState().estimations[target];
    expect(targetEst?.comments?.[0]?.text).toBe('test comment');
  });
});
