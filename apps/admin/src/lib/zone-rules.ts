/** Regras automáticas das cercas (painel de Cercas e zonas), fixas na plataforma. */
export interface ZoneRule { title: string; detail: string }

/**
 * P1-2: com moto de rastreador só relé (J16) na frota, as regras dizem o que vale para ela: o limite da zona vira aviso ao
 * cliente e alerta (o rastreador não reduz a velocidade) e o bloqueio por saída da área espera a moto parar e corta o relé.
 */
export function automaticZoneRules(opts: { relayOnly: boolean; returnFeeText?: string }): ZoneRule[] {
  return [
    {
      title: 'Saiu da área de operação',
      detail: opts.relayOnly
        ? 'Alerta imediato; reduz e bloqueia com segurança após 5 min. Rastreador só relé: não reduz a potência — espera a moto parar e corta o relé'
        : 'Alerta imediato; reduz e bloqueia com segurança após 5 min',
    },
    {
      title: 'Entrou em área de pedestres ou ciclovia',
      detail: opts.relayOnly
        ? 'Limite de 6 km/h (pedestres) ou 20 km/h (ciclovia). Rastreador só relé: não reduz a velocidade — aviso ao cliente e alerta acima do limite'
        : 'Limite de 6 km/h (pedestres) ou 20 km/h (ciclovia)',
    },
    { title: 'Zona proibida', detail: 'Não permite encerrar o aluguel' },
    { title: 'Fora do ponto de devolução', detail: opts.returnFeeText ? `Só o admin encerra à força, com taxa de ${opts.returnFeeText}` : 'Só o admin encerra à força, com taxa' },
  ];
}
