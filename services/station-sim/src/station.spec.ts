import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { loadConfig, type SimConfig } from './config';
import { parseCommand, thingFromCommandTopic, type StationEvent } from './protocol';
import { StationSim } from './station';

const SCHEMAS = join(__dirname, '../../../packages/contracts/schemas');
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const f of readdirSync(SCHEMAS).filter((x) => x.startsWith('estacao-'))) ajv.addSchema(JSON.parse(readFileSync(join(SCHEMAS, f), 'utf8')), f);
const validEvent = ajv.getSchema('estacao-eventos.schema.json')!;
const validCommand = ajv.getSchema('estacao-comandos.schema.json')!;

const STATION = 'd0000000-0000-4000-8000-000000000001';
const THING = `station-${STATION}`;
const SWAP = '5b0e7c1a-1111-4111-8111-111111111111';
const SWAP2 = '5b0e7c1a-2222-4222-8222-222222222222';

/** Relógio manual: os passos só andam com `tick`. */
function harness(over: Partial<SimConfig> = {}) {
  const cfg: SimConfig = { ...loadConfig({ STATION_SIM_ALL: 'true' }, []), stepMs: 100, ...over };
  let now = 0;
  let timers: Array<{ at: number; fn: () => void }> = [];
  const events: Array<[string, StationEvent]> = [];
  const sim = new StationSim(cfg, (t, e) => events.push([t, e]), () => undefined, { setTimeout: (fn, ms) => timers.push({ at: now + ms, fn }) }, () => now);
  const tick = (ms: number) => {
    const end = now + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > end) break;
      timers = timers.slice(1);
      now = next.at;
      next.fn();
    }
    now = end;
  };
  return { sim, events, tick, types: () => events.map(([, e]) => e.type) };
}

const open = { commandId: `${SWAP}:open_slot`, swapId: SWAP, action: 'open_slot' as const, expectedSerial: 'BAT-00001' };
const release = { commandId: `${SWAP}:release_battery`, swapId: SWAP, action: 'release_battery' as const, serialHint: 'BT-S1001' };

describe('StationSim — modo automático', () => {
  it('abre a vaga, devolve a bateria esperada (carga baixa), fecha e libera a sugerida; eventos válidos pelo schema', () => {
    const { sim, events, tick, types } = harness();
    sim.onCommand(THING, open);
    tick(99);
    expect(events).toEqual([]);
    tick(300);
    expect(types()).toEqual(['slot_opened', 'battery_returned', 'slot_closed']);
    expect(events[0][1].slotNumber).toBe(1);
    expect(events[1][1]).toEqual(expect.objectContaining({ serial: 'BAT-00001' }));
    expect(events[1][1].pct).toBeGreaterThanOrEqual(5);
    expect(events[1][1].pct).toBeLessThanOrEqual(25);
    sim.onCommand(THING, release);
    tick(100);
    expect(types()).toEqual(['slot_opened', 'battery_returned', 'slot_closed', 'battery_released']);
    expect(events[3]).toEqual([THING, expect.objectContaining({ serial: 'BT-S1001', swapId: SWAP })]);
    for (const [, e] of events) expect(validEvent(e)).toBe(true);
  });

  it('sem sugestão, libera do estoque simulado da estação', () => {
    const { sim, events, tick } = harness();
    sim.onCommand(THING, { ...open, expectedSerial: undefined });
    tick(300);
    expect(events[1][1].serial).toMatch(/^SIM-RET-\d{6}$/);
    sim.onCommand(THING, { ...release, serialHint: undefined });
    tick(100);
    expect(events[3][1].serial).toBe('SIM-0001-001');
  });

  it('comando repetido é ignorado; liberar sem devolução é recusado (segurança)', () => {
    const { sim, tick, types } = harness();
    sim.onCommand(THING, { ...release, swapId: SWAP2, commandId: `${SWAP2}:release_battery` });
    sim.onCommand(THING, open);
    sim.onCommand(THING, open);
    tick(150);
    sim.onCommand(THING, release); // ainda aguardando devolução
    tick(1000);
    expect(types()).toEqual(['slot_opened', 'battery_returned', 'slot_closed']);
  });

  it('duas trocas na mesma estação usam vagas diferentes; filtro por estação', () => {
    const { sim, events, tick } = harness({ stations: [STATION] });
    sim.onCommand(THING, open);
    sim.onCommand(THING, { ...open, swapId: SWAP2, commandId: `${SWAP2}:open_slot` });
    sim.onCommand('station-d0000000-0000-4000-8000-000000000009', { ...open, swapId: SWAP2, commandId: 'outra' });
    tick(100);
    expect(events.map(([, e]) => e.slotNumber)).toEqual([1, 2]);
  });
});

describe('StationSim — abort_swap (fix 1, I2)', () => {
  const abort = (swapId: string, slotNumber?: number) => ({ commandId: `${swapId}:abort_swap`, swapId, action: 'abort_swap' as const, slotNumber });

  it('vaga aberta: fecha e confirma com slot_closed; nada de devolução nem liberação depois', () => {
    const { sim, tick, types, events } = harness();
    sim.onCommand(THING, open);
    tick(100); // slot_opened
    sim.onCommand(THING, abort(SWAP, 1));
    tick(1000);
    expect(types()).toEqual(['slot_opened', 'slot_closed']);
    sim.onCommand(THING, release);
    tick(1000);
    expect(types()).toEqual(['slot_opened', 'slot_closed']);
    for (const [, e] of events) expect(validEvent(e)).toBe(true);
  });

  it('vaga ainda abrindo: não chega a abrir, só confirma o fechamento; troca desconhecida também confirma', () => {
    const { sim, tick, types } = harness();
    sim.onCommand(THING, open);
    sim.onCommand(THING, abort(SWAP));
    tick(1000);
    expect(types()).toEqual(['slot_closed']);
    sim.onCommand(THING, abort(SWAP2));
    expect(types()).toEqual(['slot_closed', 'slot_closed']);
  });

  it('o comando abort_swap da API passa no schema', () => {
    expect(validCommand({ ...abort(SWAP, 2), ts: '2026-10-22T15:00:00.000Z' })).toBe(true);
    expect(parseCommand({ ...abort(SWAP, 2), ts: 'x' })).toEqual(abort(SWAP, 2));
  });
});

describe('StationSim — modo manual', () => {
  it('a vaga abre sozinha; devolver (d), liberar (l) e fechar vazia (f) pelo teclado', () => {
    const { sim, tick, types, events } = harness({ mode: 'manual' });
    sim.onCommand(THING, open);
    tick(5000);
    expect(types()).toEqual(['slot_opened']);
    expect(sim.release()).toBeNull();
    expect(sim.returnBattery()?.swapId).toBe(SWAP);
    tick(1000);
    expect(types()).toEqual(['slot_opened', 'battery_returned', 'slot_closed']);
    sim.onCommand(THING, release);
    tick(5000);
    expect(types()).toHaveLength(3);
    expect(sim.release()?.swapId).toBe(SWAP);
    expect(events[3][1].serial).toBe('BT-S1001');

    sim.onCommand(THING, { ...open, swapId: SWAP2, commandId: `${SWAP2}:open_slot` });
    tick(100);
    expect(sim.closeEmpty()?.swapId).toBe(SWAP2);
    expect(types().slice(-2)).toEqual(['slot_opened', 'slot_closed']);
    expect(sim.returnBattery()).toBeNull();
  });
});

describe('protocolo e configuração', () => {
  it('tópico de comandos e validação do comando (o que a API publica passa no schema)', () => {
    expect(thingFromCommandTopic(`estacoes/${THING}/comandos`)).toBe(THING);
    expect(thingFromCommandTopic(`estacoes/${THING}/eventos`)).toBeNull();
    expect(thingFromCommandTopic('motos/moto-0001/comandos')).toBeNull();
    const wire = { ...open, ts: '2026-10-22T15:00:00.000Z' };
    expect(validCommand(wire)).toBe(true);
    expect(parseCommand(wire)).toEqual(open);
    expect(parseCommand({ ...wire, action: 'explodir' })).toBeNull();
    expect(parseCommand({ ...wire, swapId: 'x' })).toBeNull();
    expect(parseCommand('lixo')).toBeNull();
  });

  it('fix 1 (I5): sem STATION_SIM_STATIONS só sobe com STATION_SIM_ALL=true (ou --all); nunca contra o IoT Core', () => {
    expect(() => loadConfig({}, [])).toThrow(/STATION_SIM_STATIONS|STATION_SIM_ALL/);
    expect(() => loadConfig({ STATION_SIM_ALL: 'sim' }, [])).toThrow(/STATION_SIM_ALL/);
    expect(loadConfig({}, ['--all']).stations).toEqual([]);
    expect(loadConfig({ STATION_SIM_STATIONS: STATION }, []).stations).toEqual([STATION]);
    expect(() => loadConfig({ STATION_SIM_ALL: 'true', MQTT_URL: 'mqtts://abc-ats.iot.sa-east-1.amazonaws.com:8883' }, [])).toThrow(/amazonaws\.com/);
    expect(() => loadConfig({ STATION_SIM_STATIONS: STATION, MQTT_URL: 'mqtts://X.IOT.SA-EAST-1.AMAZONAWS.COM' }, [])).toThrow(/amazonaws/);
  });

  it('config: padrões, --manual e erros', () => {
    expect(loadConfig({ STATION_SIM_ALL: 'true' }, [])).toEqual(expect.objectContaining({ mode: 'auto', stepMs: 2000, slots: 12, stations: [], mqttUrl: 'mqtt://localhost:1883' }));
    expect(loadConfig({}, ['--manual', '--all']).mode).toBe('manual');
    expect(loadConfig({ STATION_SIM_MODE: 'manual', STATION_SIM_STATIONS: `${STATION.toUpperCase()}` }, []).stations).toEqual([STATION]);
    expect(() => loadConfig({ STATION_SIM_MODE: 'x' }, [])).toThrow(/STATION_SIM_MODE/);
    expect(() => loadConfig({ STATION_SIM_ALL: 'true', STATION_SIM_STEP_MS: '10' }, [])).toThrow(/STATION_SIM_STEP_MS/);
    expect(() => loadConfig({ STATION_SIM_STATIONS: 'abc' }, [])).toThrow(/STATION_SIM_STATIONS/);
  });
});
