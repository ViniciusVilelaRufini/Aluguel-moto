/** Rótulos em pt-BR da Auditoria. O identificador técnico fica como detalhe secundário (e é o valor dos filtros). */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  'battery.create': 'Bateria cadastrada',
  'battery.defect': 'Defeito de bateria',
  'battery.mark_charged': 'Bateria marcada como carregada',
  'battery.retire': 'Baixa de bateria',
  'claim.update': 'Sinistro atualizado',
  'customer.block': 'Cliente bloqueado',
  'customer.unblock': 'Cliente desbloqueado',
  'customer.delinquency_clear': 'Quitação de dívida',
  'customer.kyc_review': 'Revisão de verificação (KYC)',
  'customer.pix_refund_key': 'Chave Pix de reembolso',
  'depot.create': 'Galpão criado',
  'depot.update': 'Galpão atualizado',
  'dispute.resolve': 'Contestação resolvida',
  'handover.cancel': 'Entrega cancelada',
  'insurance.coverage.update': 'Cobertura do seguro atualizada',
  'maintenance.customer_request': 'Pedido de manutenção do cliente',
  'payment.refund': 'Reembolso de pagamento',
  'payment.updated': 'Pagamento atualizado',
  'pricing.coupon.create': 'Cupom criado',
  'pricing.coupon.update': 'Cupom atualizado',
  'pricing.coupon.delete': 'Cupom removido',
  'pricing.fee.create': 'Taxa criada',
  'pricing.fee.update': 'Taxa atualizada',
  'pricing.fee.delete': 'Taxa removida',
  'pricing.plan.create': 'Plano criado',
  'pricing.plan.update': 'Plano atualizado',
  'pricing.plan.delete': 'Plano removido',
  'rental.force_end': 'Aluguel encerrado à força',
  'rental.lock': 'Moto bloqueada ao encerrar',
  'rental.unlock': 'Moto liberada ao iniciar',
  'rental.pause': 'Aluguel pausado',
  'rental.resume': 'Aluguel retomado',
  'rental.swap': 'Troca de moto no aluguel',
  'restriction.add': 'Restrição adicionada',
  'restriction.remove': 'Restrição removida',
  'staff.create': 'Membro da equipe criado',
  'staff.update': 'Membro da equipe atualizado',
  'subscription.assign_vehicle': 'Moto fixa da assinatura',
  'swap_station.create': 'Estação de troca criada',
  'swap_station.update': 'Estação de troca atualizada',
  'swap_station.qr_read': 'QR da estação consultado',
  'vehicle.create': 'Moto cadastrada',
  'vehicle.update': 'Moto atualizada',
  'vehicle.status': 'Situação da moto alterada',
  'vehicle.service_unlock': 'Liberação para serviço',
  'vehicle.zone_speed_limit': 'Limite de velocidade da zona',
  'vehicle.out_of_area_lock': 'Bloqueio por sair da área',
  'vehicle.command.lock': 'Comando: bloquear moto',
  'vehicle.command.unlock': 'Comando: desbloquear moto',
  'vehicle_model.create': 'Modelo de moto criado',
  'vehicle_model.update': 'Modelo de moto atualizado',
  'wallet.adjustment': 'Ajuste de carteira',
  'zone.create': 'Cerca criada',
  'zone.update': 'Cerca atualizada',
  'zone.delete': 'Cerca removida',
};

export const AUDIT_ENTITY_LABEL: Record<string, string> = {
  Battery: 'Bateria',
  Claim: 'Sinistro',
  Coupon: 'Cupom',
  Customer: 'Cliente',
  Depot: 'Galpão',
  Dispute: 'Contestação',
  Fee: 'Taxa',
  Handover: 'Entrega',
  InsuranceCoverage: 'Cobertura do seguro',
  MaintenanceTask: 'Manutenção',
  Payment: 'Pagamento',
  PricingPlan: 'Plano',
  Rental: 'Aluguel',
  RestrictionEntry: 'Restrição',
  StaffUser: 'Equipe',
  Subscription: 'Assinatura',
  SwapStation: 'Estação de troca',
  Vehicle: 'Moto',
  VehicleModel: 'Modelo de moto',
  Zone: 'Cerca',
};

export function auditActionLabel(action: string): string {
  const known = AUDIT_ACTION_LABEL[action];
  if (known) return known;
  if (action.startsWith('vehicle.command.')) return `Comando remoto: ${action.slice('vehicle.command.'.length)}`;
  return action;
}

export function auditEntityLabel(entityType: string): string {
  return AUDIT_ENTITY_LABEL[entityType] ?? AUDIT_ENTITY_LABEL[entityType.charAt(0).toUpperCase() + entityType.slice(1)] ?? entityType;
}

const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'pt-BR');
/** Opção do filtro para ações/entidades fora do mapa de rótulos: libera um campo de texto com o identificador técnico. */
export const AUDIT_OTHER = '__other__';
const OTHER_OPTION = { value: AUDIT_OTHER, label: 'Outra…' };
export const AUDIT_ACTION_OPTIONS = [{ value: '', label: 'Todas as ações' }, ...Object.entries(AUDIT_ACTION_LABEL).map(([value, label]) => ({ value, label })).sort(byLabel), OTHER_OPTION];
export const AUDIT_ENTITY_OPTIONS = [{ value: '', label: 'Todas as entidades' }, ...Object.entries(AUDIT_ENTITY_LABEL).map(([value, label]) => ({ value, label })).sort(byLabel), OTHER_OPTION];

/** Valor enviado à API: o do seletor, ou o texto digitado quando "Outra…" está escolhida (vazio = sem filtro). */
export function auditFilterValue(selected: string, custom: string): string {
  return selected === AUDIT_OTHER ? custom.trim() : selected;
}
