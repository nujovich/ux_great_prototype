import { describe, it, expect, beforeEach } from 'vitest';
import { useDataStore } from '../dataStore';
import type { ProjectLine } from '../../types';

const projectLine = (over: Partial<ProjectLine> = {}): ProjectLine => ({
  id: 'AA03-H-DESIGN',
  project_id: 'AA03-H-DESIGN',
  name: 'AA03 Alpha',
  metier: 'H-DESIGN',
  status: 'To do',
  updated_at: '2026-08-31T10:00:00.000Z',
  lineName: 'AA03 Alpha — H-DESIGN',
  projectName: 'X67 Gearbox uplift',
  plNumber: 'AA03',
  plName: 'AA03 Alpha',
  assignedEngineerId: null,
  estimatedDays: null,
  estimatedKEuro: null,
  lastUpdatedBy: 'PMO',
  lastUpdatedAt: '2026-08-31T10:00:00.000Z',
  cycleId: 'cyc-2026h1',
  ...over,
});

describe('addProjectLines', () => {
  let before: number;
  beforeEach(() => {
    useDataStore.setState({ lines: structuredClone(useDataStore.getInitialState().lines) });
    before = useDataStore.getState().lines.length;
  });

  it('appends the lines and reports what it created', () => {
    const result = useDataStore.getState().addProjectLines([
      projectLine(),
      projectLine({ id: 'AA04-H-TUNING', project_id: 'AA04-H-TUNING', metier: 'H-TUNING' }),
    ]);
    expect(result).toEqual({ created: 2, skipped: 0 });
    expect(useDataStore.getState().lines).toHaveLength(before + 2);
  });

  it('keeps the existing lines', () => {
    useDataStore.getState().addProjectLines([projectLine()]);
    expect(useDataStore.getState().lines.slice(0, before))
      .toEqual(useDataStore.getInitialState().lines);
  });

  it('skips a project_id it already holds — a repeat send must not duplicate', () => {
    useDataStore.getState().addProjectLines([projectLine()]);
    const result = useDataStore.getState().addProjectLines([projectLine({ name: 'CHANGED' })]);
    expect(result).toEqual({ created: 0, skipped: 1 });
    expect(useDataStore.getState().lines).toHaveLength(before + 1);
  });

  it('leaves the row it skipped untouched rather than overwriting it', () => {
    useDataStore.getState().addProjectLines([projectLine()]);
    useDataStore.getState().addProjectLines([projectLine({ name: 'CHANGED' })]);
    expect(useDataStore.getState().lines.at(-1)!.name).toBe('AA03 Alpha');
  });

  it('skips a project_id already in the fixtures', () => {
    const existing = useDataStore.getState().lines[0];
    const result = useDataStore.getState().addProjectLines([
      projectLine({ id: existing.id, project_id: existing.project_id }),
    ]);
    expect(result).toEqual({ created: 0, skipped: 1 });
    expect(useDataStore.getState().lines).toHaveLength(before);
  });

  it('deduplicates within one call', () => {
    const result = useDataStore.getState().addProjectLines([projectLine(), projectLine()]);
    expect(result).toEqual({ created: 1, skipped: 1 });
    expect(useDataStore.getState().lines).toHaveLength(before + 1);
  });

  it('is a no-op for an empty list', () => {
    const lines = useDataStore.getState().lines;
    expect(useDataStore.getState().addProjectLines([])).toEqual({ created: 0, skipped: 0 });
    expect(useDataStore.getState().lines).toBe(lines);
  });
});
