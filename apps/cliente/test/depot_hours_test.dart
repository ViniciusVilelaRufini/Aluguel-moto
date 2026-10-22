import 'package:flutter_test/flutter_test.dart';
import 'package:volti_cliente/features/pickup/depot_hours.dart';

/// Espelha services/api/src/modules/depots/depot-rules.spec.ts: o app calcula
/// aberto/fechado e os horarios; o servidor valida de novo.
void main() {
  // Seg-sex 07:00-20:00, sabado 08:00-18:00, domingo fechado.
  final depot = DepotHours(
    timezone: 'America/Sao_Paulo',
    openingHours: [
      for (final d in [1, 2, 3, 4, 5]) OpeningInterval(weekday: d, opensAt: '07:00', closesAt: '20:00'),
      const OpeningInterval(weekday: 6, opensAt: '08:00', closesAt: '18:00'),
    ],
    pickupNowWindowMinutes: 120,
    maxScheduleDays: 7,
  );
  // 2026-10-22 e quinta-feira. 13:00Z = 10:00 em Sao Paulo (UTC-3).
  final thu10 = DateTime.utc(2026, 10, 22, 13);

  test('aberto quinta 10h, fechado domingo e antes das 7h; fechamento exclusivo', () {
    expect(depot.isOpenAt(thu10), isTrue);
    expect(depot.isOpenAt(DateTime.utc(2026, 10, 25, 15)), isFalse); // domingo 12h
    expect(depot.isOpenAt(DateTime.utc(2026, 10, 22, 9, 30)), isFalse); // 06:30 local
    expect(depot.isOpenAt(DateTime.utc(2026, 10, 22, 10)), isTrue); // 07:00 local
    expect(depot.isOpenAt(DateTime.utc(2026, 10, 22, 23)), isFalse); // 20:00 local
    expect(depot.isOpenAt(DateTime.utc(2026, 10, 22, 22, 59)), isTrue); // 19:59 local
  });

  test('retirar agora vence em 2h, limitado ao fechamento de hoje', () {
    expect(depot.pickupNowExpiry(thu10), DateTime.utc(2026, 10, 22, 15));
    expect(depot.pickupNowExpiry(DateTime.utc(2026, 10, 22, 22)), DateTime.utc(2026, 10, 22, 23)); // 19h -> 20h
  });

  test('fechamento de hoje e proxima abertura', () {
    expect(depot.closingToday(thu10), DateTime.utc(2026, 10, 22, 23));
    expect(depot.closingToday(DateTime.utc(2026, 10, 25, 15)), isNull);
    // Domingo 12h: abre segunda 07:00 local.
    expect(depot.nextOpening(DateTime.utc(2026, 10, 25, 15)), DateTime.utc(2026, 10, 26, 10));
    // Quinta 06:30: abre hoje 07:00.
    expect(depot.nextOpening(DateTime.utc(2026, 10, 22, 9, 30)), DateTime.utc(2026, 10, 22, 10));
    // Quinta 21h: abre sexta 07:00.
    expect(depot.nextOpening(DateTime.utc(2026, 10, 23, 0)), DateTime.utc(2026, 10, 23, 10));
  });

  test('slots de sabado de 30 em 30 min entre 08:00 e 17:30 local', () {
    final s = depot.slotsForDay(const LocalDay(2026, 10, 24), thu10);
    expect(s.first, DateTime.utc(2026, 10, 24, 11));
    expect(s.last, DateTime.utc(2026, 10, 24, 20, 30));
    expect(s, hasLength(20));
  });

  test('slots passados e alem de maxScheduleDays saem', () {
    // Hoje (quinta, 10:00): o primeiro slot e 10:30 (10:00 nao e futuro).
    final today = depot.slotsForDay(const LocalDay(2026, 10, 22), thu10);
    expect(today.first, DateTime.utc(2026, 10, 22, 13, 30));
    expect(today.last, DateTime.utc(2026, 10, 22, 22, 30)); // 19:30 local
    // Quinta seguinte (29): so ate agora + 7 dias (10:00 local).
    final limit = depot.slotsForDay(const LocalDay(2026, 10, 29), thu10);
    expect(limit.first, DateTime.utc(2026, 10, 29, 10));
    expect(limit.last, DateTime.utc(2026, 10, 29, 13));
    expect(depot.slotsForDay(const LocalDay(2026, 10, 30), thu10), isEmpty);
    // Domingo: fechado.
    expect(depot.slotsForDay(const LocalDay(2026, 10, 25), thu10), isEmpty);
  });

  test('dias da agenda: hoje ate maxScheduleDays, domingo fechado', () {
    final days = depot.scheduleDays(thu10);
    expect(days, hasLength(8));
    expect(days.first.day, const LocalDay(2026, 10, 22));
    expect(days.last.day, const LocalDay(2026, 10, 29));
    final sunday = days.firstWhere((d) => d.day == const LocalDay(2026, 10, 25));
    expect(sunday.closed, isTrue);
    expect(sunday.slots, isEmpty);
    expect(days.first.closed, isFalse);
    expect(days.first.weekday, 4);
  });

  test('hoje depois do fechamento: dia aberto mas sem horarios', () {
    final days = depot.scheduleDays(DateTime.utc(2026, 10, 23, 0)); // quinta 21h local
    expect(days.first.day, const LocalDay(2026, 10, 22));
    expect(days.first.closed, isFalse);
    expect(days.first.slots, isEmpty);
  });

  test('hora local e rotulos', () {
    expect(depot.toLocal(thu10), DateTime.utc(2026, 10, 22, 10));
    expect(hhmm(DateTime.utc(2026, 10, 22, 10, 5)), '10:05');
    expect(hourLabel(DateTime.utc(2026, 10, 22, 20)), '20h');
    expect(hourLabel(DateTime.utc(2026, 10, 22, 17, 30)), '17h30');
  });

  test('fuso desconhecido cai em Sao Paulo', () {
    expect(tzOffset('America/Sao_Paulo'), const Duration(hours: -3));
    expect(tzOffset('America/Manaus'), const Duration(hours: -4));
    expect(tzOffset('Europe/Lisbon'), const Duration(hours: -3));
  });
}
