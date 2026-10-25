import { Controller, Get, Param, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Public } from '../auth/principal';
import { LocationShareService, PUBLIC_SHARE_HEADERS, sharePageHtml, type SharedLocation } from './location-share.service';

/**
 * Link público do SOS (sem autenticação, rate limit por IP). `PUBLIC_SHARE_BASE_URL` aponta para `/share` desta API, que
 * serve a página; a página lê a rota JSON relativa (`../public/location-shares/{token}`).
 */
@Controller()
export class LocationShareController {
  constructor(private readonly shares: LocationShareService) {}

  @Get('public/location-shares/:token')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async get(@Param('token') token: string, @Res({ passthrough: true }) res: Response): Promise<SharedLocation> {
    res.set(PUBLIC_SHARE_HEADERS);
    return this.shares.get(token);
  }

  @Get('share/:token')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  page(@Param('token') token: string, @Res() res: Response): void {
    const nonce = randomBytes(16).toString('base64');
    res.set({
      ...PUBLIC_SHARE_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      // A CSP global da API (só JSON) é `default-src 'none'`; a página precisa do próprio script/estilo e do fetch para a API.
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    });
    res.status(200).send(sharePageHtml(token, nonce));
  }
}
