const KEY = 'volti.admin.token';
const REFRESH_KEY = 'volti.admin.refresh';

function read(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch {
    /* sessionStorage indisponível */
  }
}

/** Token só na sessão do navegador (sessionStorage), nunca em localStorage. Limpar o token encerra a sessão inteira. */
export function getToken(): string | null {
  return read(KEY);
}

export function setToken(token: string | null): void {
  write(KEY, token);
  if (!token) write(REFRESH_KEY, null);
}

/**
 * Refresh token do login com e-mail e senha (SRP), guardado na mesma sessionStorage só para ser revogado no logout
 * (`RevokeToken`). O login pelo Hosted UI não o guarda.
 */
export function getRefreshToken(): string | null {
  return read(REFRESH_KEY);
}

export function setRefreshToken(token: string | null): void {
  write(REFRESH_KEY, token);
}
