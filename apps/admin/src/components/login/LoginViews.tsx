'use client';

import type { ReactNode } from 'react';
import { Button } from '@/ds/Button';
import { Input } from '@/ds/Input';
import { OtpInput } from '@/ds/OtpInput';
import { Alert } from '@/ds/Alert';
import { Icon } from '@/ds/Icon';
import { LogoMark } from '@/ds/LogoMark';
import { STAFF_PASSWORD_RULES } from '@/lib/cognito-login';
import { qrMatrix, QR_QUIET } from '@/lib/stations';

/** Telas do login próprio do painel (pool interno do Cognito). Componentes sem estado: o controle fica em CognitoLoginForm. */

type Change = (v: string) => void;
const onText = (fn: Change) => (e: React.ChangeEvent<HTMLInputElement>) => fn(e.target.value);

export const titleStyle = { font: 'var(--type-title)', letterSpacing: '-.02em', margin: 0 } as const;
const bodyStyle = { font: 'var(--type-body)', color: 'var(--text-secondary)', margin: 0 } as const;

export function LoginError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert tone="danger" testId="login-error">
      {message}
    </Alert>
  );
}

function LinkButton({ children, onClick, testId }: { children: ReactNode; onClick: () => void; testId?: string }) {
  return (
    <button type="button" className="login-link" data-testid={testId} onClick={onClick}>
      {children}
    </button>
  );
}

/** Lista das regras da política de senha do pool, marcando as que a senha digitada já cumpre. */
export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="login-rules" data-testid="password-rules" aria-label="Regras da senha">
      {STAFF_PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.id} data-ok={ok ? 'true' : 'false'} style={{ color: ok ? 'var(--success-ink)' : 'var(--text-secondary)' }}>
            <Icon name={ok ? 'CircleCheck' : 'Circle'} size={16} />
            <span>{r.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function SignInView(p: {
  email: string;
  password: string;
  onEmail: Change;
  onPassword: Change;
  busy: boolean;
  error: string | null;
  notice?: string | null;
  onForgot: () => void;
}) {
  return (
    <>
      <h1 style={titleStyle}>Entrar</h1>
      {p.notice && <Alert tone="success">{p.notice}</Alert>}
      <Input label="E-mail" type="email" name="email" autoComplete="username" inputMode="email" icon="Mail" value={p.email} onChange={onText(p.onEmail)} testId="login-email" autoFocus />
      <Input label="Senha" type="password" name="password" autoComplete="current-password" icon="Lock" value={p.password} onChange={onText(p.onPassword)} testId="login-password" />
      <LoginError message={p.error} />
      <Button size="lg" fullWidth type="submit" disabled={p.busy || !p.email.trim() || !p.password} testId="login-submit">
        {p.busy ? 'Entrando...' : 'Entrar'}
      </Button>
      <div style={{ textAlign: 'center' }}>
        <LinkButton onClick={p.onForgot} testId="login-forgot">Esqueci minha senha</LinkButton>
      </div>
    </>
  );
}

export function NewPasswordView(p: {
  password: string;
  confirm: string;
  onPassword: Change;
  onConfirm: Change;
  busy: boolean;
  error: string | null;
  onBack: () => void;
}) {
  const mismatch = p.confirm.length > 0 && p.confirm !== p.password;
  return (
    <>
      <h1 style={titleStyle}>Crie sua senha</h1>
      <p style={bodyStyle}>Primeiro acesso: troque a senha temporária do convite por uma senha só sua.</p>
      <Input label="Nova senha" type="password" name="new-password" autoComplete="new-password" icon="Lock" value={p.password} onChange={onText(p.onPassword)} testId="new-password" autoFocus />
      <PasswordRules password={p.password} />
      <Input label="Repita a nova senha" type="password" name="confirm-password" autoComplete="new-password" icon="Lock" value={p.confirm} onChange={onText(p.onConfirm)} testId="new-password-confirm"
        error={mismatch ? 'As senhas não são iguais.' : undefined} />
      <LoginError message={p.error} />
      <Button size="lg" fullWidth type="submit" disabled={p.busy || !p.password || p.password !== p.confirm} testId="new-password-submit">
        {p.busy ? 'Salvando...' : 'Salvar e entrar'}
      </Button>
      <Button variant="ghost" fullWidth onClick={p.onBack}>Voltar</Button>
    </>
  );
}

export function TotpView(p: { code: string; onCode: Change; busy: boolean; error: string | null; onBack: () => void }) {
  return (
    <>
      <h1 style={titleStyle}>Verificação em dois fatores</h1>
      <p style={bodyStyle}>Digite o código de 6 dígitos do seu app autenticador.</p>
      <OtpInput value={p.code} onChange={p.onCode} autoFocus label="Código de 6 dígitos" error={!!p.error} testId="totp-code" />
      <Alert tone="info" icon="ShieldCheck">O código muda a cada 30 segundos. Use o que estiver na tela do app agora.</Alert>
      <LoginError message={p.error} />
      <Button size="lg" fullWidth type="submit" disabled={p.busy || p.code.length < 6} testId="totp-submit">
        {p.busy ? 'Entrando...' : 'Entrar no painel'}
      </Button>
      <Button variant="ghost" fullWidth onClick={p.onBack}>Voltar</Button>
    </>
  );
}

/** Chave do TOTP em grupos de 4 para digitar no app quando não der para ler o QR. */
export function groupSecret(secret: string): string {
  return secret.replace(/\s+/g, '').replace(/(.{4})(?=.)/g, '$1 ');
}

export function QrCode({ value, size = 184 }: { value: string; size?: number }) {
  const { size: n, path } = qrMatrix(value);
  const total = n + QR_QUIET * 2;
  return (
    <svg data-testid="mfa-qr" role="img" aria-label="QR code para o app autenticador" width={size} height={size} viewBox={`${-QR_QUIET} ${-QR_QUIET} ${total} ${total}`} shapeRendering="crispEdges"
      style={{ borderRadius: 'var(--radius-sm)', display: 'block' }}>
      <rect x={-QR_QUIET} y={-QR_QUIET} width={total} height={total} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

export function MfaSetupView(p: { secret: string; otpauthUri: string; code: string; onCode: Change; busy: boolean; error: string | null; onBack: () => void }) {
  return (
    <>
      <h1 style={titleStyle}>Ative a verificação em dois fatores</h1>
      <p style={bodyStyle}>O painel exige um app autenticador (Google Authenticator, Microsoft Authenticator, 1Password ou similar).</p>
      <ol className="login-steps">
        <li>Abra o app autenticador e adicione uma conta pelo QR code.</li>
        <li>Se não conseguir ler o QR, digite a chave abaixo.</li>
        <li>Digite o código de 6 dígitos que aparecer no app.</li>
      </ol>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <QrCode value={p.otpauthUri} />
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ font: 'var(--type-label)', marginBottom: 6 }}>Chave</div>
          <code data-testid="mfa-secret" style={{ font: '600 13px/1.5 var(--font-mono)', wordBreak: 'normal', overflowWrap: 'anywhere', color: 'var(--text-primary)' }}>{groupSecret(p.secret)}</code>
        </div>
      </div>
      <OtpInput value={p.code} onChange={p.onCode} label="Código de 6 dígitos" error={!!p.error} testId="mfa-setup-code" />
      <LoginError message={p.error} />
      <Button size="lg" fullWidth type="submit" disabled={p.busy || p.code.length < 6} testId="mfa-setup-submit">
        {p.busy ? 'Ativando...' : 'Ativar e entrar'}
      </Button>
      <Button variant="ghost" fullWidth onClick={p.onBack}>Voltar</Button>
    </>
  );
}

export function ForgotRequestView(p: { email: string; onEmail: Change; busy: boolean; error: string | null; onBack: () => void }) {
  return (
    <>
      <h1 style={titleStyle}>Esqueci minha senha</h1>
      <p style={bodyStyle}>Informe seu e-mail. Se ele tiver acesso ao painel, enviaremos um código para criar uma senha nova.</p>
      <Input label="E-mail" type="email" name="email" autoComplete="username" inputMode="email" icon="Mail" value={p.email} onChange={onText(p.onEmail)} testId="forgot-email" autoFocus />
      <LoginError message={p.error} />
      <Button size="lg" fullWidth type="submit" disabled={p.busy || !p.email.trim()} testId="forgot-submit">
        {p.busy ? 'Enviando...' : 'Enviar código'}
      </Button>
      <Button variant="ghost" fullWidth onClick={p.onBack}>Voltar para o login</Button>
    </>
  );
}

export function ForgotConfirmView(p: {
  code: string;
  password: string;
  confirm: string;
  onCode: Change;
  onPassword: Change;
  onConfirm: Change;
  busy: boolean;
  error: string | null;
  onResend: () => void;
  onBack: () => void;
}) {
  const mismatch = p.confirm.length > 0 && p.confirm !== p.password;
  return (
    <>
      <h1 style={titleStyle}>Crie uma senha nova</h1>
      <p style={bodyStyle}>Se o e-mail tiver acesso ao painel, você vai receber um código de 6 dígitos. Ele vale por 1 hora.</p>
      <OtpInput value={p.code} onChange={p.onCode} autoFocus label="Código do e-mail" testId="forgot-code" />
      <Input label="Nova senha" type="password" name="new-password" autoComplete="new-password" icon="Lock" value={p.password} onChange={onText(p.onPassword)} testId="forgot-password" />
      <PasswordRules password={p.password} />
      <Input label="Repita a nova senha" type="password" name="confirm-password" autoComplete="new-password" icon="Lock" value={p.confirm} onChange={onText(p.onConfirm)} testId="forgot-password-confirm"
        error={mismatch ? 'As senhas não são iguais.' : undefined} />
      <LoginError message={p.error} />
      <Button size="lg" fullWidth type="submit" disabled={p.busy || p.code.length < 6 || !p.password || p.password !== p.confirm} testId="forgot-confirm-submit">
        {p.busy ? 'Salvando...' : 'Salvar senha nova'}
      </Button>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <LinkButton onClick={p.onBack}>Voltar para o login</LinkButton>
        <LinkButton onClick={p.onResend} testId="forgot-resend">Reenviar código</LinkButton>
      </div>
    </>
  );
}

/** Painel escuro da esquerda (UI kit admin, LoginView): símbolo "Roda" + "volti", título e linha de apoio do kit. */
export function LoginBrand() {
  return (
    <div className="login-brand" data-testid="login-brand">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, font: '800 32px/1 var(--font-sans)', letterSpacing: '-.045em', color: 'var(--green-400)' }}>
        <LogoMark size={40} color="var(--green-400)" />
        volti
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ font: '800 48px/1.05 var(--font-sans)', letterSpacing: '-.03em', maxWidth: 420, color: '#fff' }}>Painel de operação</div>
      <div style={{ font: 'var(--type-body)', color: 'rgba(255,255,255,.6)', marginTop: 12, maxWidth: 380 }}>Frota, clientes e finanças em tempo real. Acesso restrito à equipe.</div>
    </div>
  );
}

/** Marca compacta acima do formulário quando o painel da esquerda some (telas estreitas). */
export function LoginMobileBrand() {
  return (
    <div className="login-mobile-brand" style={{ alignItems: 'center', gap: 8, font: '800 24px/1 var(--font-sans)', letterSpacing: '-.045em', color: 'var(--text-brand)' }}>
      <LogoMark size={30} color="var(--brand)" />
      volti
    </div>
  );
}
