import { COGNITO } from './config';

const VERIFIER_KEY = 'volti.admin.pkce';

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  arr.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomVerifier(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(48)));
}

export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(digest);
}

/** Redireciona para a hosted UI do pool interno (OAuth code + PKCE). O MFA é exigido pelo pool. */
export async function startCognitoLogin(): Promise<void> {
  const verifier = randomVerifier();
  window.sessionStorage.setItem(VERIFIER_KEY, verifier);
  const url = new URL(`https://${COGNITO.domain}/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: COGNITO.clientId,
    redirect_uri: COGNITO.redirectUri,
    scope: 'openid email profile',
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
  }).toString();
  window.location.assign(url.toString());
}

/** Troca o `code` por tokens e devolve o access token (traz `cognito:groups`). */
export async function exchangeCode(code: string): Promise<string> {
  const verifier = window.sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('Sessão de login expirada. Entre de novo.');
  const res = await fetch(`https://${COGNITO.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: COGNITO.clientId,
      code,
      redirect_uri: COGNITO.redirectUri,
      code_verifier: verifier,
    }),
  });
  window.sessionStorage.removeItem(VERIFIER_KEY);
  if (!res.ok) throw new Error('Não foi possível concluir o login.');
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export function cognitoLogoutUrl(): string {
  const url = new URL(`https://${COGNITO.domain}/logout`);
  url.search = new URLSearchParams({ client_id: COGNITO.clientId, logout_uri: window.location.origin + '/login' }).toString();
  return url.toString();
}
