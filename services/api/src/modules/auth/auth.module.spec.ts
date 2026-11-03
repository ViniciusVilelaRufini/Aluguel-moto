import { AuthModule } from './auth.module';
import { DevTokenController } from './dev-token.controller';

/** Auditoria run-4 (onda 2): o registro do `POST /dev/token` segue a config normalizada (`loadConfig().authMode`). */
describe('AuthModule.register', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('AUTH_MODE vazio vale como dev (mesmo padrão do loadConfig): registra o emissor local fora de produção', () => {
    process.env.AUTH_MODE = '';
    process.env.NODE_ENV = 'test';
    expect(AuthModule.register().controllers).toContain(DevTokenController);
  });

  it('AUTH_MODE=cognito: sem emissor local', () => {
    process.env.AUTH_MODE = 'cognito';
    process.env.NODE_ENV = 'test';
    expect(AuthModule.register().controllers).not.toContain(DevTokenController);
  });

  it('AUTH_MODE inválido: recusa como o loadConfig (não cai em silêncio num modo)', () => {
    process.env.AUTH_MODE = 'devv';
    expect(() => AuthModule.register()).toThrow(/AUTH_MODE inválido/);
  });
});
