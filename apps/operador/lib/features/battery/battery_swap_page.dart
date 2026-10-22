import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/fleet.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/data/tasks_provider.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Troca de bateria: serie da retirada e da instalada (QR/codigo de barras ou digitada).
/// As duas precisam ser diferentes. A retirada vem pre-preenchida com a bateria
/// atual da moto (`FieldTask.vehicleBatterySerial`) e as baterias carregadas da
/// van aparecem como sugestao para a instalada (contrato v2).
class BatterySwapPage extends ConsumerStatefulWidget {
  const BatterySwapPage({super.key, required this.taskId, this.onDone, this.scan});

  final String taskId;
  final VoidCallback? onDone;

  /// Leitor de serie (padrao: camera via `mobile_scanner`). Injetavel nos testes.
  final Future<String?> Function(BuildContext context)? scan;

  @override
  ConsumerState<BatterySwapPage> createState() => _BatterySwapPageState();
}

class _BatterySwapPageState extends ConsumerState<BatterySwapPage> {
  final _removed = TextEditingController();
  final _installed = TextEditingController();
  bool _submitting = false;
  SubmitOutcome? _outcome;
  bool _prefilled = false;

  @override
  void initState() {
    super.initState();
    // Pre-preenche a retirada uma vez, quando a tarefa estiver carregada.
    ref.listenManual<String?>(
      tasksProvider.select((a) => a.value?.byId(widget.taskId)?.vehicleBatterySerial),
      (_, serial) {
        if (_prefilled || serial == null || serial.trim().isEmpty) return;
        _prefilled = true;
        if (_removed.text.isEmpty) {
          _removed.text = serial.trim();
          if (mounted) setState(() {});
        }
      },
      fireImmediately: true,
    );
  }

  @override
  void dispose() {
    _removed.dispose();
    _installed.dispose();
    super.dispose();
  }

  bool get _bothValid =>
      BatterySwapDraft.validSerial(_removed.text) &&
      BatterySwapDraft.validSerial(_installed.text);

  bool get _differ => BatterySwapDraft.differ(_removed.text, _installed.text);

  bool get _canSubmit => _bothValid && _differ && !_submitting;

  Future<void> _scan(TextEditingController c) async {
    final value = await (widget.scan ?? SerialScannerPage.open)(context);
    if (value != null && mounted) setState(() => c.text = value.trim());
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final outcome = await ref.read(syncControllerProvider.notifier).submitBatterySwap(
          widget.taskId,
          BatterySwapDraft(
            removedSerial: _removed.text.trim(),
            installedSerial: _installed.text.trim(),
          ),
        );
    if (!mounted) return;
    setState(() {
      _submitting = false;
      _outcome = outcome;
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final o = _outcome;
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(title: t.batteryTitle),
          Expanded(
            child: o != null && o.job.error == null
            ? ListView(
                padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
                children: [
                  if (o.synced)
                    Notice(
                        key: const Key('swap-sent'),
                        tone: NoticeTone.success,
                        icon: LucideIcons.circleCheck,
                        title: t.swapSent,
                        body: _swapSummary(t, o.result))
                  else
                    Notice(
                        key: const Key('swap-queued'),
                        tone: NoticeTone.info,
                        icon: LucideIcons.cloudOff,
                        title: t.awaitingSync,
                        body: t.swapQueued),
                  const SizedBox(height: VoltiSpacing.s20),
                  VoltiButton(
                      label: t.close,
                      fullWidth: true,
                      size: VoltiButtonSize.lg,
                      onPressed: widget.onDone),
                ],
              )
            : _form(t, o?.job.error),
          ),
        ],
      ),
    );
  }

  /// "Instalada: BT-208431 · 98% · 38 ciclos" com o que a API devolveu.
  String? _swapSummary(AppLocalizations t, Object? result) {
    if (result is! BatterySwap) return null;
    return t.installedBatteryLine(batteryDetails(t, result.installedBatterySerial,
        pct: result.installedBatteryPct, cycles: result.installedBatteryCycleCount));
  }

  Widget _form(AppLocalizations t, String? error) {
    final showDiffer = _bothValid && !_differ;
    final task = ref.watch(tasksProvider).value?.byId(widget.taskId);
    final removedLine = task == null ? null : removedBatteryLine(t, task);
    // Sugestoes: baterias carregadas (>= 90%) na van, mais cheias primeiro.
    // Baterias ja comprometidas numa troca na fila offline nao aparecem.
    final queued = {
      for (final j in ref.watch(syncControllerProvider).pending)
        if (j.kind == JobKind.batterySwap)
          BatterySwapDraft.fromJson(j.payload['swap'] as Map<String, dynamic>)
              .installedSerial
              .trim()
              .toUpperCase(),
    };
    final charged = (ref.watch(vanStockProvider).value?.items.toList() ?? const <Battery>[])
        .where((b) => b.chargePct >= 90 && !queued.contains(b.serial.toUpperCase()))
        .toList()
      ..sort((a, b) => b.chargePct.compareTo(a.chargePct));
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            children: [
              const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
              // Design: serie da bateria nova primeiro, com as carregadas da van.
              _serialField(
                  key: 'installed-serial',
                  label: t.serialNewLabel,
                  controller: _installed,
                  t: t,
                  footer: charged.isEmpty
                      ? null
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: VoltiSpacing.s10),
                            Text(t.vanSuggestions,
                                style: VoltiTypography.caption
                                    .copyWith(color: VoltiColors.textSecondary)),
                            const SizedBox(height: VoltiSpacing.s6),
                            Wrap(
                              spacing: 6,
                              runSpacing: 6,
                              children: [
                                for (final b in charged.take(6))
                                  _VanPick(
                                    key: Key('van-pick-${b.serial}'),
                                    label: batteryDetails(t, b.serial,
                                        pct: b.chargePct, cycles: b.cycleCount),
                                    semanticLabel: t.vanPickSemantics(b.serial),
                                    selected: _installed.text.trim().toUpperCase() ==
                                        b.serial.toUpperCase(),
                                    onTap: () => setState(() => _installed.text = b.serial),
                                  ),
                              ],
                            ),
                          ],
                        )),
              const SizedBox(height: VoltiSpacing.s12),
              _serialField(
                  key: 'removed-serial',
                  label: t.serialRemovedLabel,
                  controller: _removed,
                  t: t,
                  footer: removedLine == null
                      ? null
                      : Padding(
                          padding: const EdgeInsets.only(top: VoltiSpacing.s6),
                          child: Text(removedLine,
                              style: VoltiTypography.caption
                                  .copyWith(color: VoltiColors.textSecondary)),
                        )),
              if (showDiffer) ...[
                const SizedBox(height: VoltiSpacing.s12),
                Notice(
                  key: const Key('serials-differ-error'),
                  tone: NoticeTone.danger,
                  icon: LucideIcons.circleAlert,
                  title: t.serialsMustDiffer,
                ),
              ],
              if (error != null) ...[
                const SizedBox(height: VoltiSpacing.s12),
                Notice(
                    tone: NoticeTone.danger,
                    icon: LucideIcons.circleAlert,
                    title: t.jobFailed(error)),
              ],
            ],
          ),
        ),
        Container(
          padding: EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12,
              VoltiSpacing.screenGutter, MediaQuery.paddingOf(context).bottom + VoltiSpacing.s16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerLowest,
            boxShadow: VoltiShadows.shadowSheet,
          ),
          child: VoltiButton(
            key: const Key('submit-swap'),
            label: t.submitSwap,
            icon: LucideIcons.batteryCharging,
            fullWidth: true,
            size: VoltiButtonSize.lg,
            onPressed: _canSubmit ? _submit : null,
          ),
        ),
      ],
    );
  }

  Widget _serialField({
    required String key,
    required String label,
    required TextEditingController controller,
    required AppLocalizations t,
    Widget? footer,
  }) {
    final tooShort = controller.text.isNotEmpty && !BatterySwapDraft.validSerial(controller.text);
    // Input do VDS: rotulo acima, campo sunken de 52 px com icone de leitura.
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: VoltiTypography.label),
          const SizedBox(height: VoltiSpacing.s6),
          TextField(
            key: Key(key),
            controller: controller,
            textCapitalization: TextCapitalization.characters,
            maxLength: 64,
            style: VoltiTypography.body.copyWith(fontFamily: VoltiTypography.fontMono),
            decoration: InputDecoration(
              hintText: t.serialPlaceholder,
              semanticCounterText: label,
              counterText: '',
              errorText: tooShort ? t.serialTooShort : null,
              prefixIcon: const Icon(LucideIcons.scanBarcode, color: VoltiColors.textTertiary),
              suffixIcon: IconButton(
                key: Key('$key-scan'),
                tooltip: t.scanAction,
                constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                icon: const Icon(LucideIcons.camera),
                onPressed: () => _scan(controller),
              ),
            ),
            onChanged: (_) => setState(() {}),
          ),
          ?footer,
        ],
      ),
    );
  }
}

/// Sugestao de bateria da van: um so no de semantica (rotulo, selecao e toque)
/// e texto que quebra de linha com fonte grande.
class _VanPick extends StatelessWidget {
  const _VanPick({
    super.key,
    required this.label,
    required this.semanticLabel,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String semanticLabel;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      child: VoltiPressable(
        onTap: onTap,
        scale: .97,
        semanticLabel: semanticLabel,
        child: ExcludeSemantics(
          child: Container(
            constraints: const BoxConstraints(minHeight: 40),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: selected ? VoltiColors.brandSoft : VoltiColors.surfaceSunken,
              borderRadius: VoltiRadii.rPill,
              border: Border.all(
                  color: selected ? VoltiColors.brand : Colors.transparent, width: 1.5),
            ),
            child: Text(label,
                style: VoltiTypography.caption.copyWith(
                    fontFamily: VoltiTypography.fontMono, color: VoltiColors.ink700)),
          ),
        ),
      ),
    );
  }
}

/// Tela de camera que le QR ou codigo de barras e devolve o texto: moldura
/// de mira, lanterna e "Digitar o numero" (volta sem leitura para digitar).
class SerialScannerPage extends StatefulWidget {
  const SerialScannerPage({super.key, this.title, this.manualLabel});

  /// Titulo no topo (padrao: "Aponte para o QR ou codigo de barras").
  final String? title;

  /// Rotulo do botao de digitar (padrao: "Digitar o numero").
  final String? manualLabel;

  static Future<String?> open(BuildContext context, {String? title, String? manualLabel}) =>
      Navigator.of(context).push<String>(MaterialPageRoute(
          builder: (_) => SerialScannerPage(title: title, manualLabel: manualLabel)));

  @override
  State<SerialScannerPage> createState() => _SerialScannerPageState();
}

class _SerialScannerPageState extends State<SerialScannerPage> {
  final _controller = MobileScannerController();
  bool _done = false;
  bool _torch = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: VoltiColors.ink900,
      body: Stack(
        children: [
          Positioned.fill(
            child: MobileScanner(
              controller: _controller,
              onDetect: (capture) {
                if (_done) return;
                final raw = capture.barcodes
                    .map((b) => b.rawValue)
                    .firstWhere((v) => v != null && v.trim().isNotEmpty, orElse: () => null);
                if (raw != null) {
                  _done = true;
                  VoltiHaptics.success();
                  Navigator.of(context).pop(raw);
                }
              },
              errorBuilder: (context, error) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(VoltiSpacing.s24),
                  child: Text(t.scanCameraError,
                      textAlign: TextAlign.center,
                      style: VoltiTypography.body.copyWith(color: VoltiColors.white)),
                ),
              ),
            ),
          ),
          // Moldura de mira.
          Center(
            child: Container(
              key: const Key('scan-frame'),
              width: 260,
              height: 160,
              decoration: BoxDecoration(
                borderRadius: VoltiRadii.rLg,
                border: Border.all(color: VoltiColors.brand, width: 3),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            top: MediaQuery.paddingOf(context).top + 8,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
              child: Row(
                children: [
                  VoltiIconButton(
                    icon: LucideIcons.x,
                    variant: VoltiIconButtonVariant.dark,
                    label: t.close,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  const SizedBox(width: VoltiSpacing.s12),
                  Expanded(
                    child: Text(widget.title ?? t.scanTitle,
                        style: VoltiTypography.label.copyWith(color: VoltiColors.white)),
                  ),
                  VoltiIconButton(
                    key: const Key('scan-torch'),
                    icon: _torch ? LucideIcons.flashlightOff : LucideIcons.flashlight,
                    variant: VoltiIconButtonVariant.dark,
                    label: t.scanTorch,
                    onPressed: () async {
                      await _controller.toggleTorch();
                      if (mounted) setState(() => _torch = !_torch);
                    },
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            left: VoltiSpacing.screenGutter,
            right: VoltiSpacing.screenGutter,
            bottom: MediaQuery.paddingOf(context).bottom + VoltiSpacing.s24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(t.scanAimHint,
                    textAlign: TextAlign.center,
                    style: VoltiTypography.caption.copyWith(color: const Color(0xCCFFFFFF))),
                const SizedBox(height: VoltiSpacing.s12),
                VoltiButton(
                  key: const Key('scan-manual'),
                  label: widget.manualLabel ?? t.scanManual,
                  icon: LucideIcons.keyboard,
                  variant: VoltiButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
