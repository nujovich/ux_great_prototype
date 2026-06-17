import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstimationReviewPage } from '../EstimationReviewPage';
import { useRoleStore } from '../../store/roleStore';
import { useDataStore } from '../../store/dataStore';

describe('EstimationReviewPage — per-project subtables', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('renders a subtable header and subtotal row per project', () => {
    render(<EstimationReviewPage />);
    // Use a project name actually seeded in the active cycle.
    const activeCycle = useDataStore.getState().cycles.find((c) => c.is_active);
    const seeded = useDataStore
      .getState()
      .lines.filter((l) => !activeCycle || l.cycleId === activeCycle.id);
    const anyProject = seeded[0].projectName;
    expect(screen.getAllByText(anyProject).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/subtotal/i).length).toBeGreaterThan(0);
  });
});
