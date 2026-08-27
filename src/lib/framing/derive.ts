/**
 * Upload-time derivation — PRD §4.3 and §5.2.
 *
 * ONLY the transforms that run at upload live here. `engineering`,
 * `estimateType`, `injectionSystem` and `market` are computed at Generate and at
 * GPMF export (§4.3) and must never be added to this module.
 */

export const DEFAULT_CLIENT = 'RG';

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Lookup key: accents stripped, trimmed, lower-cased, inner whitespace collapsed. */
export function normalizeKey(value: string): string {
  return stripAccents(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

/** §5.1/§5.2 — Part type → organ_type. Accents stripped; unmapped values pass through. */
export const ORGAN_TYPE_FR_EN: Record<string, string> = {
  'moteur thermique': 'Thermal Engine',
  'boite de vitesse': 'Gearbox',
  batterie: 'Battery',
  'moteur electrique': 'Electric Engine',
  // 'Réducteur' and 'Pile à combustible' are POC Part type values with no PRD
  // mapping — passed through untranslated. See the plan's open items.
};

/** §5.2 — Fuel → energy. E10/E20/E26/E27/E85/E100 and N/A pass through. */
export const ENERGY_FR_EN: Record<string, string> = {
  essence: 'Gasoline',
  diesel: 'Diesel',
  electrique: 'Electric',
  'hybride - essence': 'Hybrid - Gasoline',
  'hybride - diesel': 'Hybrid - Diesel',
  gpl: 'LPG',
  hydrogene: 'Hydrogen',
};

function translate(map: Record<string, string>, raw?: string | null): string {
  const value = (raw ?? '').trim();
  if (value === '') return '';
  return map[normalizeKey(value)] ?? value;
}

export function translateOrganType(raw?: string | null): string {
  return translate(ORGAN_TYPE_FR_EN, raw);
}

export function translateEnergy(raw?: string | null): string {
  return translate(ENERGY_FR_EN, raw);
}

const NULLISH_TOKENS = new Set(['', 'nan', 'none']);

function meaningful(raw?: string | null): string {
  const value = (raw ?? '').trim();
  return NULLISH_TOKENS.has(value.toLowerCase()) ? '' : value;
}

/** §5.2 — Customer takes priority over Client; empty / nan / None default to RG. */
export function resolveClient(customer?: string | null, client?: string | null): string {
  return meaningful(customer) || meaningful(client) || DEFAULT_CLIENT;
}

/** §4.3 — normalizes to 4X2 / 4X4; anything else is empty. */
export function normalizeDrivetrain(raw?: string | null): string {
  const value = (raw ?? '').trim().toUpperCase();
  return value === '4X2' || value === '4X4' ? value : '';
}

/** §4.3 — Suppression and Closure rows are dropped before persistence. */
const DROPPED_REQUEST_TYPES = new Set(['suppression', 'closure']);

export function isDroppedRequestType(raw?: string | null): boolean {
  return DROPPED_REQUEST_TYPES.has((raw ?? '').trim().toLowerCase());
}
