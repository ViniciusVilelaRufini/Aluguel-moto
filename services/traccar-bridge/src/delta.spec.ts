import { cutRefusal, parseDelta, planDelta, planDeltaFor, planReconnect } from './delta';
import { markReconnected } from './mapping';

const now = Date.parse('2026-10-27T12:00:30Z');
const fresh = { last: { fixTime: now - 2_000, speedKmh: 0.5, lat: 0, lng: 0 } };

describe('delta do shadow → ações (spec GT06 §6.4)', () => {
  it('travada → engineStop/engineResume; limite_kmh nunca vira comando (reported 32 fixo); modo_roubada ecoado', () => {
    expect(planDelta({ travada: true })).toEqual([{ kind: 'engineStop' }]);
    expect(planDelta({ travada: false, limite_kmh: 0 })).toEqual([{ kind: 'engineResume' }, { kind: 'report', reported: { limite_kmh: 32 } }]);
    expect(planDelta({ limite_kmh: 6, modo_roubada: true })).toEqual([{ kind: 'report', reported: { limite_kmh: 32, modo_roubada: true } }]);
  });

  it('get da reconexão: só travada:false é reaplicado', () => {
    expect(planReconnect({ travada: true, limite_kmh: 6 })).toEqual([{ kind: 'report', reported: { limite_kmh: 32 } }]);
    expect(planReconnect({ travada: false })).toEqual([{ kind: 'engineResume' }]);
    expect(planReconnect(undefined)).toEqual([]);
  });

  it('decisão 2: travada:true pendente nunca vira engineStop na reconexão', () => {
    for (const d of [{ travada: true }, { travada: true, limite_kmh: 6, modo_roubada: true }]) {
      expect(planReconnect(d).some((a) => a.kind === 'engineStop')).toBe(false);
    }
    expect(planReconnect({ travada: true })).toEqual([]);
  });

  it('parseDelta só aceita os campos do contrato com o tipo certo', () => {
    expect(parseDelta({ travada: 'sim', limite_kmh: 6, modo_roubada: true, x: 1 })).toEqual({ limite_kmh: 6, modo_roubada: true });
    expect(parseDelta(null)).toEqual({});
  });

  it('decisão 1: travada null ou ausente = nenhuma ação (nunca engineStop/engineResume)', () => {
    expect(parseDelta({ travada: null })).toEqual({});
    expect(planDelta(parseDelta({ travada: null }))).toEqual([]);
    expect(planDelta(parseDelta({}))).toEqual([]);
    expect(planReconnect(parseDelta({ travada: null }))).toEqual([]);
    expect(planDelta(parseDelta({ travada: null, limite_kmh: null, modo_roubada: null }))).toEqual([]);
    const ctx = { online: true, mem: fresh, now };
    expect(planDeltaFor(parseDelta({ travada: null }), ctx)).toEqual({ actions: [], refusal: null });
  });
});

describe('cutRefusal (segunda guarda da ponte)', () => {
  it('corta só online, sem corte ativo, sem envio recente e com posição de até 10 s abaixo de 3 km/h', () => {
    expect(cutRefusal({ online: true, mem: fresh, now })).toBeNull();
    expect(cutRefusal({ online: false, mem: fresh, now })).toBe('offline');
    expect(cutRefusal({ online: true, mem: { ...fresh, blocked: true }, now })).toBe('already_blocked');
    expect(cutRefusal({ online: true, mem: fresh, now, lastStopSentAt: now - 29_999 })).toBe('recently_sent');
    expect(cutRefusal({ online: true, mem: fresh, now, lastStopSentAt: now - 30_000 })).toBeNull();
    expect(cutRefusal({ online: true, mem: {}, now })).toBe('no_position');
    expect(cutRefusal({ online: true, mem: { last: { ...fresh.last, fixTime: now - 10_001 } }, now })).toBe('stale');
    expect(cutRefusal({ online: true, mem: { last: { ...fresh.last, speedKmh: 3 } }, now })).toBe('moving');
  });

  it('bit de corte velho (antes da reconexão) não conta como already_blocked', () => {
    expect(cutRefusal({ online: true, mem: markReconnected({ ...fresh, blocked: true }), now })).toBeNull();
  });
});

describe('planDeltaFor: delta com contexto da moto (decisão 3)', () => {
  const ctx = { online: true, now };

  it('travada:true com a moto livre, parada e fresca → engineStop', () => {
    expect(planDeltaFor({ travada: true }, { ...ctx, mem: fresh })).toEqual({ actions: [{ kind: 'engineStop' }], refusal: null });
  });

  it('travada:true com a moto já travada (status atual) → eco reported.travada:true, sem engineStop', () => {
    const r = planDeltaFor({ travada: true }, { ...ctx, mem: { ...fresh, blocked: true } });
    expect(r.refusal).toBe('already_blocked');
    expect(r.actions).toEqual([{ kind: 'report', reported: { travada: true } }]);
  });

  it('eco junta-se aos demais campos reported do mesmo delta', () => {
    const r = planDeltaFor({ travada: true, limite_kmh: 6, modo_roubada: true }, { ...ctx, mem: { ...fresh, blocked: true } });
    expect(r.actions).toEqual([{ kind: 'report', reported: { travada: true, limite_kmh: 32, modo_roubada: true } }]);
  });

  it('eco só com status atual: após reconexão sem status novo não ecoa true da memória velha', () => {
    const r = planDeltaFor({ travada: true }, { ...ctx, mem: markReconnected({ ...fresh, blocked: true }) });
    expect(r.refusal).toBeNull(); // bit velho descartado: a guarda decide por posição fresca e parada, não por "já travada"
    expect(r.actions).not.toContainEqual({ kind: 'report', reported: { travada: true } });
  });

  it('outras recusas não geram engineStop nem eco; o motivo é devolvido', () => {
    expect(planDeltaFor({ travada: true }, { online: false, mem: fresh, now })).toEqual({ actions: [], refusal: 'offline' });
    expect(planDeltaFor({ travada: true }, { ...ctx, mem: { last: { ...fresh.last, speedKmh: 5 } } })).toEqual({ actions: [], refusal: 'moving' });
    expect(planDeltaFor({ travada: true }, { ...ctx, mem: {} })).toEqual({ actions: [], refusal: 'no_position' });
    expect(planDeltaFor({ travada: true }, { ...ctx, mem: fresh, lastStopSentAt: now - 1000 })).toEqual({ actions: [], refusal: 'recently_sent' });
  });

  it('recusa mantém os campos reported não ligados ao corte', () => {
    expect(planDeltaFor({ travada: true, limite_kmh: 6 }, { online: false, mem: fresh, now })).toEqual({
      actions: [{ kind: 'report', reported: { limite_kmh: 32 } }],
      refusal: 'offline',
    });
  });

  it('travada:false e deltas sem travada seguem planDelta', () => {
    expect(planDeltaFor({ travada: false }, { ...ctx, mem: {} })).toEqual({ actions: [{ kind: 'engineResume' }], refusal: null });
    expect(planDeltaFor({ modo_roubada: false }, { ...ctx, mem: {} }).actions).toEqual([{ kind: 'report', reported: { modo_roubada: false } }]);
  });
});
