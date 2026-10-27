import { EventEmitter2 } from '@nestjs/event-emitter';
import { EV, IotCommandUpdatedEvent } from '../../common/events';
import { MemoryRedisStore } from '../../redis/redis-store';
import { BaseIotGateway, type GatewayOptions } from './base-iot-gateway';
import { MemoryRelayLockStore } from './relay-lock.store';
import { FakeClock } from './clock';
import { DEFAULT_RECONNECT_GRACE_MS, LiveStateStore } from './live-state.store';
import type { DesiredState, IotTransport, MomentaryCommand, ReportedState } from './shadow-transport';
import { TelemetryService } from './telemetry.service';

class FakeTransport implements IotTransport {
  readonly desired: Array<{ at: number; desired: DesiredState }> = [];
  readonly commands: MomentaryCommand[] = [];
  /** Documento do shadow (como o IoT Core: `null` no desired apaga o campo); o `reported` é ajustado pelo teste. */
  readonly shadow: { desired: DesiredState; reported: ReportedState } = { desired: {}, reported: {} };
  readFails = false;
  constructor(private readonly clock: FakeClock) {}
  async updateDesired(_t: string, desired: DesiredState) {
    this.desired.push({ at: this.clock.now(), desired });
    for (const [k, v] of Object.entries(desired) as Array<[keyof DesiredState, unknown]>) {
      if (v === null) delete this.shadow.desired[k];
      else (this.shadow.desired as Record<string, unknown>)[k] = v;
    }
  }
  async readShadow() {
    if (this.readFails) throw new Error('shadow indisponível');
    return { desired: { ...this.shadow.desired }, reported: { ...this.shadow.reported } };
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

function setup(gwOpts: Partial<GatewayOptions> = {}) {
  const clock = new FakeClock(Date.parse('2026-10-27T12:00:00Z'));
  const transport = new FakeTransport(clock);
  const events = new EventEmitter2();
  const updates: IotCommandUpdatedEvent[] = [];
  events.on(EV.IOT_COMMAND_UPDATED, (e: IotCommandUpdatedEvent) => updates.push(e));
  const redis = new MemoryRedisStore();
  const live = new LiveStateStore(redis, clock);
  const gw = new TestGateway(transport, live, clock, events, { confirmWaitMs: 3_000, commandTimeoutMs: 30_000, ...gwOpts });
  const rentals = { openRentalId: async () => undefined, trackingRentalId: async () => undefined, invalidate: () => undefined };
  const prisma = { vehicle: { findUnique: async () => ({ id: VEHICLE_ID }) }, trackPoint: { create: async () => ({}) } };
  const svc = new TelemetryService(gw, { onPosition: async () => undefined }, rentals, prisma as any, events, clock, { trackRetentionDays: 90 });
  const sample = (kmh: number, over: Record<string, unknown> = {}) =>
    svc.telemetry(T, { lat: -23.56, lng: -46.69, velocidade_kmh: kmh, bateria_pct: 80, travada: false, ignicao: true, sinal: 4, timestamp: new Date(clock.now()).toISOString(), ...over });
  const cuts = () => transport.desired.filter((d) => d.desired.travada === true);
  return { clock, transport, events, updates, redis, live, gw, svc, sample, cuts };
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

  describe('correções da revisão (Task 4, fix 1)', () => {
    it('I1: moto já travada (reported.travada=true) e online → confirmed sem gravar nada; nunca solta (travada:false) depois', async () => {
      const s = setup();
      await online(s, 0);
      await s.gw.onReported(T, { travada: true });
      expect(await lockRelay(s)).toEqual({ commandId: 'c1', status: 'confirmed' });
      for (let i = 0; i < 60; i++) await s.clock.advance(5_000);
      expect(s.transport.desired).toEqual([]);
      expect(s.updates).toEqual([]);
    });

    it('I1: reported.travada=false → fluxo só relé normal (in_progress, corta com a moto parada)', async () => {
      const s = setup();
      await online(s, 0);
      await s.gw.onReported(T, { travada: false });
      expect(await lockRelay(s)).toEqual({ commandId: 'c1', status: 'in_progress' });
      await s.sample(0);
      await s.clock.advance(10_000);
      await s.sample(0);
      expect(s.cuts()).toHaveLength(1);
    });

    it('L1: offline → pending; ao reconectar a espera recomeça e o comando volta a in_progress', async () => {
      const s = setup();
      expect(await s.gw.lock({ commandId: 'c1', thingName: T, controlMode: 'relay_only' })).toMatchObject({ status: 'pending', reason: 'offline' });
      await s.svc.presence(T, true);
      await s.clock.advance(1_000); // EMIT_GRACE_MS depois do retorno pending
      expect(s.updates).toContainEqual({ commandId: 'c1', status: 'in_progress' });
    });

    it('L1: cai no meio da espera → pending/offline; volta → in_progress', async () => {
      const s = setup();
      await online(s);
      await lockRelay(s);
      await s.svc.presence(T, false);
      await s.clock.advance(1_000);
      expect(s.updates).toEqual([{ commandId: 'c1', status: 'pending', reason: 'offline' }]);
      await s.svc.presence(T, true);
      await s.clock.advance(1_000);
      expect(s.updates).toEqual([
        { commandId: 'c1', status: 'pending', reason: 'offline' },
        { commandId: 'c1', status: 'in_progress' },
      ]);
    });

    it('L3: reported com velocidade de movimento não aceita (polling sem horário) também zera a sequência parada', async () => {
      const s = setup();
      await online(s);
      await lockRelay(s);
      await s.sample(0);
      await s.clock.advance(5_000);
      await s.gw.onReported(T, { velocidade_kmh: 15 }, { fromPoll: true });
      await s.clock.advance(5_000);
      await s.sample(0);
      expect(s.cuts()).toEqual([]);
    });

    it('L5: unlock com o corte já enviado → travada:false, o lock termina failed e o prazo do corte não grava nada depois', async () => {
      const s = setup();
      await online(s);
      await lockRelay(s);
      await s.sample(0);
      await s.clock.advance(10_000);
      await s.sample(0);
      expect(s.cuts()).toHaveLength(1);
      const p = s.gw.unlock({ commandId: 'u1', thingName: T, authority: 'staff', controlMode: 'relay_only' });
      await s.clock.advance(10);
      await s.gw.onReported(T, { travada: false });
      expect(await p).toEqual({ commandId: 'u1', status: 'confirmed' });
      for (let i = 0; i < 60; i++) await s.clock.advance(5_000);
      expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: true }, { travada: false }]);
      expect(s.updates.filter((u) => u.commandId === 'c1')).toEqual([{ commandId: 'c1', status: 'failed' }]);
    });

    it('L5: Redis fora no lock só relé → a chamada falha (o CommandsService grava failed/timeout) e nada é publicado', async () => {
      const broken = new MemoryRelayLockStore();
      broken.withLock = async () => {
        throw new Error('redis down');
      };
      const s = setup({ relayLockStore: broken });
      await online(s, 0);
      await expect(s.gw.lock({ commandId: 'c1', thingName: T, authority: 'staff', controlMode: 'relay_only' })).rejects.toThrow('redis down');
      for (let i = 0; i < 30; i++) await s.clock.advance(5_000);
      expect(s.transport.desired).toEqual([]);
      expect(s.updates).toEqual([]);
    });

    it('L5: reconexão percebida por lacuna de telemetria zera a sequência (graça antes de contar parada de novo)', async () => {
      const s = setup();
      await online(s);
      await lockRelay(s);
      const spy = jest.spyOn(s.gw.relayLock, 'onReconnected');
      await s.sample(0);
      await s.clock.advance(16_000); // > IOT_RECONNECT_GAP_MS (15 s), moto ainda online
      await s.sample(0);
      expect(spy).toHaveBeenCalledWith(T);
      await s.clock.advance(5_000);
      await s.sample(0);
      await s.clock.advance(5_000);
      await s.sample(0);
      expect(s.cuts()).toEqual([]);
    });
  });

  describe('moto já travada (Task 4, fix 2)', () => {
    it('B: só presença (sem telemetria/reported) → o lock não confirma cedo; segue o fluxo parar-e-cortar', async () => {
      const s = setup();
      await s.svc.presence(T, true);
      expect(await lockRelay(s)).toEqual({ commandId: 'c1', status: 'in_progress' });
    });

    it('A: travada, cai, lock → pending; volta pela telemetria travada:true → confirmed e nunca grava travada:false', async () => {
      const s = setup();
      await online(s, 0);
      await s.gw.onReported(T, { travada: true });
      await s.svc.presence(T, false);
      expect(await s.gw.lock({ commandId: 'c1', thingName: T, authority: 'staff', lockOrigin: 'staff', controlMode: 'relay_only' })).toEqual({ commandId: 'c1', status: 'pending', reason: 'offline' });
      for (let i = 0; i < 60; i++) {
        await s.sample(0, { travada: true, ignicao: false });
        await s.clock.advance(5_000);
      }
      expect(s.updates).toContainEqual({ commandId: 'c1', status: 'confirmed' });
      expect(s.transport.desired.filter((d) => d.desired.travada === false)).toEqual([]);
    });

    it('A: travada, cai, lock → pending; volta por presença, reported travada:true e telemetria parada → confirmed, nunca travada:false', async () => {
      const s = setup();
      await online(s, 0);
      await s.gw.onReported(T, { travada: true });
      await s.svc.presence(T, false);
      await s.gw.lock({ commandId: 'c1', thingName: T, authority: 'staff', lockOrigin: 'staff', controlMode: 'relay_only' });
      await s.svc.presence(T, true);
      await s.svc.reported(T, { travada: true });
      for (let i = 0; i < 60; i++) {
        await s.sample(0, { travada: true, ignicao: false });
        await s.clock.advance(5_000);
      }
      expect(s.updates).toContainEqual({ commandId: 'c1', status: 'confirmed' });
      expect(s.transport.desired.filter((d) => d.desired.travada === false)).toEqual([]);
    });

    it('A: travada por outro caminho durante a espera (telemetria travada:true, sem reported) → prazo confirma, sem travada:false', async () => {
      const s = setup();
      await online(s);
      await lockRelay(s);
      for (let i = 0; i < 60; i++) {
        await s.sample(0, { travada: true, ignicao: false });
        await s.clock.advance(5_000);
      }
      expect(s.updates).toContainEqual({ commandId: 'c1', status: 'confirmed' });
      expect(s.transport.desired.filter((d) => d.desired.travada === false)).toEqual([]);
    });
  });

  describe('reconexão e unlock pendente (Task 4, fix 4)', () => {
    const relay = (commandId: string) => ({ commandId, thingName: T, authority: 'staff' as const, lockOrigin: 'staff' as const, controlMode: 'relay_only' as const });

    /** Moto travada (reported travada:true), cai; o lock fica `pending`; 30 s offline. */
    async function lockedThenOffline(s: Setup): Promise<void> {
      await online(s, 0);
      await s.gw.onReported(T, { travada: true });
      s.transport.shadow.reported = { travada: true };
      await s.svc.presence(T, false);
      expect(await s.gw.lock(relay('c1'))).toEqual({ commandId: 'c1', status: 'pending', reason: 'offline' });
      await s.clock.advance(30_000);
    }

    it('N1: reconecta pelo reported travada:true da memória da ponte (sem presença) → não confirma; relé aberto → corta parada e confirma', async () => {
      const s = setup();
      await lockedThenOffline(s);
      await s.svc.reported(T, { travada: true }); // tick da reconexão: pode estar velho (J16 reiniciou)
      await s.clock.advance(1_000);
      expect(s.updates).toEqual([{ commandId: 'c1', status: 'in_progress' }]);
      for (let i = 0; i < 6 && s.cuts().length === 0; i++) {
        await s.sample(0, { travada: false, ignicao: false }); // relé aberto de verdade
        await s.clock.advance(5_000);
      }
      expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: true }]);
      await s.svc.reported(T, { travada: true });
      await s.clock.advance(1_000);
      expect(s.updates).toEqual([
        { commandId: 'c1', status: 'in_progress' },
        { commandId: 'c1', status: 'confirmed' },
      ]);
    });

    it('N1: presença + reported travada:true no mesmo tick → não confirma; reported travada:true depois da graça confirma sem gravar nada', async () => {
      const s = setup();
      await lockedThenOffline(s);
      await s.svc.presence(T, true);
      await s.svc.reported(T, { travada: true });
      await s.clock.advance(1_000);
      expect(s.updates).toEqual([{ commandId: 'c1', status: 'in_progress' }]);
      await s.clock.advance(DEFAULT_RECONNECT_GRACE_MS);
      await s.svc.reported(T, { travada: true });
      await s.clock.advance(1_000);
      expect(s.updates).toContainEqual({ commandId: 'c1', status: 'confirmed' });
      expect(s.transport.desired).toEqual([]);
    });

    it('N2: telemetria com relógio adiantado no tick da reconexão não confirma; travada:true depois da graça confirma sem gravar', async () => {
      const s = setup();
      await lockedThenOffline(s);
      const ahead = () => new Date(s.clock.now() + 120_000).toISOString();
      await s.sample(0, { travada: true, ignicao: false, timestamp: ahead() });
      await s.clock.advance(1_000);
      expect(s.updates).toEqual([{ commandId: 'c1', status: 'in_progress' }]);
      for (let i = 0; i < 6; i++) {
        await s.clock.advance(5_000);
        await s.sample(0, { travada: true, ignicao: false, timestamp: ahead() });
      }
      await s.clock.advance(1_000);
      expect(s.updates).toContainEqual({ commandId: 'c1', status: 'confirmed' });
      expect(s.transport.desired).toEqual([]);
    });

    it('unlock pendente (offline) + lock do fim do aluguel → desired travada apagado (null) antes do lock, nunca travada:false repetido', async () => {
      const s = setup();
      await online(s, 0);
      await s.gw.onReported(T, { travada: true });
      s.transport.shadow.reported = { travada: true };
      await s.svc.presence(T, false);
      expect(await s.gw.unlock({ commandId: 'u1', thingName: T, authority: 'staff', controlMode: 'relay_only' })).toEqual({ commandId: 'u1', status: 'pending', reason: 'offline' });
      expect(await s.gw.lock(relay('c1'))).toEqual({ commandId: 'c1', status: 'pending', reason: 'offline' });
      expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: false }, { travada: null }]);
      expect(s.transport.shadow.desired).toEqual({});
      await s.clock.advance(1_000);
      expect(s.updates).toContainEqual({ commandId: 'u1', status: 'failed' });
      // Volta travada (nunca recebeu o engineResume): confirma pela telemetria depois da graça, sem gravar nada.
      await s.svc.presence(T, true);
      for (let i = 0; i < 6; i++) {
        await s.sample(0, { travada: true, ignicao: false });
        await s.clock.advance(5_000);
      }
      expect(s.updates).toContainEqual({ commandId: 'c1', status: 'confirmed' });
      expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: false }, { travada: null }]);
    });

    it('unlock pendente + lock: relé aberto ao voltar → termina pelo corte com a moto parada', async () => {
      const s = setup();
      await online(s, 0);
      s.transport.shadow.reported = { travada: true };
      await s.svc.presence(T, false);
      await s.gw.unlock({ commandId: 'u1', thingName: T, authority: 'staff', controlMode: 'relay_only' });
      await s.gw.lock(relay('c1'));
      await s.svc.presence(T, true);
      for (let i = 0; i < 6 && s.cuts().length === 0; i++) {
        await s.sample(0, { travada: false, ignicao: false });
        await s.clock.advance(5_000);
      }
      expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: false }, { travada: null }, { travada: true }]);
      await s.svc.reported(T, { travada: true });
      await s.clock.advance(1_000);
      expect(s.updates).toContainEqual({ commandId: 'c1', status: 'confirmed' });
    });

    it('unlock em voo com a moto online e travada → o lock apaga o travada:false pendente antes de confirmar', async () => {
      const s = setup();
      await online(s, 0);
      await s.gw.onReported(T, { travada: true });
      s.transport.shadow.reported = { travada: true };
      void s.gw.unlock({ commandId: 'u1', thingName: T, authority: 'staff', controlMode: 'relay_only' });
      await s.clock.advance(10);
      expect(await s.gw.lock(relay('c1'))).toEqual({ commandId: 'c1', status: 'confirmed' });
      expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: false }, { travada: null }]);
    });

    it('shadow ilegível → apaga o desired travada mesmo assim (falha segura; nunca grava travada:true aqui)', async () => {
      const s = setup();
      await online(s);
      s.transport.readFails = true;
      expect(await lockRelay(s)).toEqual({ commandId: 'c1', status: 'in_progress' });
      expect(s.transport.desired.map((d) => d.desired)).toEqual([{ travada: null }]);
    });

    it('sem travada pendente no shadow → nada é gravado ao começar', async () => {
      const s = setup();
      await online(s);
      s.transport.shadow.desired = { travada: true };
      s.transport.shadow.reported = { travada: true };
      await lockRelay(s);
      expect(s.transport.desired).toEqual([]);
    });

    it('N4: prazo usa o estado relido do Redis (travada confirmada por outra instância) → confirmed, sem travada:false', async () => {
      const s = setup();
      await online(s);
      await lockRelay(s);
      await s.clock.advance(30_000);
      const other = new LiveStateStore(s.redis, s.clock);
      await other.load(T);
      await other.applyReported(T, { travada: true }); // outra task processou o reported
      for (let i = 0; i < 25; i++) await s.clock.advance(5_000);
      expect(s.updates).toContainEqual({ commandId: 'c1', status: 'confirmed' });
      expect(s.updates).not.toContainEqual(expect.objectContaining({ reason: 'did_not_stop' }));
      expect(s.transport.desired).toEqual([]);
    });
  });
});
