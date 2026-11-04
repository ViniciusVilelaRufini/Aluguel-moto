import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cutRefusal } from './delta';
import { MIN_GPS_SATELLITES } from './contract';
import { applyPosition, BLOCKED_FRESH_MS, COMMAND_ACK_GRACE_MS, currentBlocked, freshBlocked, GPS_STATUS_FRESH_MS, gpsSleepOf, LOCK_ANCHOR_MAX_GAP_MS, LOCK_REANCHOR_ALARM_M, markCommandSent, markReconnected, parseRelayReply, RELAY_REPLY_SETTLE_MS, toDeviceEvents, type DeviceMemory } from './mapping';
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
    // limites de palavra: nada colado antes de RELAY nem depois de OK
    expect(parseRelayReply('XRELAY 1 OK')).toBeUndefined();
    expect(parseRelayReply('RELAY 1 OKAY')).toBeUndefined();
    expect(parseRelayReply('RELAY 0 OK1')).toBeUndefined();
    expect(parseRelayReply('Resume engine Succeed\r\nRELAY 0 OK\r\n')).toBe(false);
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
    // fixTime repetido (a última localização conhecida, como o Traccar entrega) e parada: não renova nem apaga a amostra.
    const r = AP(reply(NOW + 2_000, STOP_OK, { outdated: false }), sent, NOW + 2_000);
    expect(r.relayReply).toBe(true);
    expect(r.telemetry).toBeNull();
    expect(freshBlocked(r.memory, NOW + 2_000)).toBe(true);
    expect(r.memory.last).toEqual(moving.last);
    expect(r.memory.lastFixTime).toBe(moving.lastFixTime);
  });

  it('resposta com fixTime mais novo que a última telemetria (mais nova e inutilizável) apaga a amostra; ordem intacta', () => {
    const stopped = AP(pos({ fixTime: at(NOW - 500), serverTime: at(NOW), speed: 0, attributes: { power: 72 } }), freeNow, NOW).memory;
    const sent = markCommandSent(stopped, NOW + 1_000, 'stop');
    const r = AP(reply(NOW + 2_000, STOP_OK, { outdated: false, fixTime: at(NOW + 1_900) }), sent, NOW + 2_000);
    expect(r.relayReply).toBe(true);
    expect(r.telemetry).toBeNull();
    expect(r.memory.last).toBeUndefined();
    expect(r.memory.lastFixTime).toBe(stopped.lastFixTime);
    expect(cutRefusal({ online: true, mem: r.memory, now: NOW + 2_000 })).toBe('already_blocked');
    expect(cutRefusal({ online: true, mem: markReconnected(r.memory), now: NOW + 2_000 })).toBe('no_position');
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

  describe('bancada 2026-11-03: status logo depois da resposta ainda traz o bit antigo (RELAY_REPLY_SETTLE_MS)', () => {
    const hb = (ms: number, blocked: boolean, extra: Record<string, unknown> = {}) =>
      pos({ outdated: true, fixTime: at(NOW - 60_000), serverTime: at(ms), attributes: { blocked, ...extra } });
    const unlocked = () => AP(reply(NOW + 2_000, RESUME_OK), markCommandSent(lockedNow, NOW + 1_000, 'resume'), NOW + 2_000).memory;
    const locked = () => AP(reply(NOW + 2_000, STOP_OK), markCommandSent(freeNow, NOW + 1_000, 'stop'), NOW + 2_000).memory;

    it('RELAY 0 OK e, 1 s depois, status blocked:true → ignorado para o bit (nem blockedAt); bateria/ignição valem', () => {
      expect(RELAY_REPLY_SETTLE_MS).toBe(5_000);
      const before = unlocked();
      const r = AP(hb(NOW + 3_000, true, { ignition: true, power: 60 }), before, NOW + 3_000);
      expect(r.staleAfterReply).toBe(true);
      expect(currentBlocked(r.memory)).toBe(false);
      expect(r.memory.blockedAt).toBe(before.blockedAt);
      expect(r.memory.ignition).toBe(true);
      expect(r.memory.batteryPct).not.toBe(before.batteryPct);
    });

    it('RELAY 1 OK e status blocked:false na janela → ignorado (nada libera um corte respondido)', () => {
      const r = AP(hb(NOW + 6_900, false), locked(), NOW + 6_900);
      expect(r.staleAfterReply).toBe(true);
      expect(freshBlocked(r.memory, NOW + 6_900)).toBe(true);
    });

    it('status que concorda com a resposta na janela vale normalmente (renova blockedAt)', () => {
      const r = AP(hb(NOW + 3_000, false), unlocked(), NOW + 3_000);
      expect(r.staleAfterReply).toBe(false);
      expect(r.memory.blockedAt).toBe(NOW + 3_000);
    });

    it('depois de 5 s o status vale (relé que não mudou aparece no heartbeat seguinte)', () => {
      const edge = AP(hb(NOW + 7_000, true), unlocked(), NOW + 7_000);
      expect(edge.staleAfterReply).toBe(true); // exatamente 5 s: ainda na janela
      const after = AP(hb(NOW + 7_001, true), edge.memory, NOW + 7_001);
      expect(after.staleAfterReply).toBe(false);
      expect(freshBlocked(after.memory, NOW + 7_001)).toBe(true);
    });

    it('status recebido pelo Traccar antes da resposta (fila) e contrário também não vale', () => {
      const r = AP(hb(NOW + 1_500, true), unlocked(), NOW + 3_000);
      expect(r.staleAfterReply).toBe(true);
      expect(currentBlocked(r.memory)).toBe(false);
    });

    it('comando novo ou reconexão encerram a janela: o status seguinte segue as regras de sempre', () => {
      const relock = markCommandSent(unlocked(), NOW + 2_500, 'stop');
      const r = AP(hb(NOW + 3_000 + COMMAND_ACK_GRACE_MS, true), relock, NOW + 3_000 + COMMAND_ACK_GRACE_MS);
      expect(r.staleAfterReply).toBe(false);
      expect(currentBlocked(r.memory)).toBe(true);
      const rc = AP(hb(NOW + 3_000, true), markReconnected(unlocked()), NOW + 3_000);
      expect(rc.staleAfterReply).toBe(false);
      expect(currentBlocked(rc.memory)).toBe(true);
    });

    it('nada nesta janela confirma um corte sem resposta: sem resposta aceita, status blocked:true segue a regra P2', () => {
      const sent = markCommandSent(freeNow, NOW + 1_000, 'stop');
      const early = AP(hb(NOW + 2_000, true), sent, NOW + 2_000);
      expect(early.staleAfterReply).toBe(false);
      expect(currentBlocked(early.memory)).toBeUndefined(); // dentro da folga de 5 s do envio, sem resposta: não vale
    });
  });
});

describe('qualidade do GPS: satélites, modo de economia e âncora do movimento travada (bancada 2026-11-04)', () => {
  const T = Date.parse('2026-11-04T13:00:00Z');
  const at = (ms: number) => new Date(ms).toISOString();
  const LAT = -23.5614;
  /** Latitude `m` metros ao norte de LAT. */
  const north = (m: number) => LAT + m / 111_195;
  /** Posição GT06 válida (parada por padrão), com o bit de corte fresco e satélites. */
  const fix = (ms: number, lat: number, sat: number | undefined = 9, speed = 0, blocked = true): TraccarPosition =>
    pos({ fixTime: at(ms), serverTime: at(ms), latitude: lat, speed, attributes: { blocked, ignition: false, power: 72, ...(sat === undefined ? {} : { sat }) } });
  /** Destravada (para a segunda guarda do corte). */
  const free = (ms: number, sat: number | undefined, speed = 0) => fix(ms, LAT, sat, speed, false);
  /** Heartbeat 0x13 com o byte terminal info cru (`attributes.status` do decoder GT06 do Traccar). */
  const hb = (ms: number, status: number | undefined): TraccarPosition =>
    pos({ outdated: true, fixTime: at(T - 3_600_000), serverTime: at(ms), speed: 0, attributes: { blocked: true, ignition: false, ...(status === undefined ? {} : { status }) } });
  const run = (steps: Array<[TraccarPosition, number]>, mem: DeviceMemory = {}) => {
    const out: Array<ReturnType<typeof applyPosition>> = [];
    for (const [p, now] of steps) {
      const r = applyPosition(p, mem, '72v', now);
      out.push(r);
      mem = r.memory;
    }
    return out;
  };

  it('limiares documentados: 5 satélites, 60 s entre posições boas, status de até 3 min', () => {
    expect(MIN_GPS_SATELLITES).toBe(5);
    expect(LOCK_ANCHOR_MAX_GAP_MS).toBe(60_000);
    expect(GPS_STATUS_FRESH_MS).toBe(180_000);
  });

  it('attributes.sat → telemetria.satelites (schema do contrato); ausente ou inválido → sem o campo', () => {
    const r = AP(pos({ attributes: { ...pos().attributes, sat: 14 } }), {});
    expect(r.telemetry?.satelites).toBe(14);
    expect(validTelemetry(r.telemetry)).toBe(true);
    expect(AP(pos(), {}).telemetry).not.toHaveProperty('satelites');
    for (const sat of [-1, 3.5, '7', Number.NaN]) expect(AP(pos({ attributes: { ...pos().attributes, sat } }), {}).telemetry).not.toHaveProperty('satelites');
  });

  it('posição fraca (< 5 satélites) parada: sai na telemetria, mas não é amostra parada da segunda guarda (só dificulta o corte)', () => {
    const [weak] = run([[free(T, 4), T]]);
    expect(weak.telemetry).toMatchObject({ satelites: 4, velocidade_kmh: 0 });
    expect(weak.memory.last).toBeUndefined();
    expect(cutRefusal({ online: true, mem: weak.memory, now: T })).toBe('no_position');
    // Boa e parada → pode cortar; fraca parada depois → recusa de novo. Fraca em movimento vence a parada guardada.
    const [good, weak2] = run([[free(T, 5), T], [free(T + 1_000, 3), T + 1_000]]);
    expect(cutRefusal({ online: true, mem: good.memory, now: T })).toBeNull();
    expect(cutRefusal({ online: true, mem: weak2.memory, now: T + 1_000 })).toBe('no_position');
    const [, moving] = run([[free(T, 9), T], [free(T + 1_000, 2, 5), T + 1_000]]);
    expect(cutRefusal({ online: true, mem: moving.memory, now: T + 1_000 })).toBe('moving');
    // Sem o campo (simulador, rastreador antigo): como antes.
    const [legacy] = run([[free(T, undefined), T]]);
    expect(cutRefusal({ online: true, mem: legacy.memory, now: T })).toBeNull();
  });

  it('posição fraca não gera movimento_sem_aluguel e a boa seguinte reancora', () => {
    const r = run([
      [fix(T, north(0)), T],
      [fix(T + 10_000, north(40), 3), T + 10_000], // salto de posição fraca
      [fix(T + 20_000, north(40)), T + 20_000], // primeira boa depois da fraca: reancora
      [fix(T + 30_000, north(65)), T + 30_000], // +25 m em 10 s entre duas boas
    ]);
    expect(r.map((x) => x.movedWhileLocked)).toEqual([false, false, false, true]);
  });

  it('sequência real: âncora, 1 h sem fix (heartbeats com o GPS desligado), fix 40 m adiante → sem alerta; +25 m em 10 s → alerta', () => {
    const steps: Array<[TraccarPosition, number]> = [[fix(T, north(0), 9), T]];
    for (let ms = T + 60_000; ms < T + 3_600_000; ms += 60_000) steps.push([hb(ms, 0x84), ms]); // 0x84: corte + GPS desligado, ACC desligada
    steps.push([fix(T + 3_600_000, north(40), 7), T + 3_600_000]);
    steps.push([fix(T + 3_610_000, north(65), 7), T + 3_610_000]);
    const r = run(steps);
    expect(r.filter((x) => x.movedWhileLocked).length).toBe(1);
    expect(r[r.length - 2].movedWhileLocked).toBe(false);
    expect(r[r.length - 1].movedWhileLocked).toBe(true);
  });

  it('sem o byte de status: a última boa há mais de 60 s também reancora (a âncora é de antes do período sem fix)', () => {
    const r = run([
      [fix(T, north(0)), T],
      [hb(T + 60_000, undefined), T + 60_000],
      [fix(T + 61_000, north(40)), T + 61_000],
      [fix(T + 71_000, north(65)), T + 71_000],
    ]);
    expect(r.map((x) => x.movedWhileLocked)).toEqual([false, false, false, true]);
  });

  it('heartbeat com o GPS desligado quebra a cadeia (a boa seguinte reancora); GPS ligado não quebra', () => {
    const off = run([
      [fix(T, north(0)), T],
      [hb(T + 5_000, 0x84), T + 5_000],
      [fix(T + 10_000, north(30)), T + 10_000],
    ]);
    expect(off.map((x) => x.movedWhileLocked)).toEqual([false, false, false]);
    const on = run([
      [fix(T, north(0)), T],
      [hb(T + 5_000, 0xc6), T + 5_000],
      [fix(T + 10_000, north(30)), T + 10_000],
    ]);
    expect(on[2].movedWhileLocked).toBe(true);
  });

  describe('furto com o GPS fora (revisão de segurança): a última posição boa travada não se perde', () => {
    it('limiar de 150 m depois de lacuna/quebra da cadeia (erro do primeiro fix) e para posição fraca', () => {
      expect(LOCK_REANCHOR_ALARM_M).toBe(150);
    });

    it('furto durante o sono: âncora, GPS desliga 30 min, volta 600 m adiante → alarme', () => {
      const steps: Array<[TraccarPosition, number]> = [[fix(T, north(0)), T]];
      for (let ms = T + 60_000; ms <= T + 1_800_000; ms += 60_000) steps.push([hb(ms, 0x84), ms]);
      steps.push([fix(T + 1_810_000, north(600), 9), T + 1_810_000]);
      const r = run(steps);
      expect(r[r.length - 1].movedWhileLocked).toBe(true);
      expect(r.filter((x) => x.movedWhileLocked).length).toBe(1);
    });

    it('furto em van: fixes fracos e inválidos até 2 km adiante → alarme por fraca > 150 m (uma vez a cada 150 m) e no primeiro fix bom', () => {
      const steps: Array<[TraccarPosition, number]> = [[fix(T, north(0)), T]];
      steps.push([pos({ valid: false, fixTime: at(T + 10_000), serverTime: at(T + 10_000), attributes: { blocked: true } }), T + 10_000]);
      steps.push([fix(T + 20_000, north(100), 3), T + 20_000]); // fraca a 100 m: nada
      steps.push([fix(T + 30_000, north(400), 3), T + 30_000]); // fraca a 400 m: alarme
      steps.push([fix(T + 40_000, north(450), 2), T + 40_000]); // 50 m da fraca do alarme: não repete
      steps.push([pos({ valid: false, fixTime: at(T + 50_000), serverTime: at(T + 50_000), attributes: { blocked: true } }), T + 50_000]);
      steps.push([fix(T + 600_000, north(2_000), 9), T + 600_000]); // primeiro bom no destino
      const r = run(steps);
      expect(r.map((x) => x.movedWhileLocked)).toEqual([false, false, false, true, false, false, true]);
    });

    it('arrasto a pé com fix fraco intermitente: boa, fraca, boa… a 150+ m da última boa → alarme', () => {
      const r = run([
        [fix(T, north(0)), T],
        [fix(T + 10_000, north(15), 3), T + 10_000],
        [fix(T + 80_000, north(160)), T + 80_000], // lacuna > 60 s e quebra pela fraca: compara com a última boa (0 m) a 150 m
      ]);
      expect(r.map((x) => x.movedWhileLocked)).toEqual([false, false, true]);
    });

    it('bancada: lacuna de 1 h, volta 40 m adiante → sem alarme (menos de 150 m)', () => {
      const steps: Array<[TraccarPosition, number]> = [[fix(T, north(0)), T]];
      for (let ms = T + 60_000; ms < T + 3_600_000; ms += 60_000) steps.push([hb(ms, 0x84), ms]);
      steps.push([fix(T + 3_600_000, north(40)), T + 3_600_000]);
      expect(run(steps).some((x) => x.movedWhileLocked)).toBe(false);
    });

    it('destravou: status com o corte solto limpa a última posição boa; travar de novo longe não alarma', () => {
      const unlocked = pos({ outdated: true, fixTime: at(T - 3_600_000), serverTime: at(T + 60_000), attributes: { blocked: false } });
      const relocked = (ms: number, lat: number) => fix(ms, lat);
      const r = run([
        [fix(T, north(0)), T],
        [unlocked, T + 60_000],
        [relocked(T + 600_000, north(5_000)), T + 600_000],
      ]);
      expect(r[1].memory.lastGoodLocked).toBeUndefined();
      expect(r[2].movedWhileLocked).toBe(false);
    });

    it('reconexão ou comando não apagam a última posição boa travada (só o corte solto)', () => {
      const [a] = run([[fix(T, north(0)), T]]);
      expect(a.memory.lastGoodLocked).toMatchObject({ lat: north(0) });
      expect(markReconnected(a.memory).lastGoodLocked).toEqual(a.memory.lastGoodLocked);
      expect(markCommandSent(a.memory, T, 'stop').lastGoodLocked).toEqual(a.memory.lastGoodLocked);
    });
  });

  it('arrasto lento na mesma cadeia (12 m a cada 10 s, todas boas) ainda alerta pelo acumulado desde a âncora', () => {
    const r = run([
      [fix(T, north(0)), T],
      [fix(T + 10_000, north(12)), T + 10_000],
      [fix(T + 20_000, north(24)), T + 20_000],
    ]);
    expect(r.map((x) => x.movedWhileLocked)).toEqual([false, false, true]);
  });

  describe('gpsSleepOf (byte terminal info do heartbeat: bit 6 = GPS, bit 1 = ACC)', () => {
    const sleepAfter = (status: unknown, now = T) => gpsSleepOf(AP(pos({ outdated: true, serverTime: at(T), attributes: { status } }), {}, T).memory, now);

    it('GPS desligado com a ACC desligada (0x04, bancada 11:48; 0x84 com o corte) → true', () => {
      expect(sleepAfter(0x04)).toBe(true);
      expect(sleepAfter(0x84)).toBe(true);
    });

    it('GPS ligado (0xc6, bancada 13:38; 0x44) ou ACC ligada (0x06) → false', () => {
      expect(sleepAfter(0xc6)).toBe(false);
      expect(sleepAfter(0x44)).toBe(false);
      expect(sleepAfter(0x06)).toBe(false);
    });

    it('sem status, status inválido ou heartbeat de mais de 3 min → desconhecido', () => {
      expect(gpsSleepOf({}, T)).toBeUndefined();
      for (const bad of [undefined, -1, 256, 3.5, '4']) expect(sleepAfter(bad)).toBeUndefined();
      expect(sleepAfter(0x04, T + GPS_STATUS_FRESH_MS)).toBe(true);
      expect(sleepAfter(0x04, T + GPS_STATUS_FRESH_MS + 1)).toBeUndefined();
    });
  });
});
