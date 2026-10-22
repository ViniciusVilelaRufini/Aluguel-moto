import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';
import 'haptics.dart';

/// Uma opcao do [VoltiSegmentedControl].
class VoltiSegment<T> {
  const VoltiSegment({required this.value, required this.label});

  final T value;
  final String label;
}

/// Abas/segmentos para 2 a 4 visoes mutuamente exclusivas (`SegmentedControl`
/// do VDS): trilho `surface-sunken` em pilula, segmento ativo branco com
/// `shadow-1`. Altura total de 44 px (alvo de toque). Reduced motion troca
/// sem animacao.
class VoltiSegmentedControl<T> extends StatelessWidget {
  const VoltiSegmentedControl({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
  });

  final List<VoltiSegment<T>> options;
  final T value;
  final ValueChanged<T>? onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final duration = VoltiMotion.scaled(context, VoltiMotion.durBase);
    return Container(
      padding: const EdgeInsets.all(VoltiSpacing.s4),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: VoltiRadii.rPill,
      ),
      child: Row(
        children: [
          for (var i = 0; i < options.length; i++) ...[
            if (i > 0) const SizedBox(width: VoltiSpacing.s4),
            Expanded(child: _segment(context, options[i], scheme, dark, duration)),
          ],
        ],
      ),
    );
  }

  Widget _segment(BuildContext context, VoltiSegment<T> o, ColorScheme scheme, bool dark,
      Duration duration) {
    final on = o.value == value;
    final fg = on ? scheme.onSurface : scheme.onSurfaceVariant;
    final VoidCallback? select = onChanged == null || on
        ? null
        : () {
            VoltiHaptics.selection();
            onChanged!(o.value);
          };
    // O toque fica no no de Semantics (excludeSemantics esconde o do
    // GestureDetector): TalkBack/VoiceOver conseguem ativar o segmento.
    return Semantics(
      button: true,
      selected: on,
      enabled: onChanged != null,
      inMutuallyExclusiveGroup: true,
      label: o.label,
      excludeSemantics: true,
      onTap: select,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: select,
        child: AnimatedContainer(
          duration: duration,
          curve: VoltiMotion.easeOut,
          height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: on ? (dark ? VoltiColors.ink800 : VoltiColors.surfaceCard) : Colors.transparent,
            borderRadius: VoltiRadii.rPill,
            boxShadow: on ? VoltiShadows.shadow1 : const [],
          ),
          child: Text(
            o.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontFamily: VoltiTypography.fontSans,
              fontWeight: VoltiTypography.fwSemibold,
              fontSize: 13,
              height: 1,
              color: fg,
            ),
          ),
        ),
      ),
    );
  }
}
