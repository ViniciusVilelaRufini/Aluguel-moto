import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart' show VehicleStatus;

import 'models.dart';

/// Rascunho do checklist por tarefa, compartilhado entre o detalhe (contador
/// n/5 e foto) e a tela do checklist.
class InspectionDraftsController extends Notifier<Map<String, InspectionDraft>> {
  @override
  Map<String, InspectionDraft> build() => const {};

  InspectionDraft of(String taskId) => state[taskId] ?? const InspectionDraft();

  void put(String taskId, InspectionDraft draft) => state = {...state, taskId: draft};

  void addPhoto(String taskId, String path) {
    final d = of(taskId);
    put(taskId, d.copyWith(photoPaths: [...d.photoPaths, path]));
  }

  void removePhoto(String taskId, int index) {
    final d = of(taskId);
    if (index < 0 || index >= d.photoPaths.length) return;
    put(taskId, d.copyWith(photoPaths: [...d.photoPaths]..removeAt(index)));
  }

  void clear(String taskId) => state = {...state}..remove(taskId);
}

final inspectionDraftsProvider =
    NotifierProvider<InspectionDraftsController, Map<String, InspectionDraft>>(
        InspectionDraftsController.new);

/// Status da moto mudado nesta sessao pelo operador. Vale ate a proxima lista
/// da API, que traz `FieldTask.vehicleStatus` (contrato v2).
class KnownVehicleStatusController extends Notifier<Map<String, VehicleStatus>> {
  @override
  Map<String, VehicleStatus> build() => const {};

  void set(String vehicleId, VehicleStatus status) => state = {...state, vehicleId: status};

  /// O servidor mandou o status destas motos: o local deixa de valer.
  void forget(Iterable<String> vehicleIds) {
    final ids = vehicleIds.toSet();
    if (!state.keys.any(ids.contains)) return;
    state = {...state}..removeWhere((k, _) => ids.contains(k));
  }
}

final knownVehicleStatusProvider =
    NotifierProvider<KnownVehicleStatusController, Map<String, VehicleStatus>>(
        KnownVehicleStatusController.new);
