'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { COGNITO } from '@/lib/config';
import {
  confirmPasswordReset,
  LoginError,
  requestPasswordReset,
  StaffSignIn,
  toLoginError,
  type SignInStep,
} from '@/lib/cognito-login';
import { ForgotConfirmView, ForgotRequestView, MfaSetupView, NewPasswordView, SignInView, TotpView } from './LoginViews';

type Step = 'signIn' | 'newPassword' | 'totp' | 'mfaSetup' | 'forgotRequest' | 'forgotConfirm';

/** Tokens válidos, mas a API recusou o perfil (GET /me): usuário sem grupo do painel, por exemplo. */
function apiMessage(e: ApiError): string {
  return e.status === 401 || e.status === 403 ? 'Seu usuário não tem acesso ao painel. Fale com um administrador.' : e.message;
}

export function CognitoLoginForm() {
  const { loginWithTokens } = useAuth();
  const router = useRouter();
  const signIn = useRef<StaffSignIn | null>(null);
  const [step, setStep] = useState<Step>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [mfa, setMfa] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const go = (next: Step) => {
    setError(null);
    setCode('');
    setStep(next);
  };

  const restart = () => {
    signIn.current = null;
    setPassword('');
    setNewPassword('');
    setConfirm('');
    setMfa(null);
    go('signIn');
  };

  const handle = async (s: SignInStep) => {
    switch (s.kind) {
      case 'signedIn':
        setPassword('');
        await loginWithTokens(s.tokens);
        router.replace('/');
        return;
      case 'newPassword':
        setPassword('');
        go('newPassword');
        return;
      case 'totp':
        go('totp');
        return;
      case 'mfaSetup':
        setMfa({ secret: s.secret, otpauthUri: s.otpauthUri });
        go('mfaSetup');
    }
  };

  const attempt = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError) {
        restart();
        setError(apiMessage(e));
      } else {
        const err = toLoginError(e);
        // Sessão do desafio expirada: volta ao começo com o aviso.
        if (err.kind === 'session-expired') restart();
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    switch (step) {
      case 'signIn':
        return attempt(async () => {
          setNotice(null);
          signIn.current = new StaffSignIn(COGNITO);
          await handle(await signIn.current.start(email, password));
        });
      case 'newPassword':
        return attempt(async () => handle(await current().completeNewPassword(newPassword)));
      case 'totp':
        return attempt(async () => handle(await current().submitTotp(code)));
      case 'mfaSetup':
        return attempt(async () => handle(await current().verifyMfaSetup(code)));
      case 'forgotRequest':
        return attempt(async () => {
          await requestPasswordReset(COGNITO, email);
          setNewPassword('');
          setConfirm('');
          go('forgotConfirm');
        });
      case 'forgotConfirm':
        return attempt(async () => {
          await confirmPasswordReset(COGNITO, email, code, newPassword);
          restart();
          setNotice('Senha alterada. Entre com a senha nova.');
        });
    }
  };

  const current = (): StaffSignIn => {
    if (!signIn.current) throw new LoginError('session-expired');
    return signIn.current;
  };

  return (
    <form key={step} className="section-in login-form" onSubmit={submit} noValidate data-step={step}>
      {step === 'signIn' && (
        <SignInView email={email} password={password} onEmail={setEmail} onPassword={setPassword} busy={busy} error={error} notice={notice}
          onForgot={() => { setNotice(null); go('forgotRequest'); }} />
      )}
      {step === 'newPassword' && (
        <NewPasswordView password={newPassword} confirm={confirm} onPassword={setNewPassword} onConfirm={setConfirm} busy={busy} error={error} onBack={restart} />
      )}
      {step === 'totp' && <TotpView code={code} onCode={setCode} busy={busy} error={error} onBack={restart} />}
      {step === 'mfaSetup' && mfa && (
        <MfaSetupView secret={mfa.secret} otpauthUri={mfa.otpauthUri} code={code} onCode={setCode} busy={busy} error={error} onBack={restart} />
      )}
      {step === 'forgotRequest' && <ForgotRequestView email={email} onEmail={setEmail} busy={busy} error={error} onBack={restart} />}
      {step === 'forgotConfirm' && (
        <ForgotConfirmView code={code} password={newPassword} confirm={confirm} onCode={setCode} onPassword={setNewPassword} onConfirm={setConfirm}
          busy={busy} error={error} onBack={restart} onResend={() => go('forgotRequest')} />
      )}
    </form>
  );
}
