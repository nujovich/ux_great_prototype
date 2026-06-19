import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstimationPanel } from '../EstimationPanel';
import { useRoleStore } from '../../../store/roleStore';
import { useDataStore } from '../../../store/dataStore';
import { useUIStore } from '../../../store/uiStore';
import type { ProjectLine } from '../../../types';

// Pre-Estimation bulk fixes:
//  - Bug #1: the post-action toast must reflect ALL bulk lines, not a single PL.
//  - Bug #2: after a bulk promote the row selection must be cleared (checkboxes
//    un-stick and the bulk action bar disappears).
describe('EstimationPanel — bulk selection & toast (Pre-Estimation)', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('Engineer');
  });

  afterEach(() => {
    cleanup();
    useDataStore.setState({ estimations: {} });
    useUIStore.setState({ toasts: [], selectedLineIds: [] });
  });

  function seedDraft(lineId: string) {
    useDataStore.getState().setEstimation(lineId, {
      lineId,
      inductorSelections: [],
      customJUs: [{ id: 'cj-1', name: 'Custom JU', variable: 1, fixed: 0, occurrence: 1, unitType: 'man_day' }],
      globalOccurrences: 1,
      yearlyBreakdown: [],
      totalDays: 1,
      totalKEuro: 1,
      status: 'Draft',
      draftedAt: '2026-05-10T09:00:00Z',
    });
  }

  it('shows a bulk toast and clears the selection after promoting multiple lines', async () => {
    const lines = useDataStore.getState().lines;
    const a: ProjectLine = { ...lines[0], status: 'Draft', spDate: '2026-01-01' };
    const b: ProjectLine = { ...lines[1], status: 'Draft', spDate: '2026-01-01' };
    seedDraft(a.id);
    useUIStore.setState({ selectedLineIds: [a.id, b.id] });

    render(<EstimationPanel line={a} onClose={() => {}} bulkLines={[a, b]} />);

    // The panel preloads editable state in a microtask — wait for the gates to open.
    const saveBtn = screen.getByRole('button', { name: /save draft/i });
    await waitFor(() => expect(saveBtn).toBeEnabled());

    // Save draft (required before promote): toast mentions all lines, not one PL.
    fireEvent.click(saveBtn);
    const draftToasts = useUIStore.getState().toasts.map((t) => t.text);
    expect(draftToasts.some((t) => /2 lines/i.test(t))).toBe(true);
    expect(draftToasts.some((t) => t === `Draft saved for ${a.id}`)).toBe(false);
    // Draft keeps the selection (panel stays open for a possible promote).
    expect(useUIStore.getState().selectedLineIds).toEqual([a.id, b.id]);

    // Promote → confirm.
    const promoteBtn = screen.getByRole('button', { name: /promote to definitive/i });
    await waitFor(() => expect(promoteBtn).toBeEnabled());
    fireEvent.click(promoteBtn);
    fireEvent.click(screen.getByRole('button', { name: /^promote$/i }));

    // Bug #1: promote toast reflects all bulk lines.
    const promoteToasts = useUIStore.getState().toasts.map((t) => t.text);
    expect(promoteToasts.some((t) => /2 lines/i.test(t))).toBe(true);
    // Bug #2: selection cleared → checkboxes un-stick, bulk bar disappears.
    expect(useUIStore.getState().selectedLineIds).toEqual([]);
  });
});
