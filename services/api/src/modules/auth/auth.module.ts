import { DynamicModule, Module } from '@nestjs/common';
import { DevTokenController } from './dev-token.controller';
import { MeController } from './me.controller';

@Module({})
export class AuthModule {
  /** O emissor `POST /dev/token` só é registrado com `AUTH_MODE=dev`. */
  static register(): DynamicModule {
    // QA-15: nunca em produção (o loadConfig já recusa AUTH_MODE=dev com NODE_ENV=production; aqui é a segunda trava).
    const dev = (process.env.AUTH_MODE ?? 'dev') === 'dev' && process.env.NODE_ENV !== 'production';
    return { module: AuthModule, controllers: dev ? [DevTokenController, MeController] : [MeController] };
  }
}
