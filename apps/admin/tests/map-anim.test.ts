import { describe, expect, it } from 'vitest';
import { anyMoved, batteryHex, interpolatePositions, positionsOf } from '@/lib/map-anim';

const from = positionsOf([{ id: 'a', lng: -46.6, lat: -23.5 }, { id: 'b', lng: -46.7, lat: -23.6 }]);

describe('interpolação de posição das motos', () => {
  it('meio caminho entre a posição desenhada e a nova', () => {
    const [a] = interpolatePositions(from, [{ id: 'a', lng: -46.602, lat: -23.502 }], 0.5);
    expect(a.lng).toBeCloseTo(-46.601, 6);
    expect(a.lat).toBeCloseTo(-23.501, 6);
  });
  it('t = 1 devolve exatamente o destino e preserva os demais campos', () => {
    const to = [{ id: 'a', lng: -46.602, lat: -23.502, status: 'rented' }];
    expect(interpolatePositions(from, to, 1)[0]).toBe(to[0]);
  });
  it('moto nova aparece direto no destino', () => {
    const [c] = interpolatePositions(from, [{ id: 'c', lng: -46.5, lat: -23.4 }], 0.3);
    expect([c.lng, c.lat]).toEqual([-46.5, -23.4]);
  });
  it('salto longo (volta de sinal) não é animado', () => {
    const [a] = interpolatePositions(from, [{ id: 'a', lng: -46.5, lat: -23.5 }], 0.5);
    expect(a.lng).toBe(-46.5);
  });
  it('detecta se alguma moto se moveu', () => {
    expect(anyMoved(from, [{ id: 'a', lng: -46.6, lat: -23.5 }])).toBe(false);
    expect(anyMoved(from, [{ id: 'a', lng: -46.6001, lat: -23.5 }])).toBe(true);
  });
  it('anel de bateria segue a regra da pílula', () => {
    expect(batteryHex(90)).toBe('#34C25C');
    expect(batteryHex(50)).toBe('#FBC531');
    expect(batteryHex(21)).toBe('#FBC531');
    expect(batteryHex(20)).toBe('#F2665A');
  });
});
