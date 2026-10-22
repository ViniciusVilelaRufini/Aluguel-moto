import { isOpenAt, pickupExpiry, validatePickup, slotsForDay, DepotRulesInput } from './depot-rules';

const depot: DepotRulesInput = {
  timezone: 'America/Sao_Paulo',
  openingHours: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opensAt: '07:00', closesAt: '20:00' })).concat([{ weekday: 6, opensAt: '08:00', closesAt: '18:00' }]),
  pickupNowWindowMinutes: 120, maxScheduleDays: 7, scheduledGraceMinutes: 30,
};
// 2026-10-22 é quinta-feira. 13:00Z = 10:00 em São Paulo (UTC-3).
const thu10 = new Date('2026-10-22T13:00:00Z');

describe('depot-rules', () => {
  it('aberto quinta 10h, fechado domingo e antes das 7h', () => {
    expect(isOpenAt(depot, thu10)).toBe(true);
    expect(isOpenAt(depot, new Date('2026-10-25T15:00:00Z'))).toBe(false); // domingo 12h
    expect(isOpenAt(depot, new Date('2026-10-22T09:30:00Z'))).toBe(false); // 06:30 local
  });
  it('retirar agora vence em 2h, limitado ao fechamento', () => {
    expect(pickupExpiry(depot, 'now', thu10).toISOString()).toBe('2026-10-22T15:00:00.000Z');
    const thu19 = new Date('2026-10-22T22:00:00Z'); // 19:00 local
    expect(pickupExpiry(depot, 'now', thu19).toISOString()).toBe('2026-10-22T23:00:00.000Z'); // 20:00 local
  });
  it('agendado vence 30 min depois do horário', () => {
    const at = new Date('2026-10-23T14:00:00Z');
    expect(pickupExpiry(depot, 'scheduled', thu10, at).toISOString()).toBe('2026-10-23T14:30:00.000Z');
  });
  it('valida horário fora do funcionamento, longe demais, no passado e sem pickupAt', () => {
    expect(validatePickup(depot, 'scheduled', thu10, new Date('2026-10-25T15:00:00Z'))).toEqual({ ok: false, code: 'pickup-outside-hours' });
    expect(validatePickup(depot, 'scheduled', thu10, new Date('2026-10-30T14:00:00Z'))).toEqual({ ok: false, code: 'pickup-too-far-ahead' });
    expect(validatePickup(depot, 'scheduled', thu10, new Date('2026-10-22T12:00:00Z'))).toEqual({ ok: false, code: 'pickup-in-past' });
    expect(validatePickup(depot, 'scheduled', thu10)).toEqual({ ok: false, code: 'pickup-at-required' });
    expect(validatePickup(depot, 'now', new Date('2026-10-25T15:00:00Z'))).toEqual({ ok: false, code: 'depot-closed' });
    expect(validatePickup(depot, 'now', thu10)).toEqual({ ok: true });
  });
  it('slots de sábado de 30 em 30 min entre 08:00 e 17:30 local', () => {
    const s = slotsForDay(depot, '2026-10-24', thu10);
    expect(s[0]).toBe('2026-10-24T11:00:00.000Z');
    expect(s[s.length - 1]).toBe('2026-10-24T20:30:00.000Z');
    expect(s).toHaveLength(20);
  });
});
