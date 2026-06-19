import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstimationPanel } from '../EstimationPanel';
import { useRoleStore } from '../../../store/roleStore';
import { useDataStore } from '../../../store/dataStore';

describe('EstimationPanel — contextual copy/import buttons', () => {
  beforeEach(() => {
    // Engineer has both edit:estimation and copy:estimation
    useRoleStore.getState().setRole('Engineer');
  });

  afterEach(() => {
    cleanup();
    // Reset estimations to avoid cross-test contamination
    useDataStore.setState({ estimations: {} });
  });

  it('shows "Import legacy estimation" for an unsaved, editable line', () => {
    const data = useDataStore.getState();
    // Find a To do line with no estimation seeded (estimations is {} from reset)
    const line = data.lines.find((l) => l.status === 'To do')!;
    render(<EstimationPanel line={line} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /import legacy estimation/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy from other project lines/i })).toBeNull();
  });

  it('keeps "Import legacy" available AND adds "Copy to other project lines" once a draft exists (HIW-174 retest2)', () => {
    const data = useDataStore.getState();
    const line = data.lines.find((l) => l.status === 'To do')!;
    // Seed a persisted estimation so `existing` is truthy
    useDataStore.getState().setEstimation(line.id, {
      lineId: line.id,
      inductorSelections: [],
      customJUs: [],
      globalOccurrences: 1,
      yearlyBreakdown: [],
      totalDays: 0,
      totalKEuro: 0,
      status: 'Draft',
      draftedAt: new Date().toISOString(),
    });
    // Render with Draft status — still editable (not locked), existing is truthy.
    // The legacy import button must NOT disappear after saving.
    render(<EstimationPanel line={{ ...line, status: 'Draft' }} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /copy to other project lines/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import legacy estimation/i })).toBeInTheDocument();
  });
});
