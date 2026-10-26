'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ds/Button';
import { Input } from '@/ds/Input';
import { OtpInput } from '@/ds/OtpInput';
import { Alert } from '@/ds/Alert';
import { Field, Select, ErrorNote } from '@/components/ui';
import { DEV_USERS, useAuth } from '@/lib/auth';
import { AUTH_MODE } from '@/lib/config';
import { startCognitoLogin } from '@/lib/cognito';
import { menuFor } from '@/lib/permissions';
import { errorText } from '@/lib/api';

type DevGroup = keyof typeof DEV_USERS;
const GROUP_OPTIONS: { value: DevGroup; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operacao', label: 'Operação' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'suporte', label: 'Suporte' },
];

export default function LoginPage() {
  const { loginDev, token, me, groups, logout } = useAuth();
  // Sessão válida de quem não tem nenhuma seção no painel (perfil de campo): explica em vez de repetir o login.
  const noPanel = !!token && !!me && menuFor(groups).length === 0;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [group, setGroup] = useState<DevGroup>('admin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enter = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginDev(group);
      router.replace(menuFor([group])[0]?.href ?? '/');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const title = { font: '700 22px/1.2 var(--font-sans)', letterSpacing: '-.02em' } as const;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', color: 'var(--text-primary)' }}>
      <div className="login-brand" style={{ width: '42%', background: 'var(--ink-900)', color: '#fff', padding: 56, display: 'flex', flexDirection: 'column' }}>
        <div style={{ font: '800 32px/1 var(--font-sans)', letterSpacing: '-.04em', color: 'var(--green-400)' }}>volti</div>
        <div style={{ flex: 1 }} />
        <div style={{ font: '800 48px/1.05 var(--font-sans)', letterSpacing: '-.03em', maxWidth: 420 }}>Painel de operação</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,.6)', marginTop: 12, maxWidth: 380 }}>Frota, clientes e finanças em tempo real. Acesso restrito à equipe.</div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-app)', padding: 24, minWidth: 0 }}>
        <form key={step} className="section-in" onSubmit={(e) => { e.preventDefault(); if (AUTH_MODE === 'cognito') return; if (step === 0) setStep(1); else if (!busy && code.length === 6) enter(); }}
          style={{ width: 380, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {noPanel && (
            <>
              <Alert tone="warning" icon="TriangleAlert">Seu perfil é de campo; use o app do operador.</Alert>
              <Button variant="secondary" fullWidth testId="login-logout" onClick={logout}>Sair desta conta</Button>
            </>
          )}
          {AUTH_MODE === 'cognito' ? (
            <>
              <div style={title}>Entrar</div>
              <Alert tone="info" icon="ShieldCheck">O login pede o código do app autenticador (2FA) para todos os perfis.</Alert>
              <Button size="lg" fullWidth testId="login-cognito" onClick={() => startCognitoLogin()}>Entrar com a conta Volti</Button>
            </>
          ) : step === 0 ? (
            <>
              <h1 style={{ ...title, margin: 0 }}>Entrar</h1>
              <Input label="E-mail" value={DEV_USERS[group].email} onChange={() => {}} icon="Mail" />
              <Input label="Senha" type="password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} icon="Lock" testId="login-password" />
              <Field label="Perfil de acesso (modo de desenvolvimento)">
                <Select testId="group-select" value={group} onChange={setGroup} options={GROUP_OPTIONS} />
              </Field>
              <Button size="lg" fullWidth type="submit" testId="login-continue">Continuar</Button>
            </>
          ) : (
            <>
              <h1 style={{ ...title, margin: 0 }}>Verificação em dois fatores</h1>
              <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Digite o código do seu app autenticador.</div>
              <OtpInput value={code} onChange={setCode} autoFocus label="Código de 6 dígitos" />
              <Alert tone="info" icon="ShieldCheck">Modo de desenvolvimento: o código não é verificado. Em produção o 2FA é obrigatório para todos os perfis.</Alert>
              <ErrorNote error={error ? new Error(error) : null} />
              <Button size="lg" fullWidth type="submit" disabled={busy || code.length < 6} testId="login-submit">{busy ? 'Entrando...' : 'Entrar no painel'}</Button>
              <Button variant="ghost" fullWidth onClick={() => { setCode(''); setStep(0); }}>Voltar</Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
