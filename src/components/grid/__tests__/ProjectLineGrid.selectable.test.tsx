import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectLineGrid } from '../ProjectLineGrid';
import type { ProjectLine } from '../../../types';

function makeLine(id: string, status: string): ProjectLine {
  return {
    id,
    project_id: id,
    name: id,
    metier: 'H-SOFTWARE',
    updated_at: '2026-01-01T00:00:00Z',
    lineName: 'L',
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

describe('ProjectLineGrid — isSelectable gate', () => {
  it('disables the checkbox for non-selectable rows', () => {
    const lines = [makeLine('PL-1', 'Draft'), makeLine('PL-2', 'Estimated')];
    render(
      <ProjectLineGrid
        lines={lines}
        selectedIds={[]}
        onToggleSelect={() => {}}
        onRowClick={() => {}}
        showSelection
        showKEuro={false}
        isSelectable={(l) => l.status !== 'Estimated' && l.status !== 'Approved'}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeEnabled();   // Draft
    expect(checkboxes[1]).toBeDisabled();  // Estimated
  });
});
