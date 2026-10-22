import 'package:volti_api/volti_api.dart';

import '../../../l10n/app_localizations.dart';
import '../../ride/battery_sheet.dart' show swapPlaces;

/// Faixa de disponibilidade de baterias de uma estacao (cor do marcador e da
/// pilula): verde a partir de 3, ambar com 1 ou 2, cinza sem nenhuma.
enum StationAvailability { many, few, none }

StationAvailability stationAvailability(SwapStation s) {
  final n = s.availableBatteries;
  if (n >= 3) return StationAvailability.many;
  if (n >= 1) return StationAvailability.few;
  return StationAvailability.none;
}

/// Ponto de troca na folha: a estacao e, quando ela e a do galpao
/// (`Depot.swapStationId`), o galpao (titulo e icone do galpao).
typedef SwapPoint = ({SwapStation station, Depot? depot});

/// Ordem da folha "Troca de bateria": o galpao primeiro (se ele for ponto de
/// troca) e depois as estacoes mais perto primeiro. `distanceM` so vem quando o
/// app mandou a posicao (consentimento LGPD); sem ela fica a ordem da API.
List<SwapPoint> orderSwapPoints(Depot? depot, List<SwapStation> stations) {
  final places = swapPlaces(depot, stations);
  final others = places.others.indexed.toList()
    ..sort((a, b) {
      final da = a.$2.distanceM, db = b.$2.distanceM;
      if (da == null && db == null) return a.$1.compareTo(b.$1);
      if (da == null) return 1;
      if (db == null) return -1;
      final c = da.compareTo(db);
      return c != 0 ? c : a.$1.compareTo(b.$1);
    });
  return [if (places.depotStation != null) (station: places.depotStation!, depot: depot), for (final e in others) (station: e.$2, depot: null)];
}

/// "Aberto 24h" ou o horario publicado pela estacao (`openingHours` e texto
/// livre no contrato, ex.: "Seg a sáb, 7h às 22h").
String stationHoursLabel(AppLocalizations l, SwapStation s) => s.open24h == true ? l.stationOpen24h : s.openingHours;
