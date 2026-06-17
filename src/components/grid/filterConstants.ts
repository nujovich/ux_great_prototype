import type { Metier } from '../../types';

const METIERS: Metier[] = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-PROJECT', 'H-CUSTOMER', 'H-TESTING', 'H-NP'];

// Non-estimable métiers excluded from the filter (HIW-174 §4 / SDD EXCLUDED_METIERS_FROM_FILTER)
const EXCLUDED_METIERS: Metier[] = ['H-NP', 'H-TESTING', 'H-PROJECT'];
export const FILTER_METIERS: Metier[] = METIERS.filter((m) => !EXCLUDED_METIERS.includes(m));
