import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Troca de bateria: serie da retirada e da instalada (QR/codigo de barras ou digitada).
/// As duas precisam ser diferentes.
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
                        title: t.swapSent)
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

  Widget _form(AppLocalizations t, String? error) {
    final showDiffer = _bothValid && !_differ;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            children: [
              const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
              // Design: serie da bateria nova primeiro. A retirada ainda e digitada/lida:
              // serie, % e ciclos da bateria atual dependem de contrato.
              _serialField(
                  key: 'installed-serial',
                  label: t.serialNewLabel,
                  controller: _installed,
                  t: t),
              const SizedBox(height: VoltiSpacing.s12),
              _serialField(
                  key: 'removed-serial',
                  label: t.serialRemovedLabel,
                  controller: _removed,
                  t: t),
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
        ],
      ),
    );
  }
}

/// Tela de camera que le QR ou codigo de barras e devolve o texto: moldura
/// de mira, lanterna e "Digitar o numero" (volta sem leitura para digitar).
class SerialScannerPage extends StatefulWidget {
  const SerialScannerPage({super.key});

  static Future<String?> open(BuildContext context) =>
      Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => const SerialScannerPage()));

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
                    child: Text(t.scanTitle,
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
                  label: t.scanManual,
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
