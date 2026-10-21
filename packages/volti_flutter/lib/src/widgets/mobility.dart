import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' show VehicleStatus;

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';
import 'pressable.dart';

/// Pilula escura com bateria e autonomia. O anel segue o nivel:
/// > 50 verde, 21-50 amarelo, <= 20 coral.
class BatteryPill extends StatelessWidget {
  const BatteryPill(this.pct, {super.key, this.rangeKm});

  /// 0-100.
  final int pct;

  /// Autonomia estimada em km.
  final int? rangeKm;

  /// Cor do anel para [pct].
  static Color colorFor(int pct) => VoltiColors.batteryColor(pct);

  @override
  Widget build(BuildContext context) {
    final c = colorFor(pct);
    const style = TextStyle(
      fontFamily: VoltiTypography.fontSans,
      fontWeight: VoltiTypography.fwSemibold,
      fontSize: 13,
      height: 1,
      color: Colors.white,
    );
    return Semantics(
      label: 'Bateria $pct%',
      child: Container(
        height: 30,
        padding: const EdgeInsets.only(left: 4, right: 12),
        decoration: const BoxDecoration(
          color: VoltiColors.surfaceInverse,
          borderRadius: VoltiRadii.rPill,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              key: const Key('battery-ring'),
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: c, width: 1.5),
              ),
              child: Icon(LucideIcons.zap, size: 12, color: c),
            ),
            const SizedBox(width: 8),
            Text('$pct%', style: style),
            if (rangeKm != null) ...[
              const SizedBox(width: 8),
              Container(width: 1, height: 14, color: const Color(0x59FFFFFF)),
              const SizedBox(width: 8),
              Text('~$rangeKm km', style: style),
            ],
          ],
        ),
      ),
    );
  }
}

/// Pin de moto no mapa, com tique de bateria embaixo. O corpo usa a cor de
/// `--status-*`; o tique usa a cor da bateria.
class VehicleMarker extends StatelessWidget {
  const VehicleMarker(
    this.status,
    this.batteryPct, {
    super.key,
    this.selected = false,
    this.onTap,
  });

  final VehicleStatus status;
  final int batteryPct;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final size = selected ? 44.0 : 34.0;
    final color = VoltiColors.statusColor(status);
    return VoltiPressable(
      onTap: onTap,
      semanticLabel: 'Moto, bateria $batteryPct%',
      child: AnimatedContainer(
        duration: VoltiMotion.durBase,
        curve: VoltiMotion.easeSpring,
        width: size,
        height: size + 6,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              top: 0,
              left: 0,
              child: AnimatedContainer(
                key: const Key('vehicle-marker-body'),
                duration: VoltiMotion.durBase,
                curve: VoltiMotion.easeSpring,
                width: size,
                height: size,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2.5),
                  boxShadow: selected
                      ? [BoxShadow(color: color.withValues(alpha: .35), offset: const Offset(0, 8), blurRadius: 20)]
                      : VoltiShadows.shadow1,
                ),
                child: Icon(LucideIcons.bike, size: selected ? 22 : 17, color: Colors.white),
              ),
            ),
            Positioned(
              bottom: 0,
              left: (size - 16) / 2,
              child: Container(
                key: const Key('vehicle-marker-battery'),
                width: 16,
                height: 4,
                decoration: BoxDecoration(
                  color: VoltiColors.batteryColor(batteryPct),
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Indicador de status da frota (operador/admin).
class FleetStatusBadge extends StatelessWidget {
  const FleetStatusBadge(
    this.status, {
    super.key,
    this.count,
    this.pill = true,
    this.selected = false,
    this.onTap,
  });

  final VehicleStatus status;
  final int? count;

  /// `true` = chip de filtro; `false` = rotulo com ponto, inline.
  final bool pill;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final label = VoltiColors.statusLabel(status);
    final scheme = Theme.of(context).colorScheme;
    final dot = Container(
      key: const Key('fleet-status-dot'),
      width: 8,
      height: 8,
      decoration: BoxDecoration(color: VoltiColors.statusColor(status), shape: BoxShape.circle),
    );
    if (!pill) {
      return Row(mainAxisSize: MainAxisSize.min, children: [
        dot,
        const SizedBox(width: 6),
        Text(label, style: VoltiTypography.label.copyWith(color: scheme.onSurface)),
      ]);
    }
    final fg = selected ? Colors.white : scheme.onSurface;
    final txt = TextStyle(
      fontFamily: VoltiTypography.fontSans,
      fontWeight: VoltiTypography.fwMedium,
      fontSize: 12,
      height: 1,
      color: fg,
    );
    return VoltiPressable(
      onTap: onTap,
      child: Container(
        height: 30,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: selected ? VoltiColors.ink900 : scheme.surface,
          borderRadius: VoltiRadii.rPill,
          border: Border.all(color: selected ? VoltiColors.ink900 : scheme.outlineVariant),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          dot,
          const SizedBox(width: 6),
          Text(label, style: txt),
          if (count != null) ...[
            const SizedBox(width: 6),
            Opacity(
              opacity: .7,
              child: Text('$count',
                  style: txt.copyWith(fontFamily: VoltiTypography.fontMono, fontWeight: VoltiTypography.fwBold)),
            ),
          ],
        ]),
      ),
    );
  }
}

/// Rotulo flutuante no mapa: tempo a pe e distancia ate a moto.
class RouteInfoPill extends StatelessWidget {
  const RouteInfoPill({super.key, required this.minutes, required this.distance});

  final int minutes;

  /// Ja formatada, ex.: "310 m".
  final String distance;

  Widget _dot(IconData icon) => Container(
        width: 22,
        height: 22,
        decoration: const BoxDecoration(color: VoltiColors.green900, shape: BoxShape.circle),
        child: Icon(icon, size: 13, color: VoltiColors.green300),
      );

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(
      fontFamily: VoltiTypography.fontSans,
      fontWeight: VoltiTypography.fwSemibold,
      fontSize: 12,
      height: 1,
      color: Colors.white,
    );
    return Container(
      height: 32,
      padding: const EdgeInsets.only(left: 5, right: 12),
      decoration: const BoxDecoration(
        color: VoltiColors.surfaceInverse,
        borderRadius: VoltiRadii.rPill,
        boxShadow: VoltiShadows.shadow2,
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        _dot(LucideIcons.clock),
        const SizedBox(width: 8),
        Text('$minutes min', style: style),
        const SizedBox(width: 14),
        _dot(LucideIcons.route),
        const SizedBox(width: 8),
        Text(distance, style: style),
      ]),
    );
  }
}

/// Faixa de acao de deslizar para confirmar (cancelar, encerrar).
class SwipeAction extends StatefulWidget {
  const SwipeAction({
    super.key,
    this.label = 'Deslize para cancelar',
    this.danger = true,
    this.onComplete,
  });

  final String label;

  /// `true` = coral; `false` = verde.
  final bool danger;

  /// Dispara quando o botao passa de 85% do trilho.
  final VoidCallback? onComplete;

  @override
  State<SwipeAction> createState() => _SwipeActionState();
}

class _SwipeActionState extends State<SwipeAction> {
  static const double _h = 52, _k = 40, _pad = 6;
  double _x = 0;
  bool _dragging = false;

  void _end(double max) {
    final done = _x > max * .85;
    setState(() {
      _dragging = false;
      _x = done ? max : 0;
    });
    if (done) {
      widget.onComplete?.call();
      Future<void>.delayed(const Duration(milliseconds: 400), () {
        if (mounted) setState(() => _x = 0);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final c = widget.danger ? VoltiColors.danger : VoltiColors.brand;
    return LayoutBuilder(builder: (context, box) {
      final max = (box.maxWidth.isFinite ? box.maxWidth : 280) - _k - _pad * 2;
      return Container(
        height: _h,
        decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rPill),
        child: Stack(alignment: Alignment.center, children: [
          Opacity(
            opacity: (1 - _x / (max * 1.2)).clamp(0.0, 1.0),
            child: Text(widget.label,
                style: TextStyle(
                  fontFamily: VoltiTypography.fontSans,
                  fontWeight: VoltiTypography.fwBold,
                  fontSize: 16,
                  height: 1,
                  color: scheme.onSurface,
                )),
          ),
          AnimatedPositioned(
            duration: _dragging ? Duration.zero : VoltiMotion.durSlow,
            curve: VoltiMotion.easeSpring,
            left: _pad + _x,
            top: _pad,
            child: GestureDetector(
              key: const Key('swipe-knob'),
              onHorizontalDragStart: (_) => setState(() => _dragging = true),
              onHorizontalDragUpdate: (d) =>
                  setState(() => _x = (_x + d.delta.dx).clamp(0.0, max)),
              onHorizontalDragEnd: (_) => _end(max),
              onHorizontalDragCancel: () => setState(() {
                _dragging = false;
                _x = 0;
              }),
              child: Container(
                width: _k,
                height: _k,
                decoration: BoxDecoration(color: c, shape: BoxShape.circle),
                child: const Icon(LucideIcons.chevronsRight, size: 20, color: Colors.white),
              ),
            ),
          ),
        ]),
      );
    });
  }
}

/// Contagem regressiva da reserva (coral) com deslize para cancelar.
class ReservationBanner extends StatelessWidget {
  const ReservationBanner({
    super.key,
    required this.seconds,
    this.label = 'Tempo de reserva restante',
    this.swipeLabel = 'Deslize para cancelar',
    this.onCancel,
  });

  /// Segundos restantes.
  final int seconds;
  final String label;
  final String swipeLabel;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 12, 6, 6),
      decoration: const BoxDecoration(
        color: VoltiColors.danger,
        borderRadius: VoltiRadii.rXl,
        boxShadow: VoltiShadows.shadowCoral,
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(label, style: VoltiTypography.caption.copyWith(color: Colors.white.withValues(alpha: .92))),
        const SizedBox(height: 2),
        Text.rich(
          TextSpan(children: [
            TextSpan(
              text: '$m : $s ',
              style: const TextStyle(
                fontFamily: VoltiTypography.fontMono,
                fontWeight: VoltiTypography.fwBold,
                fontSize: 22,
                height: 1.2,
                letterSpacing: .44,
              ),
            ),
            const TextSpan(
              text: 'min',
              style: TextStyle(
                fontFamily: VoltiTypography.fontSans,
                fontWeight: VoltiTypography.fwSemibold,
                fontSize: 15,
              ),
            ),
          ]),
          style: const TextStyle(color: Colors.white),
        ),
        const SizedBox(height: 10),
        SwipeAction(label: swipeLabel, onComplete: onCancel),
      ]),
    );
  }
}

enum ListRowTone { neutral, brand, info, sun, danger }

enum ListRowTrailing { arrow, chevron, none }

/// Linha tocavel de configuracoes / pagamento / promo.
class ListRow extends StatelessWidget {
  const ListRow({
    super.key,
    required this.title,
    this.icon,
    this.iconTone = ListRowTone.neutral,
    this.subtitle,
    this.value,
    this.trailing = ListRowTrailing.arrow,
    this.onTap,
  });

  final String title;
  final IconData? icon;
  final ListRowTone iconTone;
  final String? subtitle;
  final String? value;
  final ListRowTrailing trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (bg, fg) = switch (iconTone) {
      ListRowTone.neutral => (scheme.surfaceContainerHighest, scheme.onSurface),
      ListRowTone.brand => (VoltiColors.green50, VoltiColors.green700),
      ListRowTone.info => (VoltiColors.blue50, VoltiColors.blue600),
      ListRowTone.sun => (const Color(0xFFFFF3CC), VoltiColors.orange600),
      ListRowTone.danger => (VoltiColors.coral50, VoltiColors.coral600),
    };
    final t = switch (trailing) {
      ListRowTrailing.arrow => LucideIcons.arrowRight,
      ListRowTrailing.chevron => LucideIcons.chevronRight,
      ListRowTrailing.none => null,
    };
    final row = Container(
      constraints: const BoxConstraints(minHeight: 56),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rMd),
      child: Row(children: [
        if (icon != null) ...[
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 18, color: fg),
          ),
          const SizedBox(width: 12),
        ],
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(subtitle!, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
            ],
          ]),
        ),
        if (value != null) ...[
          const SizedBox(width: 8),
          Text(value!, style: VoltiTypography.label.copyWith(color: scheme.onSurfaceVariant)),
        ],
        if (t != null) ...[
          const SizedBox(width: 8),
          Icon(t, size: 20, color: scheme.onSurface),
        ],
      ]),
    );
    return onTap == null ? row : VoltiPressable(onTap: onTap, scale: .99, child: row);
  }
}

/// Espaco tracejado para foto obrigatoria (documento, selfie, moto estacionada).
class PhotoCapture extends StatelessWidget {
  const PhotoCapture({
    super.key,
    this.label = 'Tirar foto',
    this.hint,
    this.done = false,
    this.icon = LucideIcons.camera,
    this.height = 160,
    this.onTap,
  });

  final String label;
  final String? hint;
  final bool done;
  final IconData icon;
  final double height;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fg = done ? VoltiColors.successInk : scheme.onSurface;
    return VoltiPressable(
      onTap: onTap,
      scale: .99,
      semanticLabel: done ? 'Foto enviada' : label,
      child: CustomPaint(
        foregroundPainter: _DashedBorder(
          color: done ? VoltiColors.brand : scheme.outline,
          radius: VoltiRadii.lg,
        ),
        child: Container(
          height: height,
          width: double.infinity,
          decoration: BoxDecoration(
            color: done ? VoltiColors.brandSoft : scheme.surfaceContainerHighest,
            borderRadius: VoltiRadii.rLg,
          ),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: done ? VoltiColors.brand : Colors.white,
                shape: BoxShape.circle,
                boxShadow: VoltiShadows.shadow1,
              ),
              child: Icon(done ? LucideIcons.check : icon,
                  size: 22, color: done ? Colors.white : VoltiColors.ink700),
            ),
            const SizedBox(height: 8),
            Text(done ? 'Foto enviada' : label, style: VoltiTypography.label.copyWith(color: fg)),
            if (hint != null && !done) ...[
              const SizedBox(height: 8),
              Text(hint!, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
            ],
          ]),
        ),
      ),
    );
  }
}

class _DashedBorder extends CustomPainter {
  _DashedBorder({required this.color, required this.radius});
  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final path = Path()
      ..addRRect(RRect.fromRectAndRadius(
          Offset.zero & size, Radius.circular(radius)).deflate(.75));
    for (final m in path.computeMetrics()) {
      var d = 0.0;
      while (d < m.length) {
        canvas.drawPath(m.extractPath(d, d + 6), paint);
        d += 10;
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorder old) => old.color != color || old.radius != radius;
}
