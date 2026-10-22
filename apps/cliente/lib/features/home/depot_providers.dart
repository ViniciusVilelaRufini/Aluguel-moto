import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';

import '../../core/backend.dart';
import 'providers.dart';

/// Galpoes ativos, mais perto primeiro (`distanceM` da API quando ha localizacao;
/// sem distancia mantem a ordem da API, depois dos que tem).
final depotsProvider = FutureProvider.autoDispose<List<Depot>>((ref) async {
  final loc = await ref.watch(userLocationProvider.future);
  final list = await ref.watch(backendProvider).depots(lat: loc?.latitude, lng: loc?.longitude);
  return sortDepotsByDistance([for (final d in list) if (d.active) d]);
});

List<Depot> sortDepotsByDistance(List<Depot> list) {
  final indexed = list.indexed.toList()
    ..sort((a, b) {
      final da = a.$2.distanceM, db = b.$2.distanceM;
      if (da == null && db == null) return a.$1.compareTo(b.$1);
      if (da == null) return 1;
      if (db == null) return -1;
      final c = da.compareTo(db);
      return c != 0 ? c : a.$1.compareTo(b.$1);
    });
  return [for (final e in indexed) e.$2];
}

/// Galpao escolhido no seletor da home (`null` = o mais perto).
final selectedDepotIdProvider = NotifierProvider<SelectedDepotNotifier, String?>(SelectedDepotNotifier.new);

class SelectedDepotNotifier extends Notifier<String?> {
  @override
  String? build() => null;
  void select(String id) => state = id;
}

/// Galpao ativo: o escolhido no seletor ou, sem escolha (ou com um so), o mais perto.
final currentDepotProvider = FutureProvider.autoDispose<Depot?>((ref) async {
  final list = await ref.watch(depotsProvider.future);
  final id = ref.watch(selectedDepotIdProvider);
  for (final d in list) {
    if (d.id == id) return d;
  }
  return list.firstOrNull;
});

/// Galpao por id (tela da reserva): primeiro na lista ja carregada, senao `GET /depots/{id}`.
final depotByIdProvider = FutureProvider.autoDispose.family<Depot, String>((ref, id) async {
  try {
    final list = await ref.watch(depotsProvider.future);
    for (final d in list) {
      if (d.id == id) return d;
    }
  } catch (_) {}
  return ref.watch(backendProvider).depot(id);
});

/// Motos livres do galpao.
final depotVehiclesProvider = FutureProvider.autoDispose.family<List<Vehicle>, String>(
  (ref, depotId) => ref.watch(backendProvider).depotVehicles(depotId),
);

/// Modelos do catalogo por id (foto). Falha = sem fotos (a lista mostra o icone).
final vehicleModelsProvider = FutureProvider.autoDispose<Map<String, VehicleModel>>((ref) async {
  try {
    final list = await ref.watch(backendProvider).vehicleModels();
    return {for (final m in list) m.id: m};
  } catch (_) {
    return const {};
  }
});

/// Estacoes de troca de bateria (mapa da home e "Trocar bateria"). O erro
/// sobe: a home mostra o mapa sem estacoes (`.value`), a folha mostra o erro
/// com "Tentar de novo".
final swapStationsProvider = FutureProvider.autoDispose<List<SwapStation>>((ref) async {
  final loc = await ref.watch(userLocationProvider.future);
  return ref.watch(backendProvider).swapStations(lat: loc?.latitude, lng: loc?.longitude);
});
