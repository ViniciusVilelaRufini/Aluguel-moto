import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';
import 'motion.dart';
import 'pressable.dart';

enum VoltiButtonVariant { primary, secondary, ghost, dark, danger }

enum VoltiButtonSize { sm, md, lg }

/// Botao pill. Primario = verde de acao ([VoltiColors.brandAction]) com glow.
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
    this.loading = false,
    this.shine = false,
    this.semanticLabel,
  });

  /// Rotulo para leitor de tela mais completo que [label] (ex.: com a serie).
  final String? semanticLabel;

  final String label;

  /// `null` desabilita o botao.
  final VoidCallback? onPressed;
  final VoltiButtonVariant variant;
  final VoltiButtonSize size;
  final IconData? icon;
  final IconData? iconRight;
  final bool fullWidth;

  /// Spinner no lugar do icone; o botao fica inerte.
  final bool loading;

  /// Brilho periodico; so no CTA principal da tela.
  final bool shine;

  static (double h, double px, double fs, double ic) _dims(VoltiButtonSize s) =>
      switch (s) {
        VoltiButtonSize.sm => (36, 16, 14, 16),
        VoltiButtonSize.md => (48, 20, 15, 20),
        VoltiButtonSize.lg => (56, 24, 16, 22),
      };

  static TextStyle _labelStyle(double fs, Color color) => TextStyle(
    fontFamily: VoltiTypography.fontSans,
    fontWeight: VoltiTypography.fwSemibold,
    fontSize: fs,
    height: 1,
    color: color,
  );

  /// Largura minima para o rotulo caber inteiro em uma linha (com o texto
  /// na escala atual do aparelho).
  double minWidth(BuildContext context) {
    final (_, px, fs, ic) = _dims(size);
    final tp = TextPainter(
      text: TextSpan(text: label, style: _labelStyle(fs, Colors.black)),
      textDirection: Directionality.maybeOf(context) ?? TextDirection.ltr,
      textScaler: MediaQuery.textScalerOf(context),
      maxLines: 1,
    )..layout();
    final icons = (icon != null || loading ? ic + 10 : 0) + (iconRight != null ? ic + 10 : 0);
    final w = tp.width + px * 2 + 3 + icons;
    tp.dispose();
    return w.ceilToDouble() + 1;
  }

  @override
  Widget build(BuildContext context) {
    final (h, px, fs, ic) = _dims(size);
    final scheme = Theme.of(context).colorScheme;
    final (bg, fg, bd, sh) = switch (variant) {
      // Fundo no tom de acao (E-12): texto branco >= 4,5:1.
      VoltiButtonVariant.primary => (
        VoltiColors.brandAction,
        VoltiColors.onBrandAction,
        Colors.transparent,
        VoltiShadows.shadowBrand,
      ),
      // Extensao do E-12: texto e contorno no tom de acao (>= 4,5:1 sobre branco).
      VoltiButtonVariant.secondary => (
        scheme.surface,
        VoltiColors.brandAction,
        VoltiColors.brandAction,
        const <BoxShadow>[],
      ),
      VoltiButtonVariant.ghost => (
        Colors.transparent,
        scheme.onSurface,
        Colors.transparent,
        const <BoxShadow>[],
      ),
      VoltiButtonVariant.dark => (
        VoltiColors.surfaceInverse,
        VoltiColors.textOnInverse,
        Colors.transparent,
        VoltiShadows.shadow2,
      ),
      VoltiButtonVariant.danger => (
        VoltiColors.danger,
        VoltiColors.white,
        Colors.transparent,
        VoltiShadows.shadowCoral,
      ),
    };
    final disabled = onPressed == null;
    final off = disabled || loading;
    final ripple = switch (variant) {
      VoltiButtonVariant.primary => const Color(0x61FFFFFF),
      VoltiButtonVariant.secondary => const Color(0x3334C25C),
      VoltiButtonVariant.ghost => const Color(0x1415181A),
      VoltiButtonVariant.dark => const Color(0x38FFFFFF),
      VoltiButtonVariant.danger => const Color(0x59FFFFFF),
    };
    final content = Row(
      mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading) ...[
          _Spinner(size: ic, color: fg),
          const SizedBox(width: 10),
        ] else if (icon != null) ...[
          Icon(icon, size: ic, color: fg),
          const SizedBox(width: 10),
        ],
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: _labelStyle(fs, fg),
          ),
        ),
        if (iconRight != null && !loading) ...[
          const SizedBox(width: 10),
          Icon(iconRight, size: ic, color: fg),
        ],
      ],
    );
    final body = Opacity(
      opacity: disabled ? .4 : 1,
      child: Container(
        height: h,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: VoltiRadii.rPill,
          border: Border.all(color: bd, width: 1.5),
          boxShadow: disabled ? null : sh,
        ),
        child: VoltiRipple(
          color: off ? null : ripple,
          borderRadius: VoltiRadii.rPill,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: px),
            child: Center(widthFactor: fullWidth ? null : 1, child: content),
          ),
        ),
      ),
    );
    final shown = shine && !off ? VoltiShine(child: body) : body;
    return VoltiPressable(
      onTap: off ? null : onPressed,
      semanticLabel: semanticLabel ?? label,
      child: semanticLabel == null
          ? (fullWidth ? SizedBox(width: double.infinity, child: shown) : shown)
          : ExcludeSemantics(
              child: fullWidth ? SizedBox(width: double.infinity, child: shown) : shown),
    );
  }
}

/// Dois botoes lado a lado na proporcao do design (`flex` 1 : 1,3 por
/// padrao). Se algum rotulo nao couber inteiro, divide pela largura que cada
/// um precisa; se nem assim couber (texto grande), empilha os dois.
class VoltiButtonPair extends StatelessWidget {
  const VoltiButtonPair({
    super.key,
    required this.first,
    required this.second,
    this.firstFlex = 10,
    this.secondFlex = 13,
    this.gap = 10,
  });

  final VoltiButton first, second;
  final int firstFlex, secondFlex;
  final double gap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) {
        final avail = box.maxWidth - gap;
        final n1 = first.minWidth(context), n2 = second.minWidth(context);
        final w1 = avail * firstFlex / (firstFlex + secondFlex);
        if (n1 <= w1 && n2 <= avail - w1) {
          return Row(
            children: [
              Expanded(flex: firstFlex, child: first),
              SizedBox(width: gap),
              Expanded(flex: secondFlex, child: second),
            ],
          );
        }
        if (n1 + n2 <= avail) {
          // Sobra dividida igualmente; cada um com o minimo dele.
          final extra = (avail - n1 - n2) / 2;
          return Row(
            children: [
              SizedBox(width: n1 + extra, child: first),
              SizedBox(width: gap),
              Expanded(child: second),
            ],
          );
        }
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [first, SizedBox(height: gap), second],
        );
      },
    );
  }
}

class _Spinner extends StatefulWidget {
  const _Spinner({required this.size, required this.color});
  final double size;
  final Color color;
  @override
  State<_Spinner> createState() => _SpinnerState();
}

class _SpinnerState extends State<_Spinner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  );
  bool _init = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_init) return;
    _init = true;
    if (!VoltiMotion.reduced(context)) _c.repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => RotationTransition(
    key: const Key('volti-button-spinner'),
    turns: _c,
    child: Icon(
      LucideIcons.loaderCircle,
      size: widget.size,
      color: widget.color,
    ),
  );
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
      VoltiIconButtonVariant.surface => (
        scheme.surface,
        scheme.onSurface,
        VoltiShadows.shadow1,
      ),
      VoltiIconButtonVariant.ghost => (
        Colors.transparent,
        scheme.onSurface,
        const <BoxShadow>[],
      ),
      VoltiIconButtonVariant.soft => (
        scheme.surfaceContainerHighest,
        scheme.onSurface,
        const <BoxShadow>[],
      ),
      VoltiIconButtonVariant.brand => (
        VoltiColors.brandAction,
        VoltiColors.onBrandAction,
        VoltiShadows.shadowBrand,
      ),
      VoltiIconButtonVariant.dark => (
        VoltiColors.surfaceInverse,
        VoltiColors.white,
        const <BoxShadow>[],
      ),
    };
    return VoltiPressable(
      onTap: onPressed,
      scale: VoltiMotion.iconPressScale,
      semanticLabel: label,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bg,
          shape: BoxShape.circle,
          boxShadow: sh,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              icon,
              size: (size * .46).roundToDouble(),
              color: iconColor ?? fg,
            ),
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
