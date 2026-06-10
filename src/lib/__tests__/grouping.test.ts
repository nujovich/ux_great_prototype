import { describe, it, expect } from 'vitest';
import { groupByCompatibility } from '../grouping';
import type { ProjectLine } from '../../types';

function makeLine(overrides: Partial<ProjectLine>): ProjectLine {
  return {
    id: 'line-1',
    lineName: 'Test Line',
    projectName: 'Test Project',
    metier: 'H-DESIGN',
    status: 'To do',
    assignedEngineerId: null,
    estimatedDays: null,
    estimatedKEuro: null,
    lastUpdatedBy: 'user',
    lastUpdatedAt: '2026-01-01',
    cycleId: 'cycle-1',
    organType: undefined,
    energyFuelType: undefined,
    projectRanking: undefined,
    injectionSystem: undefined,
    ...overrides,
  } as ProjectLine;
}

describe('groupByCompatibility', () => {
  it('two lines with distinct combos produce 2 groups', () => {
    const lines: ProjectLine[] = [
      makeLine({ id: 'L1', organType: 'Engine', energyFuelType: 'Electric', projectRanking: 'A', injectionSystem: 'Direct' }),
      makeLine({ id: 'L2', organType: 'Gearbox', energyFuelType: 'Hybrid', projectRanking: 'B', injectionSystem: 'Indirect' }),
    ];
    const groups = groupByCompatibility(lines);
    expect(groups).toHaveLength(2);
  });

  it('two lines with the same combo are grouped together and fields are populated', () => {
    const lines: ProjectLine[] = [
      makeLine({ id: 'L1', organType: 'Engine', energyFuelType: 'Electric', projectRanking: 'A', injectionSystem: 'Direct' }),
      makeLine({ id: 'L2', organType: 'Engine', energyFuelType: 'Electric', projectRanking: 'A', injectionSystem: 'Direct' }),
    ];
    const groups = groupByCompatibility(lines);
    expect(groups).toHaveLength(1);
    expect(groups[0].lines).toHaveLength(2);
    expect(groups[0].fields.organType).toBe('Engine');
    expect(groups[0].fields.energyFuelType).toBe('Electric');
    expect(groups[0].fields.projectRanking).toBe('A');
    expect(groups[0].fields.injectionSystem).toBe('Direct');
  });

  it('null injectionSystem produces its own group with key containing "—"', () => {
    const lines: ProjectLine[] = [
      makeLine({ id: 'L1', organType: 'Engine', energyFuelType: 'Electric', projectRanking: 'A', injectionSystem: null }),
      makeLine({ id: 'L2', organType: 'Engine', energyFuelType: 'Electric', projectRanking: 'A', injectionSystem: 'Direct' }),
    ];
    const groups = groupByCompatibility(lines);
    expect(groups).toHaveLength(2);
    const nullGroup = groups.find((g) => g.fields.injectionSystem === null);
    expect(nullGroup).toBeDefined();
    expect(nullGroup!.key).toContain('—');
  });
});
