import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/fleet.dart';
import 'package:volti_operador/features/fleet/fleet_widgets.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Revisoes da frota por km/horas (`GET /maintenance/vehicles`): situacao,
/// km desde a revisao, o que falta e a manutencao agendada. Somente leitura
/// (agendar e da operacao, no painel).
class FleetServicePage extends ConsumerStatefulWidget {
  const FleetServicePage({super.key});

  @override
  ConsumerState<FleetServicePage> createState() => _FleetServicePageState();
}

class _FleetServicePageState extends ConsumerState<FleetServicePage> {
  VehicleServiceStatus? _filter;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final rows = ref.watch(serviceStatusProvider(_filter));
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(title: t.fleetServiceTitle),
          Padding(
            padding: const EdgeInsets.fromLTRB(
                VoltiSpacing.screenGutter, 0, VoltiSpacing.screenGutter, VoltiSpacing.s8),
            child: Column(
              children: [
                const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s8)),
                VoltiSegmentedControl<VehicleServiceStatus?>(
                  key: const Key('service-filter'),
                  options: [
                    VoltiSegment(value: null, label: t.filterAll),
                    VoltiSegment(value: VehicleServiceStatus.overdue, label: t.filterOverdue),
                    VoltiSegment(value: VehicleServiceStatus.dueSoon, label: t.filterDueSoon),
                  ],
                  value: _filter,
                  onChanged: (v) => setState(() => _filter = v),
                ),
              ],
            ),
          ),
          Expanded(
            child: rows.when(
              skipLoadingOnRefresh: true,
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, _) => VoltiEmptyState(
                icon: LucideIcons.cloudOff,
                title: t.serviceError,
                actionLabel: t.retry,
                actionIcon: LucideIcons.refreshCw,
                onAction: () => ref.invalidate(serviceStatusProvider(_filter)),
              ),
              data: (list) => RefreshIndicator(
                onRefresh: () => ref.refresh(serviceStatusProvider(_filter).future),
                child: list.isEmpty
                    ? ListView(children: [
                        Padding(
                          padding: const EdgeInsets.only(top: VoltiSpacing.s24),
                          child: VoltiEmptyState(
                              icon: LucideIcons.circleCheck, title: t.serviceEmpty, compact: true),
                        ),
                      ])
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4,
                            VoltiSpacing.screenGutter, VoltiSpacing.s40),
                        itemCount: list.length,
                        separatorBuilder: (_, _) => const SizedBox(height: VoltiSpacing.s10),
                        itemBuilder: (_, i) => _ServiceRow(row: list[i]),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceRow extends StatelessWidget {
  const _ServiceRow({required this.row});

  final VehicleServiceRow row;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      key: Key('service-row-${row.vehicleCode}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: VoltiSpacing.s8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Semantics(
                header: true,
                child: Text(row.vehicleCode,
                    style: VoltiTypography.label.copyWith(fontFamily: VoltiTypography.fontMono)),
              ),
              Text(row.model,
                  style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
            ],
          ),
          const SizedBox(height: VoltiSpacing.s8),
          ServiceIndicator(service: row.service, scheduledFor: row.scheduledFor),
        ],
      ),
    );
  }
}
