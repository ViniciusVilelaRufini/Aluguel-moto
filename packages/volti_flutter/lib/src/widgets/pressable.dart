import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../tokens/shadows.dart';

/// Area tocavel com feedback de press (escala com mola), como no design system.
class VoltiPressable extends StatefulWidget {
  const VoltiPressable({
    super.key,
    required this.child,
    this.onTap,
    this.scale = VoltiMotion.pressScale,
    this.semanticLabel,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final String? semanticLabel;

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

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null;
    return Semantics(
      button: true,
      enabled: enabled,
      label: widget.semanticLabel,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? (_) => _set(true) : null,
        onTapUp: enabled ? (_) => _set(false) : null,
        onTapCancel: enabled ? () => _set(false) : null,
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _down ? widget.scale : 1,
          duration: VoltiMotion.scaled(context, VoltiMotion.durSpring),
          curve: VoltiMotion.easeSpring,
          // Com [semanticLabel] o rotulo ja descreve tudo: sem isso o texto
          // interno era lido de novo ("Entrar Entrar").
          child: widget.semanticLabel != null ? ExcludeSemantics(child: widget.child) : widget.child,
        ),
      ),
    );
  }
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
