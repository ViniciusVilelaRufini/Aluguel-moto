import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { SwapStationInputDto, SwapStationUpdateDto } from './swap-stations.dto';
import { SwapStationsService } from './swap-stations.service';

/**
 * Cadastro das estações de troca no painel (admin, operacao). A leitura pública (`GET /swap-stations`) fica no catálogo;
 * as trocas e o QR (`/swap-stations/{id}/swaps`, `/qr`) no módulo das trocas. Rota literal `registry` não colide com `:id`
 * (só há `PATCH :id`).
 */
@Controller('swap-stations')
export class SwapStationsAdminController {
  constructor(private readonly stations: SwapStationsService) {}

  @Get('registry')
  @StaffOnly('admin', 'operacao')
  list() {
    return this.stations.list();
  }

  @Post()
  @StaffOnly('admin', 'operacao')
  create(@Body() dto: SwapStationInputDto, @CurrentUser() u: Principal) {
    return this.stations.create(u, dto);
  }

  @Patch(':id')
  @StaffOnly('admin', 'operacao')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SwapStationUpdateDto, @CurrentUser() u: Principal) {
    return this.stations.update(u, id, dto);
  }
}
