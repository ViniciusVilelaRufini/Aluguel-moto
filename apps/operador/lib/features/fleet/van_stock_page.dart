import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/fleet.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/features/battery/battery_swap_page.dart' show SerialScannerPage;
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Leitor de serie injetavel (padrao: camera).
typedef SerialScan = Future<String?> Function(BuildContext context);

/// Estoque de baterias na van (`GET /batteries/van-stock`): serie, carga e
/// ciclos; carregar (series lidas ou digitadas) e descarregar para recarga.
/// Exige rede: nada daqui entra na fila offline.
class VanStockPage extends ConsumerStatefulWidget {
  const VanStockPage({super.key, this.scan});

  final SerialScan? scan;

  @override
  ConsumerState<VanStockPage> createState() => _VanStockPageState();
}

class _VanStockPageState extends ConsumerState<VanStockPage> {
  bool _busy = false;

  Future<void> _run(Future<void> Function() body, String success) async {
    final t = AppLocalizations.of(context);
    setState(() => _busy = true);
    try {
      await body();
      if (mounted) VoltiToast.show(context, success);
    } on RepositoryException catch (e) {
      if (mounted) {
        VoltiToast.show(context, e.kind == FailureKind.network ? t.offlineAction : e.message,
            tone: VoltiToastTone.danger);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _load() async {
    final t = AppLocalizations.of(context);
    final serials = await VoltiBottomSheet.show<List<String>>(
      context,
      builder: (_) => _LoadSheet(scan: widget.scan ?? SerialScannerPage.open),
    );
    if (serials == null || serials.isEmpty || !mounted) return;
    await _run(() => ref.read(vanStockProvider.notifier).load(serials), t.vanLoaded);
  }

  /// Pergunta o destino (galpao para recarga ou uma estacao) e descarrega.
  Future<void> _unload(Battery b) async {
    final t = AppLocalizations.of(context);
    final dest = await VoltiBottomSheet.show<UnloadDestination>(
      context,
      builder: (_) => UnloadDestinationSheet(serial: b.serial),
    );
    if (dest == null || !mounted) return;
    final station = dest.station;
    await _run(
      () => ref.read(vanStockProvider.notifier).unload([b.serial], stationId: station?.id),
      station == null ? t.vanUnloaded : t.unloadedStation(station.name),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final stock = ref.watch(vanStockProvider);
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(title: t.vanTitle),
          Expanded(
            child: stock.when(
              skipLoadingOnRefresh: true,
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, _) => VoltiEmptyState(
                icon: LucideIcons.cloudOff,
                title: t.vanError,
                actionLabel: t.retry,
                actionIcon: LucideIcons.refreshCw,
                onAction: () => ref.read(vanStockProvider.notifier).refresh(),
              ),
              data: (v) => RefreshIndicator(
                onRefresh: () => ref.read(vanStockProvider.notifier).refresh(),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 0,
                      VoltiSpacing.screenGutter, VoltiSpacing.s24),
                  children: [
                    const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
                    Wrap(
                      spacing: VoltiSpacing.s8,
                      runSpacing: VoltiSpacing.s8,
                      children: [
                        _Stat(label: t.vanTotal, value: v.total),
                        _Stat(label: t.vanCharged, value: v.chargedCount),
                        _Stat(label: t.vanDepleted, value: v.depletedCount),
                      ],
                    ),
                    const SizedBox(height: VoltiSpacing.s12),
                    Notice(
                        tone: NoticeTone.neutral,
                        icon: LucideIcons.wifi,
                        title: t.vanOnlineHint),
                    const SizedBox(height: VoltiSpacing.s12),
                    if (v.items.isEmpty)
                      VoltiEmptyState(
                          icon: LucideIcons.batteryLow, title: t.vanEmpty, compact: true)
                    else
                      for (final b in _sorted(v.items)) ...[
                        _BatteryRow(
                          battery: b,
                          onUnload: _busy ? null : () => _unload(b),
                        ),
                        const SizedBox(height: VoltiSpacing.s10),
                      ],
                  ],
                ),
              ),
            ),
          ),
          Container(
            padding: EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12,
                VoltiSpacing.screenGutter, MediaQuery.paddingOf(context).bottom + 12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerLowest,
              boxShadow: VoltiShadows.shadowSheet,
            ),
            child: VoltiButton(
              key: const Key('van-load'),
              label: t.vanLoad,
              icon: LucideIcons.packagePlus,
              fullWidth: true,
              size: VoltiButtonSize.lg,
              loading: _busy,
              onPressed: _busy || !stock.hasValue ? null : _load,
            ),
          ),
        ],
      ),
    );
  }

  /// Carregadas primeiro, depois por serie.
  static List<Battery> _sorted(Iterable<Battery> items) => items.toList()
    ..sort((a, b) {
      final c = b.chargePct.compareTo(a.chargePct);
      return c != 0 ? c : a.serial.compareTo(b.serial);
    });
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: '$label: $value',
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 96),
        child: SectionCard(
          padding: 12,
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
    );
  }
}

class _BatteryRow extends StatelessWidget {
  const _BatteryRow({required this.battery, required this.onUnload});

  final Battery battery;
  final VoidCallback? onUnload;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final cycles = t.cyclesCount(battery.cycleCount);
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            label: t.vanBatterySemantics(battery.serial, battery.chargePct, cycles),
            excludeSemantics: true,
            child: Wrap(
              spacing: VoltiSpacing.s8,
              runSpacing: VoltiSpacing.s4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(battery.serial,
                    style: VoltiTypography.body.copyWith(
                        fontFamily: VoltiTypography.fontMono, fontWeight: FontWeight.w600)),
                VoltiBadge('${battery.chargePct}%',
                    tone: batteryTone(battery.chargePct), size: VoltiBadgeSize.sm),
                Text(cycles,
                    style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
              ],
            ),
          ),
          const SizedBox(height: VoltiSpacing.s8),
          // Rotulo curto (cabe a 200%); o leitor de tela ouve a serie, num no proprio.
          Semantics(
            container: true,
            child: VoltiButton(
            key: Key('van-unload-${battery.serial}'),
            label: t.vanUnload,
            semanticLabel: t.vanUnloadSemantics(battery.serial),
            icon: LucideIcons.batteryCharging,
            variant: VoltiButtonVariant.secondary,
            size: VoltiButtonSize.sm,
            fullWidth: true,
            onPressed: onUnload,
          )),
        ],
      ),
    );
  }
}

/// Destino da descarga: `station == null` = galpao (recarga).
class UnloadDestination {
  const UnloadDestination.warehouse() : station = null;
  const UnloadDestination.station(SwapStation this.station);

  final SwapStation? station;
}

/// Folha "Descarregar BT-...": "Galpao (recarga)" ou uma estacao de
/// `GET /swap-stations`. Sem rede para as estacoes, o galpao continua valendo.
class UnloadDestinationSheet extends ConsumerWidget {
  const UnloadDestinationSheet({super.key, required this.serial});

  final String serial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final stations = ref.watch(swapStationsProvider);
    return VoltiBottomSheet(
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
                header: true,
                child: Text(t.unloadTitle(serial), style: VoltiTypography.heading)),
            const SizedBox(height: VoltiSpacing.s8),
            ListRow(
              key: const Key('unload-warehouse'),
              icon: LucideIcons.warehouse,
              iconTone: ListRowTone.brand,
              title: t.unloadWarehouse,
              subtitle: t.unloadWarehouseHint,
              trailing: ListRowTrailing.chevron,
              onTap: () => Navigator.of(context).pop(const UnloadDestination.warehouse()),
            ),
            const SizedBox(height: VoltiSpacing.s8),
            Text(t.unloadStations,
                style: VoltiTypography.label.copyWith(color: VoltiColors.textSecondary)),
            stations.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(VoltiSpacing.s16),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (_, _) => Padding(
                padding: const EdgeInsets.only(top: VoltiSpacing.s8),
                child: Notice(
                  key: const Key('unload-stations-error'),
                  tone: NoticeTone.neutral,
                  icon: LucideIcons.cloudOff,
                  title: t.unloadStationsError,
                ),
              ),
              data: (list) => Column(
                children: [
                  for (final s in list)
                    ListRow(
                      key: Key('unload-station-${s.id}'),
                      icon: LucideIcons.batteryCharging,
                      title: s.name,
                      subtitle: t.unloadStationHint(s.availableBatteries, s.address),
                      trailing: ListRowTrailing.chevron,
                      onTap: () => Navigator.of(context).pop(UnloadDestination.station(s)),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Folha "Carregar na van": series lidas ou digitadas, sem repetir.
class _LoadSheet extends StatefulWidget {
  const _LoadSheet({required this.scan});

  final SerialScan scan;

  @override
  State<_LoadSheet> createState() => _LoadSheetState();
}

class _LoadSheetState extends State<_LoadSheet> {
  final _serial = TextEditingController();
  final _serials = <String>[];
  bool _duplicate = false;

  @override
  void dispose() {
    _serial.dispose();
    super.dispose();
  }

  void _add() {
    final s = _serial.text.trim().toUpperCase();
    if (!BatterySwapDraft.validSerial(s)) return;
    setState(() {
      _duplicate = _serials.contains(s);
      if (!_duplicate && _serials.length < 50) _serials.add(s);
      _serial.clear();
    });
  }

  Future<void> _scan() async {
    final v = await widget.scan(context);
    if (v != null && mounted) setState(() => _serial.text = v.trim());
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final valid = BatterySwapDraft.validSerial(_serial.text);
    return VoltiBottomSheet(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t.vanLoadTitle, style: VoltiTypography.heading),
          const SizedBox(height: VoltiSpacing.s12),
          TextField(
            key: const Key('van-load-serial'),
            controller: _serial,
            textCapitalization: TextCapitalization.characters,
            maxLength: 64,
            style: VoltiTypography.body.copyWith(fontFamily: VoltiTypography.fontMono),
            decoration: InputDecoration(
              labelText: t.vanLoadSerial,
              hintText: t.serialPlaceholder,
              counterText: '',
              errorText: _duplicate ? t.vanLoadDuplicate : null,
              suffixIcon: IconButton(
                key: const Key('van-load-serial-scan'),
                tooltip: t.scanAction,
                constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                icon: const Icon(LucideIcons.camera),
                onPressed: _scan,
              ),
            ),
            onChanged: (_) => setState(() => _duplicate = false),
            onSubmitted: (_) => _add(),
          ),
          const SizedBox(height: VoltiSpacing.s8),
          VoltiButton(
            key: const Key('van-load-add'),
            label: t.vanLoadAdd,
            icon: LucideIcons.plus,
            variant: VoltiButtonVariant.secondary,
            fullWidth: true,
            onPressed: valid ? _add : null,
          ),
          if (_serials.isNotEmpty) ...[
            const SizedBox(height: VoltiSpacing.s10),
            // Uma linha por serie (quebra com texto grande), com "tirar".
            for (final s in _serials)
              Row(
                key: Key('van-load-item-$s'),
                children: [
                  Expanded(
                    child: Text(s,
                        style: VoltiTypography.body
                            .copyWith(fontFamily: VoltiTypography.fontMono)),
                  ),
                  IconButton(
                    tooltip: t.vanLoadRemove(s),
                    constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                    icon: const Icon(LucideIcons.x),
                    onPressed: () => setState(() => _serials.remove(s)),
                  ),
                ],
              ),
          ],
          const SizedBox(height: VoltiSpacing.s12),
          VoltiButton(
            key: const Key('van-load-confirm'),
            label: t.vanLoadConfirm(_serials.length),
            fullWidth: true,
            onPressed:
                _serials.isEmpty ? null : () => Navigator.of(context).pop(List.of(_serials)),
          ),
        ],
      ),
    );
  }
}
