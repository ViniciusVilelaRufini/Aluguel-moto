'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, unwrap } from './api';
import { AUTH_MODE, COGNITO } from './config';
import { cognitoLogoutUrl } from './cognito';
import { revokeRefreshToken } from './cognito-revoke';
import type { StaffTokens } from './cognito-login';
import { getRefreshToken, getToken, setRefreshToken, setToken } from './token-store';
import type { S, StaffGroup } from './types';

export const DEV_USERS: Record<'admin' | 'operacao' | 'financeiro' | 'suporte', { sub: string; email: string }> = {
  admin: { sub: 'dev-admin', email: 'admin@volti.dev' },
  operacao: { sub: 'dev-operacao', email: 'operacao@volti.dev' },
  financeiro: { sub: 'dev-financeiro', email: 'financeiro@volti.dev' },
  suporte: { sub: 'dev-suporte', email: 'suporte@volti.dev' },
};

interface AuthState {
  ready: boolean;
  token: string | null;
  me: S<'Me'> | null;
  groups: StaffGroup[];
  loginDev: (group: keyof typeof DEV_USERS) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  /** Login com e-mail e senha (SRP): guarda o access token (como o Hosted UI) e o refresh token para revogar no logout. */
  loginWithTokens: (tokens: StaffTokens) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [me, setMe] = useState<S<'Me'> | null>(null);

  const loadMe = useCallback(async (t: string) => {
    setToken(t);
    const data = await unwrap(api.GET('/me'));
    setTokenState(t);
    setMe(data);
  }, []);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setReady(true);
      return;
    }
    loadMe(t)
      .catch(() => {
        setToken(null);
      })
      .finally(() => setReady(true));
  }, [loadMe]);

  const loginDev = useCallback(
    async (group: keyof typeof DEV_USERS) => {
      const u = DEV_USERS[group];
      const res = await unwrap(api.POST('/dev/token', { body: { sub: u.sub, email: u.email, groups: [group], pool: 'staff' } }));
      await loadMe(res.accessToken);
    },
    [loadMe],
  );

  const loginWithTokens = useCallback(
    async (tokens: StaffTokens) => {
      try {
        await loadMe(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);
      } catch (e) {
        setToken(null);
        await revokeRefreshToken(COGNITO, tokens.refreshToken);
        throw e;
      }
    },
    [loadMe],
  );

  const logout = useCallback(() => {
    const refresh = getRefreshToken();
    setToken(null);
    setTokenState(null);
    setMe(null);
    if (AUTH_MODE !== 'cognito') {
      window.location.assign('/login/');
    } else if (refresh) {
      // Login próprio (SRP): revoga o refresh token (e os access tokens dele) e volta para a tela de login.
      void revokeRefreshToken(COGNITO, refresh).finally(() => window.location.assign('/login/'));
    } else if (COGNITO.domain) {
      // Sessão aberta pelo Hosted UI: encerra também o cookie do domínio do Cognito.
      window.location.assign(cognitoLogoutUrl());
    } else {
      window.location.assign('/login/');
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ ready, token, me, groups: me?.groups ?? [], loginDev, loginWithToken: loadMe, loginWithTokens, logout }),
    [ready, token, me, loginDev, loadMe, loginWithTokens, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}
