import 'package:volti_api/volti_api.dart';

import '../../l10n/app_localizations.dart';
import 'depot_hours.dart';

String _two(int n) => n.toString().padLeft(2, '0');

/// "Hoje", "Amanhã" ou "sáb. 24/10" (dia local do galpao).
String dayChipLabel(AppLocalizations l, LocalDay day, LocalDay today) {
  if (day == today) return l.dayToday;
  if (day == today.addDays(1)) return l.dayTomorrow;
  return l.dayChip(l.weekdayShort('${day.weekday}'), '${_two(day.day)}/${_two(day.month)}');
}

/// "hoje", "amanhã" ou "sáb. 24/10" (no meio da frase).
String dayInSentence(AppLocalizations l, LocalDay day, LocalDay today) {
  if (day == today) return l.dayTodayLower;
  if (day == today.addDays(1)) return l.dayTomorrowLower;
  return l.dayChip(l.weekdayShort('${day.weekday}'), '${_two(day.day)}/${_two(day.month)}');
}

/// "seg." quando a proxima abertura e ainda nesta semana (ate 6 dias), "hoje" ou "amanhã".
String _openingDay(AppLocalizations l, LocalDay day, LocalDay today) {
  if (day == today) return l.dayTodayLower;
  if (day == today.addDays(1)) return l.dayTomorrowLower;
  return l.weekdayShort('${day.weekday}');
}

/// "Aberto até 20h" ou "Fechado · abre seg. às 7h" (`null` = sem horario cadastrado).
String? depotOpenLabel(AppLocalizations l, Depot depot, DateTime now) {
  final hours = DepotHours.of(depot);
  if (hours.isOpenAt(now)) {
    final closing = hours.closingToday(now)!;
    return l.depotOpenUntil(hourLabel(hours.toLocal(closing)));
  }
  final next = hours.nextOpening(now);
  if (next == null) return l.depotClosed;
  final wall = hours.toLocal(next);
  final today = LocalDay.of(hours.toLocal(now));
  return l.depotClosedOpens(_openingDay(l, LocalDay.of(wall), today), hourLabel(wall));
}

/// "Galpão Volti · Pinheiros" (sem bairro, o nome cadastrado).
String depotTitle(AppLocalizations l, Depot d) {
  final district = d.district?.trim();
  return district == null || district.isEmpty ? d.name : l.depotCardTitle(district);
}

/// "Galpão Volti · Pinheiros · 3 motos disponíveis".
String depotHeadline(AppLocalizations l, Depot d) {
  final count = d.availableVehicleCount;
  return count == null ? depotTitle(l, d) : '${depotTitle(l, d)} · ${l.depotAvailable(count)}';
}
