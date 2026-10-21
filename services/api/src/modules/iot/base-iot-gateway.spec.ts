import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, IotCommandUpdatedEvent } from '../../common/events';
import { InvalidSpeedLimitError } from '../../ports/iot-gateway.port';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway } from './base-iot-gateway';
import { FakeClock } from './clock';
import { LiveStateStore } from './live-state.store';
import type { DesiredState, IotTransport, MomentaryCommand } from './shadow-transport';

class FakeTransport implements IotTransport {
  readonly desired: Array<{ thingName: string; desired: DesiredState }> = [];
  readonly commands: Array<{ thingName: string; command: MomentaryCommand }> = [];
  /** Simula o rastreador respondendo com reported. */
  autoReport?: (thingName: string, desired: DesiredState) => void;
  async updateDesired(thingName: string, desired: DesiredState) {
    this.desired.push({ thingName, desired });
    this.autoReport?.(thingName, desired);
  }
  async publishCommand(thingName: string, command: MomentaryCommand) {
    this.commands.push({ thingName, command });
  }
  async start() {}
  async stop() {}
}

class TestGateway extends BaseIotGateway {}

const T = 'moto-0001';
const telemetry = (speed: number) => ({ lat: -23.56, lng: -46.69, velocidade_kmh: speed, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: '2026-10-21T15:00:00Z' });

async function setup(opts: { online?: boolean; speed?: number } = {}) {
  const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
  const transport = new FakeTransport();
  const events = new EventEmitter2();
  const updates: IotCommandUpdatedEvent[] = [];
  events.on(EV.IOT_COMMAND_UPDATED, (e: IotCommandUpdatedEvent) => updates.push(e));
  const live = new LiveStateStore(new MemoryRedisStore(), clock);
  const gw = new TestGateway(transport, live, clock, events, { confirmWaitMs: 3_000, commandTimeoutMs: 30_000 });
  if (opts.online !== false) {
    // A primeira amostra abre a conexão e a graça pós-reconexão de 10 s (revisão 5): a moto só tem velocidade conhecida depois dela.
    await live.applyTelemetry(T, telemetry(opts.speed ?? 0));
    await clock.advance(10_000);
    await live.applyTelemetry(T, { ...telemetry(opts.speed ?? 0), timestamp: new Date(clock.now()).toISOString() });
  }
  return { clock, transport, events, updates, live, gw };
}

describe('BaseIotGateway', () => {
  it.each([33, -1, 6.5])('setSpeedLimit(%p) → InvalidSpeedLimitError e nada publicado', async (v) => {
    const { gw, transport } = await setup();
    await expect(gw.setSpeedLimit({ commandId: 'c1', thingName: T }, v)).rejects.toBeInstanceOf(InvalidSpeedLimitError);
    expect(transport.desired).toEqual([]);
  });

  it('QA-01: limite manual acima do limite da zona em que a moto está → failed/invalid_limit e nada publicado; igual ou abaixo passa', async () => {
    const { gw, transport } = await setup();
    gw.setLimitResolver(() => 6); // calçadão
    expect(await gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 32)).toEqual({ commandId: 'c1', status: 'failed', reason: 'invalid_limit' });
    expect(await gw.setSpeedLimit({ commandId: 'c2', thingName: T }, 7)).toEqual({ commandId: 'c2', status: 'failed', reason: 'invalid_limit' });
    expect(transport.desired).toEqual([]);
    transport.autoReport = (t, d) => void gw.onReported(t, { limite_kmh: d.limite_kmh });
    expect(await gw.setSpeedLimit({ commandId: 'c3', thingName: T }, 6)).toEqual({ commandId: 'c3', status: 'confirmed' });
    expect(await gw.setSpeedLimit({ commandId: 'c4', thingName: T }, 3)).toEqual({ commandId: 'c4', status: 'confirmed' });
  });

  it('online + reported dentro da espera → confirmed (sem evento)', async () => {
    const { gw, transport, updates } = await setup();
    transport.autoReport = (t, d) => void gw.onReported(t, { limite_kmh: d.limite_kmh });
    const res = await gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 20);
    expect(res).toEqual({ commandId: 'c1', status: 'confirmed' });
    expect(transport.desired).toEqual([{ thingName: T, desired: { limite_kmh: 20 } }]);
    expect(updates).toEqual([]);
  });

  it('online sem reported na espera → in_progress; reported depois → iot.command-updated confirmed', async () => {
    const { gw, clock, updates } = await setup();
    const p = gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 6);
    await clock.advance(3_000);
    expect(await p).toEqual({ commandId: 'c1', status: 'in_progress' });
    await gw.onReported(T, { limite_kmh: 6 });
    await clock.advance(1_000); // janela de graça (EMIT_GRACE_MS)
    expect(updates).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
  });

  it('sem reported em 30 s → failed/timeout', async () => {
    const { gw, clock, updates } = await setup();
    const p = gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 6);
    await clock.advance(3_000);
    await p;
    await clock.advance(27_000);
    expect(updates).toEqual([{ commandId: 'c1', status: 'failed', reason: 'timeout' }]);
  });

  it('offline → pending/offline; o desired fica no shadow e confirma ao reconectar e reportar', async () => {
    const { gw, transport, clock, updates } = await setup({ online: false });
    const res = await gw.setStolenMode({ commandId: 'c1', thingName: T }, true);
    expect(res).toEqual({ commandId: 'c1', status: 'pending', reason: 'offline' });
    expect(transport.desired).toEqual([{ thingName: T, desired: { modo_roubada: true } }]);
    await clock.advance(3_600_000); // sem timeout enquanto offline
    expect(updates).toEqual([]);
    await gw.onConnectivity(T, true);
    await gw.onReported(T, { modo_roubada: true });
    expect(updates).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
  });

  it('reported já igual ao desired → confirmed na hora', async () => {
    const { gw, live } = await setup();
    await live.applyReported(T, { limite_kmh: 20 });
    expect(await gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 20)).toEqual({ commandId: 'c1', status: 'confirmed' });
  });

  it('novo limite substitui o anterior ainda pendente (o anterior termina failed)', async () => {
    const { gw, clock, updates } = await setup();
    const p1 = gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 6);
    await clock.advance(3_000);
    await p1;
    const p2 = gw.setSpeedLimit({ commandId: 'c2', thingName: T }, 20);
    await gw.onReported(T, { limite_kmh: 20 });
    expect(await p2).toEqual({ commandId: 'c2', status: 'confirmed' });
    await clock.advance(1_000);
    expect(updates).toEqual([{ commandId: 'c1', status: 'failed' }]);
  });

  it('lock com moto andando delega à rampa: publica limite 15, não trava', async () => {
    const { gw, clock, transport } = await setup({ speed: 25 });
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(3_000);
    expect(await p).toEqual({ commandId: 'c1', status: 'in_progress' });
    expect(transport.desired).toEqual([{ thingName: T, desired: { limite_kmh: 15 } }]);
  });

  it('lock com moto parada confirmado dentro da espera → confirmed', async () => {
    const { gw, transport } = await setup({ speed: 0 });
    transport.autoReport = (t, d) => {
      if (d.travada) void gw.onReported(t, { travada: true });
    };
    expect(await gw.lock({ commandId: 'c1', thingName: T })).toEqual({ commandId: 'c1', status: 'confirmed' });
  });

  it('lock rampa até parar: telemetria abaixo de 3 km/h trava e confirma por evento', async () => {
    const { gw, clock, transport, updates } = await setup({ speed: 25 });
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(3_000);
    await p;
    await gw.onSpeed(T, 1.5);
    expect(transport.desired[transport.desired.length - 1].desired).toEqual({ travada: true });
    await gw.onReported(T, { travada: true });
    await clock.advance(1_000);
    expect(updates).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
  });

  it('unlock cancela a rampa e restaura o limite em vigor (resolver de zona)', async () => {
    const { gw, clock, transport, updates } = await setup({ speed: 25 });
    gw.setLimitResolver(() => 20);
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(3_000);
    await p;
    const u = gw.unlock({ commandId: 'c2', thingName: T });
    await gw.onReported(T, { travada: false, limite_kmh: 20 });
    expect(await u).toEqual({ commandId: 'c2', status: 'confirmed' });
    expect(transport.desired[transport.desired.length - 1].desired).toEqual({ travada: false, limite_kmh: 20 });
    await clock.advance(1_000);
    expect(updates).toEqual([{ commandId: 'c1', status: 'failed' }]);
  });

  it('horn online publica em motos/{t}/comandos e confirma; offline → failed/offline sem publicar', async () => {
    const a = await setup();
    expect(await a.gw.horn({ commandId: 'c1', thingName: T })).toEqual({ commandId: 'c1', status: 'confirmed' });
    expect(a.transport.commands).toEqual([{ thingName: T, command: { comando_id: 'c1', acao: 'buzina' } }]);
    const b = await setup({ online: false });
    expect(await b.gw.horn({ commandId: 'c2', thingName: T })).toEqual({ commandId: 'c2', status: 'failed', reason: 'offline' });
    expect(b.transport.commands).toEqual([]);
  });

  it('durante a rampa do bloqueio seguro, setSpeedLimit (ex.: saída de zona → 32) é recusado sem publicar', async () => {
    const { gw, clock, transport } = await setup({ speed: 25 });
    const p = gw.lock({ commandId: 'c1', thingName: T });
    await clock.advance(3_000);
    await p;
    const before = transport.desired.length;
    expect(await gw.setSpeedLimit({ commandId: 'c2', thingName: T }, 32)).toEqual({ commandId: 'c2', status: 'failed' });
    expect(await gw.setSpeedLimit({ commandId: 'c3', thingName: T }, 6)).toEqual({ commandId: 'c3', status: 'failed' });
    expect(transport.desired.length).toBe(before);
  });

  it('desfecho logo depois de a chamada responder in_progress é emitido com atraso (evita sobrescrever confirmed com in_progress)', async () => {
    const { gw, clock, updates } = await setup();
    const p = gw.setSpeedLimit({ commandId: 'c1', thingName: T }, 6);
    await clock.advance(3_000);
    expect((await p).status).toBe('in_progress');
    await gw.onReported(T, { limite_kmh: 6 });
    expect(updates).toEqual([]); // ainda dentro da janela de graça
    await clock.advance(1_000);
    expect(updates).toEqual([{ commandId: 'c1', status: 'confirmed' }]);
  });

  it('getLiveState devolve o estado conhecido (ou null)', async () => {
    const { gw } = await setup({ speed: 12 });
    expect(await gw.getLiveState(T)).toEqual(expect.objectContaining({ thingName: T, speedKmh: 12, online: true }));
    expect(await gw.getLiveState('moto-9999')).toBeNull();
  });
});
