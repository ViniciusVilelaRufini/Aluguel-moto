import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ForgotConfirmView,
  ForgotRequestView,
  groupSecret,
  LoginBrand,
  MfaSetupView,
  NewPasswordView,
  PasswordRules,
  SignInView,
  TotpView,
} from '@/components/login/LoginViews';
import { otpauthUri } from '@/lib/cognito-login';

const noop = () => {};
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('telas do login próprio (modo cognito)', () => {
  it('entrar: e-mail, senha, esqueci a senha e nenhuma dica de 2FA antes do desafio', () => {
    const html = renderToStaticMarkup(
      <SignInView email="" password="" onEmail={noop} onPassword={noop} busy={false} error={null} onForgot={noop} />,
    );
    expect(html).toContain('data-testid="login-email"');
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="current-password"');
    expect(text(html)).toContain('Esqueci minha senha');
    expect(text(html)).not.toMatch(/2FA|autenticador/);
    expect(text(html)).not.toContain('Entrar com a conta Volti');
    // Sem e-mail e senha o botão fica desabilitado.
    expect(html).toMatch(/<button type="submit" disabled=""[^>]*data-testid="login-submit"/);
  });

  it('entrar: mostra o erro e o aviso de senha alterada', () => {
    const html = renderToStaticMarkup(
      <SignInView email="a@b.co" password="x" onEmail={noop} onPassword={noop} busy={false} error="E-mail ou senha incorretos." notice="Senha alterada. Entre com a senha nova." onForgot={noop} />,
    );
    expect(html).toContain('data-testid="login-error"');
    expect(text(html)).toContain('E-mail ou senha incorretos.');
    expect(text(html)).toContain('Senha alterada.');
    expect(html).not.toMatch(/<button type="submit" disabled=""/);
  });

  it('primeiro acesso: regras da política e senhas diferentes', () => {
    const html = renderToStaticMarkup(
      <NewPasswordView password="Abcdefghijk1!" confirm="outra" onPassword={noop} onConfirm={noop} busy={false} error={null} onBack={noop} />,
    );
    const t = text(html);
    expect(t).toContain('Crie sua senha');
    for (const rule of ['Pelo menos 12 caracteres', 'Uma letra maiúscula', 'Uma letra minúscula', 'Um número', 'Um símbolo']) expect(t).toContain(rule);
    expect(t).toContain('As senhas não são iguais.');
    expect(html).toMatch(/<button type="submit" disabled=""[^>]*data-testid="new-password-submit"/);
  });

  it('regras marcam o que a senha já cumpre', () => {
    const html = renderToStaticMarkup(<PasswordRules password="abc" />);
    expect(html.match(/data-ok="true"/g)).toHaveLength(1); // só a minúscula
    const all = renderToStaticMarkup(<PasswordRules password="Abcdefghijk1!" />);
    expect(all).not.toContain('data-ok="false"');
  });

  it('TOTP: a dica do app autenticador aparece só no desafio', () => {
    const t = text(renderToStaticMarkup(<TotpView code="12" onCode={noop} busy={false} error={null} onBack={noop} />));
    expect(t).toContain('Verificação em dois fatores');
    expect(t).toContain('app autenticador');
  });

  it('MFA_SETUP: QR code do otpauth e chave em grupos de 4', () => {
    const uri = otpauthUri('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', 'a@b.co');
    const html = renderToStaticMarkup(
      <MfaSetupView secret="JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" otpauthUri={uri} code="" onCode={noop} busy={false} error={null} onBack={noop} />,
    );
    expect(html).toContain('data-testid="mfa-qr"');
    expect(html).toMatch(/<path d="M\d+ \d+h1v1h-1z/);
    expect(text(html)).toContain('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP');
    expect(text(html)).toContain('Ative a verificação em dois fatores');
    expect(groupSecret('ABCDEFGHI')).toBe('ABCD EFGH I');
  });

  it('esqueci a senha: pedido e confirmação com código e senha nova', () => {
    const req = text(renderToStaticMarkup(<ForgotRequestView email="" onEmail={noop} busy={false} error={null} onBack={noop} />));
    expect(req).toContain('Enviar código');
    // Não revela se o e-mail existe.
    expect(req).toContain('Se ele tiver acesso ao painel');
    const conf = renderToStaticMarkup(
      <ForgotConfirmView code="123456" password="Abcdefghijk1!" confirm="Abcdefghijk1!" onCode={noop} onPassword={noop} onConfirm={noop} busy={false} error={null} onResend={noop} onBack={noop} />,
    );
    expect(text(conf)).toContain('Reenviar código');
    expect(conf).toContain('data-testid="password-rules"');
    expect(conf).not.toMatch(/<button type="submit" disabled=""/);
  });

  it('painel da marca: símbolo Roda + volti e textos do UI kit', () => {
    const html = renderToStaticMarkup(<LoginBrand />);
    expect(html).toContain('<svg');
    expect(html).toContain('<polyline points="62,64 90,124 120,52"');
    const t = text(html);
    expect(t).toContain('volti');
    expect(t).toContain('Painel de operação');
    expect(t).toContain('Frota, clientes e finanças em tempo real. Acesso restrito à equipe.');
  });
});
