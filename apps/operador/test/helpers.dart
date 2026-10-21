import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/device.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/offline_queue.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/l10n/app_localizations.dart';

class SubmittedInspection {
  SubmittedInspection(this.taskId, this.draft, this.photoKeys, this.key);
  final String taskId;
  final InspectionDraft draft;
  final List<String> photoKeys;
  final String key;
}

/// Repositorio fake: `online = false` simula falta de rede.
class FakeFieldRepository implements FieldRepository {
  bool online = true;
  final inspections = <SubmittedInspection>[];
  final swaps = <(String, BatterySwapDraft, String)>[];
  final completions = <(String, CompletionDraft, String)>[];
  final uploaded = <String>[];
  final seenKeys = <String>{};
  RepositoryException? rejectWith;

  void _check() {
    if (!online) {
      throw const RepositoryException(FailureKind.network, 'offline');
    }
    if (rejectWith != null) throw rejectWith!;
  }

  @override
  Future<List<FieldTask>> listTasks() async {
    _check();
    return [];
  }

  @override
  Future<FieldTask> startTask(String id) async => throw UnimplementedError();

  @override
  Future<VehicleCommand> serviceUnlock(String vehicleId,
          {required String reason, String? taskId}) async =>
      throw UnimplementedError();

  @override
  Future<void> setVehicleStatus(String vehicleId,
      {required ServiceVehicleStatus status, required String reason}) async {
    _check();
  }

  @override
  Future<String> uploadPhoto(String path) async {
    _check();
    uploaded.add(path);
    return 'inspections/${uploaded.length}.jpg';
  }

  @override
  Future<Inspection> submitInspection(String taskId, InspectionDraft draft,
      {required List<String> photoKeys,
      required DateTime recordedAt,
      required String idempotencyKey}) async {
    _check();
    // Reenvio com a mesma chave nao duplica (como a API).
    if (seenKeys.add(idempotencyKey)) {
      inspections.add(SubmittedInspection(taskId, draft, photoKeys, idempotencyKey));
    }
    final nonCompliant = draft.speedNonCompliant;
    return Inspection((b) => b
      ..id = 'insp-1'
      ..fieldTaskId = taskId
      ..vehicleId = 'veh-1'
      ..inspectorId = 'op-1'
      ..brakes = ChecklistItem((c) => c.ok = draft.brakes ?? false).toBuilder()
      ..tires = ChecklistItem((c) => c.ok = draft.tires ?? false).toBuilder()
      ..lights = ChecklistItem((c) => c.ok = draft.lights ?? false).toBuilder()
      ..bell = ChecklistItem((c) => c.ok = draft.bell ?? false).toBuilder()
      ..speedLimiter = SpeedLimiterCheck((s) => s
        ..ok = draft.effectiveSpeedOk ?? false
        ..configuredMaxKmh = draft.speedReading ?? 0).toBuilder()
      ..photoObjectKeys.replace(photoKeys)
      ..passed = !nonCompliant
      ..maintenanceTaskId = nonCompliant ? 'maint-77' : null
      ..alertId = nonCompliant ? 'alert-88' : null
      ..recordedAt = recordedAt
      ..createdAt = DateTime.now().toUtc());
  }

  @override
  Future<BatterySwap> submitBatterySwap(String taskId, BatterySwapDraft draft,
      {required DateTime recordedAt, required String idempotencyKey}) async {
    _check();
    if (seenKeys.add(idempotencyKey)) swaps.add((taskId, draft, idempotencyKey));
    return BatterySwap((b) => b
      ..id = 'swap-1'
      ..fieldTaskId = taskId
      ..vehicleId = 'veh-1'
      ..operatorId = 'op-1'
      ..removedBatterySerial = draft.removedSerial
      ..installedBatterySerial = draft.installedSerial
      ..recordedAt = recordedAt
      ..createdAt = DateTime.now().toUtc());
  }

  @override
  Future<FieldTask> completeTask(String taskId, CompletionDraft draft,
      {required DateTime completedAt, required String idempotencyKey}) async {
    _check();
    if (seenKeys.add(idempotencyKey)) completions.add((taskId, draft, idempotencyKey));
    return fakeTask(id: taskId, status: FieldTaskStatus.done);
  }
}

FieldTask fakeTask({
  String id = 'task-1',
  FieldTaskType type = FieldTaskType.inspection,
  FieldTaskStatus status = FieldTaskStatus.assigned,
  TaskPriority priority = TaskPriority.high,
  String code = 'VT-3310',
}) =>
    FieldTask((b) => b
      ..id = id
      ..type = type
      ..status = status
      ..priority = priority
      ..vehicleId = 'veh-1'
      ..vehicleCode = code
      ..vehicleLat = -23.55
      ..vehicleLng = -46.65
      ..vehicleBatteryPct = 12
      ..createdAt = DateTime.utc(2026, 10, 21)
      ..updatedAt = DateTime.utc(2026, 10, 21));

class FakeConnectivity implements ConnectivityMonitor {
  final controller = StreamController<bool>.broadcast();

  @override
  Stream<bool> get onlineChanges => controller.stream;
}

class FakePhotoPicker implements PhotoPicker {
  int count = 0;

  @override
  Future<String?> take() async => '/tmp/photo-${++count}.jpg';
}

class Harness {
  Harness({FakeFieldRepository? repo})
      : repo = repo ?? FakeFieldRepository(),
        connectivity = FakeConnectivity(),
        queue = MemoryOfflineQueue();

  final FakeFieldRepository repo;
  final FakeConnectivity connectivity;
  final MemoryOfflineQueue queue;

  List<Override> get overrides => [
        fieldRepositoryProvider.overrideWithValue(repo),
        connectivityMonitorProvider.overrideWithValue(connectivity),
        offlineQueueProvider.overrideWithValue(queue),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
      ];

  Future<void> pump(WidgetTester tester, Widget child) async {
    tester.view.physicalSize = const Size(800, 2000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: VoltiTheme.light(),
        locale: const Locale('pt'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: child,
      ),
    ));
    await tester.pump();
  }
}
