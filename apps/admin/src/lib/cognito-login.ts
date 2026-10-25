import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
  type IAuthenticationCallback,
  type ICognitoStorage,
} from 'amazon-cognito-identity-js';
import { isPoolConfigured, type StaffPoolConfig } from './cognito-revoke';

export { cognitoEndpoint, regionOf, revokeRefreshToken, type StaffPoolConfig } from './cognito-revoke';

/**
 * Login próprio do painel no pool interno do Cognito (`USER_SRP_AUTH`): a senha nunca sai do navegador, só a prova SRP.
 * Fala direto com a API pública do Cognito (`cognito-idp.<região>.amazonaws.com`), sem endpoint novo na API da Volti.
 * Desafios tratados: NEW_PASSWORD_REQUIRED, SOFTWARE_TOKEN_MFA e MFA_SETUP (TOTP). Nada aqui grava log.
 */

export interface StaffTokens {
  accessToken: string;
  refreshToken: string;
}

export type SignInStep =
  | { kind: 'signedIn'; tokens: StaffTokens }
  | { kind: 'newPassword' }
  | { kind: 'totp' }
  | { kind: 'mfaSetup'; secret: string; otpauthUri: string };

// ───────────── Política de senha do pool interno ─────────────

/** Espelha `passwordPolicy` do StaffPool em `infra/lib/stacks/auth-stack.ts` (12+, maiúscula, minúscula, número, símbolo). */
export const STAFF_PASSWORD_RULES: { id: string; label: string; test: (p: string) => boolean }[] = [
  { id: 'length', label: 'Pelo menos 12 caracteres', test: (p) => p.length >= 12 },
  { id: 'upper', label: 'Uma letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Uma letra minúscula', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Um número', test: (p) => /[0-9]/.test(p) },
  { id: 'symbol', label: 'Um símbolo (por exemplo ! @ # $ %)', test: (p) => /[\^$*.[\]{}()?"!@#%&/\\,><':;|_~`=+\- ]/.test(p) },
];

export function passwordMeetsPolicy(p: string): boolean {
  return STAFF_PASSWORD_RULES.every((r) => r.test(p));
}

// ───────────── Erros em pt-BR ─────────────

export type LoginErrorKind =
  | 'credentials'
  | 'disabled'
  | 'too-many'
  | 'code'
  | 'weak-password'
  | 'network'
  | 'session-expired'
  | 'reset-required'
  | 'temp-expired'
  | 'delivery'
  | 'config'
  | 'unknown';

export const LOGIN_ERROR_MESSAGES: Record<LoginErrorKind, string> = {
  credentials: 'E-mail ou senha incorretos.',
  disabled: 'Este acesso está desativado. Fale com um administrador.',
  'too-many': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  code: 'Código inválido ou expirado. Confira e tente de novo.',
  'weak-password': 'A senha não atende às regras do painel.',
  network: 'Sem conexão com o servidor de login. Verifique a internet e tente de novo.',
  'session-expired': 'O tempo para concluir o login acabou. Comece de novo.',
  'reset-required': 'Sua senha precisa ser redefinida. Use "Esqueci minha senha".',
  'temp-expired': 'A senha temporária expirou. Peça um novo convite a um administrador.',
  delivery: 'Não foi possível enviar o código por e-mail. Tente de novo em instantes.',
  config: 'Login indisponível: o painel está sem a configuração do Cognito.',
  unknown: 'Não foi possível entrar agora. Tente de novo.',
};

export class LoginError extends Error {
  readonly kind: LoginErrorKind;
  constructor(kind: LoginErrorKind) {
    super(LOGIN_ERROR_MESSAGES[kind]);
    this.kind = kind;
    this.name = 'LoginError';
  }
}

/** Traduz o erro do Cognito (ou da rede) sem revelar se o e-mail existe e sem carregar a mensagem original adiante. */
export function toLoginError(err: unknown): LoginError {
  if (err instanceof LoginError) return err;
  const e = (err ?? {}) as { code?: string; name?: string; message?: string };
  const code = e.code || e.name || '';
  const msg = (e.message || '').toLowerCase();
  if (err instanceof TypeError || msg === 'network error' || code === 'NetworkError') return new LoginError('network');
  switch (code) {
    case 'NotAuthorizedException':
      if (msg.includes('disabled')) return new LoginError('disabled');
      if (msg.includes('attempts exceeded')) return new LoginError('too-many');
      if (msg.includes('session')) return new LoginError('session-expired');
      if (msg.includes('temporary password')) return new LoginError('temp-expired');
      return new LoginError('credentials');
    case 'UserNotFoundException':
    case 'UserNotConfirmedException':
      return new LoginError('credentials');
    case 'PasswordResetRequiredException':
      return new LoginError('reset-required');
    case 'TooManyRequestsException':
    case 'TooManyFailedAttemptsException':
    case 'LimitExceededException':
      return new LoginError('too-many');
    case 'CodeMismatchException':
    case 'ExpiredCodeException':
    case 'EnableSoftwareTokenMFAException':
      return new LoginError('code');
    case 'InvalidPasswordException':
      return new LoginError('weak-password');
    case 'CodeDeliveryFailureException':
      return new LoginError('delivery');
    case 'InvalidParameterException':
      if (msg.includes('password')) return new LoginError('weak-password');
      if (msg.includes('code')) return new LoginError('code');
      return new LoginError('unknown');
    default:
      return new LoginError('unknown');
  }
}

// ───────────── Cliente ─────────────

/** Armazenamento em memória: a biblioteca não grava nada no navegador; os tokens vão só para o token-store do painel. */
class MemoryStorage implements ICognitoStorage {
  private data = new Map<string, string>();
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
}

function poolFor(cfg: StaffPoolConfig): { pool: CognitoUserPool; storage: ICognitoStorage } {
  if (!isPoolConfigured(cfg)) throw new LoginError('config');
  const storage = new MemoryStorage();
  return { pool: new CognitoUserPool({ UserPoolId: cfg.userPoolId, ClientId: cfg.clientId, Storage: storage }), storage };
}

function tokensOf(session: CognitoUserSession): StaffTokens {
  return { accessToken: session.getAccessToken().getJwtToken(), refreshToken: session.getRefreshToken().getToken() };
}

/** URI `otpauth://` do TOTP para o QR do app autenticador (Google Authenticator, 1Password, Authy...). */
export function otpauthUri(secret: string, email: string): string {
  const label = encodeURIComponent(`Volti:${email}`);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=Volti`;
}

export const TOTP_DEVICE_NAME = 'Painel Volti';

/** Uma tentativa de login, do e-mail e senha até os tokens, passando pelos desafios do pool. */
export class StaffSignIn {
  private user: CognitoUser | null = null;
  private email = '';

  constructor(private readonly cfg: StaffPoolConfig) {}

  start(email: string, password: string): Promise<SignInStep> {
    return this.run((cb) => {
      const { pool, storage } = poolFor(this.cfg);
      this.email = email.trim();
      this.user = new CognitoUser({ Username: this.email, Pool: pool, Storage: storage });
      this.user.setAuthenticationFlowType('USER_SRP_AUTH');
      this.user.authenticateUser(new AuthenticationDetails({ Username: this.email, Password: password }), cb);
    });
  }

  /** NEW_PASSWORD_REQUIRED: troca a senha temporária pela definitiva. */
  completeNewPassword(newPassword: string): Promise<SignInStep> {
    if (!passwordMeetsPolicy(newPassword)) return Promise.reject(new LoginError('weak-password'));
    return this.run((cb) => this.current().completeNewPasswordChallenge(newPassword, {}, cb));
  }

  /** SOFTWARE_TOKEN_MFA: código de 6 dígitos do app autenticador. */
  submitTotp(code: string): Promise<SignInStep> {
    return this.run((cb) => this.current().sendMFACode(code, cb, 'SOFTWARE_TOKEN_MFA'));
  }

  /** MFA_SETUP: confirma o primeiro código do app recém-cadastrado (VerifySoftwareToken) e conclui o login. */
  verifyMfaSetup(code: string): Promise<SignInStep> {
    return new Promise<SignInStep>((resolve, reject) => {
      try {
        this.current().verifySoftwareToken(code, TOTP_DEVICE_NAME, {
          onSuccess: (session: CognitoUserSession) => resolve({ kind: 'signedIn', tokens: tokensOf(session) }),
          onFailure: (err: unknown) => reject(toLoginError(err)),
        });
      } catch (err) {
        reject(toLoginError(err));
      }
    });
  }

  private current(): CognitoUser {
    if (!this.user) throw new LoginError('session-expired');
    return this.user;
  }

  private run(start: (cb: IAuthenticationCallback) => void): Promise<SignInStep> {
    return new Promise<SignInStep>((resolve, reject) => {
      const fail = (err: unknown) => reject(toLoginError(err));
      const cb: IAuthenticationCallback = {
        onSuccess: (session) => resolve({ kind: 'signedIn', tokens: tokensOf(session) }),
        onFailure: fail,
        newPasswordRequired: () => resolve({ kind: 'newPassword' }),
        totpRequired: () => resolve({ kind: 'totp' }),
        // O pool interno só tem TOTP; se o Cognito perguntar o tipo, a resposta é sempre o app autenticador.
        selectMFAType: () => this.current().sendMFASelectionAnswer('SOFTWARE_TOKEN_MFA', cb),
        mfaSetup: () =>
          this.current().associateSoftwareToken({
            associateSecretCode: (secret: string) => resolve({ kind: 'mfaSetup', secret, otpauthUri: otpauthUri(secret, this.email) }),
            onFailure: fail,
          }),
        mfaRequired: () => fail(new LoginError('unknown')),
        customChallenge: () => fail(new LoginError('unknown')),
      };
      try {
        start(cb);
      } catch (err) {
        fail(err);
      }
    });
  }
}

// ───────────── Esqueci minha senha ─────────────

function userFor(cfg: StaffPoolConfig, email: string): CognitoUser {
  const { pool, storage } = poolFor(cfg);
  return new CognitoUser({ Username: email.trim(), Pool: pool, Storage: storage });
}

/** ForgotPassword: o Cognito manda o código por e-mail. Com `preventUserExistenceErrors`, responde igual se o e-mail não existir. */
export function requestPasswordReset(cfg: StaffPoolConfig, email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      userFor(cfg, email).forgotPassword({
        onSuccess: () => resolve(),
        inputVerificationCode: () => resolve(),
        onFailure: (err: unknown) => reject(toLoginError(err)),
      });
    } catch (err) {
      reject(toLoginError(err));
    }
  });
}

/** ConfirmForgotPassword: código do e-mail + senha nova. */
export function confirmPasswordReset(cfg: StaffPoolConfig, email: string, code: string, newPassword: string): Promise<void> {
  if (!passwordMeetsPolicy(newPassword)) return Promise.reject(new LoginError('weak-password'));
  return new Promise((resolve, reject) => {
    try {
      userFor(cfg, email).confirmPassword(code.trim(), newPassword, {
        onSuccess: () => resolve(),
        onFailure: (err: unknown) => reject(toLoginError(err)),
      });
    } catch (err) {
      reject(toLoginError(err));
    }
  });
}
