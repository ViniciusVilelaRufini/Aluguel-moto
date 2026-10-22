import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/launcher.dart';
import '../../core/widgets.dart';
import '../home/depot_providers.dart';
import '../pickup/depot_labels.dart';

/// Galpao do aluguel: o da moto (`Vehicle.depotId`) ou, sem ele, o mais perto.
/// Usado por "Trocar bateria" e "Devolver no galpao".
final rentalDepotProvider = FutureProvider.autoDispose.family<Depot?, String>((ref, rentalId) async {
  final backend = ref.watch(backendProvider);
  String? depotId;
  try {
    final rental = await backend.rental(rentalId);
    depotId = (await backend.vehicleByCode(rental.vehicleCode)).depotId;
  } catch (_) {
    // Sem a moto: cai no galpao mais perto.
  }
  if (depotId != null) {
    try {
      return await ref.watch(depotByIdProvider(depotId).future);
    } catch (_) {}
  }
  return ref.watch(currentDepotProvider.future);
});

/// Onde trocar a bateria, na ordem da tela: o galpao primeiro (pela estacao
/// dele, `Depot.swapStationId`, ou o proprio galpao, com o operador) e depois
/// as outras estacoes (`GET /swap-stations`, mais perto primeiro).
({SwapStation? depotStation, List<SwapStation> others}) swapPlaces(Depot? depot, List<SwapStation> stations) {
  final own = depot?.swapStationId;
  SwapStation? depotStation;
  final others = <SwapStation>[];
  for (final s in stations) {
    if (own != null && s.id == own) {
      depotStation = s;
    } else {
      others.add(s);
    }
  }
  return (depotStation: depotStation, others: others);
}

/// Folha "Trocar bateria" da corrida. A rota so abre quando o cliente toca num
/// lugar (`geo:` no Android ou o link `maps/dir` do Google Maps); a posicao do
/// cliente nao sai do aparelho.
class BatterySwapSheet extends ConsumerWidget {
  const BatterySwapSheet({super.key, required this.rentalId});
  final String rentalId;

  static Future<void> show(BuildContext context, String rentalId) =>
      VoltiBottomSheet.show<void>(context, builder: (_) => BatterySwapSheet(rentalId: rentalId));

  Future<void> _go(BuildContext context, WidgetRef ref, double lat, double lng) async {
    final ok = await openDirections(ref.read(urlLauncherProvider), lat, lng);
    if (!ok && context.mounted) VoltiToast.show(context, context.l.navigateFailed, tone: VoltiToastTone.danger);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final depotAsync = ref.watch(rentalDepotProvider(rentalId));
    final stationsAsync = ref.watch(swapStationsProvider);
    final loading = (depotAsync.isLoading && !depotAsync.hasValue) || (stationsAsync.isLoading && !stationsAsync.hasValue);
    final depot = depotAsync.value;
    final places = swapPlaces(depot, stationsAsync.value ?? const []);

    Widget place({required Key key, required String title, required String subtitle, required IconData icon, required ListRowTone tone, required VoidCallback onTap}) =>
        Padding(
          padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
          child: Semantics(
            hint: l.swapDirectionsHint,
            child: KeyedSubtree(
              key: key,
              child: ListRow(title: title, subtitle: subtitle, icon: icon, iconTone: tone, onTap: onTap),
            ),
          ),
        );

    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(l.swapBattery, style: VoltiTypography.title)),
          const SizedBox(height: VoltiSpacing.s8),
          Text(l.swapBatteryText, style: VoltiTypography.caption),
          const SizedBox(height: VoltiSpacing.s16),
          if (loading)
            VoltiSkeleton.list(key: const Key('swap-skeleton'), rows: 3, trailing: false, label: l.loading)
          else ...[
            if (depot != null)
              place(
                key: const Key('swap-depot'),
                title: depotTitle(l, depot),
                subtitle: [
                  depot.address,
                  places.depotStation != null ? l.swapAvailable(places.depotStation!.availableBatteries) : l.swapAtDepot,
                ].join(' · '),
                icon: LucideIcons.warehouse,
                tone: ListRowTone.brand,
                onTap: () => _go(context, ref, depot.lat, depot.lng),
              ),
            for (final s in places.others)
              place(
                key: Key('swap-station-${s.id}'),
                title: s.name,
                subtitle: '${s.address} · ${l.swapAvailable(s.availableBatteries)}',
                icon: LucideIcons.batteryCharging,
                tone: ListRowTone.info,
                onTap: () => _go(context, ref, s.lat, s.lng),
              ),
            if (places.others.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: VoltiSpacing.s4),
                child: Text(l.swapStationsEmpty, style: VoltiTypography.caption),
              ),
          ],
          const SizedBox(height: VoltiSpacing.s8),
          VoltiButton(label: l.close, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop()),
        ],
      ),
    );
  }
}
