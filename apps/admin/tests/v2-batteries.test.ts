import { describe, expect, it } from 'vitest';
import { batteryLocation, chargeTone, countByStatus, parseSerials, type Battery } from '@/lib/batteries';

const b = (over: Partial<Battery>): Battery => ({ id: 'b1', serial: 'BT-1', chargePct: 100, cycleCount: 3, status: 'charging', updatedAt: '2026-10-22T10:00:00Z', ...over });

describe('baterias', () => {
  it('séries: separa, normaliza e tira repetidas', () => {
    expect(parseSerials(' bt-190577\nBT-190578, bt-190577;BT-9 ')).toEqual({ serials: ['BT-190577', 'BT-190578', 'BT-9'] });
  });

  it('séries: vazia, curta demais e mais de 50', () => {
    expect(parseSerials('  ').error).toBe('Informe ao menos um número de série');
    expect(parseSerials('BT-1 X1').error).toBe('Série inválida: X1');
    const many = Array.from({ length: 51 }, (_, i) => `BT-${1000 + i}`).join(' ');
    expect(parseSerials(many).error).toBe('No máximo 50 baterias por vez');
  });

  it('onde está: moto, van com operador, estação, carregador', () => {
    const stations = new Map([['s1', 'Estação Largo da Batata']]);
    const staff = new Map([['u1', 'Rafael']]);
    expect(batteryLocation(b({ status: 'in_vehicle', vehicleCode: 'VLT-0001' }))).toBe('VLT-0001');
    expect(batteryLocation(b({ status: 'in_van', holderId: 'u1' }), { staff })).toBe('Van · Rafael');
    expect(batteryLocation(b({ status: 'in_van', holderId: 'u2' }), { staff })).toBe('Van · operador');
    expect(batteryLocation(b({ status: 'in_station', stationId: 's1' }), { stations })).toBe('Estação Largo da Batata');
    expect(batteryLocation(b({ status: 'charging' }))).toBe('Carregador');
  });

  it('contagem por situação inclui zeros', () => {
    const c = countByStatus([b({ status: 'in_van' }), b({ status: 'in_van' }), b({ status: 'in_vehicle' })]);
    expect(c).toEqual({ in_vehicle: 1, in_van: 2, in_station: 0, charging: 0, retired: 0 });
  });

  it('carregada a partir de 90%', () => {
    expect(chargeTone(90)).toBe('success');
    expect(chargeTone(89)).toBe('warning');
    expect(chargeTone(12)).toBe('danger');
  });
});
