import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { DEV_TOKEN_TTL_SECONDS, DevAuthVerifier } from '../../adapters/auth/dev-auth-verifier';
import { AUTH_VERIFIER, type AuthVerifier } from '../../ports/auth-verifier.port';
import { DevTokenRequestDto } from './auth.dto';
import { Public } from './principal';

/** `POST /dev/token` — registrado **somente** com `AUTH_MODE=dev` (em produção a rota não existe → 404). */
@Controller('dev')
export class DevTokenController {
  constructor(@Inject(AUTH_VERIFIER) private readonly verifier: AuthVerifier) {}

  @Post('token')
  @HttpCode(200)
  @Public()
  async issue(@Body() dto: DevTokenRequestDto) {
    const dev = this.verifier as DevAuthVerifier;
    const accessToken = await dev.issue({ sub: dto.sub, email: dto.email, groups: dto.pool === 'staff' ? dto.groups : [], pool: dto.pool });
    return { accessToken, tokenType: 'Bearer', expiresIn: DEV_TOKEN_TTL_SECONDS };
  }
}
