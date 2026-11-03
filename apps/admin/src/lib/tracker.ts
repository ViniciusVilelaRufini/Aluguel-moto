import type { CommandType, S } from './types';

/** Tipo do rastreador da moto (spec GT06 §9). */
export type TrackerControlMode = S<'TrackerControlMode'>;

export const TRACKER_CONTROL_LABEL: Record<TrackerControlMode, string> = { speed_control: 'Controle de velocidade', relay_only: 'Só relé' };
export const RELAY_ONLY_SPEED_HINT = 'Este rastreador não controla velocidade';
export const RELAY_ONLY_HORN_HINT = 'Este rastreador não tem buzina';
export const RELAY_LOCK_WAITING = 'Aguardando a moto parar para bloquear';
/** Desbloqueio `relay_only`: a confirmação vem da resposta do rastreador (normalmente ~1 s; a API espera até 90 s). */
export const RELAY_UNLOCK_WAITING = 'Aguardando o rastreador confirmar o desbloqueio';
export const RELAY_UNLOCK_TIMEOUT = 'falhou: sem resposta do rastreador em 90 s';
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

/** Texto do diálogo de bloqueio: com controle de velocidade a potência cai aos poucos; só relé espera a moto parar e corta o relé. */
export function lockDescription(mode: TrackerControlMode | undefined): string {
  return mode === 'relay_only'
    ? 'O rastreador só corta o relé: o sistema espera a moto parar (3 posições paradas em 20 s) e só então corta. Nunca corta com a moto em movimento.'
    : 'A moto reduz a potência aos poucos e só trava abaixo de 3 km/h. Nunca corta o motor em movimento.';
}

/** Aviso do diálogo de bloqueio quando a moto está andando. */
export function lockMovingWarning(mode: TrackerControlMode | undefined): string {
  return mode === 'relay_only'
    ? 'O comando fica pendente até a moto parar (3 posições paradas em 20 s); só então o relé é cortado.'
    : 'O comando fica pendente até a velocidade cair abaixo de 3 km/h.';
}
