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
    // Fix 2: o primeiro degrau sai da velocidade medida (menor degrau ≥ velocidade, nunca 3 com a moto andando).
    expect(transport.limits()).toEqual([8]);
  });

  it('120 s sem parar → failed/did_not_stop; a rampa segue no 0 (já confirmado) e só trava quando a velocidade cair abaixo de 3', async () => {
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
    // Fix 3: a rampa continua (segurando o limite); ainda andando não trava; parou → trava.
    expect(svc.isActive(T)).toBe(true);
    await svc.onSpeed(T, 5);
    expect(transport.lockPublished()).toBe(false);
    await svc.onSpeed(T, 0);
    expect(transport.lockPublished()).toBe(true);
  });

  it('timeout de 120 s conta desde o início (não reinicia a cada degrau)', async () => {
    const { clock, outcomes, svc } = setup();
    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await clock.advance(119_999);
    expect(outcomes).toEqual([]);
    await clock.advance(1);
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'did_not_stop' }]);
  });

  it('timeout sem nenhum reported → did_not_stop; fix 3: nada de limite 0 de uma vez (fica no degrau publicado, esperando o ack)', async () => {
    const { clock, transport, outcomes, svc } = setup();
    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await clock.advance(120_000);
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'did_not_stop' }]);
    expect(transport.limits()).toEqual([15, 15]); // M2: o degrau sem ack é republicado (nunca fica preso), nada de 0
    // O ack chega depois: a escada continua normalmente.
    await svc.onReported(T, { limite_kmh: 15 });
    await clock.advance(2_000);
    expect(transport.limits()).toEqual([15, 15, 8]);
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

  it('travada enviada mas sem confirmação em 120 s → failed/timeout; sem velocidade fresca < 3: travada:false e rampa gradual (nunca limite 0 de uma vez)', async () => {
    const { clock, outcomes, svc, transport } = setup();
    await svc.start(REQ, { speedKmh: 0, speedLimitKmh: 32, locked: false, online: true });
    await clock.advance(120_000);
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'timeout' }]);
    expect(transport.desired.slice(-2).map((d) => d.desired)).toEqual([{ travada: false }, { limite_kmh: 15 }]);
  });

  it('fix 3: trava sem confirmação em 120 s com velocidade fresca < 3 (probe) → continua esperando a confirmação, sem desfazer', async () => {
    const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
    const transport = new FakeTransport(clock);
    const outcomes: CommandOutcome[] = [];
    const svc = new SafeLockService(clock, transport, (o) => outcomes.push(o), { probe: async () => ({ speedKmh: 0, speedLimitKmh: 32, locked: false, online: true }) });
    await svc.start(REQ, { speedKmh: 0, speedLimitKmh: 32, locked: false, online: true });
    await clock.advance(120_000);
    expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'timeout' }]);
    expect(transport.desired.map((d) => d.desired)).toEqual([{ travada: true }]);
    await svc.onReported(T, { travada: true });
    expect(svc.isActive(T)).toBe(false);
  });

  it('eventos de outra moto não afetam a rampa', async () => {
    const { transport, svc } = setup();
    await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
    await svc.onSpeed('moto-0002', 0);
    await svc.onReported('moto-0002', { limite_kmh: 15, velocidade_kmh: 0 });
    expect(transport.lockPublished()).toBe(false);
  });

  describe('menores da re-revisão 3 (merge)', () => {
    it('M2: rampa retomada esperando um ack que não vem (desired sobrescrito) republica o degrau a cada prazo; desfecho uma vez só', async () => {
      const { clock, transport, outcomes, svc } = setup();
      await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
      await svc.onReported(T, { limite_kmh: 15 });
      await clock.advance(2_000); // publica 8; o ack nunca vem (alguém sobrescreveu o desired para 20)
      await clock.advance(118_000);
      expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'did_not_stop' }]);
      expect(transport.limits()).toEqual([15, 8, 8]);
      await clock.advance(120_000);
      expect(transport.limits()).toEqual([15, 8, 8, 8]);
      expect(outcomes).toHaveLength(1);
      expect(transport.lockPublished()).toBe(false);
    });

    it('M4: publicação da retomada falha (IoT fora) → o desfecho (e o alerta) sai mesmo assim', async () => {
      for (const [speed, reason] of [[25, 'did_not_stop'], [0, 'timeout']] as const) {
        const { clock, transport, outcomes, svc } = setup();
        await svc.start(REQ, { speedKmh: speed, speedLimitKmh: 32, locked: false, online: true });
        transport.updateDesired = async () => {
          throw new Error('iot fora');
        };
        await clock.advance(120_000);
        expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason }]);
      }
    });

    it('M5: trava direta não confirmada, velocidade desconhecida e teto confirmado 0 → travada:false sem subir o limite para 3', async () => {
      const clock = new FakeClock(Date.parse('2026-10-21T15:00:00Z'));
      const transport = new FakeTransport(clock);
      const outcomes: CommandOutcome[] = [];
      const svc = new SafeLockService(clock, transport, (o) => outcomes.push(o), { probe: async () => ({ speedKmh: null, speedLimitKmh: 0, locked: false, online: true }) });
      await svc.start(REQ, { speedKmh: 0, speedLimitKmh: 0, locked: false, online: true });
      await clock.advance(120_000);
      expect(outcomes).toEqual([{ commandId: 'cmd-1', status: 'failed', reason: 'timeout' }]);
      expect(transport.desired.map((d) => d.desired)).toEqual([{ travada: true }, { travada: false }]);
    });

    it('M3: publishIfAllowed reconfere sob o lock — limite acima do degrau atual não é publicado', async () => {
      const { transport, svc } = setup();
      await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
      const published: number[] = [];
      expect(await svc.publishIfAllowed(T, 20, async () => void published.push(20))).toBe(false);
      expect(await svc.publishIfAllowed(T, 6, async () => void published.push(6))).toBe(true);
      expect(published).toEqual([6]);
      expect(transport.limits()).toEqual([15]);
    });
  });

  describe('re-revisão 4', () => {
    it('I1: primeiro degrau igual ao limite já reportado (limite manual 15 aplicado) → conta como ack e a escada segue', async () => {
      const { clock, transport, svc } = setup();
      await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 15, locked: false, online: true, reportedLimitKmh: 15 });
      expect(transport.limits()).toEqual([15]);
      await clock.advance(2_000); // nenhum reported novo (desired == reported não gera /delta)
      expect(transport.limits()).toEqual([15, 8]);
    });

    it('I1: reported acima do degrau não vale como ack (espera o reported do degrau)', async () => {
      const { clock, transport, svc } = setup();
      await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true, reportedLimitKmh: 32 });
      await clock.advance(10_000);
      expect(transport.limits()).toEqual([15]);
    });

    it('M6: lock novo numa rampa retomada ganha os próprios 120 s (não só o resto do prazo da retomada)', async () => {
      const { clock, outcomes, svc } = setup();
      await svc.start(REQ, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
      await clock.advance(120_000); // did_not_stop → retomada com prazo novo (até 240 s)
      await clock.advance(100_000); // 220 s: faltam 20 s do prazo da retomada
      await svc.start({ commandId: 'cmd-2', thingName: T }, { speedKmh: 25, speedLimitKmh: 32, locked: false, online: true });
      await clock.advance(119_000);
      expect(outcomes.filter((o) => o.commandId === 'cmd-2')).toEqual([]);
      await clock.advance(1_000);
      expect(outcomes.filter((o) => o.commandId === 'cmd-2')).toEqual([{ commandId: 'cmd-2', status: 'failed', reason: 'did_not_stop' }]);
    });
  });
});
