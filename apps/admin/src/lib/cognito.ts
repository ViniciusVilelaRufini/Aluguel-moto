import { COGNITO } from './config';

/**
 * Hosted UI do pool interno (OAuth code + PKCE). O painel entra pelo formulário próprio (`cognito-login.ts`); isto fica
 * só para concluir um login que já estava em andamento no Hosted UI (`/auth/callback/`) e para o logout dessas sessões.
 */

const VERIFIER_KEY = 'volti.admin.pkce';

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
  url.search = new URLSearchParams({ client_id: COGNITO.clientId, logout_uri: window.location.origin + '/login/' }).toString();
  return url.toString();
}
