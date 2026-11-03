import { DynamicModule, Module } from '@nestjs/common';
import { authModeConfig } from '../../config/env';
import { DevTokenController } from './dev-token.controller';
import { MeController } from './me.controller';

@Module({})
export class AuthModule {
  /** O emissor `POST /dev/token` só é registrado com `AUTH_MODE=dev`. */
  static register(): DynamicModule {
    // QA-15: nunca em produção (o loadConfig já recusa AUTH_MODE=dev com NODE_ENV=production; aqui é a segunda trava).
    // Auditoria run-4 (onda 2): a mesma normalização do loadConfig (AUTH_MODE vazio = dev; inválido recusa), não o env cru.
    const cfg = authModeConfig();
    const dev = cfg.authMode === 'dev' && cfg.nodeEnv !== 'production';
    return { module: AuthModule, controllers: dev ? [DevTokenController, MeController] : [MeController] };
  }
}
