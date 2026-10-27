import { MIN_TRACCAR_NOQUEUE, supportsNoQueue } from './version';

describe('supportsNoQueue (C1: Traccar ≥ 6.7.0 respeita attributes.noQueue)', () => {
  it('mínimo 6.7.0', () => expect(MIN_TRACCAR_NOQUEUE).toBe('6.7.0'));
  it.each(['6.7.0', '6.7', '6.7.1', '6.16.0', '7.0', '6.8-SNAPSHOT'])('%s → suporta', (v) => expect(supportsNoQueue(v)).toBe(true));
  it.each(['6.5', '6.6', '6.6.9', '5.12', '6'])('%s → não suporta', (v) => expect(supportsNoQueue(v)).toBe(false));
  it.each([undefined, null, '', 'abc', 6.7, 'v6.7.0'])('desconhecida/ilegível (%p) → não suporta', (v) => expect(supportsNoQueue(v)).toBe(false));
});
