import { DynamicModule, Module } from '@nestjs/common';
import { DevTokenController } from './dev-token.controller';
import { MeController } from './me.controller';

@Module({})
export class AuthModule {
  /** O emissor `POST /dev/token` só é registrado com `AUTH_MODE=dev`. */
  static register(): DynamicModule {
    const dev = (process.env.AUTH_MODE ?? 'dev') === 'dev';
    return { module: AuthModule, controllers: dev ? [DevTokenController, MeController] : [MeController] };
  }
}
