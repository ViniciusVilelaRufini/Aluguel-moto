import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmPasswordReset,
  LoginError,
  LOGIN_ERROR_MESSAGES,
  otpauthUri,
  passwordMeetsPolicy,
  requestPasswordReset,
  revokeRefreshToken,
  StaffSignIn,
  toLoginError,
} from '@/lib/cognito-login';

/**
 * Cognito simulado na fronteira HTTP: cada chamada da biblioteca (SRP) e do painel vira um POST para
 * https://cognito-idp.sa-east-1.amazonaws.com/ com `X-Amz-Target`. Os cenários respondem por operação, em ordem.
 */

const CFG = { userPoolId: 'sa-east-1_N6canrhbI', clientId: 'client-test' };
const EMAIL = 'pessoa@volti.app';
const PASSWORD = 'Senha-Secreta-123';
const STRONG = 'Nova-Senha-Forte-9';

interface Call {
  url: string;
  target: string;
  body: Record<string, any>;
  raw: string;
}
type Reply = { status?: number; json: unknown } | Error;

let calls: Call[] = [];
let script: Record<string, Reply[]> = {};

function b64(o: unknown) {
  return Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '');
}
function jwt(payload: Record<string, unknown>) {
  return `${b64({ alg: 'RS256', kid: 'k' })}.${b64(payload)}.c2ln`;
}
const now = () => Math.floor(Date.now() / 1000);
const AUTH_RESULT = {
  AuthenticationResult: {
    AccessToken: jwt({ sub: 'u-1', 'cognito:groups': ['admin'], exp: now() + 3600, iat: now(), token_use: 'access' }),
    IdToken: jwt({ sub: 'u-1', exp: now() + 3600, iat: now(), token_use: 'id' }),
    RefreshToken: 'refresh-token-opaco',
    ExpiresIn: 3600,
    TokenType: 'Bearer',
  },
};

function randomHex(bytes: number) {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString('hex');
}
const PASSWORD_VERIFIER = () => ({
  json: {
    ChallengeName: 'PASSWORD_VERIFIER',
    Session: 'sessao-1',
    ChallengeParameters: {
      SRP_B: randomHex(384),
      SALT: randomHex(16),
      SECRET_BLOCK: Buffer.from('bloco-secreto').toString('base64'),
      USER_ID_FOR_SRP: 'uuid-do-usuario',
      USERNAME: 'uuid-do-usuario',
    },
  },
});
const challenge = (name: string, params: Record<string, string> = {}) => ({ json: { ChallengeName: name, Session: `sessao-${name}`, ChallengeParameters: params } });
const fail = (type: string, message: string, status = 400) => ({ status, json: { __type: type, message } });

function on(target: string, ...replies: Reply[]) {
  (script[target] ??= []).push(...replies);
}

beforeEach(() => {
  calls = [];
  script = {};
  vi.stubGlobal('fetch', async (url: string, init: { headers: Record<string, string>; body: string }) => {
    const target = String(init.headers['X-Amz-Target']).replace('AWSCognitoIdentityProviderService.', '');
    calls.push({ url: String(url), target, body: JSON.parse(init.body), raw: init.body });
    const reply = script[target]?.shift();
    if (!reply) throw new Error(`chamada inesperada: ${target}`);
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.json), { status: reply.status ?? 200, headers: { 'Content-Type': 'application/x-amz-json-1.1' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

function bodies(target: string) {
  return calls.filter((c) => c.target === target).map((c) => c.body);
}

describe('login com e-mail e senha (USER_SRP_AUTH)', () => {
  it('entra direto quando o pool não pede desafio, sem a senha sair do navegador', async () => {
    on('InitiateAuth', PASSWORD_VERIFIER());
    on('RespondToAuthChallenge', { json: AUTH_RESULT });
    const step = await new StaffSignIn(CFG).start(` ${EMAIL} `, PASSWORD);
    expect(step).toEqual({ kind: 'signedIn', tokens: { accessToken: AUTH_RESULT.AuthenticationResult.AccessToken, refreshToken: 'refresh-token-opaco' } });

    expect(calls.every((c) => c.url === 'https://cognito-idp.sa-east-1.amazonaws.com/')).toBe(true);
    const [init] = bodies('InitiateAuth');
    expect(init.AuthFlow).toBe('USER_SRP_AUTH');
    expect(init.ClientId).toBe('client-test');
    expect(init.AuthParameters.USERNAME).toBe(EMAIL);
    expect(init.AuthParameters.SRP_A).toMatch(/^[0-9a-f]{500,}$/);
    const [verifier] = bodies('RespondToAuthChallenge');
    expect(verifier.ChallengeName).toBe('PASSWORD_VERIFIER');
    expect(verifier.Session).toBe('sessao-1');
    expect(verifier.ChallengeResponses.USERNAME).toBe('uuid-do-usuario');
    expect(verifier.ChallengeResponses.PASSWORD_CLAIM_SIGNATURE).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    expect(verifier.ChallengeResponses.PASSWORD_CLAIM_SECRET_BLOCK).toBe(Buffer.from('bloco-secreto').toString('base64'));
    // A senha nunca vai em texto em nenhuma chamada.
    for (const c of calls) expect(c.raw).not.toContain(PASSWORD);
  });

  it('NEW_PASSWORD_REQUIRED: pede a senha nova, recusa senha fraca sem chamar o Cognito e entra com a forte', async () => {
    on('InitiateAuth', PASSWORD_VERIFIER());
    on('RespondToAuthChallenge', challenge('NEW_PASSWORD_REQUIRED', { userAttributes: JSON.stringify({ email: EMAIL }), requiredAttributes: '[]' }), { json: AUTH_RESULT });
    const s = new StaffSignIn(CFG);
    expect(await s.start(EMAIL, 'Temporaria-1')).toEqual({ kind: 'newPassword' });

    await expect(s.completeNewPassword('fraca')).rejects.toMatchObject({ kind: 'weak-password' });
    expect(bodies('RespondToAuthChallenge')).toHaveLength(1);

    const done = await s.completeNewPassword(STRONG);
    expect(done.kind).toBe('signedIn');
    const resp = bodies('RespondToAuthChallenge')[1];
    expect(resp.ChallengeName).toBe('NEW_PASSWORD_REQUIRED');
    expect(resp.Session).toBe('sessao-NEW_PASSWORD_REQUIRED');
    expect(resp.ChallengeResponses.NEW_PASSWORD).toBe(STRONG);
  });

  it('senha fraca recusada pelo pool vira mensagem de política', async () => {
    on('InitiateAuth', PASSWORD_VERIFIER());
    on('RespondToAuthChallenge', challenge('NEW_PASSWORD_REQUIRED', { userAttributes: '{}', requiredAttributes: '[]' }),
      fail('InvalidPasswordException', 'Password does not conform to policy: Password not long enough'));
    const s = new StaffSignIn(CFG);
    await s.start(EMAIL, 'Temporaria-1');
    await expect(s.completeNewPassword(STRONG)).rejects.toMatchObject({ kind: 'weak-password', message: LOGIN_ERROR_MESSAGES['weak-password'] });
  });

  it('SOFTWARE_TOKEN_MFA: código errado mostra erro e o certo entra', async () => {
    on('InitiateAuth', PASSWORD_VERIFIER());
    on('RespondToAuthChallenge', challenge('SOFTWARE_TOKEN_MFA'), fail('CodeMismatchException', 'Invalid code received for user'), { json: AUTH_RESULT });
    const s = new StaffSignIn(CFG);
    expect(await s.start(EMAIL, PASSWORD)).toEqual({ kind: 'totp' });
    await expect(s.submitTotp('000000')).rejects.toMatchObject({ kind: 'code' });
    const done = await s.submitTotp('123456');
    expect(done.kind).toBe('signedIn');
    const last = bodies('RespondToAuthChallenge').at(-1)!;
    expect(last.ChallengeName).toBe('SOFTWARE_TOKEN_MFA');
    expect(last.ChallengeResponses.SOFTWARE_TOKEN_MFA_CODE).toBe('123456');
    expect(last.Session).toBe('sessao-SOFTWARE_TOKEN_MFA');
  });

  it('SOFTWARE_TOKEN_MFA com sessão expirada pede para começar de novo', async () => {
    on('InitiateAuth', PASSWORD_VERIFIER());
    on('RespondToAuthChallenge', challenge('SOFTWARE_TOKEN_MFA'), fail('NotAuthorizedException', 'Invalid session for the user, session is expired.'));
    const s = new StaffSignIn(CFG);
    await s.start(EMAIL, PASSWORD);
    await expect(s.submitTotp('123456')).rejects.toMatchObject({ kind: 'session-expired' });
  });

  it('MFA_SETUP (primeiro acesso no prod): senha nova, QR do TOTP, VerifySoftwareToken e entra', async () => {
    on('InitiateAuth', PASSWORD_VERIFIER());
    on('RespondToAuthChallenge',
      challenge('NEW_PASSWORD_REQUIRED', { userAttributes: '{}', requiredAttributes: '[]' }),
      challenge('MFA_SETUP', { MFAS_CAN_SETUP: '["SOFTWARE_TOKEN_MFA"]' }),
      { json: AUTH_RESULT });
    on('AssociateSoftwareToken', { json: { SecretCode: 'JBSWY3DPEHPK3PXP', Session: 'sessao-associada' } });
    on('VerifySoftwareToken', fail('EnableSoftwareTokenMFAException', 'Code mismatch'), { json: { Status: 'SUCCESS', Session: 'sessao-verificada' } });

    const s = new StaffSignIn(CFG);
    expect(await s.start(EMAIL, 'Temporaria-1')).toEqual({ kind: 'newPassword' });
    const setup = await s.completeNewPassword(STRONG);
    expect(setup).toEqual({ kind: 'mfaSetup', secret: 'JBSWY3DPEHPK3PXP', otpauthUri: otpauthUri('JBSWY3DPEHPK3PXP', EMAIL) });
    expect(bodies('AssociateSoftwareToken')[0]).toEqual({ Session: 'sessao-MFA_SETUP' });

    await expect(s.verifyMfaSetup('111111')).rejects.toMatchObject({ kind: 'code' });
    const done = await s.verifyMfaSetup('654321');
    expect(done.kind).toBe('signedIn');
    const verify = bodies('VerifySoftwareToken')[1];
    expect(verify).toMatchObject({ UserCode: '654321', FriendlyDeviceName: 'Painel Volti' });
    const last = bodies('RespondToAuthChallenge').at(-1)!;
    expect(last).toMatchObject({ ChallengeName: 'MFA_SETUP', Session: 'sessao-verificada', ClientId: 'client-test' });
  });

  it('otpauth com emissor Volti e e-mail no rótulo', () => {
    expect(otpauthUri('ABC', 'a@b.co')).toBe('otpauth://totp/Volti%3Aa%40b.co?secret=ABC&issuer=Volti');
  });
});

describe('erros em pt-BR', () => {
  async function failWith(reply: Reply) {
    on('InitiateAuth', reply);
    return new StaffSignIn(CFG).start(EMAIL, PASSWORD).then(
      () => { throw new Error('deveria falhar'); },
      (e: LoginError) => e,
    );
  }

  it('senha errada e usuário inexistente dão a mesma mensagem', async () => {
    const wrong = await failWith(fail('NotAuthorizedException', 'Incorrect username or password.'));
    const missing = await failWith(fail('UserNotFoundException', 'User does not exist.'));
    expect(wrong).toBeInstanceOf(LoginError);
    expect(wrong.message).toBe('E-mail ou senha incorretos.');
    expect(missing.message).toBe(wrong.message);
  });

  it('senha errada na prova SRP (segunda chamada)', async () => {
    on('InitiateAuth', PASSWORD_VERIFIER());
    on('RespondToAuthChallenge', fail('NotAuthorizedException', 'Incorrect username or password.'));
    await expect(new StaffSignIn(CFG).start(EMAIL, PASSWORD)).rejects.toMatchObject({ kind: 'credentials' });
  });

  it.each([
    [fail('NotAuthorizedException', 'User is disabled.'), 'disabled', 'Este acesso está desativado. Fale com um administrador.'],
    [fail('NotAuthorizedException', 'Password attempts exceeded'), 'too-many', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    [fail('TooManyRequestsException', 'Too many requests'), 'too-many', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    [fail('LimitExceededException', 'Attempt limit exceeded, please try after some time.'), 'too-many', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    [fail('PasswordResetRequiredException', 'Password reset required for the user'), 'reset-required', 'Sua senha precisa ser redefinida. Use "Esqueci minha senha".'],
    [fail('NotAuthorizedException', 'Temporary password has expired and must be reset by an administrator.'), 'temp-expired', 'A senha temporária expirou. Peça um novo convite a um administrador.'],
    [fail('InternalErrorException', 'boom', 500), 'unknown', 'Não foi possível entrar agora. Tente de novo.'],
    [new TypeError('Failed to fetch'), 'network', 'Sem conexão com o servidor de login. Verifique a internet e tente de novo.'],
  ] as const)('%#: %s', async (reply, kind, message) => {
    const e = await failWith(reply as Reply);
    expect(e).toMatchObject({ kind, message });
  });

  it('a mensagem original do Cognito não vaza para a tela', () => {
    const e = toLoginError({ code: 'NotAuthorizedException', message: 'Incorrect username or password for pessoa@volti.app' });
    expect(e.message).not.toContain('@');
  });

  it('sem configuração do pool não chama a rede', async () => {
    await expect(new StaffSignIn({ userPoolId: '', clientId: '' }).start(EMAIL, PASSWORD)).rejects.toMatchObject({ kind: 'config' });
    expect(calls).toHaveLength(0);
  });
});

describe('esqueci minha senha', () => {
  it('ForgotPassword manda o código e ConfirmForgotPassword grava a senha nova', async () => {
    on('ForgotPassword', { json: { CodeDeliveryDetails: { DeliveryMedium: 'EMAIL', Destination: 'p***@v***' } } });
    on('ConfirmForgotPassword', { json: {} });
    await requestPasswordReset(CFG, ` ${EMAIL} `);
    expect(bodies('ForgotPassword')[0]).toMatchObject({ ClientId: 'client-test', Username: EMAIL });
    await confirmPasswordReset(CFG, EMAIL, ' 123456 ', STRONG);
    expect(bodies('ConfirmForgotPassword')[0]).toMatchObject({ ClientId: 'client-test', Username: EMAIL, ConfirmationCode: '123456', Password: STRONG });
  });

  it('senha nova fraca é recusada antes da rede', async () => {
    await expect(confirmPasswordReset(CFG, EMAIL, '123456', 'curta')).rejects.toMatchObject({ kind: 'weak-password' });
    expect(calls).toHaveLength(0);
  });

  it('código errado ou expirado', async () => {
    on('ConfirmForgotPassword', fail('CodeMismatchException', 'Invalid verification code provided, please try again.'));
    on('ConfirmForgotPassword', fail('ExpiredCodeException', 'Invalid code provided, please request a code again.'));
    await expect(confirmPasswordReset(CFG, EMAIL, '000000', STRONG)).rejects.toMatchObject({ kind: 'code', message: 'Código inválido ou expirado. Confira e tente de novo.' });
    await expect(confirmPasswordReset(CFG, EMAIL, '000000', STRONG)).rejects.toMatchObject({ kind: 'code' });
  });

  it('muitas tentativas de envio do código', async () => {
    on('ForgotPassword', fail('LimitExceededException', 'Attempt limit exceeded, please try after some time.'));
    await expect(requestPasswordReset(CFG, EMAIL)).rejects.toMatchObject({ kind: 'too-many' });
  });
});

describe('logout', () => {
  it('RevokeToken com o refresh token e o client do painel', async () => {
    on('RevokeToken', { json: {} });
    expect(await revokeRefreshToken(CFG, 'refresh-token-opaco')).toBe(true);
    expect(calls[0]).toMatchObject({ url: 'https://cognito-idp.sa-east-1.amazonaws.com/', target: 'RevokeToken', body: { Token: 'refresh-token-opaco', ClientId: 'client-test' } });
  });

  it('falha de rede no RevokeToken não trava o logout', async () => {
    on('RevokeToken', new TypeError('Failed to fetch'));
    expect(await revokeRefreshToken(CFG, 'r')).toBe(false);
  });
});

describe('política de senha do pool interno', () => {
  it.each([
    ['Curta-1a', false],
    ['semmaiuscula-123', false],
    ['SEMMINUSCULA-123', false],
    ['SemNumero-abcdef', false],
    ['SemSimbolo12345', false],
    [STRONG, true],
  ])('%s -> %s', (p, ok) => expect(passwordMeetsPolicy(p)).toBe(ok));
});
