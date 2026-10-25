import type { S } from './types';
import type { Tone } from './status';

export const RENTAL_STATUS: Record<S<'RentalStatus'>, [string, Tone]> = {
  active: ['Em andamento', 'info'],
  paused: ['Pausado', 'warning'],
  ending: ['Encerrando', 'warning'],
  ended: ['Encerrado', 'success'],
  force_ended: ['Encerrado à força', 'danger'],
};

export const PLAN_LABEL: Record<S<'PlanCode'>, string> = { minute: 'Por minuto', hour: 'Por hora', day: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };
export const COVERAGE_LABEL: Record<S<'InsuranceCoverage'>, string> = { basic: 'Básico', full: 'Completo' };

export const KYC_STATUS: Record<S<'KycStatus'>, [string, Tone, string]> = {
  approved: ['Verificada', 'success', 'ShieldCheck'],
  pending: ['Pendente', 'warning', 'Hourglass'],
  rejected: ['Reprovada', 'danger', 'ShieldAlert'],
  not_started: ['Não iniciada', 'neutral', 'Hourglass'],
};

export const CUSTOMER_STATUS: Record<S<'CustomerStatus'>, [string, Tone]> = {
  active: ['Ativa', 'success'],
  blocked: ['Bloqueada', 'danger'],
  deleted: ['Excluída', 'neutral'],
};

export const PAYMENT_STATUS: Record<S<'PaymentStatus'>, [string, Tone]> = {
  pending: ['Pendente', 'warning'],
  authorized: ['Autorizado', 'info'],
  captured: ['Capturado', 'success'],
  canceled: ['Cancelado', 'neutral'],
  paid: ['Pago', 'success'],
  refunded: ['Estornado', 'neutral'],
  partially_refunded: ['Estorno parcial', 'neutral'],
  failed: ['Falhou', 'danger'],
};

export const PAYMENT_KIND: Record<S<'PaymentKind'>, string> = { rental: 'Aluguel', deposit: 'Caução', top_up: 'Recarga', subscription: 'Assinatura', fee: 'Taxa', debt_settlement: 'Quitação de dívida' };
/** Como a dívida de um pagamento recusado foi quitada (Task 14). */
export const DEBT_SETTLEMENT: Record<S<'DebtSettlementKind'>, string> = { payment: 'Paga pelo cliente', manual: 'Quitação registrada pelo financeiro' };
export const PAYMENT_METHOD: Record<S<'PaymentMethod'>, string> = { card: 'Cartão', pix: 'Pix', wallet: 'Carteira' };

export const RENTAL_EVENT: Record<S<'RentalEventType'>, string> = {
  started: 'Aluguel iniciado', paused: 'Pausado', resumed: 'Retomado', vehicle_swapped: 'Moto trocada', zone_entered: 'Entrou em zona',
  zone_exited: 'Saiu de zona', left_operation_area: 'Saiu da área de operação', returned_operation_area: 'Voltou à área de operação',
  alert: 'Alerta', fall_detected: 'Queda detectada', ending: 'Encerrando', ended: 'Encerrado', force_ended: 'Encerrado à força', command: 'Comando',
};

export const DISPUTE_STATUS: Record<S<'DisputeStatus'>, [string, Tone]> = {
  open: ['Aberta', 'warning'], under_review: ['Em análise', 'info'], accepted: ['Aceita', 'success'], rejected: ['Recusada', 'neutral'],
};
export const CLAIM_STATUS: Record<S<'ClaimStatus'>, [string, Tone]> = {
  submitted: ['Enviado', 'warning'], under_review: ['Em análise', 'info'], approved: ['Aprovado', 'success'], rejected: ['Recusado', 'neutral'], paid: ['Pago', 'success'],
};
export const CLAIM_TYPE: Record<S<'ClaimType'>, string> = { accident: 'Acidente', theft: 'Furto', damage: 'Danos', personal_injury: 'Lesão pessoal' };
export const INCIDENT_STATUS: Record<S<'IncidentStatus'>, [string, Tone]> = {
  open: ['Aberta', 'warning'], in_progress: ['Em andamento', 'info'], resolved: ['Resolvida', 'success'], closed: ['Fechada', 'neutral'],
};
export const INCIDENT_CATEGORY: Record<S<'IncidentCategory'>, string> = {
  vehicle_problem: 'Problema na moto', accident: 'Acidente', theft: 'Furto', app_problem: 'Problema no app', parking: 'Estacionamento', other: 'Outro',
};

export const TASK_TYPE: Record<S<'FieldTaskType'>, [string, string]> = {
  collect: ['Recolher moto', 'Truck'], battery_swap: ['Trocar bateria', 'BatteryCharging'], maintenance: ['Levar para manutenção', 'Wrench'],
  reposition: ['Reposicionar', 'MapPinned'], inspection: ['Inspeção', 'ClipboardList'],
};
export const TASK_PRIORITY: Record<S<'TaskPriority'>, [string, Tone]> = {
  low: ['Baixa', 'neutral'], medium: ['Média', 'warning'], high: ['Alta', 'danger'], urgent: ['Urgente', 'danger'],
};

/** Tipo de alerta: texto e ícone (Lucide). */
export const ALERT_TYPE: Record<S<'AlertType'>, [string, string]> = {
  out_of_operation_area: ['Moto fora da área de operação', 'MapPin'],
  forbidden_zone_entered: ['Entrou em zona proibida', 'Ban'],
  fall_detected: ['Queda detectada', 'Activity'],
  tamper: ['Violação do rastreador', 'ShieldAlert'],
  battery_critical: ['Bateria crítica', 'BatteryWarning'],
  movement_without_rental: ['Moto em movimento sem aluguel', 'ShieldAlert'],
  vehicle_offline: ['Rastreador desconectado', 'WifiOff'],
  command_failed: ['Comando falhou', 'TriangleAlert'],
  customer_not_ok: ['Cliente não respondeu ao "você está bem?"', 'Activity'],
  incident_reported: ['Ocorrência registrada', 'FileText'],
  speed_limiter_noncompliant: ['Limitador de velocidade acima de 32 km/h', 'Gauge'],
  battery_stock_low: ['Poucas baterias carregadas no galpão', 'BatteryWarning'],
  payment_needs_review: ['Pagamento precisa de revisão', 'Wallet'],
};

/** Ações de auditoria da moto (`/audit-logs?entityId=`), no vocabulário do log do design. */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  'vehicle.command.lock': 'Bloqueio',
  'vehicle.command.unlock': 'Desbloqueio',
  'vehicle.command.horn': 'Buzina',
  'vehicle.command.speed_limit': 'Limite de velocidade',
  'vehicle.command.stolen_mode': 'Modo roubada',
  'vehicle.service_unlock': 'Modo serviço',
  'vehicle.status': 'Mudança de situação',
  'vehicle.update': 'Cadastro alterado',
  'vehicle.create': 'Moto cadastrada',
  'vehicle.transfer_depot': 'Transferência de galpão',
};

/** Tipos de cerca no menu de camadas e no tooltip. */
export const ZONE_TYPE_LABEL: Record<S<'ZoneType'>, string> = {
  operation: 'Área de operação', return: 'Ponto de devolução', forbidden: 'Zona proibida', reduced_speed: 'Velocidade reduzida',
};

export const CONVERSATION_STATUS: Record<'open' | 'closed', [string, Tone]> = { open: ['Aberta', 'info'], closed: ['Fechada', 'neutral'] };
export const MAINTENANCE_STATUS: Record<S<'MaintenanceTask'>['status'], [string, Tone]> = {
  scheduled: ['Agendada', 'warning'], in_progress: ['Em andamento', 'info'], done: ['Concluída', 'success'], canceled: ['Cancelada', 'neutral'],
};

export const GROUP_LABEL: Record<S<'StaffGroup'>, string> = { admin: 'Administrador', operacao: 'Operação', financeiro: 'Financeiro', suporte: 'Suporte', campo: 'Campo' };

export const SUBSCRIPTION_STATUS: Record<S<'SubscriptionStatus'>, [string, Tone]> = {
  active: ['Ativa', 'success'], paused: ['Pausada', 'warning'], past_due: ['Em atraso', 'danger'], canceled: ['Cancelada', 'neutral'], expired: ['Expirada', 'neutral'],
};

export const STATION_SWAP_STATUS: Record<S<'StationSwapStatus'>, [string, Tone]> = {
  opening_slot: ['Abrindo vaga', 'info'],
  awaiting_return: ['Aguardando devolução', 'warning'],
  returned: ['Bateria devolvida', 'info'],
  releasing: ['Liberando carregada', 'info'],
  completed: ['Concluída', 'success'],
  canceled: ['Cancelada', 'neutral'],
  failed: ['Falhou', 'danger'],
};

export const DEPOSIT_STATUS: Record<S<'DepositStatus'>, [string, Tone]> = {
  awaiting_pix: ['Aguardando Pix', 'warning'],
  held: ['Retida', 'info'],
  failed: ['Falhou', 'danger'],
  captured: ['Cobrada', 'success'],
  released: ['Liberada', 'neutral'],
};

export const DEPOSIT_METHOD: Record<S<'DepositMethod'>, string> = { card: 'Cartão', pix: 'Pix' };
