import { describe, it, expect } from 'vitest';
import { copyCandidates } from '../copyCandidates';
import type { ProjectLine } from '../../types';

const mk = (id: string, over: Partial<ProjectLine> = {}): ProjectLine => ({
  id, project_id: 'P', name: id, metier: 'H-DESIGN', status: 'To do', updated_at: '',
  lineName: id, projectName: 'P', assignedEngineerId: 'eng-1',
  estimatedDays: null, estimatedKEuro: null, lastUpdatedBy: 'PMO', lastUpdatedAt: '',
  cycleId: 'cyc-1', organType: 'Thermal Engine', energyFuelType: 'Gasoline',
  projectRanking: 'Mother', injectionSystem: 'Direct', ...over,
} as ProjectLine);

const source = mk('PL-SRC');

describe('copyCandidates (HIW-174 §10)', () => {
  it('excludes the source line itself', () => {
    const out = copyCandidates([source, mk('PL-A')], source, { ownOnly: false, activeEngineerId: null });
    expect(out.map((l) => l.id)).toEqual(['PL-A']);
  });
  it('keeps only compatible lines (same Organ/Energy/Ranking/Injection)', () => {
    const incompatible = mk('PL-B', { organType: 'Electric Motor' });
    const out = copyCandidates([mk('PL-A'), incompatible], source, { ownOnly: false, activeEngineerId: null });
    expect(out.map((l) => l.id)).toEqual(['PL-A']);
  });
  it('keeps only To do / Draft targets', () => {
    const sent = mk('PL-C', { status: 'Sent' });
    const out = copyCandidates([mk('PL-A'), sent], source, { ownOnly: false, activeEngineerId: null });
    expect(out.map((l) => l.id)).toEqual(['PL-A']);
  });
  it('when ownOnly, keeps only lines assigned to the active engineer', () => {
    const mine = mk('PL-A', { assignedEngineerId: 'eng-1' });
    const other = mk('PL-D', { assignedEngineerId: 'eng-9' });
    const out = copyCandidates([mine, other], source, { ownOnly: true, activeEngineerId: 'eng-1' });
    expect(out.map((l) => l.id)).toEqual(['PL-A']);
  });
  it('treats null vs value as incompatible (BR-07)', () => {
    const nullInj = mk('PL-E', { injectionSystem: null });
    const out = copyCandidates([nullInj], source, { ownOnly: false, activeEngineerId: null });
    expect(out).toEqual([]);
  });
});
