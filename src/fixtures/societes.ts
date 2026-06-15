export const SOCIETES = [
  'Horse Spain S.L.-Valladolid',
  'Renault SAS-Paris',
  'Renault Technology Romania-Bucharest',
  'RNBV-Amsterdam',
  'Renault Korea-Busan',
] as const;

export type Societe = typeof SOCIETES[number];
