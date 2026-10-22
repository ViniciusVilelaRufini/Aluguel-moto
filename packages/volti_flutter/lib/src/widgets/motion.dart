import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';

/// Item da cascata (`vt-fade-up`): fade + sobe 14 px, com atraso [delay].
/// Com reduced motion mostra o estado final de imediato.
class VoltiFadeUp extends StatefulWidget {
  const VoltiFadeUp({
    super.key,
    required this.child,
    this.delay = VoltiMotion.staggerFirst,
    this.duration = VoltiMotion.staggerItem,
    this.offset = VoltiMotion.fadeUpOffset,
  });

  final Widget child;
  final Duration delay;
  final Duration duration;
  final double offset;

  @override
  State<VoltiFadeUp> createState() => _VoltiFadeUpState();
}

class _VoltiFadeUpState extends State<VoltiFadeUp>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.delay + widget.duration,
  );
  late final Animation<double> _t = CurvedAnimation(
    parent: _c,
    curve: Interval(
      widget.delay.inMicroseconds /
          (widget.delay + widget.duration).inMicroseconds,
      1,
      curve: VoltiMotion.easeOut,
    ),
  );
  bool _started = false;
  final _keep = GlobalKey();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (VoltiMotion.reduced(context)) {
      _c.value = 1;
    } else {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _t,
      // GlobalKey: ao terminar, o filho sai de Opacity/Transform sem perder o
      // estado (antes era remontado e reiniciava contadores, pulsos, campos).
      child: KeyedSubtree(key: _keep, child: widget.child),
      builder: (context, child) {
        final v = _t.value;
        if (_c.isCompleted) return child!;
        return Opacity(
          opacity: v.clamp(0.0, 1.0),
          child: Transform.translate(
            offset: Offset(0, widget.offset * (1 - v)),
            child: child,
          ),
        );
      },
    );
  }
}

/// Entrada generica: opacidade 0 -> 1, escala [fromScale] -> 1 e deslocamento
/// [fromOffset] -> 0 com [curve] (padrao mola). Base de `vt-pop-in` (dialogo),
/// `vt-toast-in` e do fade-up do conteudo de sheets. Reduced motion = final.
class VoltiEnter extends StatefulWidget {
  const VoltiEnter({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 360),
    this.delay = Duration.zero,
    this.fromScale = 1,
    this.fromOffset = Offset.zero,
    this.curve = VoltiMotion.easeSpring,
  });

  /// `vt-pop-in`: escala .9, 360 ms, mola.
  const VoltiEnter.pop({
    super.key,
    required this.child,
    this.delay = Duration.zero,
  }) : duration = const Duration(milliseconds: 360),
       fromScale = .9,
       fromOffset = Offset.zero,
       curve = VoltiMotion.easeSpring;

  /// `vt-toast-in`: sobe 18 px com escala .95, 420 ms, mola.
  const VoltiEnter.toast({
    super.key,
    required this.child,
    this.delay = Duration.zero,
  }) : duration = const Duration(milliseconds: 420),
       fromScale = .95,
       fromOffset = const Offset(0, 18),
       curve = VoltiMotion.easeSpring;

  final Widget child;
  final Duration duration;
  final Duration delay;
  final double fromScale;
  final Offset fromOffset;
  final Curve curve;

  @override
  State<VoltiEnter> createState() => _VoltiEnterState();
}

class _VoltiEnterState extends State<VoltiEnter>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.delay + widget.duration,
  );
  late final Animation<double> _t = CurvedAnimation(
    parent: _c,
    curve: Interval(
      widget.delay.inMicroseconds /
          (widget.delay + widget.duration).inMicroseconds,
      1,
    ),
  );
  bool _started = false;
  final _keep = GlobalKey();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (VoltiMotion.reduced(context)) {
      _c.value = 1;
    } else {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _t,
    // Mesmo cuidado do VoltiFadeUp: preserva o estado do filho ao terminar.
    child: KeyedSubtree(key: _keep, child: widget.child),
    builder: (context, child) {
      if (_c.isCompleted) return child!;
      final e = widget.curve.transform(_t.value.clamp(0.0, 1.0));
      return Opacity(
        opacity: _t.value.clamp(0.0, 1.0),
        child: Transform.translate(
          offset: widget.fromOffset * (1 - e),
          child: Transform.scale(
            scale: widget.fromScale + (1 - widget.fromScale) * e,
            child: child,
          ),
        ),
      );
    },
  );
}

/// Cascata (`.vt-stagger`): cada filho entra com [VoltiFadeUp], 45 ms apos o
/// anterior; o primeiro aos 140 ms. Use [VoltiStagger.wrap] para listas
/// (`ListView`, `Wrap`) e o widget para colunas/linhas.
class VoltiStagger extends StatelessWidget {
  const VoltiStagger({
    super.key,
    required this.children,
    this.axis = Axis.vertical,
    this.crossAxisAlignment = CrossAxisAlignment.start,
    this.mainAxisSize = MainAxisSize.min,
    this.startIndex = 0,
  });

  final List<Widget> children;
  final Axis axis;
  final CrossAxisAlignment crossAxisAlignment;
  final MainAxisSize mainAxisSize;
  final int startIndex;

  /// Envolve cada widget em [VoltiFadeUp] com o atraso da sua posicao.
  ///
  /// Cuidado em listas longas e preguicosas (`ListView` com muitos itens): cada
  /// item anima quando e construido ao rolar; use `animate: false` (ou envolva
  /// so os primeiros itens) em historicos e listas paginadas.
  static List<Widget> wrap(List<Widget> items, {int startIndex = 0, bool animate = true}) {
    if (!animate) return items;
    return [
      for (var i = 0; i < items.length; i++)
        VoltiFadeUp(delay: VoltiMotion.staggerDelay(startIndex + i), child: items[i]),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final w = wrap(children, startIndex: startIndex);
    return axis == Axis.vertical
        ? Column(
            crossAxisAlignment: crossAxisAlignment,
            mainAxisSize: mainAxisSize,
            children: w,
          )
        : Row(
            crossAxisAlignment: crossAxisAlignment,
            mainAxisSize: mainAxisSize,
            children: w,
          );
  }
}

/// `vt-check-pop`: escala 0 -> 1,18 -> 1 com mola. Reduced motion = final.
class VoltiCheckPop extends StatefulWidget {
  const VoltiCheckPop({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 320),
    this.delay = Duration.zero,
  });

  final Widget child;
  final Duration duration;
  final Duration delay;

  @override
  State<VoltiCheckPop> createState() => _VoltiCheckPopState();
}

class _VoltiCheckPopState extends State<VoltiCheckPop>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.delay + widget.duration,
  );
  late final Animation<double> _scale =
      TweenSequence<double>([
        TweenSequenceItem(
          tween: Tween(
            begin: 0.0,
            end: 1.18,
          ).chain(CurveTween(curve: VoltiMotion.easeSpring)),
          weight: 60,
        ),
        TweenSequenceItem(
          tween: Tween(
            begin: 1.18,
            end: 1.0,
          ).chain(CurveTween(curve: VoltiMotion.easeSpring)),
          weight: 40,
        ),
      ]).animate(
        CurvedAnimation(
          parent: _c,
          curve: Interval(
            widget.delay.inMicroseconds /
                (widget.delay + widget.duration).inMicroseconds,
            1,
          ),
        ),
      );
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (VoltiMotion.reduced(context)) {
      _c.value = 1;
    } else {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _scale,
    child: widget.child,
    builder: (context, child) => _c.isCompleted
        ? child!
        : Transform.scale(scale: _scale.value, child: child),
  );
}

/// Anel de pulso (`vt-pulse-ring`): circulo que cresce 1 -> [maxScale] e some.
/// [repeat] `null` = infinito. Reduced motion desenha so o [child].
class VoltiPulse extends StatefulWidget {
  const VoltiPulse({
    super.key,
    required this.size,
    this.color = VoltiColors.brand,
    this.child,
    this.duration = const Duration(milliseconds: 1800),
    this.delay = Duration.zero,
    this.maxScale = 2.6,
    this.repeat,
    this.active = true,
  });

  /// Diametro do anel na escala 1.
  final double size;
  final Color color;
  final Widget? child;
  final Duration duration;
  final Duration delay;
  final double maxScale;

  /// Numero de pulsos; `null` repete para sempre.
  final int? repeat;
  final bool active;

  @override
  State<VoltiPulse> createState() => _VoltiPulseState();
}

class _VoltiPulseState extends State<VoltiPulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.duration,
  );
  bool _reduced = false;
  bool _inited = false;
  bool _delayed = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final r = VoltiMotion.reduced(context);
    if (r != _reduced || !_inited) {
      _inited = true;
      _reduced = r;
      _sync();
    }
  }

  @override
  void didUpdateWidget(VoltiPulse old) {
    super.didUpdateWidget(old);
    if (old.active != widget.active) _sync();
  }

  void _sync() {
    _c.stop();
    _delayed = false;
    if (!widget.active || _reduced) return;
    if (widget.delay == Duration.zero) {
      _run();
    } else {
      // Atraso embutido: a primeira passada dura delay + duration e o anel
      // fica invisivel durante o atraso.
      _c.value = 0;
      _delayed = true;
      _c.duration = widget.delay + widget.duration;
      _c.forward().then((_) {
        if (!mounted) return;
        _delayed = false;
        _c.duration = widget.duration;
        _run();
      });
    }
  }

  void _run() {
    if (widget.repeat == null) {
      _c.repeat();
    } else {
      var n = widget.repeat!;
      Future<void> go() async {
        while (n-- > 0 && mounted) {
          await _c.forward(from: 0);
        }
      }

      go();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final showRing = widget.active && !_reduced;
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          if (showRing)
            Positioned.fill(
              child: RepaintBoundary(
                child: IgnorePointer(
                child: AnimatedBuilder(
                  animation: _c,
                  builder: (context, _) {
                    var p = _c.value;
                    if (_delayed) {
                      final total =
                          (widget.delay + widget.duration).inMicroseconds;
                      p =
                          ((p * total - widget.delay.inMicroseconds) /
                          widget.duration.inMicroseconds);
                      if (p <= 0) return const SizedBox.shrink();
                    }
                    final e = VoltiMotion.easeOut.transform(p.clamp(0.0, 1.0));
                    return Transform.scale(
                      scale: 1 + (widget.maxScale - 1) * e,
                      child: DecoratedBox(
                        key: const Key('volti-pulse-ring'),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: widget.color.withValues(alpha: .5 * (1 - e)),
                        ),
                      ),
                    );
                  },
                ),
              ),
              ),
            ),
          if (widget.child != null) widget.child!,
        ],
      ),
    );
  }
}

/// Check de sucesso: circulo verde com pop do check + anel pulsando 2x.
class VoltiSuccessCheck extends StatelessWidget {
  const VoltiSuccessCheck({
    super.key,
    this.size = 56,
    this.icon = LucideIcons.check,
    this.delay = const Duration(milliseconds: 300),
    this.color = VoltiColors.brand,
    this.iconColor = Colors.white,
  });

  final double size;
  final IconData icon;

  /// Fundo do circulo e do anel. Dentro de um botao primario use branco com
  /// [iconColor] no tom de acao (contraste E-12).
  final Color color;
  final Color iconColor;

  /// Atraso do pop; o anel comeca 400 ms depois do pop.
  final Duration delay;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      child: VoltiCheckPop(
        key: const Key('volti-success-check'),
        duration: const Duration(milliseconds: 600),
        delay: delay,
        child: VoltiPulse(
          size: size,
          maxScale: 2.6,
          duration: const Duration(milliseconds: 1100),
          delay: delay + const Duration(milliseconds: 400),
          repeat: 2,
          color: color,
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: color == VoltiColors.brand ? VoltiShadows.shadowBrand : null,
            ),
            child: Icon(
              icon,
              size: size * .5,
              color: iconColor,
              weight: 700,
            ),
          ),
        ),
      ),
    );
  }
}

/// Brilho periodico (`vt-shine`) para o CTA principal: barra clara que cruza
/// o filho a cada 3,8 s, apos 1,4 s. Reduced motion nao desenha o brilho.
class VoltiShine extends StatefulWidget {
  const VoltiShine({
    super.key,
    required this.child,
    this.borderRadius = VoltiRadii.rPill,
    this.enabled = true,
  });

  final Widget child;
  final BorderRadius borderRadius;
  final bool enabled;

  @override
  State<VoltiShine> createState() => _VoltiShineState();
}

class _VoltiShineState extends State<VoltiShine>
    with SingleTickerProviderStateMixin {
  static const _delay = 1400;
  static const _period = 3800;
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: _delay + _period),
  );
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final on = widget.enabled && !VoltiMotion.reduced(context);
    if (on && !_started) {
      _started = true;
      _c.forward().then((_) {
        if (mounted) {
          _c.repeat(
            min: _delay / (_delay + _period),
            max: 1,
            period: const Duration(milliseconds: _period),
          );
        }
      });
    } else if (!on && _started) {
      _started = false;
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final on = widget.enabled && !VoltiMotion.reduced(context);
    if (!on) return widget.child;
    return RepaintBoundary(
      child: Stack(
      children: [
        widget.child,
        Positioned.fill(
          child: IgnorePointer(
            child: ClipRRect(
              borderRadius: widget.borderRadius,
              child: AnimatedBuilder(
                animation: _c,
                builder: (context, _) {
                  final t = _phase(_c.value);
                  // Fora do varrido (45% ociosos do ciclo) nao pinta nada.
                  if (t < 0 || t > 1) return const SizedBox.expand(key: Key('volti-shine-idle'));
                  return CustomPaint(key: const Key('volti-shine'), painter: _ShinePainter(t));
                },
              ),
            ),
          ),
        ),
      ],
    ),
    );
  }

  /// 0..1 do ciclo de 3,8 s; o varrido ocupa os primeiros 55%.
  double _phase(double v) {
    final ms = v * (_delay + _period);
    if (ms < _delay) return -1;
    final p = (ms - _delay) / _period;
    return p / .55;
  }
}

class _ShinePainter extends CustomPainter {
  _ShinePainter(this.t);
  final double t; // <0 ou >1 = fora

  @override
  void paint(Canvas canvas, Size size) {
    if (t < 0 || t > 1) return;
    final e = VoltiMotion.easeInOut.transform(t);
    final w = size.width * .35;
    final from = -1.2 * w;
    final to = 3.6 * w;
    final left = from + (to - from) * e;
    canvas.save();
    canvas.translate(left, 0);
    canvas.transform(Matrix4.skewX(-20 * math.pi / 180).storage);
    final rect = Rect.fromLTWH(0, 0, w, size.height);
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          colors: [Color(0x00FFFFFF), Color(0x61FFFFFF), Color(0x00FFFFFF)],
        ).createShader(rect),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_ShinePainter old) => old.t != t;
}

/// Desenha uma rota progressivamente (`vt-draw`, 1,1 s, easeInOut, atraso
/// 300 ms). O [builder] recebe o progresso 0..1; use [partial] para obter os
/// pontos ja "desenhados" de uma polyline.
class VoltiRouteDraw extends StatefulWidget {
  const VoltiRouteDraw({
    super.key,
    required this.builder,
    this.delay = const Duration(milliseconds: 300),
    this.duration = const Duration(milliseconds: 1100),
  });

  final Widget Function(BuildContext context, double progress) builder;
  final Duration delay;
  final Duration duration;

  /// Trecho inicial de [points] correspondente a fracao [t] do comprimento.
  /// [lerp] interpola dois pontos; [dist] mede a distancia entre eles.
  static List<T> partial<T>(
    List<T> points,
    double t, {
    required T Function(T a, T b, double f) lerp,
    required double Function(T a, T b) dist,
  }) {
    if (points.length < 2 || t >= 1) return points;
    if (t <= 0) return [points.first];
    var total = 0.0;
    for (var i = 1; i < points.length; i++) {
      total += dist(points[i - 1], points[i]);
    }
    if (total == 0) return points;
    var target = total * t;
    final out = <T>[points.first];
    for (var i = 1; i < points.length; i++) {
      final d = dist(points[i - 1], points[i]);
      if (d >= target) {
        out.add(lerp(points[i - 1], points[i], d == 0 ? 0 : target / d));
        return out;
      }
      target -= d;
      out.add(points[i]);
    }
    return out;
  }

  @override
  State<VoltiRouteDraw> createState() => _VoltiRouteDrawState();
}

class _VoltiRouteDrawState extends State<VoltiRouteDraw>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.delay + widget.duration,
  );
  late final Animation<double> _t = CurvedAnimation(
    parent: _c,
    curve: Interval(
      widget.delay.inMicroseconds /
          (widget.delay + widget.duration).inMicroseconds,
      1,
      curve: VoltiMotion.easeInOut,
    ),
  );
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (VoltiMotion.reduced(context)) {
      _c.value = 1;
    } else {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _t,
    builder: (context, _) => widget.builder(context, _t.value),
  );
}
