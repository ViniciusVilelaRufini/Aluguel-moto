const TZ = 'America/Sao_Paulo';

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

/** Rótulo de barra de gráfico: R$ com centavos; a partir de R$ 10 mil abrevia ("R$ 12,3 mil"). */
export function formatBRLBar(cents: number): string {
  if (Math.abs(cents) < 1_000_000) return formatBRL(cents);
  return `R$ ${(cents / 100_000).toFixed(1).replace('.', ',')} mil`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

/** Data e hora no fuso informado (o do galpão, por exemplo); inválido ou ausente cai em São Paulo. */
export function formatDateTimeIn(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: timeZone || TZ, dateStyle: 'short', timeStyle: 'short' }).format(d);
  } catch {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(d);
  }
}

/** Data "só dia" (`YYYY-MM-DD`, sem horário): formatada em UTC para não recuar um dia no fuso de São Paulo. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Telefone brasileiro: "+5511990000001" vira "(11) 99000-0001"; formatos desconhecidos voltam como vieram. */
export function formatPhone(raw?: string | null): string {
  if (!raw) return '—';
  const d = raw.replace(/\D/g, '');
  const n = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return raw;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const timeZone = DATE_ONLY.test(iso) ? 'UTC' : TZ;
  return new Intl.DateTimeFormat('pt-BR', { timeZone, dateStyle: 'short' }).format(new Date(iso));
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
