import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstimationReviewPage } from '../EstimationReviewPage';
import { useRoleStore } from '../../store/roleStore';

// HIW-175 KO: tables are grouped by PL Number (one table per PL Number, each with
// its 5 métiers) and the métier filter must NOT offer H-TESTING.
describe('EstimationReviewPage — PL Number grouping & métier filter (HIW-175)', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('renders one table per PL Number (PL-001..PL-006)', () => {
    render(<EstimationReviewPage />);
    for (const pl of ['PL-001', 'PL-002', 'PL-003', 'PL-004', 'PL-005', 'PL-006']) {
      expect(screen.getAllByText(pl).length).toBeGreaterThan(0);
    }
  });

  it('each PL table holds the 5 métiers (incl. the alternating non-project slot)', () => {
    render(<EstimationReviewPage />);
    const tables = screen.getAllByRole('table');
    expect(tables.length).toBe(6);
    for (const table of tables) {
      const bodyRows = table.querySelectorAll('tbody tr');
      // 5 métier rows + 1 subtotal row
      expect(bodyRows.length).toBe(6);
    }
  });

  it('does NOT offer H-TESTING as a métier filter option', () => {
    render(<EstimationReviewPage />);
    const optionTexts = screen
      .getAllByRole('combobox')
      .flatMap((c) => within(c).queryAllByRole('option').map((o) => o.textContent));
    expect(optionTexts).not.toContain('H-TESTING');
    expect(optionTexts).not.toContain('H-NP');
    expect(optionTexts).not.toContain('H-PROJECT');
    expect(optionTexts).toContain('H-DESIGN');
  });
});
