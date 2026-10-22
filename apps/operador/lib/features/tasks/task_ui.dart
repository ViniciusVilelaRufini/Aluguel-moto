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

/// Tom do badge de prioridade (design: Alta = danger, Média = warning, Baixa = neutral).
/// Urgente usa o tom escuro, para se distinguir de Alta.
VoltiBadgeTone priorityTone(TaskPriority p) => switch (p) {
      TaskPriority.urgent => VoltiBadgeTone.dark,
      TaskPriority.high => VoltiBadgeTone.danger,
      TaskPriority.medium => VoltiBadgeTone.warning,
      _ => VoltiBadgeTone.neutral,
    };

/// Tom do badge de bateria: <= 20% danger, senao success.
VoltiBadgeTone batteryTone(int pct) => pct <= 20 ? VoltiBadgeTone.danger : VoltiBadgeTone.success;

/// Autonomia estimada em km (design: `bat / 4.5`).
int batteryRangeKm(int pct) => (pct / 4.5).round();

/// Distancia para o badge: "350 m" (arredonda a 10 m) ou "1,2 km".
String formatDistance(double meters) {
  final m = (meters / 10).round() * 10;
  if (m < 1000) return '$m m';
  return '${(m / 1000).toStringAsFixed(1).replaceAll('.', ',')} km';
}

/// Distancia em metros do operador ate a moto da tarefa, ou `null` sem GPS/coordenadas.
double? distanceToTaskMeters(FieldTask task, double? lat, double? lng) {
  if (lat == null || lng == null || task.vehicleLat == null || task.vehicleLng == null) {
    return null;
  }
  return distanceKm(lat, lng, task.vehicleLat!, task.vehicleLng!) * 1000;
}

String _hhmm(DateTime d) {
  final l = d.toLocal();
  return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
}

/// Prazo da tarefa: "Até 14:30" ou "Atrasada" (`null` sem prazo ou concluida).
(String, bool)? dueLabel(AppLocalizations t, FieldTask task, DateTime now) {
  final due = task.dueAt;
  if (due == null || isDone(task)) return null;
  if (due.isBefore(now)) return (t.dueLate, true);
  return (t.dueAt(_hhmm(due)), false);
}

/// "Concluída às 14:30" (aba Concluídas).
String? doneLabel(AppLocalizations t, FieldTask task) {
  if (!isDone(task)) return null;
  return t.doneAt(_hhmm(task.completedAt ?? task.updatedAt));
}

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
