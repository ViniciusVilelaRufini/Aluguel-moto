import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/widgets.dart';

/// Extrai o codigo da moto do conteudo do QR (codigo puro ou URL `.../v/<codigo>`).
String vehicleCodeFromQr(String raw) {
  final t = raw.trim();
  final uri = Uri.tryParse(t);
  if (uri != null && uri.hasScheme && uri.pathSegments.isNotEmpty) return uri.pathSegments.last;
  return t;
}

/// Leitor de QR ou digitacao do numero da moto. Com [swapRentalId], troca a moto do aluguel.
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key, this.swapRentalId});
  final String? swapRentalId;
  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final _code = TextEditingController();
  bool _busy = false;
  bool _manual = false;
  bool _found = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
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
      if (mounted) setState(() => _found = true);
      if (widget.swapRentalId != null) {
        await backend.swap(widget.swapRentalId!, vehicle.id, 'vehicle_problem');
        if (mounted) {
          VoltiToast.show(context, l.swapDone);
          context.go('/ride');
        }
        return;
      }
      if (mounted) context.push('/plan', extra: vehicle);
    } catch (e) {
      VoltiHaptics.warning();
      if (mounted) {
        setState(() {
          _found = false;
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
    return VoltiScaffold(
      title: widget.swapRentalId != null ? l.swapTitle : l.scanTitle,
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          Text(l.scanHint, style: VoltiTypography.body),
          const SizedBox(height: VoltiSpacing.s16),
          if (!_manual)
            ClipRRect(
              borderRadius: VoltiRadii.rXl,
              child: SizedBox(
                height: 320,
                child: Stack(fit: StackFit.expand, children: [
                  Semantics(
                  label: l.scanCameraSemantics,
                  child: MobileScanner(
                    onDetect: (capture) {
                      final v = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
                      if (v != null) _resolve(v);
                    },
                    errorBuilder: (context, error) => Center(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(l.cameraUnavailable, textAlign: TextAlign.center),
                      ),
                    ),
                  ),
                  ),
                  _ScanOverlay(found: _found),
                ]),
              ),
            ),
          const SizedBox(height: VoltiSpacing.s16),
          if (_manual) ...[
            TextField(
              key: const Key('vehicle-code'),
              controller: _code,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(labelText: l.vehicleNumber, prefixIcon: const Icon(LucideIcons.hash)),
              onSubmitted: _resolve,
            ),
            const SizedBox(height: VoltiSpacing.s12),
            VoltiButton(
              label: _busy ? l.loading : l.continueLabel,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              onPressed: _busy ? null : () => _resolve(_code.text),
            ),
          ] else
            VoltiButton(
              label: l.typeNumber,
              variant: VoltiButtonVariant.secondary,
              icon: LucideIcons.keyboard,
              fullWidth: true,
              onPressed: () => setState(() => _manual = true),
            ),
          if (_manual)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: VoltiButton(
                label: l.useCamera,
                variant: VoltiButtonVariant.ghost,
                icon: LucideIcons.scanLine,
                fullWidth: true,
                onPressed: () => setState(() => _manual = false),
              ),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _error!),
            ),
        ],
      ),
    );
  }
}

/// Moldura do visor: cantos, respiracao da escala (2,4 s) e linha de varredura
/// enquanto procura; ao achar a moto, check com pop e anel.
class _ScanOverlay extends StatefulWidget {
  const _ScanOverlay({required this.found});
  final bool found;
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

  static const _corner = BorderSide(color: Colors.white, width: 4);

  Widget _bracket(Alignment a) {
    final top = a.y < 0, left = a.x < 0;
    return Align(
      alignment: a,
      child: Container(
        width: 36,
        height: 36,
        margin: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          border: Border(
            top: top ? _corner : BorderSide.none,
            bottom: top ? BorderSide.none : _corner,
            left: left ? _corner : BorderSide.none,
            right: left ? BorderSide.none : _corner,
          ),
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(top && left ? 16 : 0),
            topRight: Radius.circular(top && !left ? 16 : 0),
            bottomLeft: Radius.circular(!top && left ? 16 : 0),
            bottomRight: Radius.circular(!top && !left ? 16 : 0),
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
            const Center(child: VoltiSuccessCheck(icon: LucideIcons.lockOpen, delay: Duration.zero)),
        ]),
      ),
    );
  }
}
