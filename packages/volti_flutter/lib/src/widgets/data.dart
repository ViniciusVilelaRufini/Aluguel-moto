import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';

/// Indicador numerico (`StatTile` do design): rotulo com icone, valor grande
/// e variacao opcional. O leitor de tela le "rotulo, valor" de uma vez.
class StatTile extends StatelessWidget {
  const StatTile({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.delta,
    this.trendUp = true,
    this.onTap,
  });

  final String label;
  final String value;
  final IconData? icon;
  final String? delta;
  final bool trendUp;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final deltaColor = trendUp ? VoltiColors.successInk : VoltiColors.dangerInk;
    final tile = Container(
      padding: const EdgeInsets.all(VoltiSpacing.s16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: VoltiRadii.rLg,
        boxShadow: VoltiShadows.shadow1,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(children: [
            if (icon != null) ...[
              Icon(icon, size: 16, color: scheme.onSurfaceVariant),
              const SizedBox(width: 8),
            ],
            Expanded(
              child: Text(label, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
            ),
          ]),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              maxLines: 1,
              style: TextStyle(
                fontFamily: VoltiTypography.fontSans,
                fontWeight: VoltiTypography.fwBold,
                fontSize: 26,
                height: 1.1,
                letterSpacing: 26 * VoltiTypography.lsTight,
                color: scheme.onSurface,
              ),
            ),
          ),
          if (delta != null) ...[
            const SizedBox(height: 8),
            Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(trendUp ? LucideIcons.trendingUp : LucideIcons.trendingDown, size: 14, color: deltaColor),
              const SizedBox(width: 4),
              Text(delta!, style: VoltiTypography.caption.copyWith(color: deltaColor, fontWeight: VoltiTypography.fwSemibold)),
            ]),
          ],
        ],
      ),
    );
    // Um no so para o leitor de tela, com a acao de toque quando houver.
    return Semantics(
      container: true,
      button: onTap != null,
      label: delta == null ? '$label, $value' : '$label, $value, $delta',
      onTap: onTap,
      excludeSemantics: true,
      child: onTap == null
          ? tile
          : Material(
              color: Colors.transparent,
              borderRadius: VoltiRadii.rLg,
              child: InkWell(borderRadius: VoltiRadii.rLg, onTap: onTap, child: tile),
            ),
    );
  }
}

/// Grupo de linhas com overline em caixa alta e um cartao (Conta do design).
class VoltiListGroup extends StatelessWidget {
  const VoltiListGroup({super.key, required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 18, 4, 8),
          child: Semantics(
            header: true,
            child: Text(
              title.toUpperCase(),
              style: VoltiTypography.overline.copyWith(color: scheme.onSurfaceVariant),
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: VoltiRadii.rLg,
            boxShadow: VoltiShadows.shadow1,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: children,
          ),
        ),
      ],
    );
  }
}
