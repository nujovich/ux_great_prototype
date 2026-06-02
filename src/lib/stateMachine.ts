import type { LineStatus } from '../types';

export const STATUS_TRANSITIONS: Record<LineStatus, LineStatus[]> = {
  'To do':     ['Draft'],
  'Draft':     ['Draft', 'Estimated'],
  'Estimated': ['Sent', 'Rejected'],
  'Sent':      ['Approved', 'Rejected'],
  'Rejected':  ['Draft', 'Estimated'],
  'Approved':  [],
};

export const LOCKED_STATUSES = new Set<LineStatus>(['Estimated', 'Sent', 'Approved']);
export const TERMINAL_STATUSES = new Set<LineStatus>(['Approved']);

export function canTransition(from: LineStatus, to: LineStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
