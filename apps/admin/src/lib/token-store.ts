const KEY = 'volti.admin.token';

/** Token só na sessão do navegador (sessionStorage), nunca em localStorage. */
export function getToken(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(KEY, token);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* sessionStorage indisponível */
  }
}
