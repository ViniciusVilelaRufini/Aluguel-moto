export type AuthMode = 'dev' | 'cognito';

/**
 * Fail closed: o modo dev só vale quando pedido explicitamente. Em produção, sem a variável
 * (ou com valor desconhecido), o painel usa o Cognito.
 */
export function resolveAuthMode(value: string | undefined, nodeEnv: string | undefined): AuthMode {
  if (value === 'dev') return 'dev';
  if (value === 'cognito') return 'cognito';
  return nodeEnv === 'production' ? 'cognito' : 'dev';
}
