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

export const PAYMENT_KIND: Record<S<'PaymentKind'>, string> = { rental: 'Aluguel', deposit: 'Caução', top_up: 'Recarga', subscription: 'Assinatura', fee: 'Taxa' };

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

export const GROUP_LABEL: Record<S<'StaffGroup'>, string> = { admin: 'Administrador', operacao: 'Operação', financeiro: 'Financeiro', suporte: 'Suporte', campo: 'Campo' };
