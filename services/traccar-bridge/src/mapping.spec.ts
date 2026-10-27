import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyPosition, currentBlocked, markReconnected, toDeviceEvents, type DeviceMemory } from './mapping';
import type { TraccarEvent, TraccarPosition } from './traccar/types';

const schema = (name: string) => JSON.parse(readFileSync(join(__dirname, '../../../packages/contracts/schemas', name), 'utf8'));
const ajv = addFormats(new Ajv2020({ strict: false }));
const validTelemetry = ajv.compile(schema('telemetria.schema.json'));
const validEvent = ajv.compile(schema('eventos.schema.json'));

const pos = (over: Partial<TraccarPosition> = {}): TraccarPosition => ({
  id: 1, deviceId: 1, protocol: 'gt06', serverTime: '2026-10-27T12:00:01.000Z', deviceTime: '2026-10-27T12:00:00.000Z', fixTime: '2026-10-27T12:00:00.000Z',
  outdated: false, valid: true, latitude: -23.5614, longitude: -46.6914, speed: 10.79914, course: 90,
  attributes: { ignition: true, blocked: false, rssi: 4, power: 72 }, ...over,
});

describe('applyPosition (spec GT06 §6.2)', () => {
  it('posição válida → telemetria do contrato: nós × 1,852, timestamp = fixTime, blocked/ignition/rssi/power', () => {
    const r = applyPosition(pos(), {}, '72v');
    expect(r.telemetry).toEqual({ lat: -23.5614, lng: -46.6914, velocidade_kmh: 20, bateria_pct: 50, travada: false, ignicao: true, sinal: 5, timestamp: '2026-10-27T12:00:00.000Z' });
    expect(validTelemetry(r.telemetry)).toBe(true);
    expect(r.memory.last).toEqual({ fixTime: Date.parse('2026-10-27T12:00:00.000Z'), speedKmh: 20, lat: -23.5614, lng: -46.6914 });
  });

  it('heartbeat (outdated) não vira telemetria, mas o bit de corte e a ignição valem para a próxima', () => {
    const hb = applyPosition(pos({ outdated: true, attributes: { blocked: true, ignition: false } }), {}, '72v');
    expect(hb.telemetry).toBeNull();
    expect(hb.memory).toMatchObject({ blocked: true, ignition: false });
    const next = applyPosition(pos({ fixTime: '2026-10-27T12:00:05.000Z', speed: 0, attributes: {} }), hb.memory, '72v');
    expect(next.telemetry).toMatchObject({ travada: true, ignicao: false, velocidade_kmh: 0, sinal: 0, bateria_pct: 0 });
  });

  it('valid=false, fixTime repetido ou mais velho → sem telemetria', () => {
    expect(applyPosition(pos({ valid: false }), {}, '72v').telemetry).toBeNull();
    const first = applyPosition(pos(), {}, '72v');
    expect(applyPosition(pos(), first.memory, '72v').telemetry).toBeNull();
    expect(applyPosition(pos({ fixTime: '2026-10-27T11:59:59.000Z' }), first.memory, '72v').telemetry).toBeNull();
  });

  it('fora do schema (velocidade > 200 km/h) → invalid, sem telemetria e sem atualizar a última posição', () => {
    const r = applyPosition(pos({ speed: 200 }), {}, '72v');
    expect(r).toMatchObject({ telemetry: null, invalid: true });
    expect(r.memory.last).toBeUndefined();
  });

  it('tensão fora da curva (DC-DC 12 V) mantém o último % válido', () => {
    const a = applyPosition(pos(), {}, '72v');
    const b = applyPosition(pos({ fixTime: '2026-10-27T12:00:05.000Z', attributes: { power: 12.1 } }), a.memory, '72v');
    expect(b.telemetry?.bateria_pct).toBe(50);
  });

  it('deslocamento > 20 m com o corte ativo → movedWhileLocked uma vez por âncora', () => {
    let mem: DeviceMemory = applyPosition(pos({ speed: 0, attributes: { blocked: true } }), {}, '72v').memory;
    const r1 = applyPosition(pos({ fixTime: '2026-10-27T12:00:05.000Z', latitude: -23.5613, speed: 0, attributes: {} }), mem, '72v'); // ~11 m
    expect(r1.movedWhileLocked).toBe(false);
    mem = r1.memory;
    const r2 = applyPosition(pos({ fixTime: '2026-10-27T12:00:10.000Z', latitude: -23.5611, speed: 0, attributes: {} }), mem, '72v'); // ~33 m da âncora
    expect(r2.movedWhileLocked).toBe(true);
    const r3 = applyPosition(pos({ fixTime: '2026-10-27T12:00:15.000Z', latitude: -23.5611, speed: 0, attributes: {} }), r2.memory, '72v');
    expect(r3.movedWhileLocked).toBe(false);
  });
});

describe('reconexão: travada nunca vem de memória velha (decisão 4)', () => {
  const locked: DeviceMemory = applyPosition(pos({ speed: 0, attributes: { blocked: true, ignition: false } }), {}, '72v').memory;

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

  it('posição sem atributo blocked após reconectar não reaproveita o bit antigo (desconhecida = false na telemetria, nunca true)', () => {
    const re = markReconnected(locked);
    const r = applyPosition(pos({ fixTime: '2026-10-27T12:01:00.000Z', speed: 0, attributes: {} }), re, '72v');
    expect(r.telemetry?.travada).toBe(false);
    expect(currentBlocked(r.memory)).toBeUndefined();
    expect(r.memory.awaitingStatus).toBe(true);
  });

  it('o primeiro attributes.blocked após reconectar volta a valer (heartbeat também)', () => {
    const re = markReconnected(locked);
    const hb = applyPosition(pos({ outdated: true, attributes: { blocked: true } }), re, '72v');
    expect(currentBlocked(hb.memory)).toBe(true);
    expect(hb.memory.awaitingStatus).toBe(false);
    const hb2 = applyPosition(pos({ outdated: true, attributes: { blocked: false } }), re, '72v');
    expect(currentBlocked(hb2.memory)).toBe(false);
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
