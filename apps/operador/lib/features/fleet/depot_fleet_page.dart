import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/depot_state.dart';
import 'package:volti_operador/data/depot_time.dart';
import 'package:volti_operador/data/fleet.dart';
import 'package:volti_operador/features/fleet/fleet_labels.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Motos do galpao por status (`GET /depots/{id}/vehicles`, visao interna):
/// codigo, modelo, bateria e status; o ultimo sinal no fuso do galpao.
class DepotFleetPage extends ConsumerStatefulWidget {
  const DepotFleetPage({super.key});

  @override
  ConsumerState<DepotFleetPage> createState() => _DepotFleetPageState();
}

class _DepotFleetPageState extends ConsumerState<DepotFleetPage> {
  VehicleStatus? _filter;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final depotsAsync = ref.watch(depotsProvider);
    final depots = depotsAsync.value?.depots ?? const <Depot>[];
    final depotId = effectiveDepotId(depots, ref.watch(selectedDepotProvider));
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(title: t.depotFleetTitle),
          Expanded(
            child: depotsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, _) => VoltiEmptyState(
                icon: LucideIcons.cloudOff,
                title: t.depotFleetError,
                actionLabel: t.retry,
                actionIcon: LucideIcons.refreshCw,
                onAction: () => ref.invalidate(depotsProvider),
              ),
              data: (r) => depotId == null ? _chooser(t, r.depots) : _list(t, r, depotId),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chooser(AppLocalizations t, List<Depot> depots) => ListView(
        padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
            child: Semantics(
                header: true, child: Text(t.depotFleetChoose, style: VoltiTypography.heading)),
          ),
          for (final d in depots)
            ListRow(
              key: Key('depot-pick-${d.id}'),
              icon: LucideIcons.warehouse,
              title: d.name,
              subtitle: d.address,
              trailing: ListRowTrailing.chevron,
              onTap: () => ref.read(selectedDepotProvider.notifier).select(d.id),
            ),
        ],
      );

  Widget _list(AppLocalizations t, DepotsResult depots, String depotId) {
    final zone = depotZone(depots, depotId);
    final query = (depotId: depotId, status: _filter);
    final vehicles = ref.watch(depotVehiclesProvider(query));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
              VoltiSpacing.screenGutter, 0, VoltiSpacing.screenGutter, VoltiSpacing.s8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s8)),
              Text(depots.byId(depotId)?.name ?? '',
                  style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
              const SizedBox(height: VoltiSpacing.s8),
              Semantics(
                container: true,
                label: t.depotFleetFilter,
                child: Wrap(
                  spacing: VoltiSpacing.s8,
                  runSpacing: VoltiSpacing.s4,
                  children: [
                    VoltiChip(
                      key: const Key('fleet-filter-all'),
                      label: t.filterAll,
                      selected: _filter == null,
                      onTap: () => setState(() => _filter = null),
                    ),
                    for (final s in depotVehicleFilters)
                      VoltiChip(
                        key: Key('fleet-filter-${s.name}'),
                        label: vehicleStatusBadge(t, s).$1,
                        selected: _filter == s,
                        onTap: () => setState(() => _filter = s),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: vehicles.when(
            skipLoadingOnRefresh: true,
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, _) => VoltiEmptyState(
              icon: LucideIcons.cloudOff,
              title: t.depotFleetError,
              actionLabel: t.retry,
              actionIcon: LucideIcons.refreshCw,
              onAction: () => ref.invalidate(depotVehiclesProvider(query)),
            ),
            data: (list) => RefreshIndicator(
              onRefresh: () => ref.refresh(depotVehiclesProvider(query).future),
              child: list.isEmpty
                  ? ListView(children: [
                      Padding(
                        padding: const EdgeInsets.only(top: VoltiSpacing.s24),
                        child: VoltiEmptyState(
                            icon: LucideIcons.motorbike, title: t.depotFleetEmpty, compact: true),
                      ),
                    ])
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4,
                          VoltiSpacing.screenGutter, VoltiSpacing.s40),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: VoltiSpacing.s10),
                      itemBuilder: (_, i) => _VehicleRow(vehicle: list[i], zone: zone),
                    ),
            ),
          ),
        ),
      ],
    );
  }
}

class _VehicleRow extends StatelessWidget {
  const _VehicleRow({required this.vehicle, required this.zone});

  final Vehicle vehicle;
  final String zone;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final v = vehicle;
    final (statusLabel, tone) = vehicleStatusBadge(t, v.status);
    final seen = v.lastSeenAt;
    return Semantics(
      container: true,
      label: t.depotFleetSemantics(v.code, v.model, statusLabel, v.batteryPct),
      excludeSemantics: true,
      child: SectionCard(
        key: Key('depot-vehicle-${v.code}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: VoltiSpacing.s8,
              runSpacing: VoltiSpacing.s4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(v.code,
                    style: VoltiTypography.body.copyWith(
                        fontFamily: VoltiTypography.fontMono, fontWeight: FontWeight.w600)),
                VoltiBadge(statusLabel, tone: tone, size: VoltiBadgeSize.sm),
                VoltiBadge('${v.batteryPct}%',
                    tone: batteryTone(v.batteryPct), size: VoltiBadgeSize.sm),
              ],
            ),
            const SizedBox(height: VoltiSpacing.s4),
            Text(v.model, style: VoltiTypography.body),
            Text(seen == null ? t.depotFleetNoSignal : t.depotFleetSeen(depotHhmm(seen, zone)),
                style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}
