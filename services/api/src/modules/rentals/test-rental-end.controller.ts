import { Body, Controller, Inject, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Idempotent } from '../../common/idempotency/idempotency.interceptor';
import { notFound } from '../../common/problem';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { CurrentUser, CustomerOnly, Principal } from '../auth/principal';
import { RentalEndService } from './rental-end.service';
import { EndRentalDto } from './rentals.dto';

/**
 * endRentalTest — encerramento de teste fora do ponto verde. Só é registrado com `ALLOW_TEST_HANDOVER=true`
 * (`TestHandoverModule`); fora disso a rota é 404. Reaproveita o `RentalEndService.end` inteiro (dono, status, troca aberta,
 * foto, `ending`, bloqueio seguro com confirmação, liquidação) e pula só a conferência da zona de devolução.
 */
@Controller('rentals')
export class TestRentalEndController {
  constructor(
    private readonly ender: RentalEndService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  @Post(':id/test-end')
  @CustomerOnly()
  @Idempotent({ required: false })
  async end(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndRentalDto,
    @CurrentUser() user: Principal,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Defesa em profundidade: registrado por engano com a flag desligada, responde como rota inexistente.
    if (this.cfg.allowTestHandover !== true) throw notFound();
    const r = await this.ender.end(user.customerId!, id, { returnPhotoObjectKey: dto.returnPhotoObjectKey }, { allowOutsideZone: true });
    res.status(r.status);
    return r.rental;
  }
}
