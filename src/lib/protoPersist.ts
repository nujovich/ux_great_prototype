import type { PrototypeEstimation } from '../types';

export function buildProtoEstimation(
  lineId: string,
  quantities: Record<string, number>,
  comment: string,
): PrototypeEstimation {
  return { lineId, quantities: { ...quantities }, comment };
}
