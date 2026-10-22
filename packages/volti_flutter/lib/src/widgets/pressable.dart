import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../tokens/shadows.dart';
import 'haptics.dart';

/// Area tocavel com feedback de press, como no design system (motion v2):
/// - aperta para [scale] em [VoltiMotion.durFast] com `--ease-out`;
/// - solta com mola (`--ease-spring`, [VoltiMotion.durSpring]);
/// - com reduced motion nao escala: so baixa a opacidade para
///   [VoltiMotion.pressOpacityReduced], sem animacao;
/// - [haptic] toca a haptica antes de [onTap] (CTAs de confirmacao).
///
/// Descendentes leem o estado com [VoltiPressScope.pressedOf] (ex.: a
/// sombra do botao que baixa no press).
class VoltiPressable extends StatefulWidget {
  const VoltiPressable({
    super.key,
    required this.child,
    this.onTap,
    this.scale = VoltiMotion.pressScale,
    this.semanticLabel,
    this.haptic,
    this.semanticValue,
    this.liveRegion = false,
  });

  /// Valor do no de semantica (ex.: "Carregando…" num botao ocupado).
  final String? semanticValue;

  /// Anuncia mudancas do no (Android). Use com [semanticValue].
  final bool liveRegion;

  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final String? semanticLabel;

  /// Haptica tocada a cada toque valido (nada com [onTap] `null`).
  final VoltiHapticKind? haptic;

  @override
  State<VoltiPressable> createState() => _VoltiPressableState();
}

class _VoltiPressableState extends State<VoltiPressable> {
  bool _down = false;

  @override
  void didUpdateWidget(VoltiPressable old) {
    super.didUpdateWidget(old);
    // Desabilitado no meio do press: solta sem setState (estamos em build).
    if (widget.onTap == null) _down = false;
  }

  void _set(bool v) {
    if (_down == v || !mounted) return;
    final phase = SchedulerBinding.instance.schedulerPhase;
    if (phase == SchedulerPhase.persistentCallbacks) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _down != v) setState(() => _down = v);
      });
    } else {
      setState(() => _down = v);
    }
  }

  void _tap() {
    final h = widget.haptic;
    if (h != null) VoltiHaptics.play(h);
    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null;
    final reduced = VoltiMotion.reduced(context);
    final pressed = enabled && _down;
    // Com [semanticLabel] o rotulo ja descreve tudo: sem isso o texto
    // interno era lido de novo ("Entrar Entrar").
    final inner = widget.semanticLabel != null ? ExcludeSemantics(child: widget.child) : widget.child;
    return Semantics(
      button: true,
      enabled: enabled,
      label: widget.semanticLabel,
      value: widget.semanticValue,
      liveRegion: widget.liveRegion,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? (_) => _set(true) : null,
        onTapUp: enabled ? (_) => _set(false) : null,
        onTapCancel: enabled ? () => _set(false) : null,
        onTap: enabled ? _tap : null,
        child: VoltiPressScope(
          pressed: pressed,
          child: AnimatedScale(
            scale: pressed && !reduced ? widget.scale : 1,
            duration: reduced ? Duration.zero : (pressed ? VoltiMotion.durFast : VoltiMotion.durSpring),
            curve: pressed ? VoltiMotion.easeOut : VoltiMotion.easeSpring,
            child: Opacity(
              key: const Key('volti-press-opacity'),
              opacity: pressed && reduced ? VoltiMotion.pressOpacityReduced : 1,
              child: inner,
            ),
          ),
        ),
      ),
    );
  }
}

/// Estado de press do [VoltiPressable] mais proximo.
class VoltiPressScope extends InheritedWidget {
  const VoltiPressScope({super.key, required this.pressed, required super.child});

  final bool pressed;

  /// `true` enquanto o dedo esta sobre o [VoltiPressable] ancestral.
  static bool pressedOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<VoltiPressScope>()?.pressed ?? false;

  @override
  bool updateShouldNotify(VoltiPressScope old) => old.pressed != pressed;
}

/// Ondulacao a partir do ponto de toque (`vt-ripple`, 620 ms). Fica entre o
/// fundo e o conteudo: use dentro do `Container` decorado, envolvendo o
/// conteudo. [color] `null` desliga. Nao consome o toque.
class VoltiRipple extends StatefulWidget {
  const VoltiRipple({
    super.key,
    required this.child,
    this.color,
    this.borderRadius = BorderRadius.zero,
  });

  final Widget child;
  final Color? color;
  final BorderRadius borderRadius;

  @override
  State<VoltiRipple> createState() => _VoltiRippleState();
}

class _Drop {
  _Drop(this.origin, this.controller, this.color);
  final Offset origin;
  final Color color;
  final AnimationController controller;
}

class _VoltiRippleState extends State<VoltiRipple>
    with TickerProviderStateMixin {
  final _drops = <_Drop>[];

  void _down(PointerDownEvent e) {
    if (widget.color == null || VoltiMotion.reduced(context)) return;
    final c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 620),
    );
    final drop = _Drop(e.localPosition, c, widget.color!);
    setState(() => _drops.add(drop));
    c.forward().whenComplete(() {
      if (!mounted) return;
      setState(() => _drops.remove(drop));
      c.dispose();
    });
  }

  @override
  void dispose() {
    for (final d in _drops) {
      d.controller.dispose();
    }
    _drops.clear();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: _down,
      child: Stack(
        fit: StackFit.passthrough,
        children: [
          if (_drops.isNotEmpty)
            Positioned.fill(
              child: IgnorePointer(
                child: ClipRRect(
                  borderRadius: widget.borderRadius,
                  child: CustomPaint(
                    key: const Key('volti-ripple'),
                    painter: _RipplePainter(_drops),
                  ),
                ),
              ),
            ),
          widget.child,
        ],
      ),
    );
  }
}

class _RipplePainter extends CustomPainter {
  _RipplePainter(this.drops)
    : super(repaint: Listenable.merge([for (final d in drops) d.controller]));
  final List<_Drop> drops;

  @override
  void paint(Canvas canvas, Size size) {
    final d = (size.width > size.height ? size.width : size.height) * 2.2;
    for (final drop in drops) {
      final t = VoltiMotion.easeOut.transform(drop.controller.value);
      canvas.drawCircle(
        drop.origin,
        d / 2 * t,
        Paint()..color = drop.color.withValues(alpha: drop.color.a * (1 - t)),
      );
    }
  }

  @override
  bool shouldRepaint(_RipplePainter old) => true;
}
