export type EmailType = 'weekly-alert' | 'rejection-notice' | 'approval-notice';

export interface EmailLogEntry {
  id: string;
  timestamp: string;
  recipient: string;
  type: EmailType;
  cycleId: string;
  success: boolean;
  errorMessage?: string;
}

export const EMAIL_LOG: EmailLogEntry[] = [
  {
    id: 'email-001',
    timestamp: '2026-05-26T08:00:00Z',
    recipient: 'engineer-team@horse.com',
    type: 'weekly-alert',
    cycleId: 'cyc-2026h1',
    success: true,
  },
  {
    id: 'email-002',
    timestamp: '2026-06-02T08:00:00Z',
    recipient: 'engineer-team@horse.com',
    type: 'weekly-alert',
    cycleId: 'cyc-2026h1',
    success: true,
  },
  {
    id: 'email-003',
    timestamp: '2026-06-01T14:22:00Z',
    recipient: 'eng.alice@horse.com',
    type: 'rejection-notice',
    cycleId: 'cyc-2026h1',
    success: false,
    errorMessage: 'SMTP timeout — retry scheduled',
  },
];
