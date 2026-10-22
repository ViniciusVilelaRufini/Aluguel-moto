import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';

import 'field_repository.dart';
import 'handover_models.dart';
import 'sync.dart';

class DepotsResult {
  const DepotsResult(this.depots, {this.fromCache = false});

  final List<Depot> depots;
  final bool fromCache;

  Depot? byId(String? id) {
    for (final d in depots) {
      if (d.id == id) return d;
    }
    return null;
  }
}

/// Galpoes ativos. Sem rede, usa a ultima lista salva (a chegada funciona offline).
final depotsProvider = FutureProvider<DepotsResult>((ref) async {
  final queue = ref.read(offlineQueueProvider);
  try {
    final depots = await ref.read(fieldRepositoryProvider).listDepots();
    await queue.saveDepots([
      for (final d in depots)
        standardSerializers.serializeWith(Depot.serializer, d)! as Map<String, dynamic>,
    ]);
    return DepotsResult(depots);
  } on RepositoryException catch (e) {
    if (e.kind != FailureKind.network) rethrow;
    final cached = await queue.loadDepots();
    if (cached.isEmpty) rethrow;
    return DepotsResult([
      for (final j in cached) standardSerializers.deserializeWith(Depot.serializer, j)!,
    ], fromCache: true);
  }
});

/// Galpao escolhido pelo operador nesta sessao (`null` = ainda nao escolheu).
class SelectedDepotController extends Notifier<String?> {
  @override
  String? build() => null;

  void select(String id) => state = id;
}

final selectedDepotProvider =
    NotifierProvider<SelectedDepotController, String?>(SelectedDepotController.new);

/// Galpao em uso: o escolhido ou, com um galpao so, ele mesmo (pre-selecionado).
String? effectiveDepotId(List<Depot> depots, String? selected) {
  if (selected != null && depots.any((d) => d.id == selected)) return selected;
  return depots.length == 1 ? depots.single.id : null;
}

/// Agenda do dia do galpao.
final pickupsProvider = FutureProvider.family<List<Reservation>, String>((ref, depotId) async {
  final items = await ref.read(fieldRepositoryProvider).listPickups(depotId, DateTime.now());
  return sortPickups(items);
});

/// Rascunhos do checklist de saida, por codigo do QR. Sem rede o rascunho fica
/// guardado e o envio espera a rede voltar.
class PickupDraftsController extends Notifier<Map<String, PickupDraft>> {
  @override
  Map<String, PickupDraft> build() => const {};

  PickupDraft of(String code) => state[code] ?? PickupDraft(pickupCode: code);

  void put(PickupDraft d) => state = {...state, d.pickupCode: d};

  void clear(String code) => state = {...state}..remove(code);

  /// Rascunho da reserva (pelo id dentro do codigo), se houver.
  PickupDraft? forReservation(String reservationId) {
    for (final d in state.values) {
      if (PickupCode.parse(d.pickupCode)?.reservationId == reservationId) return d;
    }
    return null;
  }
}

final pickupDraftsProvider =
    NotifierProvider<PickupDraftsController, Map<String, PickupDraft>>(
        PickupDraftsController.new);
