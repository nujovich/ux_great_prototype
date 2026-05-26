import type { InductorSelection, JobUnit, CustomJU, Metier } from '../types';
import { K_EURO_RATES, CURRENT_CYCLE_ID } from '../fixtures/cycles';

export function calcTotalDays(
  selections: InductorSelection[],
  jobUnits: JobUnit[],
  customJUs: CustomJU[],
  globalOccurrences: number,
): number {
  const inductorDays = selections.reduce((acc, sel) => {
    if (!sel.selectedCranId) return acc;
    const cranJUs = jobUnits.filter((ju) => ju.cranId === sel.selectedCranId);
    const selDays = cranJUs.reduce((sum, ju) => {
      const juOcc = sel.juOccurrences.find((o) => o.juId === ju.id);
      const occ = juOcc?.occurrence ?? sel.inductorOccurrence;
      return sum + occ * ju.variable + ju.fixed;
    }, 0);
    return acc + selDays;
  }, 0);
  const customDays = customJUs.reduce((acc, j) => acc + j.days, 0);
  return (inductorDays + customDays) * Math.max(globalOccurrences, 1);
}

export function calcKEuro(days: number, metier: Metier): number {
  const rate = K_EURO_RATES.find((r) => r.metier === metier && r.cycleId === CURRENT_CYCLE_ID);
  return days * (rate?.rate ?? 0.85);
}

export function yearlyBreakdown(totalDays: number): number[] {
  const weights = [0.5, 1, 1.2, 1.3, 1.4, 1.4, 1.2, 1.1, 1, 0.9, 0.6, 0.4];
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Number(((w / sum) * totalDays).toFixed(2)));
}
