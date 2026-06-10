import type { LineStatus } from '../types';

export const STATUS_TRANSITIONS: Record<LineStatus, LineStatus[]> = {
  'To do':     ['Draft'],
  'Draft':     ['Draft', 'Estimated'],
  'Estimated': ['Sent', 'Modification Requested'],
  'Sent':      ['Approved', 'Modification Requested'],
  'Modification Requested':  ['Draft', 'Estimated'],
  'Approved':  [],
};

export const LOCKED_STATUSES = new Set<LineStatus>(['Estimated', 'Sent', 'Approved']);
export const TERMINAL_STATUSES = new Set<LineStatus>(['Approved']);

// Maps a LineStatus display value to its canonical i18n key (status.to_do, …),
// matching the LineStatus enum in the SDD kit and the `status` map in src/i18n/*.
export const STATUS_I18N_KEYS: Record<LineStatus, string> = {
  'To do':     'to_do',
  'Draft':     'draft',
  'Estimated': 'estimated',
  'Sent':      'sent',
  'Modification Requested':  'modification_requested',
  'Approved':  'approved',
};

/** Returns the i18n path for a status label, e.g. statusI18nKey('To do') === 'status.to_do'. */
export function statusI18nKey(status: LineStatus): string {
  return `status.${STATUS_I18N_KEYS[status]}`;
}

export function canTransition(from: LineStatus, to: LineStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
