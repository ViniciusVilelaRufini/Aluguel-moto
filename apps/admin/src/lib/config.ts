import { resolveAuthMode, type AuthMode } from './auth-mode';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const AUTH_MODE: AuthMode = resolveAuthMode(process.env.NEXT_PUBLIC_AUTH_MODE, process.env.NODE_ENV);

export const COGNITO = {
  /** Pool interno (staff). O login do painel fala direto com a API do Cognito (SRP); a região sai do prefixo do id. */
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? '',
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
  /** Hosted UI: só para o callback de sessões antigas e o logout delas. */
  domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? '',
  redirectUri: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI ?? '',
};
