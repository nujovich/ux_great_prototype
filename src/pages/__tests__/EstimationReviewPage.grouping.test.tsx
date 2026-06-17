import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstimationReviewPage } from '../EstimationReviewPage';
import { useRoleStore } from '../../store/roleStore';
import { ENGINEERS } from '../../fixtures/engineers';

describe('EstimationReviewPage — per-assignee subtables', () => {
  beforeEach(() => {
    useRoleStore.getState().setRole('PMO');
  });

  it('renders a subtable header and subtotal row per assignee', () => {
    render(<EstimationReviewPage />);
    const anyEngineer = ENGINEERS[0].name; // Ana Martinez — has seeded lines
    expect(screen.getAllByText(anyEngineer).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/subtotal/i).length).toBeGreaterThan(0);
  });
});
