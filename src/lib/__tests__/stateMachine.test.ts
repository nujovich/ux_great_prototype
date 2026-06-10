import { describe, it, expect } from 'vitest';
import { canTransition, LOCKED_STATUSES, TERMINAL_STATUSES } from '../stateMachine';

describe('canTransition', () => {
  it('To do → Draft is allowed', () => {
    expect(canTransition('To do', 'Draft')).toBe(true);
  });
  it('To do → Estimated is blocked', () => {
    expect(canTransition('To do', 'Estimated')).toBe(false);
  });
  it('Draft → Estimated is allowed', () => {
    expect(canTransition('Draft', 'Estimated')).toBe(true);
  });
  it('Draft → Draft is allowed (re-save)', () => {
    expect(canTransition('Draft', 'Draft')).toBe(true);
  });
  it('Estimated → Sent is allowed', () => {
    expect(canTransition('Estimated', 'Sent')).toBe(true);
  });
  it('Estimated → Modification Requested is allowed', () => {
    expect(canTransition('Estimated', 'Modification Requested')).toBe(true);
  });
  it('Sent → Approved is allowed', () => {
    expect(canTransition('Sent', 'Approved')).toBe(true);
  });
  it('Sent → Modification Requested is allowed', () => {
    expect(canTransition('Sent', 'Modification Requested')).toBe(true);
  });
  it('Sent → Draft is blocked (BR-16)', () => {
    expect(canTransition('Sent', 'Draft')).toBe(false);
  });
  it('Modification Requested → Draft is allowed', () => {
    expect(canTransition('Modification Requested', 'Draft')).toBe(true);
  });
  it('Modification Requested → Estimated is allowed', () => {
    expect(canTransition('Modification Requested', 'Estimated')).toBe(true);
  });
  it('Approved → anything is blocked (BR-04)', () => {
    expect(canTransition('Approved', 'Draft')).toBe(false);
    expect(canTransition('Approved', 'Estimated')).toBe(false);
    expect(canTransition('Approved', 'Sent')).toBe(false);
    expect(canTransition('Approved', 'Modification Requested')).toBe(false);
  });
});

describe('LOCKED_STATUSES', () => {
  it('includes Estimated, Sent, Approved', () => {
    expect(LOCKED_STATUSES.has('Estimated')).toBe(true);
    expect(LOCKED_STATUSES.has('Sent')).toBe(true);
    expect(LOCKED_STATUSES.has('Approved')).toBe(true);
  });
  it('does not include To do or Draft', () => {
    expect(LOCKED_STATUSES.has('To do')).toBe(false);
    expect(LOCKED_STATUSES.has('Draft')).toBe(false);
  });
});

describe('TERMINAL_STATUSES', () => {
  it('only Approved is terminal', () => {
    expect(TERMINAL_STATUSES.has('Approved')).toBe(true);
    expect(TERMINAL_STATUSES.has('Sent')).toBe(false);
  });
});
