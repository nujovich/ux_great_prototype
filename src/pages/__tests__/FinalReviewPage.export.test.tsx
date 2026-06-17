import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinalReviewPage } from '../FinalReviewPage';

describe('FinalReviewPage export', () => {
  it('renders the global CSV export button disabled', () => {
    render(<FinalReviewPage />);
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeDisabled();
  });
});
