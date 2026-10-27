import type { CommandType, S } from './types';

/** Tipo do rastreador da moto (spec GT06 §9). */
export type TrackerControlMode = S<'TrackerControlMode'>;

export const TRACKER_CONTROL_LABEL: Record<TrackerControlMode, string> = { speed_control: 'Controle de velocidade', relay_only: 'Só relé' };
export const RELAY_ONLY_SPEED_HINT = 'Este rastreador não controla velocidade';
export const RELAY_ONLY_HORN_HINT = 'Este rastreador não tem buzina';
export const RELAY_LOCK_WAITING = 'Aguardando a moto parar para bloquear';
/** `id` do aviso da ficha (`RelayOnlyNotice`): os botões desabilitados apontam para ele (`aria-describedby`). */
export const RELAY_ONLY_NOTICE_ID = 'relay-only-notice';

/** `relay_only` não executa limite de velocidade nem buzina (a API responde `unsupported_by_tracker`). */
export function commandSupported(type: CommandType, mode: TrackerControlMode | undefined): boolean {
  return mode !== 'relay_only' || (type !== 'speed_limit' && type !== 'horn');
}

/** `aria-describedby` do botão de um comando que o rastreador não executa (aponta para o aviso); senão `undefined`. */
export function unsupportedDescribedBy(type: CommandType, mode: TrackerControlMode | undefined): string | undefined {
  return commandSupported(type, mode) ? undefined : RELAY_ONLY_NOTICE_ID;
}

export function unsupportedHint(type: CommandType): string | undefined {
  return type === 'speed_limit' ? RELAY_ONLY_SPEED_HINT : type === 'horn' ? RELAY_ONLY_HORN_HINT : undefined;
}
