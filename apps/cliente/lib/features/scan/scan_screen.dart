import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/shared_vehicle.dart';
import '../../core/widgets.dart';

/// Extrai o codigo da moto do conteudo do QR (codigo puro ou URL `.../v/<codigo>`).
String vehicleCodeFromQr(String raw) {
  final t = raw.trim();
  final uri = Uri.tryParse(t);
  if (uri != null && uri.hasScheme && uri.pathSegments.isNotEmpty) return uri.pathSegments.last;
  return t;
}

/// Camera do leitor (mobile_scanner; falsa nos testes).
abstract class ScanCamera {
  Widget preview({required ValueChanged<String> onCode, required WidgetBuilder onError});
  Future<void> toggleTorch();

  /// Para a leitura (e apaga a lanterna) enquanto outra tela esta por cima.
  Future<void> stop();

  /// Volta a ler.
  Future<void> start();
  Future<void> dispose();
}

class MobileScanCamera implements ScanCamera {
  // Sem duplicatas: o mesmo QR parado na frente da camera dispara uma vez so.
  final _controller = MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates);

  @override
  Widget preview({required ValueChanged<String> onCode, required WidgetBuilder onError}) => MobileScanner(
        controller: _controller,
        onDetect: (capture) {
          final v = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
          if (v != null) onCode(v);
        },
        errorBuilder: (context, _) => onError(context),
      );

  @override
  Future<void> toggleTorch() => _controller.toggleTorch();

  @override
  Future<void> stop() => _controller.stop();

  @override
  Future<void> start() => _controller.start();

  @override
  Future<void> dispose() => _controller.dispose();
}

final scanCameraFactoryProvider = Provider<ScanCamera Function()>((ref) => MobileScanCamera.new);

/// Fundo do leitor (design `#0d0f10`).
const scanBackground = Color(0xFF0D0F10);
const _glass = Color(0x1FFFFFFF); // rgba(255,255,255,.12)

/// Leitor de QR (design `ScanScreen`): tela escura, X e lanterna em vidro,
/// visor de 250 px com cantos verdes, titulo e subtitulo e "Digitar numero da
/// moto". Com [swapRentalId], troca a moto do aluguel. [expectedCode] (moto
/// vinda do mapa ou da reserva) aparece acima do visor e liga o Hero da moto.
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key, this.swapRentalId, this.expectedCode});
  final String? swapRentalId;
  final String? expectedCode;
  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final _code = TextEditingController();
  late final ScanCamera _camera = ref.read(scanCameraFactoryProvider)();
  bool _busy = false;
  bool _manual = false;
  bool _torch = false;
  String? _foundCode;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    _camera.dispose();
    super.dispose();
  }

  Future<void> _toggleTorch() async {
    try {
      await _camera.toggleTorch();
      VoltiHaptics.selection();
      if (mounted) setState(() => _torch = !_torch);
    } catch (_) {
      if (mounted) VoltiToast.show(context, context.l.cameraUnavailable, tone: VoltiToastTone.danger);
    }
  }

  Future<void> _stopCamera() async {
    try {
      await _camera.stop();
    } catch (_) {}
    if (mounted) setState(() => _torch = false);
  }

  Future<void> _startCamera() async {
    if (_manual) return;
    try {
      await _camera.start();
    } catch (_) {}
  }

  Future<void> _resolve(String raw) async {
    if (_busy || raw.trim().isEmpty) return;
    final l = context.l;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final backend = ref.read(backendProvider);
      final vehicle = await backend.vehicleByCode(vehicleCodeFromQr(raw));
      VoltiHaptics.success();
      if (mounted) setState(() => _foundCode = vehicle.code);
      if (widget.swapRentalId != null) {
        await backend.swap(widget.swapRentalId!, vehicle.id, 'vehicle_problem');
        if (mounted) {
          VoltiToast.show(context, l.swapDone);
          context.go('/ride');
        }
        return;
      }
      if (!mounted) return;
      // A camera para (e a lanterna apaga) antes de abrir o plano: nada de leituras
      // por baixo empilhando outros /plan. Ao voltar, limpa o "encontrada" e le de novo.
      await _stopCamera();
      if (!mounted) return;
      await context.push('/plan', extra: vehicle);
      if (!mounted) return;
      setState(() => _foundCode = null);
      await _startCamera();
    } catch (e) {
      VoltiHaptics.warning();
      if (mounted) {
        setState(() {
          _foundCode = null;
          _error = failureText(l, e);
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final heroCode = _foundCode ?? widget.expectedCode;
    return Theme(
      data: VoltiTheme.dark(),
      child: Scaffold(
        backgroundColor: scanBackground,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s8, VoltiSpacing.screenGutter, VoltiSpacing.s24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(children: [
                  _GlassButton(
                    key: const Key('scan-close'),
                    icon: LucideIcons.x,
                    label: l.close,
                    onTap: () => Navigator.of(context).maybePop(),
                  ),
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text(
                        widget.swapRentalId != null ? l.swapTitle : l.scanQr,
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: VoltiTypography.bodyStrong.copyWith(color: Colors.white),
                      ),
                    ),
                  ),
                  _GlassButton(
                    key: const Key('scan-torch'),
                    icon: _torch ? LucideIcons.flashlight : LucideIcons.flashlightOff,
                    label: l.torch,
                    toggled: _torch,
                    onTap: _manual ? null : _toggleTorch,
                  ),
                ]),
                Expanded(
                  child: SingleChildScrollView(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minHeight: MediaQuery.sizeOf(context).height * .55),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(height: VoltiSpacing.s16),
                          if (heroCode != null) ...[
                            _ExpectedVehicle(code: heroCode, found: _foundCode != null),
                            const SizedBox(height: VoltiSpacing.s16),
                          ],
                          if (_manual) _manualForm(context) else _viewfinder(context),
                          const SizedBox(height: VoltiSpacing.s24),
                          if (!_manual) ...[
                            Text(l.scanAimTitle,
                                textAlign: TextAlign.center, style: VoltiTypography.heading.copyWith(color: Colors.white)),
                            const SizedBox(height: 6),
                            Text(l.scanAimText,
                                textAlign: TextAlign.center,
                                style: VoltiTypography.body.copyWith(color: Colors.white.withValues(alpha: .7))),
                          ],
                          if (_error != null)
                            Padding(
                              padding: const EdgeInsets.only(top: VoltiSpacing.s16),
                              child: NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _error!),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                _OutlineLightButton(
                  key: const Key('scan-mode'),
                  label: _manual ? l.useCamera : l.typeNumber,
                  icon: _manual ? LucideIcons.scanQrCode : LucideIcons.keyboard,
                  onTap: () => setState(() {
                    _manual = !_manual;
                    _error = null;
                  }),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _viewfinder(BuildContext context) {
    final l = context.l;
    return SizedBox(
      width: 250,
      height: 250,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: Stack(fit: StackFit.expand, children: [
          const ColoredBox(color: Color(0x0AFFFFFF)),
          Semantics(
            label: l.scanCameraSemantics,
            child: _camera.preview(
              onCode: _resolve,
              onError: (context) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(l.cameraUnavailable,
                      textAlign: TextAlign.center, style: VoltiTypography.caption.copyWith(color: Colors.white70)),
                ),
              ),
            ),
          ),
          _ScanOverlay(found: _foundCode != null, foundLabel: _foundCode == null ? null : l.vehicleFound(_foundCode!)),
        ]),
      ),
    );
  }

  Widget _manualForm(BuildContext context) {
    final l = context.l;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      TextField(
        key: const Key('vehicle-code'),
        controller: _code,
        autofocus: true,
        textCapitalization: TextCapitalization.characters,
        textInputAction: TextInputAction.go,
        style: VoltiTypography.body.copyWith(color: Colors.white),
        decoration: InputDecoration(labelText: l.vehicleNumber, prefixIcon: const Icon(LucideIcons.hash)),
        onSubmitted: _resolve,
      ),
      const SizedBox(height: VoltiSpacing.s12),
      VoltiButton(
        key: const Key('vehicle-code-submit'),
        label: l.continueLabel,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        loading: _busy,
        onPressed: () => _resolve(_code.text),
      ),
    ]);
  }
}

/// Moto esperada (veio do mapa/reserva) ou achada: miniatura compartilhada (Hero) + codigo.
class _ExpectedVehicle extends StatelessWidget {
  const _ExpectedVehicle({required this.code, required this.found});
  final String code;
  final bool found;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 6, 16, 6),
      decoration: const BoxDecoration(color: _glass, borderRadius: VoltiRadii.rPill),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        VehicleHero(code: code, child: const VehicleThumb(size: 36)),
        const SizedBox(width: 10),
        Flexible(
          child: Text(
            found ? l.vehicleFound(code) : l.lookingFor(code),
            style: VoltiTypography.label.copyWith(color: Colors.white),
          ),
        ),
      ]),
    );
  }
}

/// Botao redondo de vidro escuro (X, lanterna).
class _GlassButton extends StatelessWidget {
  const _GlassButton({super.key, required this.icon, required this.label, this.onTap, this.toggled});
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool? toggled;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      toggled: toggled,
      child: VoltiPressable(
        onTap: onTap,
        scale: VoltiMotion.iconPressScale,
        semanticLabel: label,
        child: Opacity(
          opacity: onTap == null ? .4 : 1,
          child: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: toggled == true ? Colors.white : _glass,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: toggled == true ? scanBackground : Colors.white),
          ),
        ),
      ),
    );
  }
}

/// "Digitar numero da moto": contorno branco sobre o fundo escuro.
class _OutlineLightButton extends StatelessWidget {
  const _OutlineLightButton({super.key, required this.label, required this.icon, required this.onTap});
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return VoltiPressable(
      onTap: onTap,
      semanticLabel: label,
      child: Container(
        constraints: const BoxConstraints(minHeight: VoltiSpacing.controlLg),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(
          borderRadius: VoltiRadii.rPill,
          border: Border.all(color: Colors.white.withValues(alpha: .3), width: 1.5),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 22, color: Colors.white),
          const SizedBox(width: 10),
          Flexible(
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: VoltiTypography.fontSans,
                fontWeight: VoltiTypography.fwSemibold,
                fontSize: 16,
                color: Colors.white,
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

/// Moldura do visor: cantos verdes, respiracao da escala (2,4 s) e linha de
/// varredura enquanto procura; ao achar a moto, check com pop e anel e o texto
/// "Moto X encontrada".
class _ScanOverlay extends StatefulWidget {
  const _ScanOverlay({required this.found, this.foundLabel});
  final bool found;
  final String? foundLabel;
  @override
  State<_ScanOverlay> createState() => _ScanOverlayState();
}

class _ScanOverlayState extends State<_ScanOverlay> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
  late final CurvedAnimation _eased = CurvedAnimation(parent: _c, curve: VoltiMotion.easeInOut);
  bool _reduced = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduced = VoltiMotion.reduced(context);
    _sync();
  }

  @override
  void didUpdateWidget(_ScanOverlay old) {
    super.didUpdateWidget(old);
    _sync();
  }

  /// Anima so enquanto procura e sem reduced motion.
  void _sync() {
    if (_reduced || widget.found) {
      _c.stop();
      _c.value = 0;
    } else if (!_c.isAnimating) {
      _c.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _eased.dispose();
    _c.dispose();
    super.dispose();
  }

  static const _corner = BorderSide(color: VoltiColors.green400, width: 4);

  Widget _bracket(Alignment a) {
    final top = a.y < 0, left = a.x < 0;
    return Align(
      alignment: a,
      child: Container(
        key: Key('scan-corner-${top ? 't' : 'b'}${left ? 'l' : 'r'}'),
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          border: Border(
            top: top ? _corner : BorderSide.none,
            bottom: top ? BorderSide.none : _corner,
            left: left ? _corner : BorderSide.none,
            right: left ? BorderSide.none : _corner,
          ),
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(top && left ? 24 : 0),
            topRight: Radius.circular(top && !left ? 24 : 0),
            bottomLeft: Radius.circular(!top && left ? 24 : 0),
            bottomRight: Radius.circular(!top && !left ? 24 : 0),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final eased = _eased;
    return IgnorePointer(
      child: ScaleTransition(
        scale: Tween(begin: 1.0, end: widget.found ? 1.0 : 1.035).animate(eased),
        child: Stack(children: [
          _bracket(Alignment.topLeft),
          _bracket(Alignment.topRight),
          _bracket(Alignment.bottomLeft),
          _bracket(Alignment.bottomRight),
          if (!widget.found)
            AnimatedBuilder(
              animation: eased,
              builder: (context, _) => Align(
                alignment: Alignment(0, -.8 + 1.56 * eased.value),
                child: Container(
                  key: const Key('scan-line'),
                  margin: const EdgeInsets.symmetric(horizontal: 18),
                  height: 3,
                  decoration: BoxDecoration(
                    color: VoltiColors.green400,
                    borderRadius: BorderRadius.circular(2),
                    boxShadow: const [BoxShadow(color: Color(0x8055CC79), blurRadius: 18, spreadRadius: 5)],
                  ),
                ),
              ),
            )
          else
            Center(
              child: Semantics(
                liveRegion: true,
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const VoltiSuccessCheck(icon: LucideIcons.lockOpen, delay: Duration.zero),
                  if (widget.foundLabel != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      widget.foundLabel!,
                      key: const Key('scan-found-label'),
                      textAlign: TextAlign.center,
                      style: VoltiTypography.label.copyWith(color: Colors.white),
                    ),
                  ],
                ]),
              ),
            ),
        ]),
      ),
    );
  }
}
