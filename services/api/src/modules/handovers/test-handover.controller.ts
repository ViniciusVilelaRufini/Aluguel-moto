import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser, CustomerOnly, Principal } from '../auth/principal';
import { TestHandoverService } from './test-handover.service';

/** createTestHandover — só existe com `ALLOW_TEST_HANDOVER=true` (ver `TestHandoverModule`); fora disso a rota é 404. */
@Controller('reservations')
export class TestHandoverController {
  constructor(private readonly testHandovers: TestHandoverService) {}

  @Post(':id/test-handover')
  @CustomerOnly()
  create(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Principal) {
    return this.testHandovers.create(user, id);
  }
}
