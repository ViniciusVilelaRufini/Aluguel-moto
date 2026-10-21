const digits = (v: string) => v.replace(/\D/g, '');

export function formatCpf(v: string): string {
  const d = digits(v);
  if (d.length !== 11) return v;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** `***.456.789-**`: esconde os 3 primeiros e os 2 últimos dígitos. */
export function maskCpf(v?: string | null): string {
  if (!v) return '—';
  const d = digits(v);
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function displayCpf(v: string | undefined | null, full: boolean): string {
  if (!v) return '—';
  return full ? formatCpf(v) : maskCpf(v);
}
