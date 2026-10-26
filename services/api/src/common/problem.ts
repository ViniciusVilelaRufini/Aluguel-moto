import { HttpException } from '@nestjs/common';

export const PROBLEM_BASE = 'https://api.volti.com.br/problems/';

export interface ValidationIssue {
  field: string;
  message: string;
}

const DEFAULT_TITLES: Record<string, string> = {
  'validation-error': 'Dados inválidos',
  unauthorized: 'Não autenticado',
  forbidden: 'Acesso negado',
  'not-found': 'Não encontrado',
  conflict: 'Conflito',
  'rate-limited': 'Muitas requisições',
  'idempotency-key-reused': 'Idempotency-Key reutilizada com outro corpo',
  'speed-limit-out-of-range': 'Limite de velocidade fora do permitido',
  'kyc-not-approved': 'Verificação de identidade não aprovada',
  'kyc-underage': 'Cliente menor de 18 anos',
  'customer-blocked': 'Conta bloqueada',
  'customer-delinquent': 'Pagamento pendente',
  'payment-pending': 'Pagamento pendente',
  'vehicle-unavailable': 'Moto indisponível',
  'vehicle-offline': 'Moto sem conexão',
  'reservation-already-active': 'Já existe uma reserva ativa',
  'rental-already-active': 'Já existe um aluguel em andamento',
  'rental-not-active': 'Aluguel não está em andamento',
  'rental-outside-return-zone': 'Fora da zona de devolução',
  'return-photo-missing': 'Foto de devolução ausente',
  'rental-lock-not-confirmed': 'Travamento não confirmado',
  'force-end-outside-zone-requires-admin': 'Encerramento fora da zona exige admin',
  'insurance-required': 'Seguro obrigatório',
  'coupon-invalid': 'Cupom inválido',
  'deposit-not-held': 'Caução não retida',
  'payment-failed': 'Pagamento recusado',
  'card-not-found': 'Cartão não encontrado',
  'card-required': 'Cartão necessário',
  'zone-invalid-geometry': 'Geometria da zona inválida',
  'zone-speed-limit-required': 'Limite de velocidade obrigatório',
  'zone-speed-limit-invalid': 'Limite de velocidade inválido para a zona',
  'location-consent-required': 'Consentimento de localização necessário',
  'speed-limiter-noncompliant': 'Limitador de velocidade fora da norma',
  'battery-serials-must-differ': 'Números de série iguais',
  'account-deletion-blocked': 'Exclusão de conta bloqueada',
  'webhook-signature-invalid': 'Assinatura do webhook inválida',
  // contrato v2
  'pix-key-invalid': 'Chave Pix inválida',
  'top-up-amount-out-of-range': 'Valor de recarga fora do permitido',
  'subscription-not-pausable': 'Assinatura não pode ser pausada ou retomada',
  'subscription-pause-limit-reached': 'Limite de pausa do plano',
  'subscription-required': 'Plano semanal ou mensal necessário',
  'subscription-vehicle-required': 'Plano sem moto fixa',
  'maintenance-slot-unavailable': 'Horário de manutenção indisponível',
  'referral-code-invalid': 'Código de indicação inválido',
  'referral-not-eligible': 'Indicação não permitida',
  // retirada em galpão
  'depot-inactive': 'Galpão inativo',
  // ciclo de vida das baterias no galpão
  'depot-required': 'Informe o galpão',
  // troca de bateria na estação via QR
  'station-not-found': 'Estação não encontrada',
  'station-unavailable': 'Estação indisponível',
  'vehicle-moving': 'Moto em movimento',
  'too-far': 'Longe da estação',
  'swap-open': 'Já existe uma troca em andamento',
  'swap-not-cancelable': 'Troca não pode ser cancelada',
  // cadastro de estações pelo painel
  'thing-name-taken': 'Armário (thing) já usado por outra estação',
  'station-swap-in-progress': 'Troca em andamento na estação',
  'slots-below-stock': 'Vagas abaixo das baterias na estação',
  // inadimplência (Task 14 das lacunas)
  'debt-not-payable': 'Não há dívida a quitar',
  'debt-in-collection': 'Cobrança em andamento',
  'vehicle-locked-by-staff': 'Moto bloqueada pela equipe',
  'internal-error': 'Erro interno',
};

/** Erro de domínio no formato RFC 7807. `slug` vira `type = https://api.volti.com.br/problems/<slug>`. */
export class ProblemException extends HttpException {
  constructor(
    status: number,
    readonly slug: string,
    readonly detail?: string,
    readonly errors?: ValidationIssue[],
    title?: string,
  ) {
    super({ slug, detail, errors, title: title ?? DEFAULT_TITLES[slug] ?? slug }, status);
  }

  get title(): string {
    return (this.getResponse() as { title: string }).title;
  }
}

export const problemTitle = (slug: string): string => DEFAULT_TITLES[slug] ?? slug;

// Atalhos usados pelos módulos.
export const badRequest = (detail: string, errors?: ValidationIssue[]) =>
  new ProblemException(400, 'validation-error', detail, errors);
export const notFound = (detail = 'Recurso não encontrado.') => new ProblemException(404, 'not-found', detail);
export const forbidden = (detail = 'Você não tem permissão para esta ação.', slug = 'forbidden') =>
  new ProblemException(403, slug, detail);
export const conflict = (slug: string, detail: string) => new ProblemException(409, slug, detail);
export const unprocessable = (slug: string, detail: string) => new ProblemException(422, slug, detail);
