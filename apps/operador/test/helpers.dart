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
import 'package:volti_operador/data/location.dart';
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

  final unlocks = <(String, String?)>[];

  @override
  Future<VehicleCommand> serviceUnlock(String vehicleId,
      {required String reason, String? taskId}) async {
    _check();
    unlocks.add((vehicleId, taskId));
    final now = DateTime.now().toUtc();
    return VehicleCommand((b) => b
      ..id = 'cmd-1'
      ..vehicleId = vehicleId
      ..type = CommandType.unlock
      ..status = CommandStatus.confirmed
      ..reason = reason
      ..createdAt = now
      ..updatedAt = now);
  }

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

  // ---- contrato v2 ----

  /// `null` = a API devolve erro de rede para a van.
  VanStock? van = fakeVan(const []);
  int vanReads = 0;
  final loads = <(List<String>, int?)>[];
  final unloads = <List<String>>[];
  List<VehicleServiceRow> serviceRows = const [];
  final serviceQueries = <VehicleServiceStatus?>[];
  int modelReads = 0;
  final vehicles = <String, Vehicle>{};
  List<VehicleModel> models = const [];
  final maintenance = <String, MaintenanceTask>{};

  @override
  Future<VanStock> getVanStock() async {
    _check();
    vanReads++;
    if (van == null) throw const RepositoryException(FailureKind.network, 'offline');
    return van!;
  }

  @override
  Future<VanStock> loadVan(List<String> serials, {int? chargePct}) async {
    _check();
    loads.add((serials, chargePct));
    van = fakeVan([
      ...?van?.items,
      for (final s in serials) fakeBattery(s, pct: chargePct ?? 100, cycles: 0),
    ]);
    return van!;
  }

  @override
  Future<VanStock> unloadVan(List<String> serials) async {
    _check();
    unloads.add(serials);
    van = fakeVan([...?van?.items.where((b) => !serials.contains(b.serial))]);
    return van!;
  }

  @override
  Future<List<VehicleServiceRow>> listServiceStatus({VehicleServiceStatus? status}) async {
    _check();
    serviceQueries.add(status);
    return serviceRows.where((r) => status == null || r.service.status == status).toList();
  }

  @override
  Future<Vehicle> getVehicle(String id) async {
    _check();
    final v = vehicles[id];
    if (v == null) {
      throw const RepositoryException(FailureKind.rejected, 'not found', status: 404);
    }
    return v;
  }

  @override
  Future<List<VehicleModel>> listVehicleModels() async {
    _check();
    modelReads++;
    return models;
  }

  @override
  Future<MaintenanceTask> getMaintenanceTask(String id) async {
    _check();
    final m = maintenance[id];
    if (m == null) {
      throw const RepositoryException(FailureKind.rejected, 'not found', status: 404);
    }
    return m;
  }
}

Battery fakeBattery(String serial,
        {int pct = 100, int cycles = 10, BatteryStatus? status}) =>
    Battery((b) => b
      ..id = 'bat-$serial'
      ..serial = serial
      ..chargePct = pct
      ..cycleCount = cycles
      ..status = status ?? BatteryStatus.inVan
      ..holderId = 'op-1'
      ..updatedAt = DateTime.utc(2026, 10, 22));

VanStock fakeVan(List<Battery> items) => VanStock((b) => b
  ..operatorId = 'op-1'
  ..total = items.length
  ..chargedCount = items.where((e) => e.chargePct >= 90).length
  ..depletedCount = items.where((e) => e.chargePct < 90).length
  ..items.replace(items));

VehicleServiceInfo fakeService({
  double kmSince = 812.4,
  double hoursSince = 40,
  int intervalKm = 1000,
  int intervalHours = 100,
  VehicleServiceStatus? status,
  double odometer = 3812.4,
}) =>
    VehicleServiceInfo((b) => b
      ..odometerKm = odometer
      ..usageHours = 300
      ..kmSinceService = kmSince
      ..hoursSinceService = hoursSince
      ..serviceIntervalKm = intervalKm
      ..serviceIntervalHours = intervalHours
      ..nextServiceAtKm = odometer - kmSince + intervalKm
      ..nextServiceAtHours = 300 - hoursSince + intervalHours
      ..kmUntilService = intervalKm - kmSince
      ..hoursUntilService = intervalHours - hoursSince
      ..status = status ?? VehicleServiceStatus.ok);

VehicleServiceRow fakeServiceRow(String code,
        {VehicleServiceInfo? service, DateTime? scheduledFor, String model = 'Volti City'}) =>
    VehicleServiceRow((b) => b
      ..vehicleId = 'veh-$code'
      ..vehicleCode = code
      ..model = model
      ..vehicleStatus = VehicleStatus.free
      ..service.replace(service ?? fakeService())
      ..scheduledFor = scheduledFor);

Vehicle fakeVehicle({
  String id = 'veh-1',
  String code = 'VT-3310',
  String? modelId,
  VehicleServiceInfo? service,
  String? address,
}) =>
    Vehicle((b) => b
      ..id = id
      ..code = code
      ..model = 'Volti City'
      ..status = VehicleStatus.free
      ..lat = -23.55
      ..lng = -46.65
      ..batteryPct = 12
      ..estimatedRangeKm = 3
      ..speedLimitKmh = 32
      ..vehicleModelId = modelId
      ..address = address
      ..service = service?.toBuilder());

VehicleModel fakeModel({
  String id = 'model-1',
  String name = 'Volti City',
  String category = 'Urbana',
  int priceCents = 59,
  String? photoUrl,
}) =>
    VehicleModel((b) => b
      ..id = id
      ..name = name
      ..slug = 'volti-city'
      ..categoryLabel = category
      ..photoUrl = photoUrl
      ..pricePerMinuteCents = priceCents
      ..serviceIntervalKm = 1000
      ..serviceIntervalHours = 100
      ..active = true
      ..sortOrder = 1
      ..createdAt = DateTime.utc(2026, 10, 1)
      ..updatedAt = DateTime.utc(2026, 10, 1));

MaintenanceTask fakeMaintenance({
  String id = 'maint-1',
  MaintenanceSource? source,
  String? customerName,
  String title = 'Revisão preventiva',
  DateTime? scheduledFor,
}) =>
    MaintenanceTask((b) => b
      ..id = id
      ..vehicleId = 'veh-1'
      ..vehicleCode = 'VT-3310'
      ..kind = MaintenanceKind.preventive
      ..title = title
      ..status = MaintenanceStatus.scheduled
      ..source_ = source
      ..customerName = customerName
      ..scheduledFor = scheduledFor
      ..createdAt = DateTime.utc(2026, 10, 21)
      ..updatedAt = DateTime.utc(2026, 10, 21));

FieldTask fakeTask({
  String id = 'task-1',
  FieldTaskType type = FieldTaskType.inspection,
  FieldTaskStatus status = FieldTaskStatus.assigned,
  TaskPriority priority = TaskPriority.high,
  String code = 'VT-3310',
  String? notes,
  VehicleStatus? vehicleStatus,
  String? vehicleAddress,
  String? targetAddress,
  String? batterySerial,
  int? batteryCycles,
  String? maintenanceTaskId,
}) =>
    FieldTask((b) => b
      ..notes = notes
      ..vehicleStatus = vehicleStatus
      ..vehicleAddress = vehicleAddress
      ..targetAddress = targetAddress
      ..vehicleBatterySerial = batterySerial
      ..vehicleBatteryCycleCount = batteryCycles
      ..maintenanceTaskId = maintenanceTaskId
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

  bool online = true;

  @override
  Future<bool> isOnline() async => online;
}

/// GPS fake: [access] e uma posicao fixa opcional.
class FakeLocationService implements LocationService {
  FakeLocationService({this.access = LocationAccess.notAsked, this.position, this.onRequest});

  LocationAccess access;
  GeoPoint? position;
  LocationAccess? onRequest;
  int requests = 0;
  int settingsOpened = 0;

  @override
  Future<LocationAccess> check() async => access;

  @override
  Future<LocationAccess> request() async {
    requests++;
    if (onRequest != null) access = onRequest!;
    return access;
  }

  @override
  Stream<GeoPoint> watch() => position == null ? const Stream.empty() : Stream.value(position!);

  @override
  Future<bool> openSettings() async {
    settingsOpened++;
    return true;
  }
}

class FakePhotoPicker implements PhotoPicker {
  int count = 0;

  @override
  Future<String?> take() async => '/tmp/photo-${++count}.jpg';
}

/// Celular pequeno (360x740 dp) para os testes de texto a 200%.
const phone = Size(360, 740);

class Harness {
  Harness({FakeFieldRepository? repo, OfflineQueue? queue, FakeLocationService? location})
      : repo = repo ?? FakeFieldRepository(),
        connectivity = FakeConnectivity(),
        queue = queue ?? MemoryOfflineQueue(),
        location = location ?? FakeLocationService();

  final FakeFieldRepository repo;
  final FakeConnectivity connectivity;
  final OfflineQueue queue;
  final FakeLocationService location;

  List<Override> get overrides => [
        fieldRepositoryProvider.overrideWithValue(repo),
        connectivityMonitorProvider.overrideWithValue(connectivity),
        offlineQueueProvider.overrideWithValue(queue),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
        locationServiceProvider.overrideWithValue(location),
      ];

  Future<void> pump(WidgetTester tester, Widget child,
      {List<Override> extraOverrides = const [],
      double textScale = 1,
      Size surface = const Size(800, 2000)}) async {
    tester.view.physicalSize = surface;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(ProviderScope(
      overrides: [...overrides, ...extraOverrides],
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
        builder: textScale == 1
            ? null
            : (context, w) => MediaQuery(
                  data: MediaQuery.of(context)
                      .copyWith(textScaler: TextScaler.linear(textScale)),
                  child: w!,
                ),
        home: child,
      ),
    ));
    await tester.pump();
  }
}
