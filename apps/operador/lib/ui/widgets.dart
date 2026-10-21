import 'package:flutter/material.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Cabecalho escuro (ink-900) com cantos inferiores arredondados do app do operador.
class OperatorHeader extends StatelessWidget {
  const OperatorHeader({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: VoltiColors.ink900,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(
        VoltiSpacing.screenGutter,
        MediaQuery.paddingOf(context).top + VoltiSpacing.s16,
        VoltiSpacing.screenGutter,
        VoltiSpacing.s20,
      ),
      child: DefaultTextStyle.merge(
        style: const TextStyle(color: VoltiColors.white),
        child: child,
      ),
    );
  }
}

enum NoticeTone { success, warning, danger, info, neutral }

/// Faixa de aviso (modo servico ativo, moto fora do limite legal, aguardando sincronizacao).
class Notice extends StatelessWidget {
  const Notice({
    super.key,
    required this.tone,
    required this.icon,
    required this.title,
    this.body,
  });

  final NoticeTone tone;
  final IconData icon;
  final String title;
  final String? body;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      NoticeTone.success => (VoltiColors.successSoft, VoltiColors.successInk),
      NoticeTone.warning => (VoltiColors.warningSoft, VoltiColors.warningInk),
      NoticeTone.danger => (VoltiColors.dangerSoft, VoltiColors.dangerInk),
      NoticeTone.info => (VoltiColors.infoSoft, VoltiColors.infoInk),
      NoticeTone.neutral => (VoltiColors.surfaceSunken, VoltiColors.ink700),
    };
    return Container(
      padding: const EdgeInsets.all(VoltiSpacing.s14),
      decoration: BoxDecoration(color: bg, borderRadius: VoltiRadii.rMd),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: fg, size: 20),
          const SizedBox(width: VoltiSpacing.s10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: VoltiTypography.label.copyWith(color: fg)),
                if (body != null) ...[
                  const SizedBox(height: VoltiSpacing.s2),
                  Text(body!, style: VoltiTypography.caption.copyWith(color: fg)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Cartao branco padrao das telas.
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.child, this.padding = 14});

  final Widget child;
  final double padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLowest,
        borderRadius: VoltiRadii.rLg,
        boxShadow: VoltiShadows.shadow1,
      ),
      child: child,
    );
  }
}
