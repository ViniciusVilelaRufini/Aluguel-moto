import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/depot_state.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/fleet.dart';
import 'package:volti_operador/features/fleet/battery_sheets.dart';
import 'package:volti_operador/features/fleet/fleet_labels.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Estoque de baterias (`GET /batteries`): contagem real por galpao e status
/// (`statusCounts`: carregadas, carregando, com defeito, estacoes, van, motos) e
/// a lista com serie, carga e ciclos. Acoes: marcar carregada, apontar defeito
/// (motivo) e historico de movimentacoes. As acoes exigem rede (sem fila offline).
/// Status que o app ainda nao conhece aparecem como "Outro status".
class BatteryStockPage extends ConsumerStatefulWidget {
  const BatteryStockPage({super.key});

  @override
  ConsumerState<BatteryStockPage> createState() => _BatteryStockPageState();
}

class _BatteryStockPageState extends ConsumerState<BatteryStockPage> {
  /// `null` = todas; `unknownDefaultOpenApi` = o grupo "Outro status".
  BatteryStatus? _filter;

  /// `null` = todos os galpoes.
  String? _depotId;
  bool _busy = false;

  void _refresh() {
    ref.invalidate(batteriesProvider);
    ref.invalidate(batteryCountsProvider);
    ref.invalidate(vanStockProvider);
  }

  Future<void> _run(Future<void> Function() body, String success) async {
    final t = AppLocalizations.of(context);
    setState(() => _busy = true);
    try {
      await body();
      _refresh();
      if (mounted) VoltiToast.show(context, success);
    } on RepositoryException catch (e) {
      if (mounted) {
        VoltiToast.show(
          context,
          e.kind == FailureKind.network ? t.offlineAction : e.message,
          tone: VoltiToastTone.danger,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _markCharged(Battery b) {
    final t = AppLocalizations.of(context);
    return _run(
      () => ref.read(fieldRepositoryProvider).markBatteryCharged(b.id),
      t.batMarkedCharged(b.serial),
    );
  }

  Future<void> _reportDefect(Battery b) async {
    final t = AppLocalizations.of(context);
    final reason = await VoltiBottomSheet.show<String>(
      context,
      builder: (_) => DefectSheet(serial: b.serial),
    );
    if (reason == null || !mounted) return;
    await _run(
      () => ref
          .read(fieldRepositoryProvider)
          .reportBatteryDefect(b.id, reason: reason),
      t.batDefectDone(b.serial),
    );
  }

  Future<void> _history(Battery b) => VoltiBottomSheet.show<void>(
    context,
    builder: (_) => BatteryHistorySheet(battery: b),
  );

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final batteries = ref.watch(batteriesProvider(_depotId));
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
                onAction: _refresh,
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

  /// Contagem por grupo: `statusCounts` do servidor quando chega; senao, a da lista.
  Map<BatteryStatus, int> _counts(List<Battery> all) {
    final counts = <BatteryStatus, int>{};
    for (final b in all) {
      counts.update(_group(b.status), (n) => n + 1, ifAbsent: () => 1);
    }
    final c = ref.watch(batteryCountsProvider(_depotId)).value;
    if (c == null) return counts;
    return {
      BatteryStatus.charged: c.charged,
      BatteryStatus.charging: c.charging,
      BatteryStatus.defective: c.defective,
      BatteryStatus.inStation: c.inStation,
      BatteryStatus.inVan: c.inVan,
      BatteryStatus.inVehicle: c.inVehicle,
      BatteryStatus.retired: c.retired,
      BatteryStatus.unknownDefaultOpenApi:
          counts[BatteryStatus.unknownDefaultOpenApi] ?? 0,
    };
  }

  Widget _depotFilter(AppLocalizations t, List<Depot> depots) => Padding(
    padding: const EdgeInsets.only(bottom: VoltiSpacing.s12),
    child: Semantics(
      container: true,
      label: t.stockDepotFilter,
      child: Wrap(
        spacing: VoltiSpacing.s8,
        runSpacing: VoltiSpacing.s4,
        children: [
          VoltiChip(
            key: const Key('stock-depot-all'),
            label: t.stockAllDepots,
            selected: _depotId == null,
            onTap: () => setState(() => _depotId = null),
          ),
          for (final d in depots)
            VoltiChip(
              key: Key('stock-depot-${d.id}'),
              label: d.name,
              selected: _depotId == d.id,
              onTap: () => setState(() => _depotId = d.id),
            ),
        ],
      ),
    ),
  );

  Widget _content(AppLocalizations t, List<Battery> all) {
    final counts = _counts(all);
    final depots = ref.watch(depotsProvider).value?.depots ?? const <Depot>[];
    final groups = [
      ...knownBatteryStatuses,
      if ((counts[BatteryStatus.unknownDefaultOpenApi] ?? 0) > 0)
        BatteryStatus.unknownDefaultOpenApi,
    ];
    final shown =
        (_filter == null
              ? all
              : all.where((b) => _group(b.status) == _filter).toList())
          ..sort((a, b) => a.serial.compareTo(b.serial));
    return RefreshIndicator(
      onRefresh: () async {
        _refresh();
        await ref.read(batteriesProvider(_depotId).future);
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          VoltiSpacing.screenGutter,
          0,
          VoltiSpacing.screenGutter,
          VoltiSpacing.s40,
        ),
        children: [
          const ConnectivityBanner(
            padding: EdgeInsets.only(bottom: VoltiSpacing.s10),
          ),
          if (depots.length > 1) _depotFilter(t, depots),
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
                  onTap: () =>
                      setState(() => _filter = _filter == g ? null : g),
                ),
            ],
          ),
          const SizedBox(height: VoltiSpacing.s12),
          if (shown.isEmpty)
            VoltiEmptyState(
              icon: LucideIcons.batteryLow,
              title: t.stockEmpty,
              compact: true,
            )
          else
            for (final b in shown) ...[
              _BatteryTile(
                battery: b,
                busy: _busy,
                onMarkCharged: canMarkCharged(b.status)
                    ? () => _markCharged(b)
                    : null,
                onReportDefect: canReportDefect(b.status)
                    ? () => _reportDefect(b)
                    : null,
                onHistory: () => _history(b),
              ),
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
        constraints: const BoxConstraints(
          minWidth: 96,
          minHeight: VoltiSpacing.hitMin,
        ),
        child: InkWell(
          borderRadius: VoltiRadii.rLg,
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: VoltiRadii.rLg,
              border: Border.all(
                color: selected
                    ? VoltiColors.green700
                    : VoltiColors.borderSubtle,
                width: selected ? 2 : 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$value',
                  style: const TextStyle(
                    fontFamily: VoltiTypography.fontSans,
                    fontSize: 22,
                    height: 1,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: VoltiTypography.caption.copyWith(
                    color: VoltiColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BatteryTile extends StatelessWidget {
  const _BatteryTile({
    required this.battery,
    required this.busy,
    required this.onMarkCharged,
    required this.onReportDefect,
    required this.onHistory,
  });

  final Battery battery;
  final bool busy;
  final VoidCallback? onMarkCharged;
  final VoidCallback? onReportDefect;
  final VoidCallback onHistory;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final b = battery;
    final status = batteryStatusLabel(t, b.status);
    final cycles = t.cyclesCount(b.cycleCount);
    return SectionCard(
      key: Key('stock-battery-${b.serial}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // So o resumo e lido como um bloco; os botoes abaixo tem rotulo proprio.
          Semantics(
            container: true,
            label: t.stockItemSemantics(b.serial, status, b.chargePct, cycles),
            excludeSemantics: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: VoltiSpacing.s8,
                  runSpacing: VoltiSpacing.s4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      b.serial,
                      style: VoltiTypography.body.copyWith(
                        fontFamily: VoltiTypography.fontMono,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    VoltiBadge(
                      '${b.chargePct}%',
                      tone: batteryTone(b.chargePct),
                      size: VoltiBadgeSize.sm,
                    ),
                    Text(
                      cycles,
                      style: VoltiTypography.caption.copyWith(
                        color: VoltiColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: VoltiSpacing.s4),
                Text(
                  b.vehicleCode != null && b.status == BatteryStatus.inVehicle
                      ? t.stockOnVehicle(b.vehicleCode!)
                      : status,
                  style: VoltiTypography.caption.copyWith(
                    color: VoltiColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: VoltiSpacing.s8),
          // Rotulos curtos (cabem a 200%); o leitor de tela ouve a serie em cada um.
          Wrap(
            spacing: VoltiSpacing.s8,
            runSpacing: VoltiSpacing.s8,
            children: [
              if (onMarkCharged != null)
                VoltiButton(
                  key: Key('stock-charged-${b.serial}'),
                  label: t.batMarkCharged,
                  semanticLabel: t.batMarkChargedSemantics(b.serial),
                  icon: LucideIcons.batteryCharging,
                  size: VoltiButtonSize.sm,
                  onPressed: busy ? null : onMarkCharged,
                ),
              if (onReportDefect != null)
                VoltiButton(
                  key: Key('stock-defect-${b.serial}'),
                  label: t.batDefect,
                  semanticLabel: t.batDefectSemantics(b.serial),
                  icon: LucideIcons.triangleAlert,
                  variant: VoltiButtonVariant.secondary,
                  size: VoltiButtonSize.sm,
                  onPressed: busy ? null : onReportDefect,
                ),
              VoltiButton(
                key: Key('stock-history-${b.serial}'),
                label: t.batHistory,
                semanticLabel: t.batHistorySemantics(b.serial),
                icon: LucideIcons.history,
                variant: VoltiButtonVariant.ghost,
                size: VoltiButtonSize.sm,
                onPressed: onHistory,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
