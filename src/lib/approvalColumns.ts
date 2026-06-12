import type { LineStatus } from '../types';

/**
 * Engineer Approval column derivation.
 * Returns ✓ when line is in a state where the engineer has completed their work.
 * Returns — otherwise (work not yet complete).
 *
 * Per ERev-BR-08: approval is status-derived, not manually set.
 */
export function engineerApproval(status: LineStatus): string {
  switch (status) {
    case 'Estimated':
    case 'Sent':
    case 'Approved':
      return '✓';
    default:
      return '—';
  }
}

/**
 * CPO Approval column derivation.
 * Returns appropriate status indicator for the CPO's approval workflow:
 * - — : not yet sent to CPO
 * - ⏳ Pending : awaiting CPO review
 * - ✓ Approved : CPO approved
 * - ✗ Rejected : CPO requested modifications
 *
 * Per ERev-BR-08: approval is status-derived, not manually set.
 */
export function cpoApproval(status: LineStatus): string {
  switch (status) {
    case 'Estimated':
      return '— (not yet sent)';
    case 'Sent':
      return '⏳ Pending';
    case 'Approved':
      return '✓ Approved';
    case 'Modification Requested':
      return '✗ Rejected';
    default:
      return '—';
  }
}
