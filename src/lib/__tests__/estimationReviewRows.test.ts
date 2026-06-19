import { describe, it, expect } from 'vitest';
import { deriveGridRow } from '../estimationReviewRows';
import type { ProjectLine, Estimation } from '../../types';

const mockLine: ProjectLine = {
  id: 'PL-001',
  name: 'Auth API',
  lineName: 'Auth API',
  project_id: 'PROJ-A',
  projectName: 'PROJ-A',
  metier: 'H-SOFTWARE',
  assignedEngineerId: 'eng-1',
  estimatedDays: 20,
  estimatedKEuro: 50,
  status: 'Estimated',
  cycleId: 'cycle-1',
  updated_at: '2026-06-10T00:00:00Z',
  lastUpdatedBy: 'eng-1',
  lastUpdatedAt: '2026-06-10T00:00:00Z',
};

const mockEstimation: Estimation = {
  lineId: 'PL-001',
  inductorSelections: [],
  customJUs: [{ id: 'cu-1', name: 'Dev', variable: 20, fixed: 0, occurrence: 1, unitType: 'man_day' }],
  globalOccurrences: 1,
  yearlyBreakdown: [25, 25],
  totalDays: 20,
  totalKEuro: 50,
  status: 'Estimated',
};

const cycleYears = ['2026', '2027'];

describe('deriveGridRow', () => {
  it('adds engineerApproval and cpoApproval', () => {
    const row = deriveGridRow(mockLine, mockEstimation, [], cycleYears);
    expect(row.engineerApproval).toBe('✓');
    expect(row.cpoApproval).toBe('— (not yet sent)');
  });

  it('computes totalFte from custom JUs when no inductor selections', () => {
    const row = deriveGridRow(mockLine, mockEstimation, [], cycleYears);
    // customJU: variable=20 × occurrence=1 + fixed=0 = 20 manDays; FTE = 20 / 209 ≈ 0.096
    expect(row.totalFte).toBeCloseTo(0.096, 2);
  });

  it('sets totalBh and totalKm to 0 when no bench/km JUs', () => {
    const row = deriveGridRow(mockLine, mockEstimation, [], cycleYears);
    expect(row.totalBh).toBe(0);
    expect(row.totalKm).toBe(0);
  });

  it('maps yearlyBreakdown to yearly K€ keyed by year', () => {
    const row = deriveGridRow(mockLine, mockEstimation, [], cycleYears);
    expect(row.yearlyKEuro['2026']).toBe(25);
    expect(row.yearlyKEuro['2027']).toBe(25);
  });

  it('handles missing estimation gracefully', () => {
    const row = deriveGridRow(mockLine, null, [], cycleYears);
    expect(row.totalFte).toBe(0);
    expect(row.totalBh).toBe(0);
    expect(row.totalKm).toBe(0);
    expect(row.yearlyKEuro).toEqual({});
  });

  it('yearly FTE/BH/KM are zeroed (prototype limitation — no annual breakdown by type)', () => {
    const row = deriveGridRow(mockLine, mockEstimation, [], cycleYears);
    expect(row.yearlyFte['2026']).toBe(0);
    expect(row.yearlyFte['2027']).toBe(0);
    expect(row.yearlyBh['2026']).toBe(0);
    expect(row.yearlyKm['2026']).toBe(0);
  });
});
