import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';

enum VoltiBadgeTone { success, info, warning, danger, neutral, dark }

enum VoltiBadgeSize { sm, md }

/// Rotulo curto de status (`Badge` do VDS): raio `xs`, 20 px (sm) ou 26 px (md).
class VoltiBadge extends StatelessWidget {
  const VoltiBadge(
    this.label, {
    super.key,
    this.tone = VoltiBadgeTone.success,
    this.size = VoltiBadgeSize.md,
    this.icon,
    this.semanticLabel,
  });

  final String label;
  final VoltiBadgeTone tone;
  final VoltiBadgeSize size;
  final IconData? icon;

  /// Texto lido pelo leitor de tela no lugar de [label] (ex.: "Prioridade alta").
  final String? semanticLabel;

  static (Color, Color) colorsFor(VoltiBadgeTone tone) => switch (tone) {
        VoltiBadgeTone.success => (VoltiColors.successSoft, VoltiColors.successInk),
        VoltiBadgeTone.info => (VoltiColors.infoSoft, VoltiColors.infoInk),
        VoltiBadgeTone.warning => (VoltiColors.warningSoft, VoltiColors.warningInk),
        VoltiBadgeTone.danger => (VoltiColors.dangerSoft, VoltiColors.dangerInk),
        VoltiBadgeTone.neutral => (VoltiColors.surfaceSunken, VoltiColors.ink700),
        VoltiBadgeTone.dark => (VoltiColors.surfaceInverse, VoltiColors.white),
      };

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = colorsFor(tone);
    final sm = size == VoltiBadgeSize.sm;
    final text = Text(
      label,
      maxLines: 1,
      style: TextStyle(
        fontFamily: VoltiTypography.fontSans,
        fontWeight: VoltiTypography.fwSemibold,
        fontSize: sm ? 11 : 12,
        height: 1,
        color: fg,
      ),
    );
    return Semantics(
      label: semanticLabel,
      excludeSemantics: semanticLabel != null,
      child: Container(
        key: const Key('volti-badge'),
        // Altura minima que cresce com a escala do texto (sem corte a 200%).
        constraints: BoxConstraints(minHeight: sm ? 20 : 26),
        padding: EdgeInsets.symmetric(horizontal: sm ? 6 : 8, vertical: sm ? 4.5 : 7),
        decoration: BoxDecoration(color: bg, borderRadius: VoltiRadii.rXs),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: sm ? 12 : 14, color: fg),
              const SizedBox(width: 4),
            ],
            text,
          ],
        ),
      ),
    );
  }
}
