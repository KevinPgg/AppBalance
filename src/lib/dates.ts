// Fechas locales en formato 'YYYY-MM-DD' (el mismo que usa <input type="date">).

export function toDateStr(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

// Convierte 'YYYY-MM-DD' a ISO fijando el mediodía LOCAL: así el día elegido
// en el calendario no se corre al pasar a UTC (evita el clásico off-by-one).
export function dateStrToISO(s: string): string {
  return new Date(`${s}T12:00:00`).toISOString();
}
