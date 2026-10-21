export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const AUTH_MODE: 'dev' | 'cognito' = process.env.NEXT_PUBLIC_AUTH_MODE === 'cognito' ? 'cognito' : 'dev';

export const COGNITO = {
  domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? '',
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
  redirectUri: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI ?? '',
};
