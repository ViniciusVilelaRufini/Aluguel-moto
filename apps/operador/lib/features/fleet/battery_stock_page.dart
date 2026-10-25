import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/fleet.dart';
import 'package:volti_operador/features/fleet/fleet_labels.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Estoque de baterias (`GET /batteries`): contagem por status (galpao em
/// recarga, estacoes, van, motos) e a lista com serie, carga e ciclos.
/// Status que o app ainda nao conhece aparecem como "Outro status".
class BatteryStockPage extends ConsumerStatefulWidget {
  const BatteryStockPage({super.key});

  @override
  ConsumerState<BatteryStockPage> createState() => _BatteryStockPageState();
}

class _BatteryStockPageState extends ConsumerState<BatteryStockPage> {
  /// `null` = todas; `unknownDefaultOpenApi` = o grupo "Outro status".
  BatteryStatus? _filter;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final batteries = ref.watch(batteriesProvider);
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(title: t.stockTitle),
          Expanded(
            child: batteries.when(
              skipLoadingOnRefresh: true,
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, _) => VoltiEmptyState(
                icon: LucideIcons.cloudOff,
                title: t.stockError,
                actionLabel: t.retry,
                actionIcon: LucideIcons.refreshCw,
                onAction: () => ref.invalidate(batteriesProvider),
              ),
              data: (all) => _content(t, all),
            ),
          ),
        ],
      ),
    );
  }

  /// Grupo da bateria: o proprio status se conhecido, senao "outro".
  static BatteryStatus _group(BatteryStatus s) =>
      isKnownBatteryStatus(s) ? s : BatteryStatus.unknownDefaultOpenApi;

  Widget _content(AppLocalizations t, List<Battery> all) {
    final counts = <BatteryStatus, int>{};
    for (final b in all) {
      counts.update(_group(b.status), (n) => n + 1, ifAbsent: () => 1);
    }
    final groups = [
      ...knownBatteryStatuses,
      if ((counts[BatteryStatus.unknownDefaultOpenApi] ?? 0) > 0)
        BatteryStatus.unknownDefaultOpenApi,
    ];
    final shown = (_filter == null ? all : all.where((b) => _group(b.status) == _filter).toList())
      ..sort((a, b) => a.serial.compareTo(b.serial));
    return RefreshIndicator(
      onRefresh: () => ref.refresh(batteriesProvider.future),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
            VoltiSpacing.screenGutter, 0, VoltiSpacing.screenGutter, VoltiSpacing.s40),
        children: [
          const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
          Wrap(
            spacing: VoltiSpacing.s8,
            runSpacing: VoltiSpacing.s8,
            children: [
              for (final g in groups)
                _Count(
                  key: Key('stock-count-${g.name}'),
                  label: batteryStatusLabel(t, g),
                  value: counts[g] ?? 0,
                  selected: _filter == g,
                  onTap: () => setState(() => _filter = _filter == g ? null : g),
                ),
            ],
          ),
          const SizedBox(height: VoltiSpacing.s12),
          if (shown.isEmpty)
            VoltiEmptyState(icon: LucideIcons.batteryLow, title: t.stockEmpty, compact: true)
          else
            for (final b in shown) ...[
              _BatteryTile(battery: b),
              const SizedBox(height: VoltiSpacing.s10),
            ],
        ],
      ),
    );
  }
}

class _Count extends StatelessWidget {
  const _Count({
    super.key,
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final int value;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Semantics(
      container: true,
      button: true,
      selected: selected,
      label: t.stockCountSemantics(label, value),
      onTap: onTap,
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 96, minHeight: VoltiSpacing.hitMin),
        child: InkWell(
          borderRadius: VoltiRadii.rLg,
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: VoltiRadii.rLg,
              border: Border.all(
                  color: selected ? VoltiColors.green700 : VoltiColors.borderSubtle,
                  width: selected ? 2 : 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('$value',
                    style: const TextStyle(
                        fontFamily: VoltiTypography.fontSans,
                        fontSize: 22,
                        height: 1,
                        fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(label,
                    style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BatteryTile extends StatelessWidget {
  const _BatteryTile({required this.battery});

  final Battery battery;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final b = battery;
    final status = batteryStatusLabel(t, b.status);
    final cycles = t.cyclesCount(b.cycleCount);
    return Semantics(
      container: true,
      label: t.stockItemSemantics(b.serial, status, b.chargePct, cycles),
      excludeSemantics: true,
      child: SectionCard(
        key: Key('stock-battery-${b.serial}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: VoltiSpacing.s8,
              runSpacing: VoltiSpacing.s4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(b.serial,
                    style: VoltiTypography.body.copyWith(
                        fontFamily: VoltiTypography.fontMono, fontWeight: FontWeight.w600)),
                VoltiBadge('${b.chargePct}%',
                    tone: batteryTone(b.chargePct), size: VoltiBadgeSize.sm),
                Text(cycles,
                    style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
              ],
            ),
            const SizedBox(height: VoltiSpacing.s4),
            Text(
              b.vehicleCode != null && b.status == BatteryStatus.inVehicle
                  ? t.stockOnVehicle(b.vehicleCode!)
                  : status,
              style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
