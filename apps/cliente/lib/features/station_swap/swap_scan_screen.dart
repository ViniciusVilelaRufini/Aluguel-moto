import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/clock.dart';
import '../../core/widgets.dart';
import 'swap_confirm_sheet.dart';
import 'swap_logic.dart';

/// Visor da camera que le QR codes. [onCode] recebe o conteudo lido; ao
/// faltar permissao ou camera, o visor explica e chama [onManual] para o
/// campo de codigo digitado.
typedef QrScannerBuilder = Widget Function(BuildContext context, {required ValueChanged<String> onCode, required VoidCallback onManual});

/// Quanto o mesmo QR da camera fica ignorado depois que a confirmacao fecha.
const kSwapRescanCooldown = Duration(seconds: 2);

/// Trocado nos testes de widget (sem camera nem canal de plataforma).
final qrScannerBuilderProvider = Provider<QrScannerBuilder>(
  (ref) => (context, {required onCode, required onManual}) => MobileQrScanner(onCode: onCode, onManual: onManual),
);

/// "Escanear QR da estacao": camera (mobile_scanner) e, como alternativa
/// (emulador, desenvolvimento, camera negada), o codigo digitado. Lido o QR,
/// abre a confirmacao; com a troca criada, troca esta tela pela de progresso.
class SwapScanScreen extends ConsumerStatefulWidget {
  const SwapScanScreen({super.key, this.stationHint});

  /// Estacao perto (do aviso de proximidade), so para o texto da tela.
  final String? stationHint;

  @override
  ConsumerState<SwapScanScreen> createState() => _SwapScanScreenState();
}

class _SwapScanScreenState extends ConsumerState<SwapScanScreen> {
  final _manual = TextEditingController();
  final _manualFocus = FocusNode();
  Future<CurrentRentalState>? _state;

  /// Uma leitura por vez: enquanto a confirmacao esta aberta, novos QR sao ignorados.
  bool _handling = false;

  /// Ultimo QR da camera e quando a confirmacao dele fechou: o visor continua
  /// lendo o mesmo QR, que fica ignorado por [kSwapRescanCooldown] (sem a
  /// folha reabrir sozinha), e depois volta a valer.
  String? _lastScan;
  DateTime? _lastClosedAt;

  /// Nome da estacao do aviso de proximidade (`Estacao: <nome>`).
  String? _hintName;

  @override
  void initState() {
    super.initState();
    _state = ref.read(backendProvider).currentRentalState();
    final hint = widget.stationHint;
    if (hint != null) {
      _station(hint.toLowerCase()).then((s) {
        if (mounted && s != null) setState(() => _hintName = s.name);
      });
    }
    _state!.then((s) {
      // Troca ja em andamento: retoma a tela dela em vez de abrir outra.
      if (mounted && isOpenSwap(s.stationSwap)) _goProgress(s.stationSwap!);
    }, onError: (Object _) {});
  }

  @override
  void dispose() {
    _manual.dispose();
    _manualFocus.dispose();
    super.dispose();
  }

  /// Devolve a troca a quem abriu o leitor ([openSwapScan] abre o progresso);
  /// aberto direto (sem tela embaixo), vai para o progresso.
  void _goProgress(StationSwap swap) {
    if (_left) return;
    _left = true;
    if (context.canPop()) {
      context.pop(swap);
    } else {
      context.go('/station-swap/${swap.stationId}/${swap.id}', extra: swap);
    }
  }

  bool _left = false;

  /// Estacao do QR (baterias, horario) pela lista publica, sem filtro de raio.
  Future<SwapStation?> _station(String id) async {
    try {
      return (await ref.read(backendProvider).swapStations()).where((s) => s.id.toLowerCase() == id).firstOrNull;
    } catch (_) {
      return null;
    }
  }

  /// QR lido pela camera (repetido continuamente pelo visor).
  void _onScanned(String raw) {
    final code = raw.trim();
    final closed = _lastClosedAt;
    if (code == _lastScan && closed != null && ref.read(clockProvider)().difference(closed) < kSwapRescanCooldown) return;
    if (_handling) return;
    _lastScan = code;
    _onCode(code);
  }

  Future<void> _onCode(String raw) async {
    if (_handling || !mounted) return;
    final l = context.l;
    final code = raw.trim();
    final stationId = stationIdFromQr(code);
    if (stationId == null) {
      VoltiHaptics.warning();
      VoltiToast.show(context, l.swapErrorInvalidQr, tone: VoltiToastTone.danger);
      return;
    }
    _handling = true;
    try {
      final state = await _state!;
      final rental = state.rental;
      if (!mounted) return;
      if (!rentalAllowsSwap(rental)) {
        VoltiToast.show(context, l.swapNoRental, tone: VoltiToastTone.danger);
        return;
      }
      final station = await _station(stationId);
      if (!mounted) return;
      VoltiHaptics.selection();
      final swap = await SwapConfirmSheet.show(
        context,
        rental: rental!,
        stationId: stationId,
        stationCode: code,
        station: station,
        feeCents: state.batterySwapFeeCents,
      );
      if (!mounted) return;
      if (swap != null) {
        _goProgress(swap);
        return;
      }
      // Fechou sem troca: se o POST chegou a criar uma (resposta perdida), retoma.
      try {
        final now = await ref.read(backendProvider).currentRentalState();
        if (mounted && isOpenSwap(now.stationSwap)) _goProgress(now.stationSwap!);
      } catch (_) {}
    } catch (e) {
      if (mounted) VoltiToast.show(context, swapErrorMessage(l, e), tone: VoltiToastTone.danger);
    } finally {
      _handling = false;
      if (mounted) _lastClosedAt = ref.read(clockProvider)();
    }
  }

  void _focusManual() => _manualFocus.requestFocus();

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final scanner = ref.watch(qrScannerBuilderProvider);
    return VoltiScaffold(
      title: l.swapScanTitle,
      body: FutureBuilder<CurrentRentalState>(
        future: _state,
        builder: (context, snap) {
          if (snap.hasError) {
            return ErrorState(
              error: snap.error!,
              onRetry: () => setState(() => _state = ref.read(backendProvider).currentRentalState()),
            );
          }
          if (snap.hasData && !rentalAllowsSwap(snap.data!.rental)) {
            return VoltiEmptyState(
              key: const Key('swap-scan-no-rental'),
              icon: LucideIcons.bike,
              title: l.swapNoRental,
            );
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_hintName != null) ...[
                  Text(l.swapScanStation(_hintName!), key: const Key('swap-scan-station'), style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
                  const SizedBox(height: VoltiSpacing.s4),
                ],
                Text(l.swapScanHint, style: VoltiTypography.body.copyWith(color: scheme.onSurfaceVariant)),
                const SizedBox(height: VoltiSpacing.s16),
                AspectRatio(
                  aspectRatio: 1,
                  child: ClipRRect(
                    borderRadius: VoltiRadii.rLg,
                    child: ColoredBox(
                      color: VoltiColors.ink900,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          KeyedSubtree(
                            key: const Key('swap-scanner'),
                            child: scanner(context, onCode: _onScanned, onManual: _focusManual),
                          ),
                          const IgnorePointer(child: _ScanFrame()),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: VoltiSpacing.s24),
                Semantics(header: true, child: Text(l.swapManualLabel, style: VoltiTypography.bodyStrong)),
                const SizedBox(height: VoltiSpacing.s8),
                TextField(
                  key: const Key('swap-manual-code'),
                  controller: _manual,
                  focusNode: _manualFocus,
                  autocorrect: false,
                  enableSuggestions: false,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (v) => _onCode(v),
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(hintText: l.swapManualHint),
                ),
                const SizedBox(height: VoltiSpacing.s12),
                VoltiButton(
                  key: const Key('swap-manual-continue'),
                  label: l.swapManualContinue,
                  variant: VoltiButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: _manual.text.trim().isEmpty ? null : () => _onCode(_manual.text),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Moldura do visor (cantos em L), so decorativa.
class _ScanFrame extends StatelessWidget {
  const _ScanFrame();

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(VoltiSpacing.s40),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: VoltiRadii.rLg,
            border: Border.all(color: VoltiColors.white.withValues(alpha: .85), width: 3),
          ),
        ),
      );
}

/// Visor real com mobile_scanner (so QR). Sem permissao da camera explica e
/// oferece o codigo digitado.
class MobileQrScanner extends StatefulWidget {
  const MobileQrScanner({super.key, required this.onCode, required this.onManual});
  final ValueChanged<String> onCode;
  final VoidCallback onManual;

  @override
  State<MobileQrScanner> createState() => _MobileQrScannerState();
}

class _MobileQrScannerState extends State<MobileQrScanner> {
  // `normal`: o mesmo QR volta a ser entregue (a tela ignora repeticoes por
  // [kSwapRescanCooldown]); com `noDuplicates` cancelar a folha travava a releitura.
  final _controller = MobileScannerController(formats: const [BarcodeFormat.qrCode], detectionSpeed: DetectionSpeed.normal);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MobileScanner(
        controller: _controller,
        onDetect: (capture) {
          for (final b in capture.barcodes) {
            final v = b.rawValue;
            if (v != null && v.isNotEmpty) {
              widget.onCode(v);
              return;
            }
          }
        },
        errorBuilder: (context, error) => CameraUnavailable(
          denied: error.errorCode == MobileScannerErrorCode.permissionDenied,
          onManual: widget.onManual,
        ),
      );
}

/// Camera negada ou indisponivel: explica e leva ao codigo digitado.
class CameraUnavailable extends StatelessWidget {
  const CameraUnavailable({super.key = const Key('swap-camera-unavailable'), required this.denied, required this.onManual});
  final bool denied;
  final VoidCallback onManual;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return Container(
      color: VoltiColors.ink900,
      padding: const EdgeInsets.all(VoltiSpacing.s24),
      alignment: Alignment.center,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(LucideIcons.cameraOff, color: VoltiColors.white, size: 32),
            const SizedBox(height: VoltiSpacing.s12),
            Text(
              denied ? l.swapScanDenied : l.swapScanUnavailable,
              textAlign: TextAlign.center,
              style: VoltiTypography.body.copyWith(color: VoltiColors.white),
            ),
            const SizedBox(height: VoltiSpacing.s16),
            VoltiButton(
              key: const Key('swap-camera-manual'),
              label: l.swapManualToggle,
              icon: LucideIcons.keyboard,
              variant: VoltiButtonVariant.secondary,
              size: VoltiButtonSize.sm,
              wrap: true,
              onPressed: onManual,
            ),
          ],
        ),
      ),
    );
  }
}
