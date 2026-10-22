import { parseStationEvent, STATION_SERVER_SUBSCRIPTIONS, STATION_TOPICS, stationThingFromTopic } from './station-mqtt-contract';

const SWAP = '5b0e7c1a-1111-4111-8111-111111111111';
const ts = '2026-10-22T15:00:00.000Z';

describe('contrato MQTT das estações', () => {
  it('tópicos no padrão das motos (`estacoes/{thing}/comandos|eventos`)', () => {
    expect(STATION_TOPICS.commands('station-abc')).toBe('estacoes/station-abc/comandos');
    expect(STATION_TOPICS.events('station-abc')).toBe('estacoes/station-abc/eventos');
    expect(STATION_SERVER_SUBSCRIPTIONS).toEqual(['estacoes/+/eventos']);
    expect(stationThingFromTopic('estacoes/station-abc/eventos')).toBe('station-abc');
    expect(stationThingFromTopic('motos/moto-1/eventos')).toBeNull();
    expect(stationThingFromTopic('estacoes//eventos')).toBeNull();
  });

  it('eventos válidos', () => {
    expect(parseStationEvent({ type: 'slot_opened', swapId: SWAP, slotNumber: 3, ts })).toEqual({ type: 'slot_opened', swapId: SWAP, slotNumber: 3, ts });
    expect(parseStationEvent({ type: 'battery_returned', swapId: SWAP, serial: 'BAT-00001', pct: 18, ts })).toEqual({ type: 'battery_returned', swapId: SWAP, serial: 'BAT-00001', pct: 18, ts });
    expect(parseStationEvent({ type: 'slot_closed', swapId: SWAP, ts })).toEqual({ type: 'slot_closed', swapId: SWAP, ts });
    expect(parseStationEvent({ type: 'battery_released', swapId: SWAP, serial: 'BT-S1001', ts })).toEqual({ type: 'battery_released', swapId: SWAP, serial: 'BT-S1001', ts });
  });

  it('recusa evento malformado (campos obrigatórios por tipo, faixas e tipos)', () => {
    const bad = [
      null, 'x', {}, { type: 'explodiu', swapId: SWAP, ts },
      { type: 'slot_opened', swapId: 'nao-uuid', slotNumber: 1, ts },
      { type: 'slot_opened', swapId: SWAP, ts },
      { type: 'slot_opened', swapId: SWAP, slotNumber: 0, ts },
      { type: 'battery_returned', swapId: SWAP, serial: 'BAT-1', ts },
      { type: 'battery_returned', swapId: SWAP, serial: 'BAT-1', pct: 101, ts },
      { type: 'battery_returned', swapId: SWAP, serial: '', pct: 10, ts },
      { type: 'battery_released', swapId: SWAP, ts },
      { type: 'battery_released', swapId: SWAP, serial: 'x'.repeat(65), ts },
      { type: 'slot_closed', swapId: SWAP, ts: 'ontem' },
    ];
    for (const b of bad) expect(parseStationEvent(b)).toBeNull();
  });
});
