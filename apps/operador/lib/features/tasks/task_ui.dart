import 'dart:math';

import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/l10n/app_localizations.dart';

String typeLabel(AppLocalizations t, FieldTaskType type) => switch (type) {
      FieldTaskType.collect => t.typeCollect,
      FieldTaskType.batterySwap => t.typeBatterySwap,
      FieldTaskType.maintenance => t.typeMaintenance,
      FieldTaskType.reposition => t.typeReposition,
      _ => t.typeInspection,
    };

(IconData, ListRowTone) typeIcon(FieldTaskType type) => switch (type) {
      FieldTaskType.collect => (LucideIcons.truck, ListRowTone.sun),
      FieldTaskType.batterySwap => (LucideIcons.batteryCharging, ListRowTone.info),
      FieldTaskType.maintenance => (LucideIcons.wrench, ListRowTone.danger),
      FieldTaskType.reposition => (LucideIcons.mapPinned, ListRowTone.brand),
      _ => (LucideIcons.clipboardCheck, ListRowTone.neutral),
    };

String priorityLabel(AppLocalizations t, TaskPriority p) => switch (p) {
      TaskPriority.urgent => t.priorityUrgent,
      TaskPriority.high => t.priorityHigh,
      TaskPriority.medium => t.priorityMedium,
      _ => t.priorityLow,
    };

bool isUrgent(TaskPriority p) => p == TaskPriority.urgent || p == TaskPriority.high;

bool isDone(FieldTask t) => t.status == FieldTaskStatus.done;

/// Distancia em km entre dois pontos (haversine).
double distanceKm(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371.0;
  double rad(double d) => d * pi / 180;
  final dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  final a = pow(sin(dLat / 2), 2) +
      cos(rad(lat1)) * cos(rad(lat2)) * pow(sin(dLng / 2), 2);
  return 2 * r * asin(sqrt(a));
}

/// Abre a rota ate a moto (ou ao destino do reposicionamento) no app de mapas.
Future<bool> openRoute(double lat, double lng) => launchUrl(
      Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving'),
      mode: LaunchMode.externalApplication,
    );
