import { distanceM } from './geo';
import { DECEL_KMH_PER_S, MAX_SPEED_KMH, VirtualMoto } from './model';
import { insideOperationArea, ROUTES } from './routes';

function riding(cruiseKmh = 25, over: Partial<ConstructorParameters<typeof VirtualMoto>[0]> = {}) {
  return new VirtualMoto({ thingName: 'moto-0001', route: ROUTES[0], cruiseKmh, riding: true, locked: false, ...over });
}

function run(m: VirtualMoto, seconds: number, onTick?: (m: VirtualMoto) => void) {
  for (let i = 0; i < seconds; i++) {
    m.step(1);
    onTick?.(m);
  }
}

describe('VirtualMoto (modelo de movimento)', () => {
  it('acelera até a velocidade de cruzeiro e nunca passa de 32 km/h, mesmo com cruzeiro configurado acima', () => {
    const m = riding(45);
    let max = 0;
    run(m, 120, (x) => (max = Math.max(max, x.state.speedKmh)));
    expect(max).toBeLessThanOrEqual(MAX_SPEED_KMH);
    expect(m.state.speedKmh).toBe(MAX_SPEED_KMH);
  });

  it('respeita limite_kmh: nunca acelera acima do limite e converge para ele na taxa do controlador', () => {
    const m = riding(25);
    run(m, 30);
    expect(m.state.speedKmh).toBe(25);
    m.applyDesired({ limite_kmh: 15 });
    expect(m.state.limitKmh).toBe(15);
    const before = m.state.speedKmh;
    m.step(1);
    expect(m.state.speedKmh).toBe(before - DECEL_KMH_PER_S); // desacelera, sem corte brusco
    run(m, 5);
    expect(m.state.speedKmh).toBeLessThanOrEqual(15);
    let max = 0;
    run(m, 60, (x) => (max = Math.max(max, x.state.speedKmh)));
    expect(max).toBeLessThanOrEqual(15);
  });

  it('limite inválido (33, -1, 6.5) é recusado pelo firmware', () => {
    const m = riding();
    for (const v of [33, -1, 6.5]) expect(m.applyDesired({ limite_kmh: v })).toEqual({});
    expect(m.state.limitKmh).toBe(32);
  });

  it('travada:true com a moto andando não trava: fica pendente e trava só abaixo de 3 km/h', () => {
    const m = riding(25);
    run(m, 30);
    expect(m.applyDesired({ travada: true })).toEqual({});
    expect(m.state.locked).toBe(false);
    expect(m.state.pendingLock).toBe(true);
    // o rastreador continua andando enquanto o servidor não reduzir o limite
    run(m, 5);
    expect(m.state.locked).toBe(false);
    m.applyDesired({ limite_kmh: 0 });
    const speeds: Array<{ speed: number; locked: boolean }> = [];
    run(m, 20, (x) => speeds.push({ speed: x.state.speedKmh, locked: x.state.locked }));
    for (const s of speeds) if (s.locked) expect(s.speed).toBeLessThan(3);
    expect(m.state.locked).toBe(true);
    expect(m.state.speedKmh).toBe(0);
  });

  it('travada:true com a moto parada trava na hora e reporta', () => {
    const m = new VirtualMoto({ thingName: 'moto-0002', route: ROUTES[1], locked: false, riding: false });
    expect(m.applyDesired({ travada: true })).toEqual({ travada: true });
    expect(m.state.locked).toBe(true);
  });

  it('travada sobe o motor parado: moto travada não anda', () => {
    const m = new VirtualMoto({ thingName: 'moto-0003', route: ROUTES[2], locked: true, riding: true });
    const start = m.position();
    run(m, 30);
    expect(m.state.speedKmh).toBe(0);
    expect(distanceM(start, m.position())).toBe(0);
  });

  it('destravar volta a andar (piloto simulado) e reporta travada:false', () => {
    const m = new VirtualMoto({ thingName: 'moto-0004', route: ROUTES[0], locked: true, riding: false, rideOnUnlock: true });
    expect(m.applyDesired({ travada: false })).toEqual({ travada: false });
    run(m, 10);
    expect(m.state.speedKmh).toBeGreaterThan(0);
  });

  it('step informa quando reportar a velocidade (desacelerando para o limite) e quando travou', () => {
    const m = riding(25);
    run(m, 30);
    m.applyDesired({ limite_kmh: 0, travada: true });
    const reports: Array<{ speed: boolean; locked: boolean }> = [];
    for (let i = 0; i < 10; i++) {
      const r = m.step(1);
      reports.push({ speed: r.reportSpeed, locked: r.lockedNow });
    }
    expect(reports.filter((r) => r.speed).length).toBeGreaterThan(0);
    expect(reports.filter((r) => r.locked)).toHaveLength(1);
  });

  it('anda pela rota e fica dentro da área de operação', () => {
    for (const route of ROUTES) {
      const m = new VirtualMoto({ thingName: 'moto-0005', route, cruiseKmh: 30, riding: true, locked: false });
      const start = m.position();
      let moved = 0;
      let prev = start;
      run(m, 600, (x) => {
        expect(insideOperationArea(x.position())).toBe(true);
        moved += distanceM(prev, x.position());
        prev = x.position();
      });
      expect(moved).toBeGreaterThan(2000);
    }
  });

  it('modo roubada é aplicado e reportado', () => {
    const m = riding();
    expect(m.applyDesired({ modo_roubada: true })).toEqual({ modo_roubada: true });
    expect(m.state.stolenMode).toBe(true);
  });

  it('telemetria segue o contrato (campos e tipos)', () => {
    const m = riding();
    run(m, 5);
    const t = m.telemetry(new Date('2026-10-21T15:00:00Z'));
    expect(Object.keys(t).sort()).toEqual(['bateria_pct', 'ignicao', 'lat', 'lng', 'sinal', 'timestamp', 'travada', 'velocidade_kmh']);
    expect(t.timestamp).toBe('2026-10-21T15:00:00.000Z');
    expect(Number.isInteger(t.sinal)).toBe(true);
  });
});
