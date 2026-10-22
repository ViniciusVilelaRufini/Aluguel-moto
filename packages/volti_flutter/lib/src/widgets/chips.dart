import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';
import 'pressable.dart';

/// Chip pill de acao rapida/filtro (`Chip` do design): 36 px, press .94 com
/// mola, cores animadas ao selecionar.
class VoltiChip extends StatelessWidget {
  const VoltiChip({
    super.key,
    required this.label,
    this.icon,
    this.selected = false,
    this.onTap,
    this.elevated = false,
  });

  final String label;
  final IconData? icon;
  final bool selected;
  final VoidCallback? onTap;

  /// Sombra leve para chips sobre o mapa.
  final bool elevated;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fg = selected ? VoltiColors.successInk : scheme.onSurface;
    return Semantics(
      selected: selected,
      child: VoltiPressable(
        onTap: onTap,
        scale: VoltiMotion.chipPressScale,
        semanticLabel: label,
        // Alvo de toque >= 44 px (E-13): 4 px invisiveis acima e abaixo do
        // visual de 36 px; a semantica cobre a area inteira.
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: (VoltiSpacing.hitMin - 36) / 2),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minWidth: VoltiSpacing.hitMin),
            child: AnimatedContainer(
          duration: VoltiMotion.scaled(context, VoltiMotion.durBase),
          // Altura minima 36 (design) que cresce com a escala de texto.
          constraints: const BoxConstraints(minHeight: 36),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: selected ? VoltiColors.brandSoft : scheme.surface,
            borderRadius: VoltiRadii.rPill,
            border: Border.all(
              color: selected ? VoltiColors.brand : (elevated ? Colors.transparent : scheme.outlineVariant),
            ),
            boxShadow: elevated ? VoltiShadows.shadow1 : null,
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            if (icon != null) ...[Icon(icon, size: 16, color: fg), const SizedBox(width: 6)],
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: VoltiTypography.fontSans,
                  fontWeight: VoltiTypography.fwMedium,
                  fontSize: 13,
                  height: 1,
                  color: fg,
                ),
              ),
            ),
          ]),
        ),
          ),
        ),
      ),
    );
  }
}

enum PassCardTone { brand, sun, sky, coral }

/// Cartao de promocao/passe sobre o mapa: vidro branco com blur, icone em
/// bloco tonal e press .96 com mola.
class PassCard extends StatelessWidget {
  const PassCard({
    super.key,
    required this.title,
    this.subtitle,
    this.icon = Icons.confirmation_number_outlined,
    this.tone = PassCardTone.sun,
    this.onTap,
  });

  final String title;
  final String? subtitle;
  final IconData icon;
  final PassCardTone tone;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (bg, fg) = switch (tone) {
      PassCardTone.brand => (VoltiColors.green100, VoltiColors.green700),
      PassCardTone.sun => (const Color(0xFFFFF3CC), VoltiColors.orange600),
      PassCardTone.sky => (VoltiColors.sky100, VoltiColors.blue600),
      PassCardTone.coral => (VoltiColors.coral50, VoltiColors.coral600),
    };
    return VoltiPressable(
      onTap: onTap,
      scale: .96,
      semanticLabel: subtitle == null ? title : '$title. $subtitle',
      child: DecoratedBox(
        decoration: const BoxDecoration(borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
        child: ClipRRect(
          borderRadius: VoltiRadii.rLg,
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: VoltiShadows.glassBlur, sigmaY: VoltiShadows.glassBlur),
            child: Container(
              padding: const EdgeInsets.fromLTRB(8, 8, 18, 8),
              color: VoltiColors.glassBg,
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
                  child: Icon(icon, size: 22, color: fg),
                ),
                const SizedBox(width: 12),
                Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, maxLines: 1, style: VoltiTypography.label.copyWith(color: scheme.onSurface)),
                  if (subtitle != null)
                    Text(subtitle!, maxLines: 1, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                ]),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
