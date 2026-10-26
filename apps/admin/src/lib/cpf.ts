const digits = (v: string) => v.replace(/\D/g, '');

export function formatCpf(v: string): string {
  const d = digits(v);
  if (d.length !== 11) return v;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** `***.456.789-**`: esconde os 3 primeiros e os 2 últimos dígitos. */
const ALREADY_MASKED = /^\*{3}\.\d{3}\.\d{3}-\*{2}$/;

export function maskCpf(v?: string | null): string {
  if (!v) return '—';
  if (ALREADY_MASKED.test(v)) return v; // a API já devolve mascarado para quem não é admin
  const d = digits(v);
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function displayCpf(v: string | undefined | null, full: boolean): string {
  if (!v) return '—';
  return full ? formatCpf(v) : maskCpf(v);
}

/** CPF com 11 dígitos, não repetidos, e dígitos verificadores corretos. */
export function isValidCpf(v: string): boolean {
  const d = digits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
