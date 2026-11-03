/** Menor prefixo aceito em faixas de origem: abaixo de /8 a faixa já cobre boa parte da internet (dois /1 = /0). */
export const MIN_IPV4_PREFIX = 8;

/**
 * Lança se algum item não for CIDR IPv4 (`a.b.c.d/n`, octetos 0–255, n 0–32) ou tiver prefixo menor que /8.
 * `label` é o nome da opção (aparece na mensagem, ex.: `apnCidrs`).
 */
export function assertIpv4Cidrs(label: string, cidrs: readonly string[]): void {
  for (const c of cidrs) {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(c);
    if (!m || m.slice(1, 5).some((o) => Number(o) > 255) || Number(m[5]) > 32) throw new Error(`${label}: CIDR IPv4 inválido: ${c}`);
    if (Number(m[5]) < MIN_IPV4_PREFIX) throw new Error(`${label}: ${c} é larga demais (prefixo mínimo /${MIN_IPV4_PREFIX}).`);
  }
}
