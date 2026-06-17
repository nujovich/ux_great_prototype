import type { LineStatus } from '../../types';

export const STATUS_COLORS: Record<LineStatus, string> = {
  'To do':    '#94a3b8',
  'Draft':    '#f59e0b',
  'Estimated': '#3b82f6',
  'Sent':     '#a855f7',
  'Modification Requested': '#ef4444',
  'Approved': '#22c55e',
};
