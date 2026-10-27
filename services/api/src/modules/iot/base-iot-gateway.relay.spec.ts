import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, IotCommandUpdatedEvent } from '../../common/events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import { LiveStateStore } from './live-state.store';
import type { DesiredState, IotTransport, MomentaryCommand } from './shadow-transport';
import { TelemetryService } from './telemetry.service';

class FakeTransport implements IotTransport {
  readonly desired: Array<{ at: number; desired: DesiredState }> = [];
  readonly commands: MomentaryCommand[] = [];
  constructor(private readonly clock: FakeClock) {}
  async updateDesired(_t: string, desired: DesiredState) {
    this.desired.push({ at: this.clock.now(), desired });
  }
  async publishCommand(_t: string, command: MomentaryCommand) {
    this.commands.push(command);
  }
  async start() {}
  async stop() {}
}
class TestGateway extends BaseIotGateway {}

const T = 'moto-0901';
const VEHICLE_ID = '99999999-9999-4999-8999-999999999999';

function setup() {
  const clock = new FakeClock(Date.parse('2026-10-27T12:00:00Z'));
  const transport = new FakeTransport(clock);
  const events = new EventEmitter2();
  const updates: IotCommandUpdatedEvent[] = [];
  events.on(EV.IOT_COMMAND_UPDATED, (e: IotCommandUpdatedEvent) => updates.push(e));
  const live = new LiveStateStore(new MemoryRedisStore(), clock);
  const gw = new TestGateway(transport, live, clock, events, { confirmWaitMs: 3_000, commandTimeoutMs: 30_000 });
  const rentals = { openRentalId: async () => undefined, trackingRentalId: async () => undefined, invalidate: () => undefined };
  const prisma = { vehicle: { findUnique: async () => ({ id: VEHICLE_ID }) }, trackPoint: { create: async () => ({}) } };
  const svc = new TelemetryService(gw, { onPosition: async () => undefined }, rentals, prisma as any, events, clock, { trackRetentionDays: 90 });
  const sample = (kmh: number, over: Record<string, unknown> = {}) =>
    svc.telemetry(T, { lat: -23.56, lng: -46.69, velocidade_kmh: kmh, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: new Date(clock.now()).toISOString(), ...over });
  const cuts = () => transport.desired.filter((d) => d.desired.travada === true);
  return { clock, transport, events, updates, live, gw, svc, sample, cuts };
}
type Setup = ReturnType<typeof setup>;

/** Conecta (presença) e passa a graça de 10 s andando (telemetria a cada 5 s). Termina em T0+15 s. */
async function online(s: Setup, kmh = 20): Promise<void> {
  await s.svc.presence(T, true);
  for (let i = 0; i < 3; i++) {
    await s.sample(kmh);
    await s.clock.advance(5_000);
  }
}

/** Lock `relay_only` pela porta IoT; a chamada responde depois de `confirmWaitMs` (3 s). */
async function lockRelay(s: Setup, commandId = 'c1') {
  const p = s.gw.lock({ commandId, thingName: T, authority: 'staff', lockOrigin: 'staff', controlMode: 'relay_only' });
  await s.clock.advance(3_000);
  return p;
}

describe('BaseIotGateway com rastreador relay_only (spec GT06 §5)', () => {
  it('andando → in_progress e nada publicado (sem rampa); corta uma vez depois de 2 telemetrias paradas em 10 s; reported confirma', async () => {
    const s = setup();
    await online(s);
    expect(await lockRelay(s)).toEqual({ commandId: 'c1', status: 'in_progress' });
    await s.sample(20);
    await s.clock.advance(5_000);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.transport.desired).toEqual([]);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: true }]);
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
    await s.gw.onReported(T, { travada: true });
    await s.clock.advance(1_000);
    expect(s.updates).toContainEqual({ commandId: 'c1', status: 'confirmed' });
  });

  it('120 s sem parar → failed/did_not_stop e nenhum desired (nem limite_kmh)', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    for (let i = 0; i < 25; i++) {
      await s.sample(15);
      await s.clock.advance(5_000);
    }
    expect(s.updates).toContainEqual({ commandId: 'c1', status: 'failed', reason: 'did_not_stop' });
    expect(s.transport.desired).toEqual([]);
  });

  it('reconexão (presença) no meio: graça de 10 s e a sequência parada recomeça', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.svc.presence(T, true);
    for (let i = 0; i < 4; i++) {
      await s.sample(0);
      await s.clock.advance(5_000);
    }
    expect(s.cuts()).toEqual([]);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('telemetria velha (> 10 s) no meio é "em movimento": zera a sequência', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    await s.sample(0);
    await s.clock.advance(5_000);
    await s.sample(0, { timestamp: new Date(s.clock.now() - 1).toISOString() });
    await s.clock.advance(5_000);
    await s.sample(0, { timestamp: new Date(s.clock.now() - 11_000).toISOString() });
    await s.clock.advance(5_000);
    await s.sample(0);
    expect(s.cuts()).toEqual([]);
  });

  it('moto offline → pending/offline; reconectada, só corta depois da graça e de 2 amostras paradas novas', async () => {
    const s = setup();
    expect(await s.gw.lock({ commandId: 'c1', thingName: T, controlMode: 'relay_only' })).toEqual({ commandId: 'c1', status: 'pending', reason: 'offline' });
    await s.svc.presence(T, true);
    for (let i = 0; i < 4; i++) {
      await s.sample(0);
      await s.clock.advance(5_000);
    }
    expect(s.cuts()).toEqual([]);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
  });

  it('corte sem confirmação em 120 s → failed/timeout e desired travada:false', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    await s.sample(0);
    await s.clock.advance(10_000);
    await s.sample(0);
    expect(s.cuts()).toHaveLength(1);
    for (let i = 0; i < 25; i++) await s.clock.advance(5_000);
    expect(s.updates).toContainEqual({ commandId: 'c1', status: 'failed', reason: 'timeout' });
    expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: true }, { travada: false }]);
  });

  it('speed_limit e horn → failed/unsupported_by_tracker sem publicar nada', async () => {
    const s = setup();
    await online(s);
    expect(await s.gw.setSpeedLimit({ commandId: 'c1', thingName: T, controlMode: 'relay_only' }, 6)).toEqual({ commandId: 'c1', status: 'failed', reason: 'unsupported_by_tracker' });
    expect(await s.gw.horn({ commandId: 'c2', thingName: T, controlMode: 'relay_only' })).toEqual({ commandId: 'c2', status: 'failed', reason: 'unsupported_by_tracker' });
    expect(s.transport.desired).toEqual([]);
    expect(s.transport.commands).toEqual([]);
  });

  it('unlock (staff) → só travada:false (sem limite_kmh) e cancela a trava em curso; confirma por reported.travada=false', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    const p = s.gw.unlock({ commandId: 'u1', thingName: T, authority: 'staff', controlMode: 'relay_only' });
    await s.clock.advance(10);
    expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: false }]);
    await s.gw.onReported(T, { travada: false });
    expect(await p).toEqual({ commandId: 'u1', status: 'confirmed' });
    await s.clock.advance(1_000); // EMIT_GRACE_MS do desfecho do lock cancelado
    expect(s.updates).toContainEqual({ commandId: 'c1', status: 'failed' });
  });

  it('unlock de cliente depois de lock da equipe → locked_by_staff, nada publicado (autoridade inalterada)', async () => {
    const s = setup();
    await online(s);
    await lockRelay(s);
    expect(await s.gw.unlock({ commandId: 'u1', thingName: T, authority: 'customer', controlMode: 'relay_only' })).toEqual({ commandId: 'u1', status: 'failed', reason: 'locked_by_staff' });
    expect(s.transport.desired).toEqual([]);
  });

  it('stolen_mode é aceito (desired modo_roubada) e não corta', async () => {
    const s = setup();
    await online(s);
    const p = s.gw.setStolenMode({ commandId: 's1', thingName: T, controlMode: 'relay_only' }, true);
    await s.gw.onReported(T, { modo_roubada: true });
    expect(await p).toEqual({ commandId: 's1', status: 'confirmed' });
    expect(s.transport.desired.map((d) => d.desired)).toEqual([{ modo_roubada: true }]);
  });

  it('sem controlMode o lock continua sendo a rampa (speed_control intocado)', async () => {
    const s = setup();
    await online(s);
    void s.gw.lock({ commandId: 'c1', thingName: T, authority: 'staff', lockOrigin: 'staff' });
    await s.clock.advance(10);
    expect(s.transport.desired[0].desired).toEqual({ limite_kmh: 15 });
  });
});
