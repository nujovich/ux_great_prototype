export function formatKEuro(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)} k€`;
}

export function formatDays(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)} d`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatFTE(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)} ETP`;
}

export function formatBenchHours(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)} BH`;
}

export function formatKm(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(1)} km`;
}
