const TZ = 'America/Sao_Paulo';

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short' }).format(new Date(iso));
}

export function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, timeStyle: 'medium' }).format(new Date(iso));
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

export function timeAgo(iso?: string | null, now = Date.now()): string {
  if (!iso) return '—';
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `há ${s} s`;
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} d`;
}

/** Dia local (São Paulo) em `YYYY-MM-DD` para filtros e inputs de data. */
export function localDay(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

/** Início do dia em São Paulo (UTC-3, sem horário de verão desde 2019) como ISO UTC. */
export function dayStartIso(day: string): string {
  return new Date(`${day}T00:00:00-03:00`).toISOString();
}
export function dayEndIso(day: string): string {
  return new Date(`${day}T23:59:59.999-03:00`).toISOString();
}
