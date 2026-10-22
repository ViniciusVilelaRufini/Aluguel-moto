import { describe, expect, it } from 'vitest';
import {
  depotToBody, draftFromDepot, emptyDepotDraft, hoursFromApi, hoursToApi, isHHMM, summarizeHours, validateDepot, validateHours,
} from '@/lib/depot-hours';

const closedWeek = () => hoursFromApi([]);

describe('horário HH:MM', () => {
  it('aceita 00:00 a 23:59 com dois dígitos', () => {
    expect(isHHMM('00:00')).toBe(true);
    expect(isHHMM('08:30')).toBe(true);
    expect(isHHMM('23:59')).toBe(true);
  });
  it('recusa formatos fora de HH:MM', () => {
    for (const v of ['8:00', '24:00', '12:60', '0800', '', '08:00:00', 'ab:cd']) expect(isHHMM(v), v).toBe(false);
  });
});

describe('editor de horários por dia', () => {
  it('dia ausente na lista fica fechado; dia presente fica aberto com os horários', () => {
    const d = hoursFromApi([{ weekday: 1, opensAt: '07:00', closesAt: '20:00' }]);
    expect(d).toHaveLength(7);
    expect(d[1]).toEqual({ open: true, opensAt: '07:00', closesAt: '20:00' });
    expect(d[0].open).toBe(false);
  });

  it('valida HH:MM só nos dias abertos', () => {
    const d = closedWeek();
    d[0] = { open: false, opensAt: 'xx', closesAt: 'yy' };
    d[2] = { open: true, opensAt: '7:00', closesAt: '18:00' };
    d[3] = { open: true, opensAt: '08:00', closesAt: '25:00' };
    const e = validateHours(d);
    expect(e[0]).toBeUndefined();
    expect(e[2]).toBe('Use o formato HH:MM (ex.: 08:00)');
    expect(e[3]).toBe('Use o formato HH:MM (ex.: 08:00)');
  });

  it('exige abertura antes do fechamento', () => {
    const d = closedWeek();
    d[4] = { open: true, opensAt: '18:00', closesAt: '08:00' };
    d[5] = { open: true, opensAt: '09:00', closesAt: '09:00' };
    d[6] = { open: true, opensAt: '09:00', closesAt: '09:01' };
    const e = validateHours(d);
    expect(e[4]).toBe('A abertura precisa ser antes do fechamento');
    expect(e[5]).toBe('A abertura precisa ser antes do fechamento');
    expect(e[6]).toBeUndefined();
  });

  it('converte para a lista do contrato só com os dias abertos, em ordem de weekday', () => {
    const d = closedWeek();
    d[6] = { open: true, opensAt: '08:00', closesAt: '18:00' };
    d[1] = { open: true, opensAt: '07:00', closesAt: '20:00' };
    expect(hoursToApi(d)).toEqual([
      { weekday: 1, opensAt: '07:00', closesAt: '20:00' },
      { weekday: 6, opensAt: '08:00', closesAt: '18:00' },
    ]);
  });

  it('resume a semana começando na segunda e agrupando dias iguais', () => {
    const list = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opensAt: '07:00', closesAt: '20:00' }));
    list.push({ weekday: 6, opensAt: '08:00', closesAt: '18:00' });
    expect(summarizeHours(list)).toBe('Seg–Sex 07:00–20:00 · Sáb 08:00–18:00 · Dom fechado');
    expect(summarizeHours([])).toBe('Fechado todos os dias');
  });
});

describe('cadastro do galpão', () => {
  it('rascunho novo usa os prazos padrão (120 min, 7 dias, 30 min) e fuso de São Paulo', () => {
    const d = emptyDepotDraft();
    expect(d.pickupNowWindowMinutes).toBe('120');
    expect(d.maxScheduleDays).toBe('7');
    expect(d.scheduledGraceMinutes).toBe('30');
    expect(d.lat).toBeNull();
    expect(d.active).toBe(true);
  });

  it('exige nome, endereço e o ponto no mapa', () => {
    const e = validateDepot({ ...emptyDepotDraft(), name: ' ', address: '' });
    expect(e.name).toBe('Informe o nome do galpão');
    expect(e.address).toBe('Informe o endereço');
    expect(e.point).toBe('Clique no mapa para marcar o ponto do galpão');
  });

  it('valida os prazos nos limites do contrato', () => {
    const base = { ...emptyDepotDraft(), name: 'G', address: 'R', lat: -23.5, lng: -46.6 };
    expect(validateDepot(base)).toEqual({});
    const e = validateDepot({ ...base, pickupNowWindowMinutes: '10', maxScheduleDays: '31', scheduledGraceMinutes: '121' });
    expect(e.pickupNowWindowMinutes).toBe('Entre 15 e 480 minutos');
    expect(e.maxScheduleDays).toBe('Entre 0 e 30 dias');
    expect(e.scheduledGraceMinutes).toBe('Entre 0 e 120 minutos');
    expect(validateDepot({ ...base, pickupNowWindowMinutes: '30.5' }).pickupNowWindowMinutes).toBe('Entre 15 e 480 minutos');
  });

  it('leva os erros de horário por dia', () => {
    const base = { ...emptyDepotDraft(), name: 'G', address: 'R', lat: -23.5, lng: -46.6 };
    base.hours[2] = { open: true, opensAt: '20:00', closesAt: '07:00' };
    expect(validateDepot(base).days).toEqual({ 2: 'A abertura precisa ser antes do fechamento' });
  });

  it('monta o corpo do POST/PATCH com números e a lista de horários', () => {
    const d = { ...emptyDepotDraft(), name: ' Galpão Sul ', address: 'Rua A, 1', district: '', lat: -23.6, lng: -46.7 };
    const body = depotToBody(d);
    expect(body).toMatchObject({ name: 'Galpão Sul', address: 'Rua A, 1', lat: -23.6, lng: -46.7, timezone: 'America/Sao_Paulo', pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30, active: true });
    expect(body).not.toHaveProperty('district');
    expect(body.openingHours).toEqual(hoursToApi(d.hours));
  });

  it('carrega um galpão existente no rascunho', () => {
    const d = draftFromDepot({
      id: 'd1', name: 'G', address: 'R', district: 'Pinheiros', lat: -23.5, lng: -46.6, timezone: 'America/Sao_Paulo',
      openingHours: [{ weekday: 3, opensAt: '09:00', closesAt: '17:00' }], pickupNowWindowMinutes: 90, maxScheduleDays: 5, scheduledGraceMinutes: 15, active: false,
    });
    expect(d).toMatchObject({ id: 'd1', district: 'Pinheiros', pickupNowWindowMinutes: '90', maxScheduleDays: '5', scheduledGraceMinutes: '15', active: false });
    expect(d.hours[3]).toEqual({ open: true, opensAt: '09:00', closesAt: '17:00' });
  });
});
