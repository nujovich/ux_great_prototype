/**
 * Parent-child relationships + original HVT snapshots (HIW-174 §5b).
 * The snapshot for PL-002 is intentionally STALE (different injectionSystem) so the
 * HVT-change alert fires when PL-001's editor lists PL-002 as a related line.
 */
import type { LineRelationship, HvtSnapshot } from '../types';

export const LINE_RELATIONSHIPS: LineRelationship[] = [
  { parentLineId: 'PL-001', childLineId: 'PL-002', relationshipType: 'parent_child' },
];

/** Original HVT attributes per line as last acknowledged by the estimator. */
export const ORIGINAL_HVT_SNAPSHOTS: Record<string, HvtSnapshot> = {
  // PL-002's live injectionSystem differs from this snapshot → change detected.
  'PL-002': {
    organType: 'Thermal Engine', energyFuelType: 'Gasoline', projectRanking: 'Mother',
    injectionSystem: 'Indirect Injection', spDate: '2026-02-01',
    allianceCode: 'ALL-002', vehicleCode: 'VEH-C02', client: 'Nissan', market: 'LATAM',
  },
};
