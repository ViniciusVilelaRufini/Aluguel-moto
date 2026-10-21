import { Logger } from '@nestjs/common';
import type { ModuleRef } from '@nestjs/core';
import type { PrismaClient } from '@prisma/client';
import { OPEN_RENTAL_STATUSES } from '../../common/enums';
import { CommandsService } from '../commands/commands.service';
import type { Clock } from './clock';
import type { CommandContext, GeofenceCommander, RentalLookup } from './geofence/geofence.service';

const GEOFENCE_ACTOR = { system: true as const, name: 'geofence' };

/**
 * Ações do motor de cercas como comandos de sistema (`CommandsService.dispatch`): cria o `VehicleCommand`, grava o AuditLog e
 * chama o `IotGateway`. Não espera a confirmação (o desfecho chega por `iot.command-updated`), para não segurar a fila da moto.
 * `CommandsService` é resolvido sob demanda (ModuleRef) porque o `CommandsModule` depende do `IOT_GATEWAY` deste módulo.
 */
export class CommandsGeofenceCommander implements GeofenceCommander {
  private readonly logger = new Logger('GeofenceCommander');

  constructor(private readonly moduleRef: ModuleRef) {}

  private fire(vehicleId: string, input: Parameters<CommandsService['dispatch']>[0]): void {
    void this.moduleRef
      .get(CommandsService, { strict: false })
      .dispatch(input)
      .catch((err: Error) => this.logger.error({ msg: 'geofence_command_failed', vehicleId, type: input.type, error: err.message }));
  }

  async setSpeedLimit(vehicleId: string, kmh: number, ctx: CommandContext): Promise<void> {
    this.fire(vehicleId, {
      vehicleId,
      type: 'speed_limit',
      speedLimitKmh: kmh,
      reason: kmh >= 32 ? 'Saída de zona de velocidade reduzida' : `Zona de velocidade reduzida (${kmh} km/h)`,
      actor: GEOFENCE_ACTOR,
      context: { rentalId: ctx.rentalId, purpose: ctx.purpose },
      auditAction: 'vehicle.zone_speed_limit',
    });
  }

  async safeLock(vehicleId: string, ctx: CommandContext): Promise<void> {
    this.fire(vehicleId, {
      vehicleId,
      type: 'lock',
      reason: 'Fora da área de operação por mais de 5 minutos',
      actor: GEOFENCE_ACTOR,
      context: { rentalId: ctx.rentalId, purpose: ctx.purpose },
      auditAction: 'vehicle.out_of_area_lock',
    });
  }
}

/** Aluguel em andamento da moto, com cache curto (invalidado por `rental.changed`). */
export class PrismaRentalLookup implements RentalLookup {
  private readonly cache = new Map<string, { rentalId?: string; at: number }>();

  constructor(
    private readonly prisma: Pick<PrismaClient, 'rental'>,
    private readonly clock: Clock,
    private readonly ttlMs = 5_000,
  ) {}

  async openRentalId(vehicleId: string): Promise<string | undefined> {
    const hit = this.cache.get(vehicleId);
    if (hit && this.clock.now() - hit.at < this.ttlMs) return hit.rentalId;
    const r = await this.prisma.rental.findFirst({ where: { vehicleId, status: { in: OPEN_RENTAL_STATUSES } }, select: { id: true } });
    this.cache.set(vehicleId, { rentalId: r?.id, at: this.clock.now() });
    return r?.id;
  }

  invalidate(vehicleId?: string): void {
    if (vehicleId) this.cache.delete(vehicleId);
    else this.cache.clear();
  }
}
