import { FINANCIAL_ALERT_TYPES } from '../alerts/alerts.service';
import { corsOptions } from '../../common/cors';
import { Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { OPEN_RENTAL_STATUSES, type VehicleStatus } from '../../common/enums';
import {
  AlertCreatedEvent, CommandChangedEvent, EV, GeofenceTransitionEvent, HandoverPendingEvent, HandoverUpdatedEvent, IotDeviceEvent, IotTelemetryEvent,
  PaymentUpdatedEvent, RentalChangedEvent, PrincipalRevokedEvent, StationSwapUpdatedEvent, VehicleStatusChangedEvent,
} from '../../common/events';
import { AUTH_VERIFIER, type AuthVerifier } from '../../ports/auth-verifier.port';
import { PrismaService } from '../../prisma/prisma.service';
import type { Principal } from '../auth/principal';
import { PrincipalResolver } from '../auth/principal-resolver.service';
import { toRental } from '../rentals/rentals.mapper';

const FLEET_GROUPS = ['admin', 'operacao', 'suporte'];
/** Salas de `alert.created` (Task 14): mesmo escopo de `alertScope` (alerts.service.ts). */
const ALERT_OPS_GROUPS = ['admin', 'operacao', 'suporte'];
const ALERT_FINANCE_GROUPS = ['admin', 'suporte', 'financeiro'];
const ALERT_OPS_ROOM = 'alerts:ops';
const ALERT_FINANCE_ROOM = 'alerts:finance';
/** Staff que acompanha as entregas dos galpões (salas `depot:{id}`, todos os galpões). */
const DEPOT_GROUPS = ['admin', 'operacao', 'campo'];
/**
 * Validade do cache de status/aluguel por moto. Com várias instâncias, a invalidação por `rental.changed` só acontece na
 * instância que processou a mudança; nas outras o cache expira sozinho (15 s: posição do aluguel novo chega em até 15 s).
 */
const VEHICLE_CACHE_MS = 15_000;

interface VehicleCache {
  status: VehicleStatus;
  speedLimitKmh: number;
  rentalId?: string;
  at: number;
}

export function zoneMessage(ev: Pick<GeofenceTransitionEvent, 'zoneType' | 'transition' | 'speedLimitKmh'>): string {
  const enter = ev.transition === 'ENTER';
  switch (ev.zoneType) {
    case 'reduced_speed':
      if (!enter) return 'Você saiu da área de velocidade reduzida.';
      return ev.speedLimitKmh !== undefined && ev.speedLimitKmh <= 6
        ? `Você entrou numa área de pedestres. Velocidade máxima: ${ev.speedLimitKmh} km/h.`
        : `Você entrou numa ciclovia. Velocidade máxima: ${ev.speedLimitKmh ?? 20} km/h.`;
    case 'forbidden':
      return enter ? 'Área proibida para motos. Saia da área para continuar.' : 'Você saiu da área proibida.';
    case 'operation':
      return enter ? 'Você voltou para a área de operação.' : 'Você saiu da área de operação. Volte em até 5 minutos para evitar o bloqueio da moto.';
    case 'return':
      return enter ? 'Você está numa zona de devolução. Já pode encerrar o aluguel.' : 'Você saiu da zona de devolução.';
  }
}

/** Socket.IO `/realtime` (packages/contracts/realtime.md): salas `fleet` e `rental:{id}`; servidor → cliente apenas. */
@WebSocketGateway({ namespace: '/realtime', cors: corsOptions() })
export class RealtimeGateway implements OnGatewayInit {
  private readonly logger = new Logger('RealtimeGateway');
  private readonly vehicles = new Map<string, VehicleCache>();

  @WebSocketServer()
  server: Namespace;

  constructor(
    @Inject(AUTH_VERIFIER) private readonly verifier: AuthVerifier,
    private readonly resolver: PrincipalResolver,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Namespace): void {
    server.use((socket, next) => {
      void this.authenticate(socket)
        .then(() => next())
        .catch(() => next(new Error('unauthorized')));
    });
  }

  private async authenticate(socket: Socket): Promise<void> {
    const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
    if (!token) throw new Error('unauthorized');
    const principal: Principal = await this.resolver.resolve(await this.verifier.verify(token));
    socket.data.principal = principal;
    // Sala do próprio usuário: revogação (conta excluída, grupo removido, desativado) desconecta os sockets dele.
    await socket.join(`principal:${principal.pool}:${principal.userId}`);
    if (principal.pool === 'staff') {
      if (principal.groups.some((g) => FLEET_GROUPS.includes(g))) await socket.join('fleet');
      // Task 14 (fix round 1, M3): alertas seguem o escopo de `GET /alerts` (alertScope): operacionais para admin/operação/
      // suporte; de pagamento para admin/suporte/financeiro.
      if (principal.groups.some((g) => ALERT_OPS_GROUPS.includes(g))) await socket.join(ALERT_OPS_ROOM);
      if (principal.groups.some((g) => ALERT_FINANCE_GROUPS.includes(g))) await socket.join(ALERT_FINANCE_ROOM);
      if (principal.groups.some((g) => DEPOT_GROUPS.includes(g))) {
        const depots = await this.prisma.depot.findMany({ select: { id: true } });
        if (depots.length) await socket.join(depots.map((d) => `depot:${d.id}`));
      }
      return;
    }
    await socket.join(`user:${principal.customerId}`);
    // Entrega no galpão (`handover.*`): só eventos da própria entrega, sem posição (LGPD).
    await socket.join(`customer:${principal.customerId}`);
    const rental = await this.prisma.rental.findFirst({ where: { customerId: principal.customerId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
    if (rental) await socket.join(`rental:${rental.id}`);
  }

  private async vehicleInfo(vehicleId: string): Promise<VehicleCache | null> {
    const cached = this.vehicles.get(vehicleId);
    if (cached && Date.now() - cached.at < VEHICLE_CACHE_MS) return cached;
    const v = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { status: true, speedLimitKmh: true } });
    if (!v) return null;
    const r = await this.prisma.rental.findFirst({ where: { vehicleId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true, speedLimitKmh: true } });
    const info: VehicleCache = { status: v.status, speedLimitKmh: r?.speedLimitKmh ?? v.speedLimitKmh, rentalId: r?.id, at: Date.now() };
    this.vehicles.set(vehicleId, info);
    return info;
  }

  /**
   * Fix round 1: acesso revogado → desconecta os sockets do usuário; o app reconecta e passa de novo pela autenticação
   * (conta excluída → recusada; staff → salas pelos grupos atuais). Com o adaptador Redis (lacunas T5), vale para os sockets
   * do usuário em todas as instâncias.
   */
  @OnEvent(EV.PRINCIPAL_REVOKED)
  onPrincipalRevoked(ev: PrincipalRevokedEvent): void {
    this.server?.in(`principal:${ev.pool}:${ev.userId}`).disconnectSockets(true);
  }

  @OnEvent(EV.IOT_TELEMETRY, { async: true, promisify: true })
  async onTelemetry(ev: IotTelemetryEvent): Promise<void> {
    if (!this.server) return;
    const info = await this.vehicleInfo(ev.vehicleId);
    if (!info) return;
    const payload = { vehicleId: ev.vehicleId, lat: ev.lat, lng: ev.lng, speedKmh: ev.speedKmh, batteryPct: ev.batteryPct, status: info.status, speedLimitKmh: info.speedLimitKmh, ts: ev.ts };
    this.server.to('fleet').emit('vehicle.position', payload);
    if (info.rentalId) this.server.to(`rental:${info.rentalId}`).emit('vehicle.position', payload);
  }

  @OnEvent(EV.VEHICLE_STATUS_CHANGED)
  onVehicleStatus(ev: VehicleStatusChangedEvent): void {
    const cached = this.vehicles.get(ev.vehicleId);
    if (cached) cached.status = ev.status;
    this.server?.to('fleet').emit('vehicle.status', { vehicleId: ev.vehicleId, status: ev.status, ts: ev.ts });
  }

  @OnEvent(EV.COMMAND_CHANGED)
  onCommand(ev: CommandChangedEvent): void {
    const payload: Record<string, unknown> = { commandId: ev.commandId, vehicleId: ev.vehicleId, type: ev.type, status: ev.status };
    if (ev.reason) payload.reason = ev.reason;
    this.server?.to('fleet').emit('command.updated', payload);
  }

  @OnEvent(EV.ALERT_CREATED)
  onAlert(ev: AlertCreatedEvent): void {
    const room = (FINANCIAL_ALERT_TYPES as readonly string[]).includes(ev.type) ? ALERT_FINANCE_ROOM : ALERT_OPS_ROOM;
    this.server?.to(room).emit('alert.created', JSON.parse(JSON.stringify(ev)));
  }

  @OnEvent(EV.RENTAL_CHANGED)
  onRental(ev: RentalChangedEvent): void {
    this.vehicles.delete(ev.vehicleId);
    if (!this.server) return;
    const room = `rental:${ev.rentalId}`;
    const open = OPEN_RENTAL_STATUSES.includes(ev.status);
    if (open) this.server.in(`user:${ev.customerId}`).socketsJoin(room);
    this.server.to(room).emit('rental.updated', { rentalId: ev.rentalId, status: ev.status, elapsedSeconds: ev.elapsedSeconds, costCents: ev.costCents, ts: ev.ts });
    if (!open) this.server.in(room).socketsLeave(room);
  }

  /** Pagamento ligado a um aluguel (ex.: liquidação) → `rental.updated` na sala do aluguel com o custo atual. */
  @OnEvent(EV.PAYMENT_UPDATED, { async: true, promisify: true })
  async onPaymentUpdated(ev: PaymentUpdatedEvent): Promise<void> {
    if (!ev.rentalId || !this.server) return;
    const rental = await this.prisma.rental.findUnique({ where: { id: ev.rentalId } });
    if (!rental) return;
    const mapped = toRental(rental);
    this.server.to(`rental:${rental.id}`).emit('rental.updated', {
      rentalId: rental.id, status: rental.status, elapsedSeconds: mapped.elapsedSeconds, costCents: mapped.costCents, ts: new Date().toISOString(),
    });
  }

  @OnEvent(EV.GEOFENCE_TRANSITION, { async: true, promisify: true })
  async onGeofence(ev: GeofenceTransitionEvent): Promise<void> {
    const rentalId = ev.rentalId ?? (await this.vehicleInfo(ev.vehicleId))?.rentalId;
    if (ev.zoneType === 'reduced_speed') this.vehicles.delete(ev.vehicleId);
    if (!rentalId || !this.server) return;
    const payload: Record<string, unknown> = { rentalId, zoneType: ev.zoneType, transition: ev.transition, message: zoneMessage(ev) };
    if (ev.speedLimitKmh !== undefined) payload.speedLimitKmh = ev.speedLimitKmh;
    this.server.to(`rental:${rentalId}`).emit('zone.notice', payload);
  }

  @OnEvent(EV.HANDOVER_PENDING)
  onHandoverPending(ev: HandoverPendingEvent): void {
    const payload = { handoverId: ev.handoverId, reservationId: ev.reservationId };
    this.server?.to(`customer:${ev.customerId}`).emit('handover.pending', payload);
    this.server?.to(`depot:${ev.depotId}`).emit('handover.pending', payload);
  }

  @OnEvent(EV.HANDOVER_UPDATED)
  onHandoverUpdated(ev: HandoverUpdatedEvent): void {
    const payload: Record<string, unknown> = { handoverId: ev.handoverId, status: ev.status };
    if (ev.lastError) payload.lastError = ev.lastError;
    if (ev.customerId) this.server?.to(`customer:${ev.customerId}`).emit('handover.updated', payload);
    this.server?.to(`depot:${ev.depotId}`).emit('handover.updated', payload);
  }

  /** Troca de bateria na estação: só o dono (sala `customer:{id}`), sem posição nem número de série. */
  @OnEvent(EV.STATION_SWAP_UPDATED)
  onStationSwapUpdated(ev: StationSwapUpdatedEvent): void {
    this.server?.to(`customer:${ev.customerId}`).emit('station_swap.updated', { swapId: ev.swapId, status: ev.status });
  }

  @OnEvent(EV.IOT_DEVICE_EVENT, { async: true, promisify: true })
  async onDeviceEvent(ev: IotDeviceEvent): Promise<void> {
    if (ev.type !== 'queda' || !this.server) return;
    const rentalId = (await this.vehicleInfo(ev.vehicleId))?.rentalId;
    if (rentalId) this.server.to(`rental:${rentalId}`).emit('device.event', { rentalId, type: 'queda', ts: ev.ts });
  }
}
