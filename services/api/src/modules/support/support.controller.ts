import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, CustomerOnly, CustomerOrStaff, Principal, StaffOnly } from '../auth/principal';
import { UploadRequestDto } from '../rentals/rentals.dto';
import {
  ClaimCreateDto, ClaimUpdateDto, ConversationCreateDto, ConversationUpdateDto, DisputeCreateDto, DisputeResolveDto, IncidentCreateDto, IncidentUpdateDto,
  ListClaimsQuery, ListConversationsQuery, ListDisputesQuery, ListIncidentsQuery, ListMessagesQuery, MessageCreateDto,
} from './support.dto';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post('uploads')
  @CustomerOrStaff('admin', 'suporte', 'operacao')
  upload(@Body() dto: UploadRequestDto, @CurrentUser() u: Principal) {
    return this.support.upload(u, dto.contentType);
  }

  @Get('incidents')
  @CustomerOrStaff('admin', 'operacao', 'suporte')
  listIncidents(@Query() q: ListIncidentsQuery, @CurrentUser() u: Principal) {
    return this.support.listIncidents(u, q);
  }

  @Post('incidents')
  @CustomerOrStaff('admin', 'operacao', 'suporte')
  createIncident(@Body() dto: IncidentCreateDto, @CurrentUser() u: Principal) {
    return this.support.createIncident(u, dto);
  }

  @Get('incidents/:id')
  @CustomerOrStaff('admin', 'operacao', 'suporte')
  getIncident(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.support.getIncident(u, id);
  }

  @Patch('incidents/:id')
  @StaffOnly('admin', 'operacao', 'suporte')
  updateIncident(@Param('id', ParseUUIDPipe) id: string, @Body() dto: IncidentUpdateDto) {
    return this.support.updateIncident(id, dto);
  }

  @Get('disputes')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  listDisputes(@Query() q: ListDisputesQuery, @CurrentUser() u: Principal) {
    return this.support.listDisputes(u, q);
  }

  @Post('disputes')
  @CustomerOnly()
  createDispute(@Body() dto: DisputeCreateDto, @CurrentUser() u: Principal) {
    return this.support.createDispute(u, dto);
  }

  @Get('disputes/:id')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  getDispute(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.support.getDispute(u, id);
  }

  @Post('disputes/:id/resolve')
  @HttpCode(200)
  @StaffOnly('admin', 'financeiro', 'suporte')
  resolveDispute(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DisputeResolveDto, @CurrentUser() u: Principal) {
    return this.support.resolveDispute(u, id, dto);
  }

  @Get('claims')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  listClaims(@Query() q: ListClaimsQuery, @CurrentUser() u: Principal) {
    return this.support.listClaims(u, q);
  }

  @Post('claims')
  @CustomerOnly()
  createClaim(@Body() dto: ClaimCreateDto, @CurrentUser() u: Principal) {
    return this.support.createClaim(u, dto);
  }

  @Get('claims/:id')
  @CustomerOrStaff('admin', 'financeiro', 'suporte')
  getClaim(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: Principal) {
    return this.support.getClaim(u, id);
  }

  @Patch('claims/:id')
  @StaffOnly('admin', 'financeiro', 'suporte')
  updateClaim(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ClaimUpdateDto, @CurrentUser() u: Principal) {
    return this.support.updateClaim(u, id, dto);
  }

  @Get('conversations')
  @CustomerOrStaff('admin', 'suporte')
  listConversations(@Query() q: ListConversationsQuery, @CurrentUser() u: Principal) {
    return this.support.listConversations(u, q);
  }

  @Post('conversations')
  @CustomerOnly()
  createConversation(@Body() dto: ConversationCreateDto, @CurrentUser() u: Principal) {
    return this.support.createConversation(u, dto);
  }

  @Patch('conversations/:id')
  @CustomerOrStaff('admin', 'suporte')
  updateConversation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConversationUpdateDto, @CurrentUser() u: Principal) {
    return this.support.updateConversation(u, id, dto);
  }

  @Get('conversations/:id/messages')
  @CustomerOrStaff('admin', 'suporte')
  listMessages(@Param('id', ParseUUIDPipe) id: string, @Query() q: ListMessagesQuery, @CurrentUser() u: Principal) {
    return this.support.listMessages(u, id, q);
  }

  @Post('conversations/:id/messages')
  @CustomerOrStaff('admin', 'suporte')
  sendMessage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MessageCreateDto, @CurrentUser() u: Principal) {
    return this.support.sendMessage(u, id, dto);
  }
}
