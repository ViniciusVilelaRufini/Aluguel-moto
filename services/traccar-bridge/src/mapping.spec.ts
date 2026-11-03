import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cutRefusal } from './delta';
import { applyPosition, BLOCKED_FRESH_MS, COMMAND_ACK_GRACE_MS, currentBlocked, freshBlocked, markCommandSent, markReconnected, parseRelayReply, toDeviceEvents, type DeviceMemory } from './mapping';
import type { TraccarEvent, TraccarPosition } from './traccar/types';

const schema = (name: string) => JSON.parse(readFileSync(join(__dirname, '../../../packages/contracts/schemas', name), 'utf8'));
const ajv = addFormats(new Ajv2020({ strict: false }));
const validTelemetry = ajv.compile(schema('telemetria.schema.json'));
const validEvent = ajv.compile(schema('eventos.schema.json'));

// `pos` recebido pelo Traccar em NOW: o bit de corte dele é fresco (A4-1a: telemetria só com bit ≤ 90 s).
const NOW = Date.parse('2026-10-27T12:10:00Z');
const AP = (p: TraccarPosition, mem: DeviceMemory, now = NOW) => applyPosition(p, mem, '72v', now);

const pos = (over: Partial<TraccarPosition> = {}): TraccarPosition => ({
  id: 1, deviceId: 1, protocol: 'gt06', serverTime: '2026-10-27T12:10:00.000Z', deviceTime: '2026-10-27T12:00:00.000Z', fixTime: '2026-10-27T12:00:00.000Z',
  outdated: false, valid: true, latitude: -23.5614, longitude: -46.6914, speed: 10.79914, course: 90,
  attributes: { ignition: true, blocked: false, rssi: 4, power: 72 }, ...over,
});

describe('applyPosition (spec GT06 §6.2)', () => {
  it('posição válida → telemetria do contrato: nós × 1,852, timestamp = fixTime, blocked/ignition/rssi/power', () => {
    const r = AP(pos(), {});
    expect(r.telemetry).toEqual({ lat: -23.5614, lng: -46.6914, velocidade_kmh: 20, bateria_pct: 50, travada: false, ignicao: true, sinal: 5, timestamp: '2026-10-27T12:00:00.000Z' });
    expect(validTelemetry(r.telemetry)).toBe(true);
    expect(r.memory.last).toEqual({ fixTime: Date.parse('2026-10-27T12:00:00.000Z'), speedKmh: 20, lat: -23.5614, lng: -46.6914 });
  });

  it('heartbeat (outdated) não vira telemetria, mas o bit de corte e a ignição valem para a próxima', () => {
    const hb = AP(pos({ outdated: true, attributes: { blocked: true, ignition: false, power: 60 } }), {});
    expect(hb.telemetry).toBeNull();
    expect(hb.memory).toMatchObject({ blocked: true, ignition: false });
    const next = AP(pos({ fixTime: '2026-10-27T12:00:05.000Z', speed: 0, attributes: {} }), hb.memory);
    expect(next.telemetry).toMatchObject({ travada: true, ignicao: false, velocidade_kmh: 0, sinal: 0, bateria_pct: 0 });
  });

  it('valid=false, fixTime repetido ou mais velho → sem telemetria', () => {
    expect(AP(pos({ valid: false }), {}).telemetry).toBeNull();
    const first = AP(pos(), {});
    expect(AP(pos(), first.memory).telemetry).toBeNull();
    expect(AP(pos({ fixTime: '2026-10-27T11:59:59.000Z' }), first.memory).telemetry).toBeNull();
  });

  it('fora do schema (velocidade > 200 km/h) → invalid, sem telemetria e sem atualizar a última posição', () => {
    const r = AP(pos({ speed: 200 }), {});
    expect(r).toMatchObject({ telemetry: null, invalid: true });
    expect(r.memory.last).toBeUndefined();
  });

  it('tensão fora da curva (DC-DC 12 V) mantém o último % válido', () => {
    const a = AP(pos(), {});
    const b = AP(pos({ fixTime: '2026-10-27T12:00:05.000Z', attributes: { power: 12.1 } }), a.memory);
    expect(b.telemetry?.bateria_pct).toBe(50);
  });

  it('deslocamento > 20 m com o corte ativo → movedWhileLocked uma vez por âncora', () => {
    let mem: DeviceMemory = AP(pos({ speed: 0, attributes: { blocked: true, power: 72 } }), {}).memory;
    const r1 = AP(pos({ fixTime: '2026-10-27T12:00:05.000Z', latitude: -23.5613, speed: 0, attributes: {} }), mem); // ~11 m
    expect(r1.movedWhileLocked).toBe(false);
    mem = r1.memory;
    const r2 = AP(pos({ fixTime: '2026-10-27T12:00:10.000Z', latitude: -23.5611, speed: 0, attributes: {} }), mem); // ~33 m da âncora
    expect(r2.movedWhileLocked).toBe(true);
    const r3 = AP(pos({ fixTime: '2026-10-27T12:00:15.000Z', latitude: -23.5611, speed: 0, attributes: {} }), r2.memory);
    expect(r3.movedWhileLocked).toBe(false);
  });
});

describe('reconexão: travada nunca vem de memória velha (decisão 4)', () => {
  const locked: DeviceMemory = AP(pos({ speed: 0, attributes: { blocked: true, ignition: false, power: 60 } }), {}).memory;

  it('currentBlocked devolve o bit conhecido; markReconnected o descarta até chegar status novo', () => {
    expect(currentBlocked(locked)).toBe(true);
    const re = markReconnected(locked);
    expect(currentBlocked(re)).toBeUndefined();
    expect(re.blocked).toBeUndefined();
    expect(re.lockAnchor).toBeUndefined();
    expect(re.awaitingStatus).toBe(true);
    // não muta a memória anterior
    expect(currentBlocked(locked)).toBe(true);
  });

  it('A4-6: posição sem atributo blocked após reconectar não reaproveita o bit antigo: telemetria sai com travada:false, sem âncora', () => {
    const re = markReconnected(locked);
    const r = AP(pos({ fixTime: '2026-10-27T12:01:00.000Z', speed: 0, attributes: {} }), re);
    expect(r.telemetry).toMatchObject({ travada: false });
    expect(r.held).toBeUndefined();
    expect(r.memory.lockAnchor).toBeUndefined();
    expect(currentBlocked(r.memory)).toBeUndefined();
    expect(r.memory.awaitingStatus).toBe(true);
  });

  it('o primeiro attributes.blocked após reconectar volta a valer (heartbeat também)', () => {
    const re = markReconnected(locked);
    const hb = AP(pos({ outdated: true, attributes: { blocked: true } }), re);
    expect(currentBlocked(hb.memory)).toBe(true);
    expect(hb.memory.awaitingStatus).toBe(false);
    const hb2 = AP(pos({ outdated: true, attributes: { blocked: false } }), re);
    expect(currentBlocked(hb2.memory)).toBe(false);
  });
});

describe('I2: frescor do bit de corte (sessão TCP nova invisível no Traccar)', () => {
  const serverNow = new Date(NOW).toISOString();
  it('applyPosition guarda a hora de RECEBIMENTO do último status com blocked; posição sem blocked não a renova', () => {
    const hb = AP(pos({ outdated: true, serverTime: serverNow, attributes: { blocked: true } }), {}, NOW);
    expect(hb.memory.blockedAt).toBe(NOW);
    const later = AP(pos({ fixTime: '2026-10-27T12:10:30.000Z', speed: 0, attributes: { power: 72 } }), hb.memory, NOW + 30_000);
    expect(later.memory.blockedAt).toBe(NOW);
  });

  it('B-M3: blockedAt = min(serverTime, agora): heartbeat que ficou parado numa fila não conta como fresco', () => {
    const queued = AP(pos({ outdated: true, serverTime: new Date(NOW - 100_000).toISOString(), attributes: { blocked: true } }), {}, NOW);
    expect(queued.memory.blockedAt).toBe(NOW - 100_000);
    expect(currentBlocked(queued.memory)).toBe(true);
    expect(freshBlocked(queued.memory, NOW)).toBeUndefined();
    // serverTime no futuro (relógio do Traccar adiantado) não estende o frescor além de agora
    const ahead = AP(pos({ outdated: true, serverTime: new Date(NOW + 60_000).toISOString(), attributes: { blocked: true } }), {}, NOW);
    expect(ahead.memory.blockedAt).toBe(NOW);
    // serverTime ilegível → agora
    const bad = AP(pos({ outdated: true, serverTime: 'x', attributes: { blocked: true } }), {}, NOW);
    expect(bad.memory.blockedAt).toBe(NOW);
  });

  it('freshBlocked: bit de até 90 s vale; mais velho, sem hora ou após reconexão é desconhecido', () => {
    const mem = AP(pos({ outdated: true, serverTime: serverNow, attributes: { blocked: true } }), {}, NOW).memory;
    expect(BLOCKED_FRESH_MS).toBe(90_000);
    expect(freshBlocked(mem, NOW + BLOCKED_FRESH_MS)).toBe(true);
    expect(freshBlocked(mem, NOW + BLOCKED_FRESH_MS + 1)).toBeUndefined();
    expect(freshBlocked({ blocked: false }, NOW)).toBeUndefined();
    expect(freshBlocked(markReconnected(mem), NOW)).toBeUndefined();
    expect(markReconnected(mem).blockedAt).toBeUndefined();
  });
});

describe('retenção (held) e relógio do rastreador', () => {
  const future = new Date(NOW + 3_600_000).toISOString();
  const stopped = (over: Partial<TraccarPosition> = {}) => pos({ speed: 0, ...over });

  it('A4-6: bit de corte nunca visto (sem comando pendente): telemetria sai com travada:false; o status depois vale', () => {
    const r = AP(pos({ attributes: { ignition: true, rssi: 4, power: 72 } }), {});
    expect(r.held).toBeUndefined();
    expect(r.invalid).toBe(false);
    expect(r.telemetry).toMatchObject({ travada: false, bateria_pct: 50, ignicao: true, sinal: 5 });
    expect(currentBlocked(r.memory)).toBeUndefined();
    const ok = AP(pos({ fixTime: '2026-10-27T12:00:05.000Z', attributes: { blocked: true } }), r.memory);
    expect(ok.telemetry).toMatchObject({ travada: true });
  });

  it('sem bateria conhecida: telemetry null, held awaiting_battery, mas a memória (last, ignição, sinal) atualiza', () => {
    const r = AP(pos({ attributes: { ignition: true, rssi: 4, blocked: false } }), {});
    expect(r).toMatchObject({ telemetry: null, held: 'awaiting_battery', invalid: false });
    expect(r.memory).toMatchObject({ ignition: true, signal: 5 });
    expect(r.memory.last).toMatchObject({ speedKmh: 20 });
  });

  it('sem bateria conhecida: telemetry null, held awaiting_battery; libera quando a tensão chega', () => {
    const r = AP(pos({ attributes: { blocked: false } }), {});
    expect(r).toMatchObject({ telemetry: null, held: 'awaiting_battery' });
    expect(currentBlocked(r.memory)).toBe(false);
    const ok = AP(pos({ fixTime: '2026-10-27T12:00:05.000Z', attributes: { power: 84 } }), r.memory);
    expect(ok.held).toBeUndefined();
    expect(ok.telemetry?.bateria_pct).toBe(100);
  });

  it('tensão fora da curva (12 V) não conta como bateria conhecida', () => {
    expect(AP(pos({ attributes: { blocked: false, power: 12 } }), {}).held).toBe('awaiting_battery');
  });

  it('retida ou não, a posição de corte com deslocamento > 20 m ainda gera movedWhileLocked', () => {
    const a = AP(stopped({ attributes: { blocked: true } }), {});
    expect(a.held).toBe('awaiting_battery');
    const b = AP(stopped({ fixTime: '2026-10-27T12:00:05.000Z', latitude: -23.5611, attributes: {} }), a.memory);
    expect(b).toMatchObject({ telemetry: null, movedWhileLocked: true });
  });

  it('F1: fixTime > agora + 10 min é invalid, não grava last/ordem e não bloqueia posições reais; cutRefusal recusa', () => {
    const bad = AP(stopped({ fixTime: future }), {});
    expect(bad).toMatchObject({ telemetry: null, invalid: true });
    expect(bad.memory.last).toBeUndefined();
    expect(bad.memory.lastFixTime).toBeUndefined();
    expect(cutRefusal({ online: true, mem: bad.memory, now: NOW })).toBe('no_position');
    const real = AP(pos({ fixTime: new Date(NOW - 1000).toISOString() }), bad.memory);
    expect(real.telemetry).not.toBeNull();
  });

  it('F1: futuro dentro da tolerância (<= 10 min) vale, e a frescura usa o menor entre fixTime e agora', () => {
    const r = AP(stopped({ fixTime: new Date(NOW + 5 * 60_000).toISOString() }), AP(pos({ attributes: { blocked: false, power: 72 } }), {}).memory);
    expect(r.invalid).toBe(false);
    expect(r.memory.last?.fixTime).toBe(NOW);
    expect(cutRefusal({ online: true, mem: r.memory, now: NOW + 11_000 })).toBe('stale');
  });

  it('F1: futuro também descarta a amostra parada anterior (velocidade desconhecida)', () => {
    const ok = AP(stopped({ fixTime: new Date(NOW - 1000).toISOString() }), {});
    expect(cutRefusal({ online: true, mem: ok.memory, now: NOW })).toBeNull();
    const bad = AP(stopped({ fixTime: future }), ok.memory);
    expect(cutRefusal({ online: true, mem: bad.memory, now: NOW })).toBe('no_position');
    expect(bad.memory.lastFixTime).toBe(ok.memory.lastFixTime);
  });

  it('F2: posição mais nova inutilizável (valid=false, outdated, velocidade inválida) limpa last: velocidade desconhecida = em movimento', () => {
    const t1 = new Date(NOW - 3000).toISOString();
    const t2 = new Date(NOW - 1000).toISOString();
    for (const over of [{ valid: false }, { outdated: true }, { speed: 200 }] as Partial<TraccarPosition>[]) {
      const ok = AP(stopped({ fixTime: t1 }), {});
      expect(cutRefusal({ online: true, mem: ok.memory, now: NOW })).toBeNull();
      const r = AP(stopped({ fixTime: t2, ...over }), ok.memory);
      expect(r.memory.last).toBeUndefined();
      expect(cutRefusal({ online: true, mem: r.memory, now: NOW })).toBe('no_position');
    }
  });

  it('F2b: parada com fixTime now+9 min (dentro da tolerância) e depois posição real a 20 nós (fixTime menor) → last limpo, corte recusado, sem telemetria', () => {
    const base = AP(stopped({ fixTime: new Date(NOW + 9 * 60_000).toISOString() }), AP(pos({ attributes: { blocked: false, power: 72 } }), {}).memory);
    expect(base.memory.last).toBeDefined();
    const moving = AP(pos({ fixTime: new Date(NOW + 3000).toISOString(), speed: 20 }), base.memory, NOW + 3000);
    expect(moving.telemetry).toBeNull();
    expect(moving.memory.last).toBeUndefined();
    expect(cutRefusal({ online: true, mem: moving.memory, now: NOW + 3000 })).toBe('no_position');
    const bad = AP(pos({ fixTime: new Date(NOW + 3000).toISOString(), speed: 200 }), base.memory, NOW + 3000);
    expect(bad.memory.last).toBeUndefined();
    const slow = AP(stopped({ fixTime: new Date(NOW + 3000).toISOString() }), base.memory, NOW + 3000);
    expect(slow.memory.last).toEqual(base.memory.last);
  });

  it('F2: posição inutilizável que NÃO é mais nova (heartbeat repete o fixTime da última) não apaga last', () => {
    const t1 = new Date(NOW - 3000).toISOString();
    const ok = AP(stopped({ fixTime: t1 }), {});
    const hb = AP(stopped({ fixTime: t1, outdated: true }), ok.memory);
    expect(hb.memory.last).toEqual(ok.memory.last);
  });
});

describe('toDeviceEvents (spec GT06 §6.3)', () => {
  const ev = (alarm: string): TraccarEvent => ({ id: 1, type: 'alarm', eventTime: '2026-10-27T12:00:00.000Z', deviceId: 1, attributes: { alarm } });
  const now = Date.parse('2026-10-27T12:00:30Z');

  it('powerCut → violacao; lowBattery/lowPower → bateria_critica; lista separada por vírgula sem repetir', () => {
    expect(toDeviceEvents(ev('powerCut'), {}, now)).toEqual([{ tipo: 'violacao', timestamp: '2026-10-27T12:00:00.000Z' }]);
    expect(toDeviceEvents(ev('lowPower,lowBattery'), {}, now)).toEqual([{ tipo: 'bateria_critica', timestamp: '2026-10-27T12:00:00.000Z' }]);
    for (const e of toDeviceEvents(ev('powerCut,lowBattery'), {}, now)) expect(validEvent(e)).toBe(true);
  });

  it('vibration só com o corte ativo vira movimento_sem_aluguel; sem correspondência → nada', () => {
    expect(toDeviceEvents(ev('vibration'), { blocked: false }, now)).toEqual([]);
    expect(toDeviceEvents(ev('vibration'), { blocked: true }, now)).toEqual([{ tipo: 'movimento_sem_aluguel', timestamp: '2026-10-27T12:00:00.000Z' }]);
    expect(toDeviceEvents(ev('sos'), {}, now)).toEqual([]);
    expect(toDeviceEvents({ ...ev('powerCut'), type: 'deviceMoving' }, {}, now)).toEqual([]);
  });

  it('vibration logo após reconectar (bit de corte ainda desconhecido) não vira movimento_sem_aluguel', () => {
    expect(toDeviceEvents(ev('vibration'), markReconnected({ blocked: true }), now)).toEqual([]);
  });
});

describe('A4-1: comando de motor enviado invalida o bit de corte anterior', () => {
  const at = (ms: number) => new Date(ms).toISOString();
  const lockedNow = AP(pos({ outdated: true, serverTime: at(NOW), attributes: { blocked: true, power: 72 } }), {}, NOW).memory;
  const moving = (ms: number) => pos({ fixTime: at(ms - 500), serverTime: at(ms), speed: 0, attributes: { power: 72 } });
  const hb = (ms: number, blocked: boolean, extra: Record<string, unknown> = {}) => pos({ outdated: true, serverTime: at(ms), attributes: { blocked, ...extra } });
  const ack = (ms: number) => pos({ outdated: true, serverTime: at(ms), attributes: { result: 'Relay,1 OK' } });

  it('markCommandSent: o bit anterior deixa de valer, guarda o tipo do comando e não muta a entrada', () => {
    expect(COMMAND_ACK_GRACE_MS).toBe(5_000);
    const sent = markCommandSent(lockedNow, NOW + 1_000, 'resume');
    expect(currentBlocked(sent)).toBeUndefined();
    expect(freshBlocked(sent, NOW + 1_000)).toBeUndefined();
    expect(sent).toMatchObject({ commandSentAt: NOW + 1_000, pendingCommand: 'resume' });
    expect(sent.lockAnchor).toBeUndefined();
    expect(currentBlocked(lockedNow)).toBe(true);
  });

  it('P1: depois do engineResume a telemetria fica retida (false confirmaria o unlock antes do status)', () => {
    const r = AP(moving(NOW + 2_000), markCommandSent(lockedNow, NOW + 1_000, 'resume'), NOW + 2_000);
    expect(r.telemetry).toBeNull();
    expect(r.held).toBe('awaiting_status');
  });

  it('P1: depois do engineStop a telemetria segue com travada:false (nunca confirma lock), sem âncora', () => {
    const free = AP(hb(NOW, false, { power: 72 }), {}, NOW).memory;
    const r = AP(moving(NOW + 2_000), markCommandSent(free, NOW + 1_000, 'stop'), NOW + 2_000);
    expect(r.telemetry).toMatchObject({ travada: false });
    expect(r.held).toBeUndefined();
    expect(r.memory.lockAnchor).toBeUndefined();
    expect(currentBlocked(r.memory)).toBeUndefined(); // eco/reported só com status novo
  });

  it('P2: sem resposta do aparelho, status até envio + 5 s não vale (heartbeat emitido antes do Relay)', () => {
    const sent = markCommandSent(lockedNow, NOW + 1_000, 'resume');
    const early = AP(hb(NOW + 2_000, true), sent, NOW + 2_000);
    expect(currentBlocked(early.memory)).toBeUndefined();
    expect(early.memory.pendingCommand).toBe('resume');
    const edge = AP(hb(NOW + 1_000 + COMMAND_ACK_GRACE_MS, true), early.memory, NOW + 6_000);
    expect(currentBlocked(edge.memory)).toBeUndefined();
    const late = AP(hb(NOW + 1_001 + COMMAND_ACK_GRACE_MS, false), edge.memory, NOW + 6_001);
    expect(currentBlocked(late.memory)).toBe(false);
    expect(late.memory.pendingCommand).toBeUndefined();
  });

  it('P2: com a resposta do aparelho (attributes.result), vale o primeiro status recebido DEPOIS dela', () => {
    const sent = markCommandSent(lockedNow, NOW + 1_000, 'resume');
    const acked = AP(ack(NOW + 1_500), sent, NOW + 1_500);
    expect(acked.memory.commandAckAt).toBe(NOW + 1_500);
    const same = AP(hb(NOW + 1_500, true), acked.memory, NOW + 1_500);
    expect(currentBlocked(same.memory)).toBeUndefined();
    const after = AP(hb(NOW + 2_000, false), same.memory, NOW + 2_000);
    expect(currentBlocked(after.memory)).toBe(false);
    expect(after.memory).toMatchObject({ pendingCommand: undefined, commandAckAt: undefined });
  });

  it('resposta anterior ao envio (de outro comando) não conta como ack', () => {
    const sent = markCommandSent(lockedNow, NOW + 1_000, 'stop');
    const old = AP(ack(NOW + 900), sent, NOW + 1_200);
    expect(old.memory.commandAckAt).toBeUndefined();
  });
});

describe('A4-1a / P4: bit de corte velho (> 90 s) sem comando pendente', () => {
  const at = (ms: number) => new Date(ms).toISOString();
  it('telemetria sai com travada:false (nunca confirma lock; cerca/zona continuam vendo a moto)', () => {
    const mem = AP(pos({ outdated: true, serverTime: at(NOW), attributes: { blocked: true, power: 72 } }), {}, NOW).memory;
    const now = NOW + BLOCKED_FRESH_MS + 1_000;
    const r = AP(pos({ fixTime: at(now - 500), serverTime: at(now), speed: 0, attributes: { power: 72 } }), mem, now);
    expect(r.telemetry).toMatchObject({ travada: false });
    expect(r.memory.lockAnchor).toBeUndefined();
    expect(currentBlocked(r.memory)).toBe(true); // a memória do bit não muda; só a telemetria é conservadora
    expect(freshBlocked(r.memory, now)).toBeUndefined();
  });

  it('bit fresco → telemetria sai com ele', () => {
    const mem = AP(pos({ outdated: true, serverTime: at(NOW), attributes: { blocked: true, power: 72 } }), {}, NOW).memory;
    const now = NOW + 30_000;
    const r = AP(pos({ fixTime: at(now - 500), serverTime: at(now), speed: 0, attributes: { power: 72 } }), mem, now);
    expect(r.telemetry).toMatchObject({ travada: true });
  });

  it('A4-6: depois de reconectar (bit desconhecido, sem comando pendente) a telemetria sai com travada:false', () => {
    const mem = markReconnected(AP(pos({ outdated: true, serverTime: at(NOW), attributes: { blocked: true, power: 72 } }), {}, NOW).memory);
    const r = AP(pos({ fixTime: at(NOW + 500), serverTime: at(NOW + 1_000), speed: 0, attributes: { power: 72 } }), mem, NOW + 1_000);
    expect(r.held).toBeUndefined();
    expect(r.telemetry).toMatchObject({ travada: false });
  });

  it('A4-6: reconexão com engineResume pendente → retida (um false confirmaria o unlock antes do status)', () => {
    const base = AP(pos({ outdated: true, serverTime: at(NOW), attributes: { blocked: true, power: 72 } }), {}, NOW).memory;
    const mem = markReconnected(markCommandSent(base, NOW + 500, 'resume'));
    const r = AP(pos({ fixTime: at(NOW + 800), serverTime: at(NOW + 1_000), speed: 0, attributes: { power: 72 } }), mem, NOW + 1_000);
    expect(r.telemetry).toBeNull();
    expect(r.held).toBe('awaiting_status');
  });
});

describe('J16: resposta do aparelho com o estado do relé (attributes.result "RELAY n OK")', () => {
  const at = (ms: number) => new Date(ms).toISOString();
  const STOP_OK = 'Stop engine Succeed\nRELAY 1 OK';
  const RESUME_OK = 'Resume engine Succeed\nRELAY 0 OK';
  // Como o Traccar entrega a resposta do GT06: posição `outdated` com a última localização conhecida (fixTime velho).
  const reply = (ms: number, result: string, over: Partial<TraccarPosition> = {}) =>
    pos({ outdated: true, fixTime: at(NOW - 60_000), serverTime: at(ms), speed: 0, attributes: { result }, ...over });
  const lockedNow = AP(pos({ outdated: true, serverTime: at(NOW), attributes: { blocked: true, power: 72 } }), {}, NOW).memory;
  const freeNow = AP(pos({ outdated: true, serverTime: at(NOW), attributes: { blocked: false, power: 72 } }), {}, NOW).memory;

  it('parseRelayReply: só "RELAY 0/1 OK" (qualquer caixa e espaço) é estado do relé', () => {
    expect(parseRelayReply(STOP_OK)).toBe(true);
    expect(parseRelayReply(RESUME_OK)).toBe(false);
    expect(parseRelayReply('relay1ok')).toBe(true);
    expect(parseRelayReply('Relay,1 OK')).toBeUndefined();
    expect(parseRelayReply('ok')).toBeUndefined();
    expect(parseRelayReply('Cut off the fuel supply: Success!')).toBeUndefined();
    expect(parseRelayReply('RELAY 2 OK')).toBeUndefined();
  });

  it('engineResume + "RELAY 0 OK" depois do envio → bit false fresco na hora (sem esperar heartbeat), sem telemetria', () => {
    const sent = markCommandSent(lockedNow, NOW + 1_000, 'resume');
    const r = AP(reply(NOW + 2_000, RESUME_OK), sent, NOW + 2_000);
    expect(r.relayReply).toBe(true);
    expect(r.telemetry).toBeNull();
    expect(currentBlocked(r.memory)).toBe(false);
    expect(freshBlocked(r.memory, NOW + 2_000)).toBe(false);
    expect(r.memory).toMatchObject({ blockedAt: NOW + 2_000, awaitingStatus: false, pendingCommand: undefined, commandAckAt: undefined });
  });

  it('engineStop + "RELAY 1 OK" depois do envio → bit true fresco; a resposta não é amostra de velocidade (last intacto)', () => {
    const moving = AP(pos({ fixTime: at(NOW - 500), serverTime: at(NOW), speed: 0, attributes: { power: 72 } }), freeNow, NOW).memory;
    const sent = markCommandSent(moving, NOW + 1_000, 'stop');
    // Mesmo com fixTime novo, não-outdated e parada: a resposta não renova a posição da guarda do corte.
    const r = AP(reply(NOW + 2_000, STOP_OK, { outdated: false, fixTime: at(NOW + 1_900) }), sent, NOW + 2_000);
    expect(r.relayReply).toBe(true);
    expect(r.telemetry).toBeNull();
    expect(freshBlocked(r.memory, NOW + 2_000)).toBe(true);
    expect(r.memory.last).toEqual(moving.last);
    expect(r.memory.lastFixTime).toBe(moving.lastFixTime);
  });

  it('resposta com velocidade em movimento apaga a amostra parada guardada (conservador)', () => {
    const stopped = AP(pos({ fixTime: at(NOW - 500), serverTime: at(NOW), speed: 0, attributes: { power: 72 } }), freeNow, NOW).memory;
    const r = AP(reply(NOW + 1_000, RESUME_OK, { speed: 8.1 }), stopped, NOW + 1_000);
    expect(r.memory.last).toBeUndefined();
    expect(cutRefusal({ online: true, mem: r.memory, now: NOW + 1_000 })).toBe('no_position');
  });

  it('blockedAt = min(serverTime, ingestão): resposta parada numa fila não é fresca', () => {
    const r = AP(reply(NOW - BLOCKED_FRESH_MS - 1_000, STOP_OK), freeNow, NOW);
    expect(r.relayReply).toBe(true);
    expect(r.memory.blockedAt).toBe(NOW - BLOCKED_FRESH_MS - 1_000);
    expect(freshBlocked(r.memory, NOW)).toBeUndefined();
    const future = AP(reply(NOW + 60_000, STOP_OK), freeNow, NOW);
    expect(future.memory.blockedAt).toBe(NOW);
  });

  it('resposta recebida pelo Traccar até o envio (de um comando anterior) não vale como estado nem como ack', () => {
    const sent = markCommandSent(lockedNow, NOW + 1_000, 'resume');
    const r = AP(reply(NOW + 1_000, RESUME_OK), sent, NOW + 1_200);
    expect(r.relayReply).toBe(false);
    expect(currentBlocked(r.memory)).toBeUndefined();
    expect(r.memory).toMatchObject({ pendingCommand: 'resume', commandAckAt: undefined });
  });

  it('resposta que não bate com o comando pendente (resposta atrasada do anterior) não vale como estado nem como ack', () => {
    const sentResume = markCommandSent(lockedNow, NOW + 1_000, 'resume');
    const a = AP(reply(NOW + 1_500, STOP_OK), sentResume, NOW + 1_500);
    expect(a.relayReply).toBe(false);
    expect(freshBlocked(a.memory, NOW + 1_500)).toBeUndefined(); // nada de eco already_blocked
    expect(a.memory).toMatchObject({ pendingCommand: 'resume', commandAckAt: undefined });
    const sentStop = markCommandSent(freeNow, NOW + 1_000, 'stop');
    const b = AP(reply(NOW + 1_500, RESUME_OK), sentStop, NOW + 1_500);
    expect(b.relayReply).toBe(false);
    expect(currentBlocked(b.memory)).toBeUndefined();
    expect(b.memory).toMatchObject({ pendingCommand: 'stop', commandAckAt: undefined });
  });

  it('sem comando pendente (ex.: reconexão, comando por SMS): a resposta é o estado atual do relé', () => {
    const r = AP(reply(NOW + 1_000, STOP_OK), markReconnected(freeNow), NOW + 1_000);
    expect(r.relayReply).toBe(true);
    expect(freshBlocked(r.memory, NOW + 1_000)).toBe(true);
  });

  it('result que não é estado do relé continua só como ack (P2), sem telemetria', () => {
    const sent = markCommandSent(lockedNow, NOW + 1_000, 'resume');
    const r = AP(reply(NOW + 1_500, 'ok', { outdated: false, fixTime: at(NOW + 1_400) }), sent, NOW + 1_500);
    expect(r.relayReply).toBe(false);
    expect(r.telemetry).toBeNull();
    expect(r.memory.commandAckAt).toBe(NOW + 1_500);
    expect(currentBlocked(r.memory)).toBeUndefined();
  });
});
