import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusLineChart } from '../StatusLineChart';
import type { TimelinePoint } from '../../../lib/timeline';

const series: TimelinePoint[] = [
  {
    date: '2026-01-01',
    status_counts: { 'To do': 6, 'Draft': 0, 'Estimated': 0, 'Sent': 0, 'Modification Requested': 0, 'Approved': 0 },
  },
  {
    date: '2026-06-17',
    status_counts: { 'To do': 1, 'Draft': 1, 'Estimated': 1, 'Sent': 1, 'Modification Requested': 1, 'Approved': 1 },
  },
];

describe('StatusLineChart', () => {
  it('renders one polyline per status — all 6 (MGMT-BR-03)', () => {
    const { container } = render(<StatusLineChart data={series} />);
    const lines = container.querySelectorAll('polyline[data-status]');
    expect(lines).toHaveLength(6);
  });

  it('shows the latest count per status in the legend', () => {
    render(<StatusLineChart data={series} />);
    expect(screen.getByTestId('timeline-count-To do')).toHaveTextContent('1');
    expect(screen.getByTestId('timeline-count-Approved')).toHaveTextContent('1');
  });

  it('renders the empty state when the series is empty', () => {
    render(<StatusLineChart data={[]} />);
    expect(screen.getByText('No data for the active cycle.')).toBeInTheDocument();
    expect(screen.queryByTestId('status-timeline')).not.toBeInTheDocument();
  });
});
