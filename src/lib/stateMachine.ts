import type { LineStatus } from '../types';

export const STATUS_TRANSITIONS: Record<LineStatus, LineStatus[]> = {
  to_do:     ['draft'],
  draft:     ['draft', 'estimated'],
  estimated: ['sent', 'rejected'],
  sent:      ['approved', 'rejected'],
  rejected:  ['draft', 'estimated'],
  approved:  [],
};

export const LOCKED_STATUSES = new Set<LineStatus>(['estimated', 'sent', 'approved']);
export const TERMINAL_STATUSES = new Set<LineStatus>(['approved']);

export function canTransition(from: LineStatus, to: LineStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
