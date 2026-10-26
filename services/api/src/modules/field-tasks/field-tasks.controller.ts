import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Idempotent } from '../../common/idempotency/idempotency.interceptor';
import { CurrentUser, Principal, StaffOnly } from '../auth/principal';
import { UploadRequestDto } from '../rentals/rentals.dto';
import { BatterySwapDto, FieldTaskCompleteDto, FieldTaskCreateDto, FieldTaskUpdateDto, InspectionDto, ListFieldTasksQuery } from './field-tasks.dto';
import { FieldTasksService } from './field-tasks.service';

/** `uploads` (literal) declarado antes de `:id`. */
@Controller('field-tasks')
export class FieldTasksController {
  constructor(private readonly tasks: FieldTasksService) {}

  @Get()
  @StaffOnly('admin', 'operacao', 'campo')
  list(@Query() q: ListFieldTasksQuery, @CurrentUser() u: Principal) {
    return this.tasks.list(u, q);
  }

  @Post()
  @StaffOnly('admin', 'operacao')
  create(@Body() dto: FieldTaskCreateDto, @CurrentUser() u: Principal) {
    return this.tasks.create(u, dto);
  }

  @Post('uploads')
  @StaffOnly('admin', 'operacao', 'campo')
  upload(@Body() dto: UploadRequestDto, @CurrentUser() u: Principal) {
    return this.tasks.upload(u, dto.contentType);
  }

  @Get(':id')
  @StaffOnly('admin', 'operacao', 'campo')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.tasks.get(u, id);
  }

  @Patch(':id')
  @StaffOnly('admin', 'operacao')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FieldTaskUpdateDto) {
    return this.tasks.update(id, dto);
  }

  @Post(':id/start')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao', 'campo')
  start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.tasks.start(u, id);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @StaffOnly('admin', 'operacao', 'campo')
  @Idempotent({ required: false })
  complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FieldTaskCompleteDto, @CurrentUser() u: Principal) {
    return this.tasks.complete(u, id, dto);
  }

  @Post(':id/inspection')
  @StaffOnly('admin', 'operacao', 'campo')
  @Idempotent({ required: false })
  inspection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InspectionDto,
    @CurrentUser() u: Principal,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.tasks.submitInspection(u, id, dto, key);
  }

  @Post(':id/battery-swap')
  @StaffOnly('admin', 'operacao', 'campo')
  @Idempotent({ required: false })
  batterySwap(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BatterySwapDto,
    @CurrentUser() u: Principal,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.tasks.submitBatterySwap(u, id, dto, key);
  }
}
