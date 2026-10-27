import { knotsToKmh, rssiToSignal, voltageToPct } from './units';

describe('unidades', () => {
  it('nós → km/h (× 1,852, uma casa)', () => {
    expect(knotsToKmh(10.79914)).toBe(20);
    expect(knotsToKmh(2 / 1.852)).toBe(2);
    expect(knotsToKmh(0)).toBe(0);
  });
  it('rssi do Traccar (0–4 do GT06 ou 0–31 CSQ) → sinal 0–5 do contrato', () => {
    expect([0, 1, 2, 3, 4].map(rssiToSignal)).toEqual([0, 1, 3, 4, 5]);
    expect(rssiToSignal(31)).toBe(5);
    expect(rssiToSignal(15)).toBe(2);
    expect(rssiToSignal(-1)).toBe(0);
    expect(rssiToSignal(Number.NaN)).toBe(0);
  });
  it('tensão → % pela curva do pack (aproximado); fora da faixa (ex.: 12 V de DC-DC) = sem leitura', () => {
    expect(voltageToPct(84, '72v')).toBe(100);
    expect(voltageToPct(72, '72v')).toBe(50);
    expect(voltageToPct(60, '72v')).toBe(0);
    expect(voltageToPct(57, '60v')).toBe(47);
    expect(voltageToPct(12, '72v')).toBeNull();
    expect(voltageToPct(95, '72v')).toBeNull();
  });
});
