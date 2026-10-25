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
import { CognitoLoginForm } from '@/components/login/CognitoLoginForm';
import { LoginBrand, LoginMobileBrand, titleStyle as title } from '@/components/login/LoginViews';
import { homeFor } from '@/lib/permissions';
import { errorText } from '@/lib/api';

type DevGroup = keyof typeof DEV_USERS;
const GROUP_OPTIONS: { value: DevGroup; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operacao', label: 'Operação' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'suporte', label: 'Suporte' },
];

export default function LoginPage() {
  return (
    <div className="login-screen">
      <LoginBrand />
      <main className="login-main">
        <div className="login-column">
          <LoginMobileBrand />
          {AUTH_MODE === 'cognito' ? <CognitoLoginForm /> : <DevLoginForm />}
        </div>
      </main>
    </div>
  );
}

/** Modo `NEXT_PUBLIC_AUTH_MODE=dev`: token do emissor local da API (`POST /dev/token`) com o grupo escolhido. */
function DevLoginForm() {
  const { loginDev } = useAuth();
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
      router.replace(homeFor([group]) ?? '/');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form key={step} className="section-in login-form" onSubmit={(e) => { e.preventDefault(); if (step === 0) setStep(1); else if (!busy && code.length === 6) enter(); }}>
      {step === 0 ? (
        <>
          <h1 style={title}>Entrar</h1>
          <Input label="E-mail" value={DEV_USERS[group].email} onChange={() => {}} icon="Mail" />
          <Input label="Senha" type="password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} icon="Lock" testId="login-password" />
          <Field label="Perfil de acesso (modo de desenvolvimento)">
            <Select testId="group-select" value={group} onChange={setGroup} options={GROUP_OPTIONS} />
          </Field>
          <Button size="lg" fullWidth type="submit" testId="login-continue">Continuar</Button>
        </>
      ) : (
        <>
          <h1 style={title}>Verificação em dois fatores</h1>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Digite o código do seu app autenticador.</div>
          <OtpInput value={code} onChange={setCode} autoFocus label="Código de 6 dígitos" />
          <Alert tone="info" icon="ShieldCheck">Modo de desenvolvimento: o código não é verificado. Em produção o 2FA é obrigatório para todos os perfis.</Alert>
          <ErrorNote error={error ? new Error(error) : null} />
          <Button size="lg" fullWidth type="submit" disabled={busy || code.length < 6} testId="login-submit">{busy ? 'Entrando...' : 'Entrar no painel'}</Button>
          <Button variant="ghost" fullWidth onClick={() => { setCode(''); setStep(0); }}>Voltar</Button>
        </>
      )}
    </form>
  );
}
