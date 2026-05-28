import { describe, it, expect } from 'vitest';
import { canTransition, LOCKED_STATUSES, TERMINAL_STATUSES } from '../stateMachine';

describe('canTransition', () => {
  it('to_do → draft is allowed', () => {
    expect(canTransition('to_do', 'draft')).toBe(true);
  });
  it('to_do → estimated is blocked', () => {
    expect(canTransition('to_do', 'estimated')).toBe(false);
  });
  it('draft → estimated is allowed', () => {
    expect(canTransition('draft', 'estimated')).toBe(true);
  });
  it('draft → draft is allowed (re-save)', () => {
    expect(canTransition('draft', 'draft')).toBe(true);
  });
  it('estimated → sent is allowed', () => {
    expect(canTransition('estimated', 'sent')).toBe(true);
  });
  it('estimated → rejected is allowed', () => {
    expect(canTransition('estimated', 'rejected')).toBe(true);
  });
  it('sent → approved is allowed', () => {
    expect(canTransition('sent', 'approved')).toBe(true);
  });
  it('sent → rejected is allowed', () => {
    expect(canTransition('sent', 'rejected')).toBe(true);
  });
  it('sent → draft is blocked (BR-16)', () => {
    expect(canTransition('sent', 'draft')).toBe(false);
  });
  it('rejected → draft is allowed', () => {
    expect(canTransition('rejected', 'draft')).toBe(true);
  });
  it('approved → anything is blocked (BR-04)', () => {
    expect(canTransition('approved', 'draft')).toBe(false);
    expect(canTransition('approved', 'estimated')).toBe(false);
    expect(canTransition('approved', 'sent')).toBe(false);
    expect(canTransition('approved', 'rejected')).toBe(false);
  });
});

describe('LOCKED_STATUSES', () => {
  it('includes estimated, sent, approved', () => {
    expect(LOCKED_STATUSES.has('estimated')).toBe(true);
    expect(LOCKED_STATUSES.has('sent')).toBe(true);
    expect(LOCKED_STATUSES.has('approved')).toBe(true);
  });
  it('does not include to_do or draft', () => {
    expect(LOCKED_STATUSES.has('to_do')).toBe(false);
    expect(LOCKED_STATUSES.has('draft')).toBe(false);
  });
});

describe('TERMINAL_STATUSES', () => {
  it('only approved is terminal', () => {
    expect(TERMINAL_STATUSES.has('approved')).toBe(true);
    expect(TERMINAL_STATUSES.has('sent')).toBe(false);
  });
});
