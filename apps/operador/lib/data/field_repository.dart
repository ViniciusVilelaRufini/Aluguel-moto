import 'dart:io';

import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'handover_models.dart';
import 'models.dart';

/// Tipo de falha: `network` (tentar de novo depois) ou `rejected` (a API recusou).
/// `network`: tentar de novo depois; `auth`: token expirado (401), manter e pedir login;
/// `rejected`: a API recusou (403, 422...).
enum FailureKind { network, auth, rejected }

class RepositoryException implements Exception {
  const RepositoryException(this.kind, this.message, {this.slug, this.status});

  final FailureKind kind;
  final String message;

  /// Slug do problema RFC 7807 (ex.: `battery-serials-must-differ`).
  final String? slug;
  final int? status;

  @override
  String toString() => 'RepositoryException($kind, $status, $slug, $message)';
}

/// Operacoes de campo contra a API (ou um fake nos testes).
abstract class FieldRepository {
  Future<List<FieldTask>> listTasks();
  Future<FieldTask> startTask(String id);
  Future<VehicleCommand> serviceUnlock(String vehicleId,
      {required String reason, String? taskId});
  Future<void> setVehicleStatus(String vehicleId,
      {required ServiceVehicleStatus status, required String reason});

  /// Envia a foto (URL pre-assinada) e devolve a `objectKey`.
  Future<String> uploadPhoto(String path);

  Future<Inspection> submitInspection(
    String taskId,
    InspectionDraft draft, {
    required List<String> photoKeys,
    required DateTime recordedAt,
    required String idempotencyKey,
  });

  Future<BatterySwap> submitBatterySwap(
    String taskId,
    BatterySwapDraft draft, {
    required DateTime recordedAt,
    required String idempotencyKey,
  });

  Future<FieldTask> completeTask(
    String taskId,
    CompletionDraft draft, {
    required DateTime completedAt,
    required String idempotencyKey,
  });

  // ── Galpao: agenda de retiradas e entregas ──

  /// Galpoes ativos (`GET /depots`).
  Future<List<Depot>> listDepots();

  /// Agenda do dia (`GET /depots/{id}/pickups?date=`), todas as reservas do dia.
  Future<List<Reservation>> listPickups(String depotId, DateTime day);

  /// Foto da entrega (`POST /handovers/uploads`, prefixo `handovers/`); devolve a `objectKey`.
  Future<String> uploadHandoverPhoto(String path);

  /// Saida do galpao (`type: pickup`). Precisa do servidor: o cliente aceita no app.
  Future<Handover> createPickupHandover(PickupDraft draft, {required List<String> photoKeys});

  /// Chegada de aluguel no galpao (`type: return_depot`, `depotId` obrigatorio).
  Future<Handover> createReturnHandover({
    required String rentalId,
    required String depotId,
    required ArrivalDraft draft,
    required List<String> photoKeys,
  });

  Future<Handover> getHandover(String id);

  /// Moto pelo codigo impresso ou QR (`GET /vehicles/code/{code}`).
  Future<Vehicle> vehicleByCode(String code);
  /// Contrato v2. Ficha da moto (staff): endereco, modelo, revisao e bateria.
  Future<Vehicle> getVehicle(String id);

  /// Catalogo de modelos (foto, categoria e preco por minuto).
  Future<List<VehicleModel>> listVehicleModels();

  /// Manutencao ligada a tarefa (`FieldTask.maintenanceTaskId`).
  Future<MaintenanceTask> getMaintenanceTask(String id);

  /// Revisao por km/horas (`GET /maintenance/vehicles`), filtrada por situacao.
  Future<List<VehicleServiceRow>> listServiceStatus({VehicleServiceStatus? status});

  /// Estoque de baterias na van do proprio operador.
  Future<VanStock> getVanStock();

  /// Carrega baterias (por serie) na van. Exige rede (sem fila offline).
  Future<VanStock> loadVan(List<String> serials, {int? chargePct});

  /// Descarrega baterias da van para recarga. Exige rede (sem fila offline).
  Future<VanStock> unloadVan(List<String> serials);
}

/// Corpo do `POST /handovers` de saida.
HandoverCreate pickupHandoverRequest(PickupDraft draft, List<String> photoKeys) =>
    HandoverCreate((b) => b
      ..type = HandoverType.pickup
      ..pickupCode = draft.pickupCode.trim()
      ..checklist = ListBuilder<HandoverChecklistItem>(draft.checklist())
      ..photoKeys = ListBuilder<String>(photoKeys)
      ..batteryPct = draft.batteryPct
      ..batterySerial = draft.batterySerial.trim().isEmpty ? null : draft.batterySerial.trim());

/// Corpo do `POST /handovers` de chegada (`depotId` obrigatorio em `return_depot`).
HandoverCreate returnHandoverRequest({
  required String rentalId,
  required String depotId,
  required ArrivalDraft draft,
  required List<String> photoKeys,
}) =>
    HandoverCreate((b) => b
      ..type = HandoverType.returnDepot
      ..rentalId = rentalId
      ..depotId = depotId
      ..checklist = ListBuilder<HandoverChecklistItem>(draft.checklist())
      ..photoKeys = ListBuilder<String>(photoKeys)
      ..batteryPct = draft.batteryPct);

/// Implementacao sobre o cliente `volti_api`.
class ApiFieldRepository implements FieldRepository {
  ApiFieldRepository(this._api, {Dio? uploadDio}) : _uploadDio = uploadDio ?? Dio();

  final VoltiApi _api;
  final Dio _uploadDio;

  FieldTasksApi get _tasks => _api.getFieldTasksApi();

  @override
  Future<List<FieldTask>> listTasks() => _guard(() async {
        final items = <FieldTask>[];
        String? cursor;
        do {
          final res = await _tasks.listFieldTasks(assigneeId: 'me', cursor: cursor);
          final page = res.data!;
          items.addAll(page.items);
          cursor = page.nextCursor;
        } while (cursor != null && items.length < 500);
        return items
            .where((t) =>
                t.status != FieldTaskStatus.canceled)
            .toList();
      });

  @override
  Future<FieldTask> startTask(String id) =>
      _guard(() async => (await _tasks.startFieldTask(id: id)).data!);

  @override
  Future<VehicleCommand> serviceUnlock(String vehicleId,
          {required String reason, String? taskId}) =>
      _guard(() async {
        final res = await _tasks.serviceUnlockVehicle(
          id: vehicleId,
          serviceUnlockRequest: ServiceUnlockRequest((b) => b
            ..reason = reason
            ..fieldTaskId = taskId),
        );
        return res.data!;
      });

  @override
  Future<void> setVehicleStatus(String vehicleId,
          {required ServiceVehicleStatus status, required String reason}) =>
      _guard(() async {
        await _api.getVehiclesApi().setVehicleStatus(
              id: vehicleId,
              vehicleStatusChange: VehicleStatusChange((b) => b
                ..status = status
                ..reason = reason),
            );
      });

  static UploadContentType _contentType(String path) {
    final p = path.toLowerCase();
    if (p.endsWith('.png')) return UploadContentType.imageSlashPng;
    if (p.endsWith('.heic')) return UploadContentType.imageSlashHeic;
    return UploadContentType.imageSlashJpeg;
  }

  /// Envia o arquivo para a URL pre-assinada e devolve a `objectKey`.
  Future<String> _putFile(PresignedUpload presigned, String path) async {
    final bytes = await File(path).readAsBytes();
    await _uploadDio.put<void>(
      presigned.uploadUrl,
      data: Stream.fromIterable([bytes]),
      options: Options(headers: {
        ...presigned.headers.toMap(),
        Headers.contentLengthHeader: bytes.length,
      }),
    );
    return presigned.objectKey;
  }

  @override
  Future<String> uploadPhoto(String path) => _guard(() async {
        final presigned = (await _tasks.createFieldTaskUpload(
          uploadRequest: UploadRequest((b) => b..contentType = _contentType(path)),
        ))
            .data!;
        return _putFile(presigned, path);
      });

  @override
  Future<String> uploadHandoverPhoto(String path) => _guard(() async {
        final presigned = (await _api.getHandoversApi().createHandoverPhotoUpload(
          uploadRequest: UploadRequest((b) => b..contentType = _contentType(path)),
        ))
            .data!;
        return _putFile(presigned, path);
      });

  @override
  Future<List<Depot>> listDepots() => _guard(() async {
        final res = await _api.getDepotsApi().listDepots();
        return res.data!.items.where((d) => d.active).toList();
      });

  @override
  Future<List<Reservation>> listPickups(String depotId, DateTime day) => _guard(() async {
        final l = day.toLocal();
        final res = await _api
            .getDepotsApi()
            .listDepotPickups(id: depotId, date: Date(l.year, l.month, l.day));
        return res.data!.items.toList();
      });

  @override
  Future<Handover> createPickupHandover(PickupDraft draft, {required List<String> photoKeys}) =>
      _guard(() async => (await _api
              .getHandoversApi()
              .createHandover(handoverCreate: pickupHandoverRequest(draft, photoKeys)))
          .data!);

  @override
  Future<Handover> createReturnHandover({
    required String rentalId,
    required String depotId,
    required ArrivalDraft draft,
    required List<String> photoKeys,
  }) =>
      _guard(() async => (await _api.getHandoversApi().createHandover(
                handoverCreate: returnHandoverRequest(
                    rentalId: rentalId, depotId: depotId, draft: draft, photoKeys: photoKeys),
              ))
          .data!);

  @override
  Future<Handover> getHandover(String id) =>
      _guard(() async => (await _api.getHandoversApi().getHandover(id: id)).data!);

  @override
  Future<Vehicle> vehicleByCode(String code) => _guard(
      () async => (await _api.getVehiclesApi().getVehicleByCode(code: code.trim())).data!);

  ChecklistItem _item(bool? ok, [String? notes]) => ChecklistItem((b) => b
    ..ok = ok ?? false
    ..notes = notes);

  @override
  Future<Inspection> submitInspection(
    String taskId,
    InspectionDraft draft, {
    required List<String> photoKeys,
    required DateTime recordedAt,
    required String idempotencyKey,
  }) =>
      _guard(() async {
        final req = InspectionRequest((b) => b
          ..brakes = _item(draft.brakes).toBuilder()
          ..tires = _item(draft.tires).toBuilder()
          ..lights = _item(draft.lights).toBuilder()
          ..bell = _item(draft.bell).toBuilder()
          ..speedLimiter = SpeedLimiterCheck((s) => s
            ..ok = draft.effectiveSpeedOk ?? false
            ..configuredMaxKmh = draft.speedReading ?? 0).toBuilder()
          ..photoObjectKeys = ListBuilder<String>(photoKeys)
          ..notes = draft.notes.trim().isEmpty ? null : draft.notes.trim()
          ..recordedAt = recordedAt.toUtc());
        final res = await _tasks.submitInspection(
          id: taskId,
          inspectionRequest: req,
          idempotencyKey: idempotencyKey,
        );
        return res.data!;
      });

  @override
  Future<BatterySwap> submitBatterySwap(
    String taskId,
    BatterySwapDraft draft, {
    required DateTime recordedAt,
    required String idempotencyKey,
  }) =>
      _guard(() async {
        final res = await _tasks.submitBatterySwap(
          id: taskId,
          batterySwapRequest: BatterySwapRequest((b) => b
            ..removedBatterySerial = draft.removedSerial.trim()
            ..installedBatterySerial = draft.installedSerial.trim()
            ..recordedAt = recordedAt.toUtc()),
          idempotencyKey: idempotencyKey,
        );
        return res.data!;
      });

  @override
  Future<FieldTask> completeTask(
    String taskId,
    CompletionDraft draft, {
    required DateTime completedAt,
    required String idempotencyKey,
  }) =>
      _guard(() async {
        final res = await _tasks.completeFieldTask(
          id: taskId,
          fieldTaskCompleteRequest: FieldTaskCompleteRequest((b) => b
            ..notes = (draft.notes == null || draft.notes!.trim().isEmpty)
                ? null
                : draft.notes!.trim()
            ..vehicleStatus = switch (draft.vehicleStatus) {
              'free' => ServiceVehicleStatus.free,
              'maintenance' => ServiceVehicleStatus.maintenance,
              _ => null,
            }
            ..depotId = draft.depotId
            ..completedAt = completedAt.toUtc()),
          idempotencyKey: idempotencyKey,
        );
        return res.data!;
      });

  @override
  Future<Vehicle> getVehicle(String id) =>
      _guard(() async => (await _api.getVehiclesApi().getVehicle(id: id)).data!);

  @override
  Future<List<VehicleModel>> listVehicleModels() => _guard(
      () async => (await _api.getCatalogApi().listVehicleModels()).data!.items.toList());

  @override
  Future<MaintenanceTask> getMaintenanceTask(String id) =>
      _guard(() async => (await _api.getMaintenanceApi().getMaintenanceTask(id: id)).data!);

  @override
  Future<List<VehicleServiceRow>> listServiceStatus({VehicleServiceStatus? status}) =>
      _guard(() async {
        final items = <VehicleServiceRow>[];
        String? cursor;
        do {
          final page = (await _api
                  .getMaintenanceApi()
                  .listVehicleServiceStatus(status: status, cursor: cursor, limit: 100))
              .data!;
          items.addAll(page.items);
          cursor = page.nextCursor;
        } while (cursor != null && items.length < 500);
        return items;
      });

  @override
  Future<VanStock> getVanStock() =>
      _guard(() async => (await _api.getBatteriesApi().getVanStock()).data!);

  @override
  Future<VanStock> loadVan(List<String> serials, {int? chargePct}) => _guard(() async =>
      (await _api.getBatteriesApi().loadVanBatteries(
        batteryTransferRequest: BatteryTransferRequest((b) => b
          ..serials = ListBuilder<String>(serials.map((e) => e.trim()))
          ..chargePct = chargePct),
      ))
          .data!);

  @override
  Future<VanStock> unloadVan(List<String> serials) => _guard(() async =>
      (await _api.getBatteriesApi().unloadVanBatteries(
        batteryTransferRequest: BatteryTransferRequest(
            (b) => b..serials = ListBuilder<String>(serials.map((e) => e.trim()))),
      ))
          .data!);
}

Future<T> _guard<T>(Future<T> Function() body) async {
  try {
    return await body();
  } on DioException catch (e) {
    throw mapDioError(e);
  }
}

/// Converte um erro do Dio em [RepositoryException].
RepositoryException mapDioError(DioException e) {
  final status = e.response?.statusCode;
  if (status == null) {
    return const RepositoryException(FailureKind.network, 'Sem conexão com o servidor.');
  }
  final data = e.response?.data;
  String? slug;
  String? detail;
  if (data is Map) {
    final type = data['type'];
    if (type is String && type.contains('/')) slug = type.split('/').last;
    detail = (data['detail'] ?? data['title']) as String?;
  }
  if (status == 401) {
    return RepositoryException(FailureKind.auth, detail ?? 'Sessão expirada.',
        slug: slug, status: status);
  }
  // 409 "ainda em processamento" (Idempotency-Key em andamento): tentar de novo.
  // Outros 409 sao recusa de negocio.
  final inFlight = status == 409 &&
      (slug == null || slug == 'conflict') &&
      (detail ?? '').toLowerCase().contains('processamento');
  // 5xx: o servidor pode estar indisponivel; tentar de novo depois.
  if (status >= 500 || status == 408 || status == 429 || inFlight) {
    return RepositoryException(FailureKind.network, detail ?? 'Servidor indisponível.',
        slug: slug, status: status);
  }
  return RepositoryException(FailureKind.rejected, detail ?? 'Pedido recusado ($status).',
      slug: slug, status: status);
}

final fieldRepositoryProvider = Provider<FieldRepository>(
  (ref) => ApiFieldRepository(ref.watch(apiClientProvider)),
);
