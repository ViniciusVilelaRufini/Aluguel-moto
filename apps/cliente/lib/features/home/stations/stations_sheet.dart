import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../../core/geo.dart';
import '../../../core/launcher.dart';
import '../../../core/widgets.dart';
import '../../pickup/depot_labels.dart';
import '../depot_providers.dart';
import 'station_logic.dart';

/// Acoes extras de uma linha da folha (ex.: um futuro "Trocar aqui" da troca
/// por QR). Ficam ao lado de "Como chegar"; `null` = so "Como chegar".
typedef StationActionsBuilder = List<Widget> Function(BuildContext context, SwapPoint point);

/// Folha "Troca de bateria" do modo estacoes da home. Fica no lugar do cartao
/// do galpao (nao e modal: o mapa continua visivel e tocar numa linha centra o
/// ponto). O galpao vem primeiro quando e ponto de troca; depois, as estacoes
/// mais perto primeiro. A rota so abre no toque em "Como chegar".
class StationsSheet extends ConsumerWidget {
  const StationsSheet({super.key = const Key('stations-sheet'), required this.onClose, required this.onFocus, this.extraActions});

  final VoidCallback onClose;
  final ValueChanged<SwapStation> onFocus;
  final StationActionsBuilder? extraActions;

  Future<void> _go(BuildContext context, WidgetRef ref, SwapStation s) async {
    final ok = await openDirections(ref.read(urlLauncherProvider), s.lat, s.lng);
    if (!ok && context.mounted) VoltiToast.show(context, context.l.navigateFailed, tone: VoltiToastTone.danger);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final stations = ref.watch(swapStationsProvider);
    final depot = ref.watch(currentDepotProvider).value;

    final Widget body = switch (stations) {
      AsyncValue(:final error?, hasValue: false) || AsyncValue(:final error?, isLoading: false) => SingleChildScrollView(
        child: KeyedSubtree(
          key: const Key('stations-error'),
          child: ErrorState(error: error, onRetry: () => ref.invalidate(swapStationsProvider)),
        ),
      ),
      AsyncValue(hasValue: false) => VoltiSkeleton.list(key: const Key('stations-skeleton'), rows: 3, trailing: false, label: l.loading),
      AsyncValue(:final value?) when value.isEmpty => SingleChildScrollView(
        child: VoltiEmptyState(key: const Key('stations-empty'), compact: true, icon: LucideIcons.batteryCharging, title: l.stationsEmpty),
      ),
      AsyncValue(:final value) => SingleChildScrollView(
        key: const Key('stations-list'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final p in orderSwapPoints(depot, value ?? const []))
              StationRow(
                key: Key('station-row-${p.station.id}'),
                point: p,
                onFocus: () => onFocus(p.station),
                onDirections: () => _go(context, ref, p.station),
                extraActions: extraActions?.call(context, p) ?? const [],
              ),
          ],
        ),
      ),
    };

    return VoltiBottomSheet(
      padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 12, VoltiSpacing.screenGutter, VoltiSpacing.s16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(header: true, child: Text(l.stationsSheetTitle, style: VoltiTypography.title)),
              ),
              const SizedBox(width: VoltiSpacing.s8),
              VoltiIconButton(
                key: const Key('stations-close'),
                icon: LucideIcons.x,
                variant: VoltiIconButtonVariant.soft,
                label: l.stationsCloseSemantics,
                onPressed: onClose,
              ),
            ],
          ),
          const SizedBox(height: VoltiSpacing.s12),
          Flexible(child: body),
        ],
      ),
    );
  }
}

/// Linha de um ponto de troca: nome, endereco e distancia, pilula de baterias,
/// horario e as acoes ("Como chegar" e, no futuro, [extraActions]).
class StationRow extends StatelessWidget {
  const StationRow({super.key, required this.point, required this.onFocus, required this.onDirections, this.extraActions = const []});

  final SwapPoint point;
  final VoidCallback onFocus;
  final VoidCallback onDirections;
  final List<Widget> extraActions;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final s = point.station;
    final depot = point.depot;
    final title = depot != null ? depotTitle(l, depot) : s.name;
    final distanceM = s.distanceM ?? depot?.distanceM;
    final place = distanceM == null ? s.address : '${s.address} · ${walkingDistanceLabel(distanceM)}';
    final availability = l.stationAvailability(s.availableBatteries);
    final hours = stationHoursLabel(l, s);

    return Padding(
      padding: const EdgeInsets.only(bottom: VoltiSpacing.s12),
      child: Container(
        padding: const EdgeInsets.all(VoltiSpacing.s12),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: VoltiRadii.rLg,
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              hint: l.stationShowOnMapHint,
              child: VoltiPressable(
                key: Key('station-focus-${s.id}'),
                semanticLabel: '$title. $place. $availability. $hours',
                onTap: onFocus,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(color: depot != null ? context.palette.brandSoft : context.palette.infoSoft, borderRadius: VoltiRadii.rMd),
                      child: Icon(
                        depot != null ? LucideIcons.warehouse : LucideIcons.batteryCharging,
                        color: depot != null ? VoltiColors.brandAction : context.palette.infoInk,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: VoltiSpacing.s12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
                          const SizedBox(height: 2),
                          Text(place, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                          const SizedBox(height: VoltiSpacing.s8),
                          Wrap(
                            spacing: VoltiSpacing.s8,
                            runSpacing: 6,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              StationAvailabilityPill(station: s),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(LucideIcons.clock, size: 14, color: scheme.onSurfaceVariant),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(hours, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: VoltiSpacing.s12),
            Wrap(
              spacing: VoltiSpacing.s8,
              runSpacing: VoltiSpacing.s8,
              children: [
                VoltiButton(
                  key: Key('station-directions-${s.id}'),
                  label: l.howToGetThere,
                  semanticLabel: l.stationDirectionsSemantics(title),
                  icon: LucideIcons.navigation,
                  variant: VoltiButtonVariant.secondary,
                  size: VoltiButtonSize.sm,
                  wrap: true,
                  onPressed: onDirections,
                ),
                ...extraActions,
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Pilula clara de baterias (mesmo estilo da `BatteryPill(light:)`, E-25):
/// fundo neutro, texto escuro e icone colorido pela disponibilidade.
class StationAvailabilityPill extends StatelessWidget {
  const StationAvailabilityPill({super.key, required this.station});
  final SwapStation station;

  static Color iconColor(StationAvailability a, {bool dark = false}) => switch (a) {
    // Ramo claro em tokens fixos de proposito (funcao estatica; o escuro tem os vivos). tema: fixo
    StationAvailability.many => dark ? VoltiColors.green400 : VoltiColors.successInk, // tema: fixo
    StationAvailability.few => dark ? VoltiColors.sun400 : VoltiColors.warningInk, // tema: fixo
    StationAvailability.none => dark ? VoltiColors.ink400 : VoltiColors.ink500,
  };

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final a = stationAvailability(station);
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      key: Key('station-pill-${station.id}'),
      constraints: const BoxConstraints(minHeight: 30),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: scheme.surfaceContainerHighest, borderRadius: VoltiRadii.rPill),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            a == StationAvailability.none ? LucideIcons.batteryWarning : LucideIcons.batteryCharging,
            key: Key('station-pill-icon-${station.id}'),
            size: 14,
            color: iconColor(a, dark: dark),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              context.l.stationAvailability(station.availableBatteries),
              style: VoltiTypography.caption.copyWith(color: scheme.onSurface, fontWeight: VoltiTypography.fwSemibold),
            ),
          ),
        ],
      ),
    );
  }
}
