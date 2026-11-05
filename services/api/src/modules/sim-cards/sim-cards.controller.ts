import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { CreateSimCardDto, ListSimCardsQuery, UpdateSimCardDto } from './sim-cards.dto';
import { SimCardsService } from './sim-cards.service';

@Controller('sim-cards')
export class SimCardsController {
  constructor(private readonly simCards: SimCardsService) {}

  /** listSimCards */
  @Get()
  @StaffOnly('admin', 'operacao', 'suporte')
  list(@Query() q: ListSimCardsQuery) {
    return this.simCards.list(q);
  }

  /** createSimCard */
  @Post()
  @StaffOnly('admin')
  create(@Body() dto: CreateSimCardDto, @CurrentUser() user: Principal) {
    return this.simCards.create(dto, user);
  }

  /** updateSimCard */
  @Patch(':id')
  @StaffOnly('admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSimCardDto, @CurrentUser() user: Principal) {
    return this.simCards.update(id, dto, user);
  }
}
