import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/typography.dart';

/// Medidor de velocidade contra o limite da zona (evolucao E-05, HUD da corrida).
///
/// Arco de 270 graus de 0 ao [limitKmh]: verde ate 85% do limite, sol entre
/// 85% e o limite, coral acima. A cor nunca e o unico sinal: o numero fica no
/// centro e o [semanticsLabel] le velocidade e limite. O arco anima entre
/// leituras (200 ms); reduced motion pula direto. O numero central tem escala
/// de texto limitada a 1,3x porque vive dentro de um grafico de tamanho fixo
/// (o texto de apoio do HUD continua escalando normalmente).
class VoltiSpeedGauge extends StatelessWidget {
  const VoltiSpeedGauge({
    super.key,
    required this.speedKmh,
    required this.limitKmh,
    this.size = 64,
    this.semanticsLabel,
  });

  final double speedKmh;
  final int limitKmh;
  final double size;
  final String? semanticsLabel;

  /// Cor do arco para a razao velocidade/limite.
  static Color colorFor(double speed, int limit) {
    if (limit <= 0) return VoltiColors.brand;
    final r = speed / limit;
    if (r > 1.0) return VoltiColors.danger;
    if (r >= .85) return VoltiColors.sun400;
    return VoltiColors.brand;
  }

  @override
  Widget build(BuildContext context) {
    final ratio = limitKmh <= 0 ? 0.0 : (speedKmh / limitKmh).clamp(0.0, 1.0);
    final color = colorFor(speedKmh, limitKmh);
    final d = VoltiMotion.scaled(context, VoltiMotion.durBase);
    final track = Theme.of(context).brightness == Brightness.dark ? VoltiColors.ink700 : VoltiColors.ink200;
    final over = speedKmh > limitKmh && limitKmh > 0;
    return Semantics(
      label: semanticsLabel,
      container: true,
      child: ExcludeSemantics(
        child: RepaintBoundary(
          child: SizedBox.square(
          dimension: size,
          child: TweenAnimationBuilder<double>(
            tween: Tween(end: ratio),
            duration: d,
            curve: VoltiMotion.easeOut,
            builder: (context, v, child) => CustomPaint(
              painter: _GaugePainter(value: v, color: color, track: track, stroke: size * .1),
              child: child,
            ),
            child: Center(
              child: MediaQuery.withClampedTextScaling(
                maxScaleFactor: 1.3,
                child: AnimatedDefaultTextStyle(
                  duration: d,
                  style: TextStyle(
                    fontFamily: VoltiTypography.fontSans,
                    fontWeight: VoltiTypography.fwBlack,
                    fontSize: size * .36,
                    height: 1,
                    letterSpacing: -.5,
                    color: over ? VoltiColors.dangerInkStrong : Theme.of(context).colorScheme.onSurface,
                  ),
                  child: Text('${speedKmh.round()}', key: const Key('volti-gauge-speed')),
                ),
              ),
            ),
          ),
          ),
        ),
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  _GaugePainter({required this.value, required this.color, required this.track, required this.stroke});
  final double value;
  final Color color, track;
  final double stroke;

  static const _start = math.pi * .75; // 135 graus: abre embaixo
  static const _sweep = math.pi * 1.5; // 270 graus

  @override
  void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(stroke / 2);
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, _start, _sweep, false, p..color = track);
    if (value > 0) canvas.drawArc(rect, _start, _sweep * value, false, p..color = color);
  }

  @override
  bool shouldRepaint(_GaugePainter old) =>
      old.value != value || old.color != color || old.track != track || old.stroke != stroke;
}
