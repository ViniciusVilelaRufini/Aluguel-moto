import { generateSlots, isValidSlotStart } from './maintenance-slots';

describe('janelas de manutenção do cliente', () => {
  // Quinta-feira, 22/10/2026, 10:20 em São Paulo (13:20 UTC).
  const now = new Date('2026-10-22T13:20:00Z');

  it('começa na próxima hora cheia com 2 h de antecedência e respeita 08–18 h locais', () => {
    const slots = generateSlots(now, 1);
    expect(slots[0].startsAt.toISOString()).toBe('2026-10-22T16:00:00.000Z'); // 13:00 local
    expect(slots.at(-1)!.startsAt.toISOString()).toBe('2026-10-23T13:00:00.000Z'); // sexta 10:00 local (limite de 24 h)
    for (const s of slots) {
      const localHour = (s.startsAt.getUTCHours() + 21) % 24;
      expect(localHour).toBeGreaterThanOrEqual(8);
      expect(localHour).toBeLessThan(18);
      expect(s.endsAt.getTime() - s.startsAt.getTime()).toBe(3600_000);
    }
  });

  it('não abre aos domingos; sábado abre', () => {
    const slots = generateSlots(now, 7);
    const weekdays = new Set(slots.map((s) => new Date(s.startsAt.getTime() - 3 * 3600_000).getUTCDay()));
    expect(weekdays.has(0)).toBe(false);
    expect(weekdays.has(6)).toBe(true);
    expect(slots.filter((s) => new Date(s.startsAt.getTime() - 3 * 3600_000).getUTCDay() === 6)).toHaveLength(10);
  });

  it('valida o início pedido pelo cliente', () => {
    expect(isValidSlotStart(new Date('2026-10-22T16:00:00Z'), now)).toBe(true);
    expect(isValidSlotStart(new Date('2026-10-22T14:00:00Z'), now)).toBe(false); // menos de 2 h
    expect(isValidSlotStart(new Date('2026-10-22T16:30:00Z'), now)).toBe(false); // fora da hora cheia
    expect(isValidSlotStart(new Date('2026-10-22T22:00:00Z'), now)).toBe(false); // 19 h local
    expect(isValidSlotStart(new Date('2026-10-25T13:00:00Z'), now)).toBe(false); // domingo
    expect(isValidSlotStart(new Date('2026-11-10T13:00:00Z'), now)).toBe(false); // além de 14 dias
    expect(isValidSlotStart(new Date('x'), now)).toBe(false);
  });
});
