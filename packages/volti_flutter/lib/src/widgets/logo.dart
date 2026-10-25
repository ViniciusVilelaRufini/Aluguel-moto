import 'dart:math' as math;
import 'dart:ui' show PathMetric;

import 'package:flutter/widgets.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/typography.dart';

/// Geometria do simbolo "Roda" (`design-system/assets/logo/logo-mark.svg`),
/// no viewBox 180x180. Traco sem preenchimento, caps e joins arredondados.
abstract final class VoltiLogoGeometry {
  static const double viewBox = 180;

  /// Rodas: centro e raio (traco 12).
  static const rearWheel = Offset(40, 132);
  static const frontWheel = Offset(140, 132);
  static const double wheelRadius = 22;
  static const double wheelStroke = 12;

  /// Quadro em V (polyline, traco 16).
  static const frameV = [Offset(62, 64), Offset(90, 124), Offset(120, 52)];
  static const double frameStroke = 16;

  /// Balanca traseira e garfo (linhas, traco 11).
  static const rearStay = [Offset(40, 132), Offset(70, 82)];
  static const fork = [Offset(120, 52), Offset(140, 132)];
  static const double stayStroke = 11;

  /// Banco e guidao (linhas, traco 12).
  static const seat = [Offset(46, 62), Offset(78, 62)];
  static const handlebar = [Offset(108, 44), Offset(138, 44)];
  static const double barStroke = 12;
}

/// Duracao padrao do desenho do simbolo (rodas, quadro, banco e guidao).
const kVoltiLogoDrawDuration = Duration(milliseconds: 900);

/// Simbolo "Roda" da marca Volti (moto de lado). Pintado com a geometria exata
/// do SVG. Use [VoltiLogoMark.animated] para o traco se desenhar na entrada
/// (sem animacao com reduced motion).
class VoltiLogoMark extends StatefulWidget {
  const VoltiLogoMark({
    super.key,
    this.size = 32,
    this.color = VoltiColors.brand,
    this.shadows,
    this.semanticLabel = 'Volti',
  }) : animate = false,
       delay = Duration.zero,
       duration = kVoltiLogoDrawDuration;

  /// O traco se desenha: rodas, depois o quadro em V, depois banco e guidao.
  const VoltiLogoMark.animated({
    super.key,
    this.size = 32,
    this.color = VoltiColors.brand,
    this.shadows,
    this.semanticLabel = 'Volti',
    this.delay = Duration.zero,
    this.duration = kVoltiLogoDrawDuration,
  }) : animate = true;

  /// Lado do quadrado (o viewBox 180x180 inteiro).
  final double size;
  final Color color;

  /// Sombras do traco (ex.: legibilidade sobre mapa/foto).
  final List<Shadow>? shadows;

  /// Rotulo de acessibilidade; `null` deixa o simbolo fora da semantica.
  final String? semanticLabel;
  final bool animate;
  final Duration delay;
  final Duration duration;

  @override
  State<VoltiLogoMark> createState() => _VoltiLogoMarkState();
}

class _VoltiLogoMarkState extends State<VoltiLogoMark>
    with SingleTickerProviderStateMixin {
  AnimationController? _c;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!widget.animate || _c != null) return;
    final c = _c = AnimationController(
      vsync: this,
      duration: widget.delay + widget.duration,
    );
    if (VoltiMotion.reduced(context)) {
      c.value = 1;
    } else {
      c.forward();
    }
  }

  @override
  void dispose() {
    _c?.dispose();
    super.dispose();
  }

  double get _delayFraction {
    final total = (widget.delay + widget.duration).inMicroseconds;
    return total == 0 ? 0 : widget.delay.inMicroseconds / total;
  }

  @override
  Widget build(BuildContext context) {
    final c = _c;
    Widget paint(double progress) => CustomPaint(
      size: Size.square(widget.size),
      painter: VoltiLogoMarkPainter(
        color: widget.color,
        progress: progress,
        shadows: widget.shadows,
      ),
    );
    final start = _delayFraction;
    final Widget child = c == null
        ? paint(1)
        : AnimatedBuilder(
            animation: c,
            builder: (_, _) {
              final t = c.value <= start ? 0.0 : (c.value - start) / (1 - start);
              return paint(t.clamp(0.0, 1.0));
            },
          );
    final label = widget.semanticLabel;
    if (label == null) return ExcludeSemantics(child: child);
    return Semantics(label: label, image: true, child: ExcludeSemantics(child: child));
  }
}

/// Pinta o simbolo "Roda" num quadrado. [progress] (0..1) controla o desenho:
/// rodas (0-45%), quadro em V com balanca e garfo (30-78%), banco e guidao
/// (62-100%), cada fase com as curvas dos tokens de motion.
class VoltiLogoMarkPainter extends CustomPainter {
  const VoltiLogoMarkPainter({
    required this.color,
    this.progress = 1,
    this.shadows,
  });

  final Color color;
  final double progress;
  final List<Shadow>? shadows;

  static const _wheels = Interval(0, .45, curve: VoltiMotion.easeOut);
  static const _frame = Interval(.30, .78, curve: VoltiMotion.easeInOut);
  static const _bars = Interval(.62, 1, curve: VoltiMotion.easeOut);

  @override
  void paint(Canvas canvas, Size size) {
    final scale = math.min(size.width, size.height) / VoltiLogoGeometry.viewBox;
    canvas.save();
    canvas.translate(
      (size.width - VoltiLogoGeometry.viewBox * scale) / 2,
      (size.height - VoltiLogoGeometry.viewBox * scale) / 2,
    );
    canvas.scale(scale, scale);
    for (final s in shadows ?? const <Shadow>[]) {
      canvas.save();
      canvas.translate(s.offset.dx / scale, s.offset.dy / scale);
      _strokes(canvas, s.color, MaskFilter.blur(BlurStyle.normal, s.blurSigma / scale));
      canvas.restore();
    }
    _strokes(canvas, color, null);
    canvas.restore();
  }

  void _strokes(Canvas canvas, Color c, MaskFilter? blur) {
    Paint pen(double w) => Paint()
      ..color = c
      ..style = PaintingStyle.stroke
      ..strokeWidth = w
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..isAntiAlias = true
      ..maskFilter = blur;

    final p = progress.clamp(0.0, 1.0);
    final wheels = _wheels.transform(p);
    final frame = _frame.transform(p);
    final bars = _bars.transform(p);

    // Rodas: o arco nasce no topo e gira no sentido horario.
    final wheelPen = pen(VoltiLogoGeometry.wheelStroke);
    for (final center in [VoltiLogoGeometry.rearWheel, VoltiLogoGeometry.frontWheel]) {
      if (wheels >= 1) {
        canvas.drawCircle(center, VoltiLogoGeometry.wheelRadius, wheelPen);
      } else if (wheels > 0) {
        canvas.drawArc(
          Rect.fromCircle(center: center, radius: VoltiLogoGeometry.wheelRadius),
          -math.pi / 2,
          2 * math.pi * wheels,
          false,
          wheelPen,
        );
      }
    }
    _line(canvas, VoltiLogoGeometry.frameV, frame, pen(VoltiLogoGeometry.frameStroke));
    _line(canvas, VoltiLogoGeometry.rearStay, frame, pen(VoltiLogoGeometry.stayStroke));
    _line(canvas, VoltiLogoGeometry.fork, frame, pen(VoltiLogoGeometry.stayStroke));
    _line(canvas, VoltiLogoGeometry.seat, bars, pen(VoltiLogoGeometry.barStroke));
    _line(canvas, VoltiLogoGeometry.handlebar, bars, pen(VoltiLogoGeometry.barStroke));
  }

  static void _line(Canvas canvas, List<Offset> pts, double t, Paint paint) {
    if (t <= 0) return;
    final path = Path()..moveTo(pts.first.dx, pts.first.dy);
    for (final q in pts.skip(1)) {
      path.lineTo(q.dx, q.dy);
    }
    if (t >= 1) {
      canvas.drawPath(path, paint);
      return;
    }
    final out = Path();
    for (final PathMetric m in path.computeMetrics()) {
      out.addPath(m.extractPath(0, m.length * t), Offset.zero);
    }
    canvas.drawPath(out, paint);
  }

  @override
  bool shouldRepaint(VoltiLogoMarkPainter old) =>
      old.color != color || old.progress != progress || old.shadows != shadows;
}

/// Variantes de cor do logo (`design-system/guidelines/brand-wordmark.html`).
enum VoltiLogoVariant {
  /// Simbolo verde + nome em tinta: sobre fundos claros (padrao).
  green(VoltiColors.brand, VoltiColors.ink900),

  /// Tudo branco: sobre o verde da marca, mapa escurecido ou foto.
  white(VoltiColors.white, VoltiColors.white),

  /// Tudo em tinta (#15181A): monocromatico sobre fundos claros.
  dark(VoltiColors.ink900, VoltiColors.ink900),

  /// Simbolo verde + nome branco: sobre fundos escuros (tema escuro, ink-900).
  onDark(VoltiColors.brand, VoltiColors.white);

  const VoltiLogoVariant(this.markColor, this.textColor);

  /// [green] no tema claro e [onDark] no escuro.
  static VoltiLogoVariant adaptive(Brightness brightness) =>
      brightness == Brightness.dark ? onDark : green;
  final Color markColor;
  final Color textColor;
}

/// Logo completo: simbolo "Roda" + nome "volti" em texto vivo (Plus Jakarta
/// Sans 800, tracking -4,5%). Proporcoes do lockup do design system: simbolo
/// 1,185x o corpo do texto, espaco 0,22x.
class VoltiLogo extends StatelessWidget {
  const VoltiLogo({
    super.key,
    this.variant = VoltiLogoVariant.green,
    this.fontSize = 30,
    this.shadows,
    this.semanticLabel = 'Volti',
    this.header = false,
  }) : animate = false,
       delay = Duration.zero;

  /// O simbolo se desenha (~900 ms) e o nome entra em seguida (sem animacao
  /// com reduced motion).
  const VoltiLogo.animated({
    super.key,
    this.variant = VoltiLogoVariant.green,
    this.fontSize = 30,
    this.shadows,
    this.semanticLabel = 'Volti',
    this.header = false,
    this.delay = Duration.zero,
  }) : animate = true;

  final VoltiLogoVariant variant;

  /// Corpo do nome; o simbolo e o espaco escalam com ele.
  final double fontSize;
  final List<Shadow>? shadows;

  /// Rotulo de acessibilidade; `null` deixa o logo fora da semantica.
  final String? semanticLabel;
  final bool header;
  final bool animate;
  final Duration delay;

  static const double markRatio = 64 / 54;
  static const double gapRatio = 12 / 54;
  static const double tracking = -.045;

  @override
  Widget build(BuildContext context) {
    final markSize = fontSize * markRatio;
    final mark = animate
        ? VoltiLogoMark.animated(
            size: markSize,
            color: variant.markColor,
            shadows: shadows,
            semanticLabel: null,
            delay: delay,
          )
        : VoltiLogoMark(
            size: markSize,
            color: variant.markColor,
            shadows: shadows,
            semanticLabel: null,
          );
    Widget word = Text(
      'volti',
      textScaler: TextScaler.noScaling,
      style: TextStyle(
        fontFamily: VoltiTypography.fontSans,
        fontWeight: VoltiTypography.fwBlack,
        fontSize: fontSize,
        height: 1,
        letterSpacing: fontSize * tracking,
        color: variant.textColor,
        shadows: shadows,
      ),
    );
    if (animate) {
      // O nome aparece na segunda metade do desenho do simbolo.
      word = VoltiLogoWordEntrance(
        delay: delay + kVoltiLogoDrawDuration * .45,
        child: word,
      );
    }
    final row = Row(
      mainAxisSize: MainAxisSize.min,
      children: [mark, SizedBox(width: fontSize * gapRatio), word],
    );
    final label = semanticLabel;
    if (label == null) return ExcludeSemantics(child: row);
    return Semantics(
      label: label,
      header: header,
      container: true,
      child: ExcludeSemantics(child: row),
    );
  }
}

/// Entrada do nome do logo: fade + deslize curto da esquerda (easeOut,
/// `durSlow`). Com reduced motion aparece pronto.
class VoltiLogoWordEntrance extends StatefulWidget {
  const VoltiLogoWordEntrance({super.key, required this.child, this.delay = Duration.zero});

  final Widget child;
  final Duration delay;

  @override
  State<VoltiLogoWordEntrance> createState() => _VoltiLogoWordEntranceState();
}

class _VoltiLogoWordEntranceState extends State<VoltiLogoWordEntrance>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.delay + VoltiMotion.durSlow,
  );
  late final Animation<double> _t = CurvedAnimation(
    parent: _c,
    curve: Interval(
      widget.delay.inMicroseconds / (widget.delay + VoltiMotion.durSlow).inMicroseconds,
      1,
      curve: VoltiMotion.easeOut,
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
    child: widget.child,
    builder: (context, child) => _t.value >= 1
        ? child!
        : Opacity(
            opacity: _t.value,
            child: Transform.translate(offset: Offset(-6 * (1 - _t.value), 0), child: child),
          ),
  );
}
