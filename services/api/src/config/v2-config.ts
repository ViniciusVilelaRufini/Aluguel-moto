import { oneOf } from './env';

/**
 * Configuração das funções do contrato v2 (docs/decisoes.md, 2026-10-22). Arquivo próprio para não mexer no `AppConfig`
 * compartilhado além do bucket de catálogo.
 */
export interface V2Config {
  /** Recarga de valor livre: limites efetivos (sempre dentro de 1000..100000, o intervalo do contrato). */
  topUpMinCents: number;
  topUpMaxCents: number;
  suggestedTopUpAmountsCents: number[];
  /** Indicação: bônus de quem indicou (na primeira corrida do amigo) e do indicado (na hora). */
  referralReferrerRewardCents: number;
  referralRefereeRewardCents: number;
  inviteBaseUrl: string;
  /** Endereço da moto: `local` (ruas de São Paulo em memória) ou `aws` (Amazon Location, SearchPlaceIndexForPosition). */
  geocoderMode: 'local' | 'aws';
  placeIndexName?: string;
  awsRegion: string;
  /** Agendamento de manutenção pelo cliente. */
  maintenanceSlotCapacity: number;
  maintenanceLocation: string;
  /** Intervalo de revisão padrão (moto sem modelo no catálogo). */
  defaultServiceIntervalKm: number;
  defaultServiceIntervalHours: number;
  /** Fix round 1. */
  subscriptionGraceMs: number;
  vehicleSwapCooldownMs: number;
  referralMinRentalCents: number;
  /** Segredo do HMAC do CPF (prevenção a fraude, I4). Obrigatório em produção. */
  fraudHashSecret: string;
}

const int = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const v = Number(raw);
  return raw !== undefined && raw !== '' && Number.isInteger(v) ? v : fallback;
};
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function loadV2Config(): V2Config {
  const min = clamp(int('WALLET_TOP_UP_MIN_CENTS', 1000), 1000, 100000);
  const max = clamp(int('WALLET_TOP_UP_MAX_CENTS', 100000), min, 100000);
  const suggested = (process.env.WALLET_TOP_UP_SUGGESTED_CENTS ?? '2000,5000,10000')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= min && n <= max);
  return {
    topUpMinCents: min,
    topUpMaxCents: max,
    suggestedTopUpAmountsCents: suggested,
    referralReferrerRewardCents: Math.max(0, int('REFERRAL_REFERRER_REWARD_CENTS', 1000)),
    referralRefereeRewardCents: Math.max(0, int('REFERRAL_REFEREE_REWARD_CENTS', 1000)),
    inviteBaseUrl: (process.env.REFERRAL_INVITE_BASE_URL || 'https://volti.com.br/convite').replace(/\/$/, ''),
    geocoderMode: oneOf('GEOCODER_MODE', ['local', 'aws'] as const, 'local'),
    placeIndexName: process.env.LOCATION_PLACE_INDEX || undefined,
    awsRegion: process.env.AWS_REGION || 'sa-east-1',
    maintenanceSlotCapacity: Math.max(1, int('MAINTENANCE_SLOT_CAPACITY', 2)),
    maintenanceLocation: process.env.MAINTENANCE_LOCATION || 'Oficina Volti · R. Fradique Coutinho, 1000 · Pinheiros, São Paulo',
    defaultServiceIntervalKm: Math.max(1, int('SERVICE_INTERVAL_KM', 1000)),
    defaultServiceIntervalHours: Math.max(1, int('SERVICE_INTERVAL_HOURS', 100)),
    subscriptionGraceMs: Math.max(0, int('SUBSCRIPTION_RENEWAL_GRACE_HOURS', 72)) * 3_600_000,
    vehicleSwapCooldownMs: Math.max(0, int('SUBSCRIPTION_VEHICLE_SWAP_COOLDOWN_HOURS', 24)) * 3_600_000,
    referralMinRentalCents: Math.max(0, int('REFERRAL_MIN_RENTAL_CENTS', 500)),
    fraudHashSecret: fraudSecret(),
  };
}

/** Sem `FRAUD_HASH_SECRET` em produção a API não sobe; em dev/teste usa um segredo local fixo. */
function fraudSecret(): string {
  const v = process.env.FRAUD_HASH_SECRET;
  if (v && v.trim()) return v;
  if (process.env.NODE_ENV === 'production') throw new Error('FRAUD_HASH_SECRET é obrigatório em produção (HMAC do CPF para prevenção a fraude).');
  return 'volti-dev-fraud-hash-secret';
}

export const V2_CONFIG = Symbol('V2_CONFIG');
