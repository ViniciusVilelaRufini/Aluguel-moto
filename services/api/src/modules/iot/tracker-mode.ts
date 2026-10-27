import type { PrismaClient } from '@prisma/client';
import type { TrackerControlMode } from '../../ports/iot-gateway.port';
import type { Clock } from './clock';

export type { TrackerControlMode };
export const TRACKER_MODES = Symbol('TRACKER_MODES');

/** Tipo do rastreador da moto (cercas e monitor de velocidade por zona). Sem `Tracker` = `speed_control`. */
export interface TrackerModeLookup {
  byVehicle(vehicleId: string): Promise<TrackerControlMode>;
  invalidate(vehicleId?: string): void;
}

/** `Tracker.controlMode` com cache curto (muda só pelo provisionamento). Erro de leitura propaga: quem chama decide a falha segura. */
export class PrismaTrackerModeLookup implements TrackerModeLookup {
  private readonly cache = new Map<string, { mode: TrackerControlMode; at: number }>();

  constructor(
    private readonly prisma: Pick<PrismaClient, 'tracker'>,
    private readonly clock: Clock,
    private readonly ttlMs = 60_000,
  ) {}

  async byVehicle(vehicleId: string): Promise<TrackerControlMode> {
    const hit = this.cache.get(vehicleId);
    if (hit && this.clock.now() - hit.at < this.ttlMs) return hit.mode;
    const t = await this.prisma.tracker.findUnique({ where: { vehicleId }, select: { controlMode: true } });
    const mode: TrackerControlMode = t?.controlMode ?? 'speed_control';
    this.cache.set(vehicleId, { mode, at: this.clock.now() });
    return mode;
  }

  invalidate(vehicleId?: string): void {
    if (vehicleId) this.cache.delete(vehicleId);
    else this.cache.clear();
  }
}
