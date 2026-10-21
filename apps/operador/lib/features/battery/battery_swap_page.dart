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
      appBar: AppBar(title: Text(t.batteryTitle)),
      body: SafeArea(
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
              _serialField(
                  key: 'removed-serial', label: t.batteryRemoved, controller: _removed, t: t),
              const SizedBox(height: VoltiSpacing.s12),
              _serialField(
                  key: 'installed-serial',
                  label: t.batteryInstalled,
                  controller: _installed,
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
        Padding(
          padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12,
              VoltiSpacing.screenGutter, VoltiSpacing.s16),
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
    return SectionCard(
      child: TextField(
        key: Key(key),
        controller: controller,
        textCapitalization: TextCapitalization.characters,
        maxLength: 64,
        decoration: InputDecoration(
          labelText: label,
          hintText: t.serialHint,
          counterText: '',
          errorText: tooShort ? t.serialTooShort : null,
          suffixIcon: IconButton(
            key: Key('$key-scan'),
            tooltip: t.scanAction,
            icon: const Icon(LucideIcons.scanBarcode),
            onPressed: () => _scan(controller),
          ),
        ),
        onChanged: (_) => setState(() {}),
      ),
    );
  }
}

/// Tela de camera que le QR ou codigo de barras e devolve o texto.
class SerialScannerPage extends StatefulWidget {
  const SerialScannerPage({super.key});

  static Future<String?> open(BuildContext context) =>
      Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => const SerialScannerPage()));

  @override
  State<SerialScannerPage> createState() => _SerialScannerPageState();
}

class _SerialScannerPageState extends State<SerialScannerPage> {
  bool _done = false;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: VoltiColors.ink900,
      appBar: AppBar(title: Text(t.scanTitle)),
      body: MobileScanner(
        onDetect: (capture) {
          if (_done) return;
          final raw = capture.barcodes
              .map((b) => b.rawValue)
              .firstWhere((v) => v != null && v.trim().isNotEmpty, orElse: () => null);
          if (raw != null) {
            _done = true;
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
    );
  }
}
