import 'package:volti_api/volti_api.dart';

/// Regras de horario do galpao no app, espelho de
/// `services/api/src/modules/depots/depot-rules.ts` (o servidor valida de novo):
///
/// - aberto em `[opensAt, closesAt)` do dia da semana local (fechamento exclusivo);
/// - "retirar agora" vence no que vier primeiro: agora + `pickupNowWindowMinutes` ou o fechamento de hoje;
/// - horarios de 30 em 30 min, o ultimo e `closesAt` menos o passo;
/// - horarios passados ou alem de agora + `maxScheduleDays` saem.
///
/// Todos os instantes entram e saem em UTC. A hora "de parede" do galpao e
/// representada como `DateTime.utc` com os campos locais (ver [DepotHours.toLocal]).
class DepotHours {
  DepotHours({
    required this.openingHours,
    required this.timezone,
    required this.pickupNowWindowMinutes,
    required this.maxScheduleDays,
    this.stepMinutes = 30,
  });

  factory DepotHours.of(Depot d) => DepotHours(
        openingHours: [for (final h in d.openingHours) OpeningInterval(weekday: h.weekday, opensAt: h.opensAt, closesAt: h.closesAt)],
        timezone: d.timezone,
        pickupNowWindowMinutes: d.pickupNowWindowMinutes,
        maxScheduleDays: d.maxScheduleDays,
      );

  final List<OpeningInterval> openingHours;
  final String timezone;
  final int pickupNowWindowMinutes;
  final int maxScheduleDays;
  final int stepMinutes;

  Duration get _offset => tzOffset(timezone);

  /// Hora de parede do galpao (campos locais num `DateTime.utc`).
  DateTime toLocal(DateTime utc) => utc.toUtc().add(_offset);

  DateTime _wallToUtc(LocalDay day, int minutesOfDay) =>
      DateTime.utc(day.year, day.month, day.day, 0, minutesOfDay).subtract(_offset);

  OpeningInterval? hoursFor(int weekday) {
    for (final h in openingHours) {
      if (h.weekday == weekday) return h;
    }
    return null;
  }

  bool isOpenAt(DateTime at) {
    final local = toLocal(at);
    final h = hoursFor(_weekday(local));
    if (h == null) return false;
    final m = local.hour * 60 + local.minute;
    return m >= h.opensMinutes && m < h.closesMinutes;
  }

  /// Fechamento de hoje (dia local de [now]); `null` se hoje e fechado.
  DateTime? closingToday(DateTime now) {
    final day = LocalDay.of(toLocal(now));
    final h = hoursFor(day.weekday);
    return h == null ? null : _wallToUtc(day, h.closesMinutes);
  }

  /// Prazo de "retirar agora" criado em [now].
  DateTime pickupNowExpiry(DateTime now) {
    final windowEnd = now.toUtc().add(Duration(minutes: pickupNowWindowMinutes));
    final closing = closingToday(now);
    return closing != null && closing.isBefore(windowEnd) ? closing : windowEnd;
  }

  /// Proxima abertura depois de [now] (ate 8 dias); `null` sem horario cadastrado.
  DateTime? nextOpening(DateTime now) {
    final today = LocalDay.of(toLocal(now));
    for (var i = 0; i <= 7; i++) {
      final day = today.addDays(i);
      final h = hoursFor(day.weekday);
      if (h == null) continue;
      final at = _wallToUtc(day, h.opensMinutes);
      if (at.isAfter(now)) return at;
    }
    return null;
  }

  /// Horarios que o cliente pode agendar no dia local [day].
  List<DateTime> slotsForDay(LocalDay day, DateTime now) {
    final h = hoursFor(day.weekday);
    if (h == null) return const [];
    final latest = now.toUtc().add(Duration(days: maxScheduleDays));
    return [
      for (var m = h.opensMinutes; m + stepMinutes <= h.closesMinutes; m += stepMinutes)
        if (_wallToUtc(day, m) case final at when at.isAfter(now) && !at.isAfter(latest)) at,
    ];
  }

  /// Dias da agenda: hoje ate hoje + [maxScheduleDays] (dia local).
  List<ScheduleDay> scheduleDays(DateTime now) {
    final today = LocalDay.of(toLocal(now));
    return [
      for (var i = 0; i <= maxScheduleDays; i++)
        ScheduleDay(
          day: today.addDays(i),
          closed: hoursFor(today.addDays(i).weekday) == null,
          slots: slotsForDay(today.addDays(i), now),
        ),
    ];
  }
}

/// Dia da semana do contrato: 0 = domingo ... 6 = sabado.
int _weekday(DateTime wall) => wall.weekday % 7;

class OpeningInterval {
  const OpeningInterval({required this.weekday, required this.opensAt, required this.closesAt});
  final int weekday;
  final String opensAt, closesAt;
  int get opensMinutes => _toMinutes(opensAt);
  int get closesMinutes => _toMinutes(closesAt);
}

int _toMinutes(String hhmm) {
  final p = hhmm.split(':');
  return int.parse(p[0]) * 60 + int.parse(p[1]);
}

/// Dia do calendario local do galpao.
class LocalDay {
  const LocalDay(this.year, this.month, this.day);
  factory LocalDay.of(DateTime wall) => LocalDay(wall.year, wall.month, wall.day);
  final int year, month, day;

  DateTime get _date => DateTime.utc(year, month, day);
  int get weekday => _weekday(_date);
  LocalDay addDays(int n) => LocalDay.of(_date.add(Duration(days: n)));

  @override
  bool operator ==(Object other) => other is LocalDay && other.year == year && other.month == month && other.day == day;
  @override
  int get hashCode => Object.hash(year, month, day);
  @override
  String toString() => '$year-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';
}

class ScheduleDay {
  const ScheduleDay({required this.day, required this.closed, required this.slots});
  final LocalDay day;

  /// Sem horario de funcionamento nesse dia da semana.
  final bool closed;
  final List<DateTime> slots;
  int get weekday => day.weekday;
}

/// Deslocamento fixo dos fusos do Brasil (sem horario de verao desde 2019; ver
/// `toSaoPaulo` em core/geo.dart). Fuso desconhecido = Sao Paulo.
Duration tzOffset(String timezone) => switch (timezone) {
      'America/Noronha' => const Duration(hours: -2),
      'America/Manaus' || 'America/Cuiaba' || 'America/Campo_Grande' || 'America/Porto_Velho' || 'America/Boa_Vista' =>
        const Duration(hours: -4),
      'America/Rio_Branco' || 'America/Eirunepe' => const Duration(hours: -5),
      _ => const Duration(hours: -3),
    };

String _two(int n) => n.toString().padLeft(2, '0');

/// "10:05" (hora de parede).
String hhmm(DateTime wall) => '${_two(wall.hour)}:${_two(wall.minute)}';

/// "20h" ou "17h30" (hora de parede).
String hourLabel(DateTime wall) => wall.minute == 0 ? '${wall.hour}h' : '${wall.hour}h${_two(wall.minute)}';
