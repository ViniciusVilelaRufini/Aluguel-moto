import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma, type TrackerConsoleCommand } from '@prisma/client';
import { EV, type TrackerConsoleEvent } from '../../common/events';
import { badRequest, conflict, notFound } from '../../common/problem';
import { IOT_GATEWAY, type IotGateway } from '../../ports/iot-gateway.port';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { Principal } from '../auth/principal';
import { classifyConsoleText } from './console-policy';
import { parseStatusReport } from './status-report';
import type { SendTrackerConsoleDto } from './tracker-console.dto';

/** Pendente há mais que isso vira `failed`/`timeout` (verificado ao listar e ao enviar; sem cron). */
export const CONSOLE_PENDING_TTL_MS = 90_000;
/** A resposta do aparelho não tem limite no schema MQTT: guarda só o começo. */
export const CONSOLE_RESPONSE_MAX = 1000;

const FAIL_REASON = { offline: 'offline', timeout: 'timeout', erro: 'error' } as const;

/** `TrackerConsoleCommand` do contrato. `statusReport` só quando a resposta é de `STATUS#`. */
export function toTrackerConsoleCommand(r: TrackerConsoleCommand) {
  const isStatus = r.text.trim().toUpperCase() === 'STATUS#';
  return {
    id: r.id,
    vehicleId: r.vehicleId,
    text: r.text,
    risk: r.risk,
    status: r.status,
    failReason: r.failReason,
    response: r.response,
    statusReport: isStatus && r.response ? parseStatusReport(r.response) : null,
    requestedById: r.requestedById,
    createdAt: r.createdAt.toISOString(),
    respondedAt: r.respondedAt ? r.respondedAt.toISOString() : null,
  };
}

/** Console de comandos de texto do rastreador J16 (GT06, `relay_only`). Logs só com ids; nunca texto/resposta. */
@Injectable()
export class TrackerConsoleService {
  private readonly logger = new Logger('TrackerConsoleService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IOT_GATEWAY) private readonly iot: IotGateway,
  ) {}

  async send(vehicleId: string, dto: SendTrackerConsoleDto, actor: Principal) {
    const policy = classifyConsoleText(dto.text);
    if (!policy.ok) throw badRequest(policy.reason);
    if (policy.risk !== 'read' && dto.confirm !== true) throw badRequest('Este comando altera o rastreador: confirme o envio (confirm: true).');

    const tracker = await this.prisma.tracker.findUnique({ where: { vehicleId } });
    if (!tracker) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
      if (!vehicle) throw notFound('Moto não encontrada.');
      throw conflict('conflict', 'A moto não tem rastreador.');
    }
    if (tracker.controlMode !== 'relay_only' || !tracker.imei) throw conflict('conflict', 'O console só está disponível para rastreador só relé (GT06) com IMEI.');

    const created = await this.prisma.$transaction(async (tx) => {
      // Serializa envios da mesma moto (um `pending` por moto).
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`tracker-console:${vehicleId}`}))`);
      await this.expireStale(tx, vehicleId);
      const pending = await tx.trackerConsoleCommand.findFirst({ where: { vehicleId, status: 'pending' }, select: { id: true } });
      if (pending) throw conflict('conflict', 'Já existe um comando em andamento para esta moto; aguarde a resposta.');
      const row = await tx.trackerConsoleCommand.create({
        data: { vehicleId, trackerId: tracker.id, thingName: tracker.thingName, text: policy.text, risk: policy.risk, requestedById: actor.userId },
      });
      // Sem o texto no audit (pode carregar servidor/APN).
      await this.audit.record({ actor, action: 'tracker_console.send', entityType: 'TrackerConsoleCommand', entityId: row.id, metadata: { risk: policy.risk, keyword: policy.keyword } }, tx);
      return row;
    });

    try {
      await this.iot.publishConsole(tracker.thingName, created.id, policy.text);
    } catch (err) {
      this.logger.error({ msg: 'tracker_console_publish_failed', commandId: created.id, thingName: tracker.thingName, error: (err as Error).message });
      const failed = await this.prisma.trackerConsoleCommand.update({ where: { id: created.id }, data: { status: 'failed', failReason: 'error', respondedAt: new Date() } });
      return toTrackerConsoleCommand(failed);
    }
    this.logger.log({ msg: 'tracker_console_sent', commandId: created.id, thingName: tracker.thingName, risk: policy.risk });
    return toTrackerConsoleCommand(created);
  }

  async list(vehicleId: string, limit: number) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true } });
    if (!vehicle) throw notFound('Moto não encontrada.');
    await this.expireStale(this.prisma, vehicleId);
    const rows = await this.prisma.trackerConsoleCommand.findMany({ where: { vehicleId }, orderBy: { createdAt: 'desc' }, take: limit });
    return { items: rows.map(toTrackerConsoleCommand) };
  }

  /** Encerra (atomicamente, só se ainda `pending`) a resposta ou falha vinda do rastreador. Desconhecido/encerrado: ignorado. */
  async onDeviceEvent(ev: TrackerConsoleEvent): Promise<void> {
    const data: Prisma.TrackerConsoleCommandUpdateManyMutationInput =
      ev.kind === 'resposta'
        ? { status: 'answered', response: (ev.texto ?? '').slice(0, CONSOLE_RESPONSE_MAX), respondedAt: new Date() }
        : { status: 'failed', failReason: FAIL_REASON[ev.motivo ?? 'erro'] ?? 'error', respondedAt: new Date() };
    const { count } = await this.prisma.trackerConsoleCommand.updateMany({ where: { id: ev.comandoId, thingName: ev.thingName, status: 'pending' }, data });
    this.logger.log({ msg: 'tracker_console_event', commandId: ev.comandoId, thingName: ev.thingName, kind: ev.kind, applied: count > 0 });
  }

  @OnEvent(EV.TRACKER_CONSOLE_EVENT, { async: true, promisify: true })
  async handleDeviceEvent(ev: TrackerConsoleEvent): Promise<void> {
    await this.onDeviceEvent(ev).catch((err: Error) => this.logger.error({ msg: 'tracker_console_event_failed', commandId: ev.comandoId, thingName: ev.thingName, error: err.message }));
  }

  private async expireStale(db: Pick<PrismaService, 'trackerConsoleCommand'>, vehicleId: string): Promise<void> {
    const now = Date.now();
    await db.trackerConsoleCommand.updateMany({
      where: { vehicleId, status: 'pending', createdAt: { lt: new Date(now - CONSOLE_PENDING_TTL_MS) } },
      data: { status: 'failed', failReason: 'timeout', respondedAt: new Date(now) },
    });
  }
}
