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

/// Concluida no mesmo dia (local) de [day].
bool isDoneOn(FieldTask t, DateTime day) {
  if (!isDone(t)) return false;
  final d = (t.completedAt ?? t.updatedAt).toLocal();
  final l = day.toLocal();
  return d.year == l.year && d.month == l.month && d.day == l.day;
}

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

// ---- contrato v2 ----

String _group(int n) {
  final s = n.abs().toString();
  final b = StringBuffer(n < 0 ? '-' : '');
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write('.');
    b.write(s[i]);
  }
  return b.toString();
}

/// "812 km", "1.000 km" (arredondado, separador de milhar pt-BR).
String formatKm(double km) => '${_group(km.round())} km';

/// "R$ 0,59/min" (dinheiro em centavos).
String formatCentsPerMinute(int cents) {
  final reais = _group(cents ~/ 100);
  final c = (cents % 100).toString().padLeft(2, '0');
  return 'R\$ $reais,$c/min';
}

/// Fuso de exibicao do projeto (America/Sao_Paulo): UTC-3 fixo, sem horario de
/// verao desde 2019 (mesma regra da API para as janelas de manutencao).
const Duration saoPauloOffset = Duration(hours: -3);

/// "23/10 10:00" em America/Sao_Paulo, qualquer que seja o fuso do aparelho.
String formatDayTime(DateTime d) {
  final l = d.toUtc().add(saoPauloOffset);
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(l.day)}/${two(l.month)} ${two(l.hour)}:${two(l.minute)}';
}

/// So o primeiro nome (a API ja manda so ele para o grupo `campo`; aqui por garantia).
String? firstName(String? name) {
  final n = name?.trim() ?? '';
  if (n.isEmpty) return null;
  return n.split(RegExp(r'\s+')).first;
}

/// "BT-190577 · 12% · 412 ciclos" (partes ausentes ficam de fora).
String batteryDetails(AppLocalizations t, String serial, {int? pct, int? cycles}) => [
      serial,
      if (pct != null) '$pct%',
      if (cycles != null) t.cyclesCount(cycles),
    ].join(' · ');

/// "Retirada: BT-190577 · 12% · 412 ciclos" (design TaskDetail), ou `null` sem serie.
String? removedBatteryLine(AppLocalizations t, FieldTask task) {
  final serial = task.vehicleBatterySerial;
  if (serial == null || serial.trim().isEmpty) return null;
  return t.removedBatteryLine(batteryDetails(t, serial,
      pct: task.vehicleBatteryPct, cycles: task.vehicleBatteryCycleCount));
}

/// Subtitulo do cartao: "Para: destino" no reposicionamento; senao o endereco
/// da moto; sem endereco, as observacoes da tarefa.
String? taskSubtitle(AppLocalizations t, FieldTask task) {
  final target = task.targetAddress;
  if (task.type == FieldTaskType.reposition && target != null && target.trim().isNotEmpty) {
    return t.targetAddressLine(target);
  }
  final addr = task.vehicleAddress;
  if (addr != null && addr.trim().isNotEmpty) return addr;
  final notes = task.notes;
  return notes == null || notes.trim().isEmpty ? null : notes;
}

/// Status da moto para marcador/badge: o do servidor; sem ele (ou desconhecido),
/// manutencao nas tarefas de manutencao e livre nas demais.
VehicleStatus markerStatus(FieldTask task) {
  final s = task.vehicleStatus;
  if (s != null && s != VehicleStatus.unknownDefaultOpenApi) return s;
  return task.type == FieldTaskType.maintenance ? VehicleStatus.maintenance : VehicleStatus.free;
}

String serviceStatusLabel(AppLocalizations t, VehicleServiceStatus s) => switch (s) {
      VehicleServiceStatus.overdue => t.serviceOverdue,
      VehicleServiceStatus.dueSoon => t.serviceDueSoon,
      _ => t.serviceOk,
    };

VoltiBadgeTone serviceStatusTone(VehicleServiceStatus s) => switch (s) {
      VehicleServiceStatus.overdue => VoltiBadgeTone.danger,
      VehicleServiceStatus.dueSoon => VoltiBadgeTone.warning,
      _ => VoltiBadgeTone.success,
    };

/// "812 km desde a revisão · faltam 188 km" (ou "· 120 km além do previsto").
String serviceKmLine(AppLocalizations t, VehicleServiceInfo s) {
  final since = t.serviceKmSince(formatKm(s.kmSinceService));
  final rest = s.kmUntilService < 0
      ? t.serviceKmOver(formatKm(-s.kmUntilService))
      : t.serviceKmUntil(formatKm(s.kmUntilService));
  return '$since · $rest';
}

String serviceHoursLine(AppLocalizations t, VehicleServiceInfo s) =>
    t.serviceHours(_group(s.hoursSinceService.round()), _group(s.serviceIntervalHours));
