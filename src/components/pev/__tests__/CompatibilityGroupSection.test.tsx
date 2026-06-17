import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompatibilityGroupSection } from '../CompatibilityGroupSection';
import type { CompatibilityGroup } from '../../../lib/grouping';
import type { ProjectLine } from '../../../types';

function makeLine(id: string, status: string): ProjectLine {
  return {
    id,
    project_id: id,
    name: id,
    metier: 'H-SOFTWARE',
    updated_at: '2026-01-01T00:00:00Z',
    lineName: id,
    projectName: 'P',
    status,
    assignedEngineerId: null,
    estimatedDays: null,
    estimatedKEuro: null,
    lastUpdatedBy: 'test',
    lastUpdatedAt: '2026-01-01T00:00:00Z',
    cycleId: 'C1',
  } as ProjectLine;
}

const group: CompatibilityGroup = {
  key: 'GROUP-A',
  fields: {
    organType: null,
    energyFuelType: null,
    projectRanking: null,
    injectionSystem: null,
  },
  lines: [
    makeLine('PL-1', 'Draft'),
    makeLine('PL-2', 'Approved'),
  ],
};

describe('CompatibilityGroupSection — selection gating', () => {
  it('disables selection for Approved/Estimated lines', () => {
    render(
      <CompatibilityGroupSection
        group={group}
        selectedIds={[]}
        onToggleSelect={() => {}}
        onRowClick={() => {}}
        showSelection
        showKEuro={false}
        showOwnerFilters={false}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.some((c) => (c as HTMLInputElement).disabled)).toBe(true);
    expect(checkboxes.some((c) => !(c as HTMLInputElement).disabled)).toBe(true);
  });
});
