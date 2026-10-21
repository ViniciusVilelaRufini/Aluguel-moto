import type { CommandOutcome } from '../../ports/iot-gateway.port';
import { FakeClock } from './clock';
import { SafeLockService } from './safe-lock.service';
import type { DesiredState, ShadowTransport } from './shadow-transport';

/** Transporte falso: registra cada desired publicado. */
class FakeTransport implements ShadowTransport {
  readonly desired: Array<{ thingName: string; desired: DesiredState; at: number }> = [];
  constructor(private readonly clock: FakeClock) {}
  async updateDesired(thingName: string, desired: DesiredState): Promise<void> {
    this.desired.push({ thingName, desired, at: this.clock.now() });
  }
  async publishCommand(): Promise<void> {}
  limits(): number[] {
    return this.desired.filter((d) => d.desired.limite_kmh !== undefined).map((d) => d.desired.limite_kmh!);
  }
  lockPublished(): boolean {
    return this.desired.some((d) => d.desired.travada === true);
  }
}

const T = 'moto-0001';
const REQ = { commandId: 'cmd-1', thingName: T };

function setup() {
  const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
  const transport = new FakeTransport(clock);
  const outcomes: CommandOutcome[] = [];
  const svc = new SafeLockService(clock, transport, (o) => outcomes.push(o));
  return { clock, transport, outcomes, svc };
}

describe('SafeLockService (bloqueio seguro)', () => {
  it('moto parada (0 km/h) → trava direto, sem degraus; confirma no reported travada', async () => {
    const { transport, outcomes, svc } = setup();
    const res = await svc.start(REQ, { speedKmh: 0, speedLimitKmh: 32, locked: false, online: true });
    expect(res.status).toBe('in_progress');
    expect(transport.limits()).toEqual([]);
    expect(transport.desired).toEqual([expect.objectContaining({ desired: { travada: true } })]);
    await svc.onReported(T, { travada: true, velocidade_kmh: 0 });
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'confirmed' }]);
  });

  it('moto a 25 km/h: degraus 15, 8, 3, 0 (um a cada 2 s depois do reported) e nunca trava com velocidade ≥ 3', async () => {
    const { clock, transport, outcomes, svc } = setup();
    // Invariante: sempre que travada:true for publicado, a última velocidade reportada é < 3.
    let lastSpeed = 25;
    const origUpdate = transport.updateDesired.bind(transport);
    const violations: number[] = [];
    transport.updateDesired = async (t, d) => {
      if (d.travada === true && lastSpeed >= 3) violations.push(lastSpeed);
      return origUpdate(t, d);
    };
    const reported = async (r: { limite_kmh?: number; velocidade_kmh?: number; travada?: boolean }) => {
      if (r.velocidade_kmh !== undefined) lastSpeed = r.velocidade_kmh;
      await svc.onReported(T, r);
    };
    const speed = async (v: number) => {
      lastSpeed = v;
      await svc.onSpeed(T, v);
    };

    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    expect(transport.limits()).toEqual([15]);

    // Sem reported, nada avança.
    await clock.advance(10_000);
    expect(transport.limits()).toEqual([15]);

    await reported({ limite_kmh: 15, velocidade_kmh: 18 });
    await clock.advance(1_999);
    expect(transport.limits()).toEqual([15]);
    await clock.advance(1);
    expect(transport.limits()).toEqual([15, 8]);

    await speed(14);
    await reported({ limite_kmh: 8, velocidade_kmh: 12 });
    await clock.advance(2_000);
    expect(transport.limits()).toEqual([15, 8, 3]);

    await reported({ limite_kmh: 3, velocidade_kmh: 5 });
    await clock.advance(2_000);
    expect(transport.limits()).toEqual([15, 8, 3, 0]);
    await reported({ limite_kmh: 0, velocidade_kmh: 3 });
    expect(transport.lockPublished()).toBe(false); // 3 km/h ainda não trava

    await speed(2);
    expect(transport.lockPublished()).toBe(true);
    expect(outcomes).toEqual([]);
    await reported({ travada: true, velocidade_kmh: 0 });
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'confirmed' }]);
    expect(violations).toEqual([]);
  });

  it('trava assim que reporta 2 km/h, mesmo no meio da rampa', async () => {
    const { transport, outcomes, svc } = setup();
    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await svc.onReported(T, { limite_kmh: 15, velocidade_kmh: 2 });
    expect(transport.lockPublished()).toBe(true);
    await svc.onReported(T, { travada: true, velocidade_kmh: 0 });
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'confirmed' }]);
  });

  it('velocidade exatamente 3 km/h não trava (começa a rampa)', async () => {
    const { transport, svc } = setup();
    await svc.start(REQ, { speedKmh: 3, speedLimitKmh: 32, locked: false, online: true });
    expect(transport.lockPublished()).toBe(false);
    expect(transport.limits()).toEqual([15]);
  });

  it('120 s sem parar → failed/did_not_stop, mantém limite_kmh 0 e não trava', async () => {
    const { clock, transport, outcomes, svc } = setup();
    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    for (const step of [15, 8, 3, 0]) {
      await svc.onReported(T, { limite_kmh: step, velocidade_kmh: 20 });
      await clock.advance(2_000);
    }
    expect(outcomes).toEqual([]);
    await clock.advance(120_000);
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'did_not_stop' }]);
    expect(transport.lockPublished()).toBe(false);
    const last = transport.desired[transport.desired.length - 1];
    expect(last.desired.limite_kmh).toBe(0);
    // Depois da falha a rampa acabou: velocidade baixa não trava sem novo comando.
    await svc.onSpeed(T, 0);
    expect(transport.lockPublished()).toBe(false);
    expect(svc.isActive(T)).toBe(false);
  });

  it('timeout de 120 s conta desde o início (não reinicia a cada degrau)', async () => {
    const { clock, outcomes, svc } = setup();
    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await clock.advance(119_999);
    expect(outcomes).toEqual([]);
    await clock.advance(1);
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'did_not_stop' }]);
  });

  it('timeout sem nenhum reported → did_not_stop e garante limite 0 publicado', async () => {
    const { clock, transport, outcomes, svc } = setup();
    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await clock.advance(120_000);
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'did_not_stop' }]);
    expect(transport.limits()).toEqual([15, 0]);
  });

  it('já travada → confirmed sem publicar nada', async () => {
    const { transport, svc } = setup();
    const res = await svc.start(REQ, { speedKmh: 0, speedLimitKmh: 32, locked: true, online: true });
    expect(res.status).toBe('confirmed');
    expect(transport.desired).toEqual([]);
  });

  it('offline → pending/offline sem publicar; ao reconectar faz a rampa normalmente', async () => {
    const { transport, outcomes, svc } = setup();
    const res = await svc.start(REQ, { speedKmh: 20, speedLimitKmh: 32, locked: false, online: false });
    expect(res).toEqual({ commandId: 'cmd-1', status: 'pending', reason: 'offline' });
    expect(transport.desired).toEqual([]);
    expect(svc.isActive(T)).toBe(true);
    await svc.onConnectivity(T, true, { speedKmh: 20, speedLimitKmh: 32, locked: false, online: true });
    expect(transport.limits()).toEqual([15]);
    expect(transport.lockPublished()).toBe(false);
    await svc.onSpeed(T, 1);
    expect(transport.lockPublished()).toBe(true);
    await svc.onReported(T, { travada: true });
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'confirmed' }]);
  });

  it('offline e reconecta parada → trava direto', async () => {
    const { transport, svc } = setup();
    await svc.start(REQ, { speedKmh: 0, speedLimitKmh: 32, locked: false, online: false });
    await svc.onConnectivity(T, true, { speedKmh: 0, speedLimitKmh: 32, locked: false, online: true });
    expect(transport.desired).toEqual([expect.objectContaining({ desired: { travada: true } })]);
  });

  it('segundo lock na mesma moto entra na rampa em curso e recebe o mesmo desfecho', async () => {
    const { transport, outcomes, svc } = setup();
    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    const second = await svc.start({ commandId: 'cmd-2', thingName: T }, { speedKmh: 25, speedLimitKmh: 15, locked: false, online: true });
    expect(second.status).toBe('in_progress');
    expect(transport.limits()).toEqual([15]);
    await svc.onSpeed(T, 0);
    await svc.onReported(T, { travada: true });
    expect(outcomes).toEqual([
      { commandId: 'cmd-1', status: 'confirmed' },
      { commandId: 'cmd-2', status: 'confirmed' },
    ]);
  });

  it('cancel (destravar durante a rampa) interrompe os degraus e encerra o lock como failed', async () => {
    const { clock, transport, outcomes, svc } = setup();
    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await svc.onReported(T, { limite_kmh: 15 });
    svc.cancel(T);
    await clock.advance(10_000);
    expect(transport.limits()).toEqual([15]);
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed' }]);
    expect(svc.isActive(T)).toBe(false);
  });

  it('moto com limite de zona 6 → degraus 6, 3, 0 (nunca sobe o limite)', async () => {
    const { clock, transport, svc } = setup();
    await svc.start(REQ, { speedKmh: 6, speedLimitKmh: 6, locked: false, online: true });
    await svc.onReported(T, { limite_kmh: 6 });
    await clock.advance(2_000);
    await svc.onReported(T, { limite_kmh: 3 });
    await clock.advance(2_000);
    expect(transport.limits()).toEqual([6, 3, 0]);
  });

  it('travada enviada mas sem confirmação em 120 s → failed/timeout e o desired volta a travada:false com limite 0 (um lock futuro refaz a rampa)', async () => {
    const { clock, outcomes, svc, transport } = setup();
    await svc.start(REQ, { speedKmh: 0, speedLimitKmh: 32, locked: false, online: true });
    await clock.advance(120_000);
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'timeout' }]);
    expect(transport.desired[transport.desired.length - 1].desired).toEqual({ travada: false, limite_kmh: 0 });
  });

  it('eventos de outra moto não afetam a rampa', async () => {
    const { transport, svc } = setup();
    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await svc.onSpeed('moto-0002', 0);
    await svc.onReported('moto-0002', { limite_kmh: 15, velocidade_kmh: 0 });
    expect(transport.lockPublished()).toBe(false);
  });
});
