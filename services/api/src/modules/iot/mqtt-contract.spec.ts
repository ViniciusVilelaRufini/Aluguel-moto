import { parseDeviceEvent, parseReported, parseTelemetry, thingFromTopic, TOPICS } from './mqtt-contract';

const telemetry = { lat: -23.56, lng: -46.69, velocidade_kmh: 18.5, bateria_pct: 76, travada: false, ignicao: true, sinal: 4, timestamp: '2026-10-21T15:00:00.000Z' };

describe('mqtt-contract', () => {
  it('tópicos', () => {
    expect(TOPICS.telemetry('moto-0001')).toBe('motos/moto-0001/telemetria');
    expect(TOPICS.events('moto-0001')).toBe('motos/moto-0001/eventos');
    expect(TOPICS.commands('moto-0001')).toBe('motos/moto-0001/comandos');
    expect(TOPICS.shadowUpdate('moto-0001')).toBe('$aws/things/moto-0001/shadow/update');
    expect(TOPICS.shadowDelta('moto-0001')).toBe('$aws/things/moto-0001/shadow/update/delta');
    expect(thingFromTopic('motos/moto-0007/telemetria')).toBe('moto-0007');
    expect(thingFromTopic('$aws/things/moto-0007/shadow/update')).toBe('moto-0007');
    expect(thingFromTopic('$aws/events/presence/connected/moto-0007')).toBe('moto-0007');
    expect(thingFromTopic('outro/x')).toBeNull();
  });

  it('telemetria válida', () => {
    expect(parseTelemetry(telemetry)).toEqual(telemetry);
  });

  it.each([
    ['lat fora', { ...telemetry, lat: -91 }],
    ['lng texto', { ...telemetry, lng: '-46' }],
    ['velocidade negativa', { ...telemetry, velocidade_kmh: -1 }],
    ['bateria > 100', { ...telemetry, bateria_pct: 101 }],
    ['sinal 6', { ...telemetry, sinal: 6 }],
    ['sinal fracionário', { ...telemetry, sinal: 2.5 }],
    ['sem timestamp', { ...telemetry, timestamp: undefined }],
    ['timestamp inválido', { ...telemetry, timestamp: 'ontem' }],
    ['travada não booleano', { ...telemetry, travada: 'sim' }],
    ['nulo', null],
  ])('telemetria inválida: %s', (_n, v) => {
    expect(parseTelemetry(v)).toBeNull();
  });

  it('evento', () => {
    expect(parseDeviceEvent({ tipo: 'queda', timestamp: '2026-10-21T15:00:00Z' })).toEqual({ tipo: 'queda', timestamp: '2026-10-21T15:00:00Z' });
    expect(parseDeviceEvent({ tipo: 'explosao', timestamp: '2026-10-21T15:00:00Z' })).toBeNull();
  });

  it('reported: aceita só campos conhecidos e válidos', () => {
    expect(parseReported({ state: { reported: { travada: true, limite_kmh: 8, velocidade_kmh: 4.2, firmware: '1.2.0', modo_roubada: false, extra: 1 } } })).toEqual({
      travada: true,
      limite_kmh: 8,
      velocidade_kmh: 4.2,
      firmware: '1.2.0',
      modo_roubada: false,
    });
    expect(parseReported({ state: { reported: { limite_kmh: 40 } } })).toEqual({});
    expect(parseReported({ state: { desired: { travada: true } } })).toBeNull();
  });
});
