import type { InductorValue, CustomJU, Metier } from '../types';
import { K_EURO_RATES, CURRENT_CYCLE_ID } from '../fixtures/cycles';

export function calcTotalDays(
  inductors: InductorValue[],
  customJUs: CustomJU[],
  occurrences: number,
): number {
  const indDays = inductors.reduce((acc, iv) => acc + iv.quantity * iv.factor, 0);
  const customDays = customJUs.reduce((acc, j) => acc + j.days, 0);
  return (indDays + customDays) * Math.max(occurrences, 1);
}

export function calcKEuro(days: number, metier: Metier): number {
  const rate = K_EURO_RATES.find((r) => r.metier === metier && r.cycleId === CURRENT_CYCLE_ID);
  return days * (rate?.rate ?? 0.85);
}

export function yearlyBreakdown(totalDays: number): number[] {
  // Distribución visual simple: peso mayor en meses 2-9
  const weights = [0.5, 1, 1.2, 1.3, 1.4, 1.4, 1.2, 1.1, 1, 0.9, 0.6, 0.4];
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Number(((w / sum) * totalDays).toFixed(2)));
}
