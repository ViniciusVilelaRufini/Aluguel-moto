import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';

import 'field_repository.dart';
import 'sync.dart';

/// Dados do contrato v2 que o operador consulta: estoque da van, revisoes por
/// km/horas, ficha da moto, modelos e manutencao da tarefa. Tudo online: sem
/// rede, a tela mostra o estado de erro (nada disso entra na fila offline).

Duration? _noRetry(int _, Object _) => null;

/// Estoque de baterias na van do operador (`GET /batteries/van-stock`).
class VanStockController extends AsyncNotifier<VanStock> {
  @override
  Future<VanStock> build() {
    // A troca sincronizada tira a instalada da van e poe a retirada: relê.
    ref.listen(syncControllerProvider, (prev, next) {
      for (final e in next.results.entries) {
        if (prev?.results.containsKey(e.key) ?? false) continue;
        if (e.value is BatterySwap) {
          ref.invalidateSelf();
          return;
        }
      }
    });
    return ref.read(fieldRepositoryProvider).getVanStock();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    try {
      await future;
    } on Object {
      // O estado de erro fica no provider.
    }
  }

  /// Carrega as series na van; o estado passa a ser o estoque devolvido.
  Future<VanStock> load(List<String> serials, {int? chargePct}) async {
    final v = await ref.read(fieldRepositoryProvider).loadVan(serials, chargePct: chargePct);
    state = AsyncData(v);
    return v;
  }

  /// Descarrega as series para recarga.
  Future<VanStock> unload(List<String> serials) async {
    final v = await ref.read(fieldRepositoryProvider).unloadVan(serials);
    state = AsyncData(v);
    return v;
  }
}

final vanStockProvider = AsyncNotifierProvider<VanStockController, VanStock>(
    VanStockController.new,
    retry: _noRetry);

/// Revisoes por km/horas; `null` = todas.
final serviceStatusProvider = FutureProvider.autoDispose
    .family<List<VehicleServiceRow>, VehicleServiceStatus?>(
        (ref, status) => ref.read(fieldRepositoryProvider).listServiceStatus(status: status),
        retry: _noRetry);

/// Ficha da moto (staff).
final vehicleProvider = FutureProvider.autoDispose.family<Vehicle, String>(
    (ref, id) => ref.read(fieldRepositoryProvider).getVehicle(id),
    retry: _noRetry);

/// Modelos por id (foto, nome, categoria e preco por minuto). `autoDispose`: a
/// `photoUrl` e assinada e expira, entao o catalogo e relido a cada tela que o usa.
final vehicleModelsProvider =
    FutureProvider.autoDispose<Map<String, VehicleModel>>((ref) async {
  final list = await ref.read(fieldRepositoryProvider).listVehicleModels();
  return {for (final m in list) m.id: m};
}, retry: _noRetry);

/// Manutencao ligada a tarefa.
final maintenanceTaskProvider = FutureProvider.autoDispose.family<MaintenanceTask, String>(
    (ref, id) => ref.read(fieldRepositoryProvider).getMaintenanceTask(id),
    retry: _noRetry);
