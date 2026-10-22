import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Tag do elemento compartilhado da moto (evolucao E-15): a midia do cartao no
/// mapa, o visor do scan e o cabecalho do plano usam a mesma tag, entao o Hero
/// voa entre as telas. Codigo da moto = unico na frota.
Object vehicleHeroTag(String code) => 'vehicle-media-$code';

/// Hero da moto que respeita reduced motion (sem voo: a tela troca direto).
class VehicleHero extends StatelessWidget {
  const VehicleHero({super.key, required this.code, required this.child});
  final String code;
  final Widget child;

  @override
  Widget build(BuildContext context) => HeroMode(
        enabled: !VoltiMotion.reduced(context),
        child: Hero(tag: vehicleHeroTag(code), child: child),
      );
}

/// Voo do pin ate a midia do cartao da moto (primeiro trecho de E-15, dentro
/// da mesma tela, onde Hero nao atua). Um disco sai do pin tocado e vira o tile
/// da moto, seguindo o destino enquanto o cartao sobe. Reduced motion: nada.
///
/// [hide] fica `true` durante o voo para o tile real nao aparecer duplicado.
abstract final class SharedFlight {
  static OverlayEntry? run(
    BuildContext context, {
    required Rect from,
    required GlobalKey to,
    required ValueNotifier<bool> hide,
    Duration? duration,
  }) {
    if (VoltiMotion.reduced(context)) return null;
    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return null;
    late final OverlayEntry entry;
    hide.value = true;
    entry = OverlayEntry(
      builder: (_) => _Flight(
        from: from,
        to: to,
        duration: duration ?? VoltiMotion.durScreen,
        onDone: () {
          hide.value = false;
          if (entry.mounted) entry.remove();
        },
      ),
    );
    overlay.insert(entry);
    return entry;
  }

  /// Retangulo global de um widget ja pintado.
  static Rect? rectOf(BuildContext? context) {
    final box = context?.findRenderObject();
    if (box is! RenderBox || !box.hasSize || !box.attached) return null;
    return box.localToGlobal(Offset.zero) & box.size;
  }
}

class _Flight extends StatefulWidget {
  const _Flight({required this.from, required this.to, required this.duration, required this.onDone});
  final Rect from;
  final GlobalKey to;
  final Duration duration;
  final VoidCallback onDone;
  @override
  State<_Flight> createState() => _FlightState();
}

class _FlightState extends State<_Flight> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: widget.duration)
    ..addStatusListener((s) {
      if (s == AnimationStatus.completed) widget.onDone();
    })
    ..forward();
  late final Animation<double> _t = CurvedAnimation(parent: _c, curve: VoltiMotion.easeScreen);
  Rect? _last;

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _t,
        builder: (context, _) {
          // O destino se move (o cartao sobe): mede a cada quadro.
          final to = SharedFlight.rectOf(widget.to.currentContext) ?? _last ?? widget.from;
          _last = to;
          final t = _t.value;
          final r = Rect.lerp(widget.from, to, t)!;
          final radius = r.shortestSide / 2 + (VoltiRadii.lg - r.shortestSide / 2) * t;
          return Stack(children: [
            Positioned.fromRect(
              rect: r,
              child: Container(
                key: const Key('shared-flight'),
                decoration: BoxDecoration(
                  color: Color.lerp(VoltiColors.brand, VoltiColors.surfaceMedia, t),
                  borderRadius: BorderRadius.circular(radius),
                  boxShadow: VoltiShadows.shadow2,
                ),
                alignment: Alignment.center,
                child: Icon(LucideIcons.bike, size: r.shortestSide * .42, color: Color.lerp(Colors.white, VoltiColors.blue600, t)),
              ),
            ),
          ]);
        },
      ),
    );
  }
}
