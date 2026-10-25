import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/l10n/app_localizations.dart';

/// Rotulo e tom do status da moto no galpao. Valor desconhecido (cliente
/// gerado mais antigo que a API) cai em "Outro status", sem quebrar.
(String, VoltiBadgeTone) vehicleStatusBadge(AppLocalizations t, VehicleStatus s) {
  if (s == VehicleStatus.free) return (t.vsFree, VoltiBadgeTone.success);
  if (s == VehicleStatus.rented) return (t.vsRented, VoltiBadgeTone.info);
  if (s == VehicleStatus.reserved) return (t.vsReserved, VoltiBadgeTone.info);
  if (s == VehicleStatus.paused) return (t.vsPaused, VoltiBadgeTone.warning);
  if (s == VehicleStatus.blocked) return (t.vsBlocked, VoltiBadgeTone.danger);
  if (s == VehicleStatus.maintenance) return (t.vsMaintenance, VoltiBadgeTone.warning);
  if (s == VehicleStatus.offline) return (t.vsOffline, VoltiBadgeTone.neutral);
  if (s == VehicleStatus.awaitingPickup) return (t.vsAwaitingPickup, VoltiBadgeTone.warning);
  return (t.vsOther, VoltiBadgeTone.neutral);
}

/// Status de moto que o filtro do galpao oferece.
final depotVehicleFilters = <VehicleStatus>[
  VehicleStatus.free,
  VehicleStatus.reserved,
  VehicleStatus.awaitingPickup,
  VehicleStatus.rented,
  VehicleStatus.maintenance,
  VehicleStatus.blocked,
  VehicleStatus.offline,
];

/// Rotulo do status da bateria. Status novo da API que o cliente ainda nao
/// conhece (`unknownDefaultOpenApi`) vira "Outro status", sem quebrar.
String batteryStatusLabel(AppLocalizations t, BatteryStatus s) {
  if (s == BatteryStatus.inVehicle) return t.bsInVehicle;
  if (s == BatteryStatus.inVan) return t.bsInVan;
  if (s == BatteryStatus.charging) return t.bsCharging;
  if (s == BatteryStatus.inStation) return t.bsInStation;
  if (s == BatteryStatus.retired) return t.bsRetired;
  return t.bsOther;
}

/// Ordem fixa dos status conhecidos; os desconhecidos aparecem depois, juntos.
final knownBatteryStatuses = <BatteryStatus>[
  BatteryStatus.charging,
  BatteryStatus.inStation,
  BatteryStatus.inVan,
  BatteryStatus.inVehicle,
  BatteryStatus.retired,
];

bool isKnownBatteryStatus(BatteryStatus s) => knownBatteryStatuses.contains(s);
