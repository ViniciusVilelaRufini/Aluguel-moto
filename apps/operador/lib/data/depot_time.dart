import 'package:timezone/data/latest_10y.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import 'package:volti_api/volti_api.dart' show Date;

/// Fuso padrao do projeto, usado quando o galpao nao informa um fuso valido.
const defaultDepotTimezone = 'America/Sao_Paulo';

bool _loaded = false;

/// Fuso IANA do galpao (`Depot.timezone`); invalido cai em America/Sao_Paulo.
tz.Location depotLocation(String? name) {
  if (!_loaded) {
    tzdata.initializeTimeZones();
    _loaded = true;
  }
  try {
    return tz.getLocation(name ?? defaultDepotTimezone);
  } on tz.LocationNotFoundException {
    return tz.getLocation(defaultDepotTimezone);
  }
}

/// Instante no relogio do galpao, independente do fuso do aparelho.
tz.TZDateTime inDepotZone(DateTime instant, String? zone) =>
    tz.TZDateTime.from(instant.toUtc(), depotLocation(zone));

/// "Hoje" no galpao (para `?date=` da agenda).
Date depotToday(DateTime now, String? zone) {
  final l = inDepotZone(now, zone);
  return Date(l.year, l.month, l.day);
}

/// "14:30" no fuso do galpao.
String depotHhmm(DateTime instant, String? zone) {
  final l = inDepotZone(instant, zone);
  return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
}
