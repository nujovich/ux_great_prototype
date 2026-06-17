// Verbatim mirror of great-sdd-kit specs/allocation_specs.py §11.1 (FTE) and §11.2 (TSA).
// When kit rates change, mirror them here deliberately. No automated sync (YAGNI).

export const FTE_RATES: Record<string, Record<string, number>> = {
  'Horse Spain S.L.-Valladolid': { '2024': 107, '2025': 106, '2026': 103, '2027': 101 },
  'Horse Spain S.L.-Seville': { '2024': 107, '2025': 106, '2026': 103, '2027': 101 },
  'Horse Spain S.L.-Madrid': { '2024': 107, '2025': 106, '2026': 103, '2027': 101 },
  'Horse Romania S.A.-Bucarest': { '2024': 100, '2025': 79, '2026': 76, '2027': 74 },
  'Horse Romania S.A.-Titu': { '2024': 100, '2025': 79, '2026': 76, '2027': 74 },
  'Horse Romania S.A.-Pitesti': { '2024': 100, '2025': 79, '2026': 76, '2027': 74 },
  'Horse Brasil S.A.-Curitiba': { '2024': 85, '2025': 87, '2026': 80, '2027': 78 },
  'Oyak Horse': { '2024': 100, '2025': 75, '2026': 68, '2027': 69 },
};

export const TSA_RATES: Record<string, Record<string, number>> = {
  'CHENNAI GESC H': { '2025': 54, '2026': 56.7, '2027': 59.5 },
  GEHEUNG: { '2025': 155, '2026': 162.75, '2027': 170.89 },
  'Ampere/RG': { '2025': 155, '2026': 162.75, '2027': 170.89 },
};
