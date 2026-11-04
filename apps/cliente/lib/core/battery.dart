import 'package:volti_api/volti_api.dart';

import '../l10n/app_localizations.dart';

/// Bateria da moto como o contrato manda exibir: com `batteryKnown: false`
/// (rastreador sem leitura, ex.: J16 de bancada) `batteryPct`/`estimatedRangeKm`
/// vem 0 e nao sao nivel — viram `null` ("—" / "Bateria desconhecida").
extension VehicleBattery on Vehicle {
  bool get hasBatteryReading => batteryKnown != false;
  int? get knownBatteryPct => hasBatteryReading ? batteryPct : null;
  int? get knownRangeKm => hasBatteryReading ? estimatedRangeKm.round() : null;
}

/// Rotulo do leitor de tela da pilula de bateria (um no so, com a autonomia).
String batteryPillSemantics(AppLocalizations l, int? pct, {int? rangeKm}) {
  if (pct == null) return l.batteryUnknownSemantics;
  return [l.batterySemantics(pct), if (rangeKm != null) l.rangeSemantics(rangeKm)].join(', ');
}

/// "80%" ou "—" (desconhecida).
String batteryValue(int? pct) => pct == null ? '—' : '$pct%';
