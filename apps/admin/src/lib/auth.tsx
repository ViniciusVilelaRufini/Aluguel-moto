'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, unwrap } from './api';
import { AUTH_MODE } from './config';
import { cognitoLogoutUrl } from './cognito';
import { getToken, setToken } from './token-store';
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

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setMe(null);
    if (AUTH_MODE === 'cognito') window.location.assign(cognitoLogoutUrl());
    else window.location.assign('/login/');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ ready, token, me, groups: me?.groups ?? [], loginDev, loginWithToken: loadMe, logout }),
    [ready, token, me, loginDev, loadMe, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}
