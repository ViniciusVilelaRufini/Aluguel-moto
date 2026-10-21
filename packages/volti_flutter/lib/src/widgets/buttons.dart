import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';
import 'pressable.dart';

enum VoltiButtonVariant { primary, secondary, ghost, dark, danger }

enum VoltiButtonSize { sm, md, lg }

/// Botao pill. Primario = verde com glow.
class VoltiButton extends StatelessWidget {
  const VoltiButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = VoltiButtonVariant.primary,
    this.size = VoltiButtonSize.md,
    this.icon,
    this.iconRight,
    this.fullWidth = false,
  });

  final String label;

  /// `null` desabilita o botao.
  final VoidCallback? onPressed;
  final VoltiButtonVariant variant;
  final VoltiButtonSize size;
  final IconData? icon;
  final IconData? iconRight;
  final bool fullWidth;

  static (double h, double px, double fs, double ic) _dims(VoltiButtonSize s) =>
      switch (s) {
        VoltiButtonSize.sm => (36, 16, 14, 16),
        VoltiButtonSize.md => (48, 20, 15, 20),
        VoltiButtonSize.lg => (56, 24, 16, 22),
      };

  @override
  Widget build(BuildContext context) {
    final (h, px, fs, ic) = _dims(size);
    final scheme = Theme.of(context).colorScheme;
    final (bg, fg, bd, sh) = switch (variant) {
      VoltiButtonVariant.primary => (
          VoltiColors.brand,
          VoltiColors.onBrand,
          Colors.transparent,
          VoltiShadows.shadowBrand
        ),
      VoltiButtonVariant.secondary => (
          scheme.surface,
          VoltiColors.brand,
          VoltiColors.brand,
          const <BoxShadow>[]
        ),
      VoltiButtonVariant.ghost => (
          Colors.transparent,
          scheme.onSurface,
          Colors.transparent,
          const <BoxShadow>[]
        ),
      VoltiButtonVariant.dark => (
          VoltiColors.surfaceInverse,
          VoltiColors.textOnInverse,
          Colors.transparent,
          VoltiShadows.shadow2
        ),
      VoltiButtonVariant.danger => (
          VoltiColors.danger,
          VoltiColors.white,
          Colors.transparent,
          VoltiShadows.shadowCoral
        ),
    };
    final disabled = onPressed == null;
    final content = Row(
      mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[Icon(icon, size: ic, color: fg), const SizedBox(width: 10)],
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontFamily: VoltiTypography.fontSans,
              fontWeight: VoltiTypography.fwSemibold,
              fontSize: fs,
              height: 1,
              color: fg,
            ),
          ),
        ),
        if (iconRight != null) ...[const SizedBox(width: 10), Icon(iconRight, size: ic, color: fg)],
      ],
    );
    final body = Opacity(
      opacity: disabled ? .4 : 1,
      child: Container(
        height: h,
        padding: EdgeInsets.symmetric(horizontal: px),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: VoltiRadii.rPill,
          border: Border.all(color: bd, width: 1.5),
          boxShadow: disabled ? null : sh,
        ),
        child: content,
      ),
    );
    return VoltiPressable(
      onTap: onPressed,
      semanticLabel: label,
      child: fullWidth ? SizedBox(width: double.infinity, child: body) : body,
    );
  }
}

enum VoltiIconButtonVariant { surface, ghost, soft, brand, dark }

/// Botao circular so de icone (sino, localizar, fechar).
class VoltiIconButton extends StatelessWidget {
  const VoltiIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.variant = VoltiIconButtonVariant.surface,
    this.size = 44,
    this.dot = false,
    this.label,
    this.iconColor,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final VoltiIconButtonVariant variant;

  /// Diametro. Padrao 44 (alvo minimo).
  final double size;

  /// Bolinha laranja de notificacao.
  final bool dot;
  final String? label;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (bg, fg, sh) = switch (variant) {
      VoltiIconButtonVariant.surface => (scheme.surface, scheme.onSurface, VoltiShadows.shadow1),
      VoltiIconButtonVariant.ghost => (Colors.transparent, scheme.onSurface, const <BoxShadow>[]),
      VoltiIconButtonVariant.soft => (scheme.surfaceContainerHighest, scheme.onSurface, const <BoxShadow>[]),
      VoltiIconButtonVariant.brand => (VoltiColors.brand, VoltiColors.onBrand, VoltiShadows.shadowBrand),
      VoltiIconButtonVariant.dark => (VoltiColors.surfaceInverse, VoltiColors.white, const <BoxShadow>[]),
    };
    return VoltiPressable(
      onTap: onPressed,
      scale: VoltiMotion.iconPressScale,
      semanticLabel: label,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: bg, shape: BoxShape.circle, boxShadow: sh),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, size: (size * .46).roundToDouble(), color: iconColor ?? fg),
            if (dot)
              Positioned(
                top: size * .24,
                right: size * .26,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: VoltiColors.warning,
                    shape: BoxShape.circle,
                    border: Border.all(color: scheme.surface, width: 1.5),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
