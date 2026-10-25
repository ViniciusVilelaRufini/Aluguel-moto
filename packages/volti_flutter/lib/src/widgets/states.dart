import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/palette.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';
import 'buttons.dart';
import 'haptics.dart';
import 'motion.dart';

/// Estado vazio (evolucao E-06): disco tonal com icone (ou [illustration],
/// slot pronto para a arte de personagem), titulo, texto e acao opcional.
/// Entra com pop + fade-up; reduced motion mostra direto.
class VoltiEmptyState extends StatelessWidget {
  const VoltiEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.actionIcon,
    this.onAction,
    this.illustration,
    this.compact = false,
  });

  final IconData icon;
  final String title;
  final String? message;
  final String? actionLabel;
  final IconData? actionIcon;
  final VoidCallback? onAction;

  /// Substitui o disco com icone (ex.: ilustracao 160 px de altura).
  final Widget? illustration;

  /// Versao para cartao flutuante (mapa): disco menor, sem centralizar na tela.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final disc = compact ? 48.0 : 72.0;
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        VoltiEnter.pop(
          child: illustration ??
              Container(
                width: disc,
                height: disc,
                decoration: BoxDecoration(color: VoltiPalette.of(context).brandSoft, shape: BoxShape.circle),
                child: Icon(icon, size: disc * .44, color: VoltiPalette.of(context).onBrandSoft),
              ),
        ),
        SizedBox(height: compact ? VoltiSpacing.s10 : VoltiSpacing.s16),
        VoltiFadeUp(
          delay: const Duration(milliseconds: 80),
          child: Semantics(
            header: true,
            child: Text(title, textAlign: TextAlign.center, style: compact ? VoltiTypography.bodyStrong : VoltiTypography.heading),
          ),
        ),
        if (message != null) ...[
          const SizedBox(height: VoltiSpacing.s6),
          VoltiFadeUp(
            delay: const Duration(milliseconds: 125),
            child: Text(
              message!,
              textAlign: TextAlign.center,
              style: VoltiTypography.body.copyWith(color: scheme.onSurfaceVariant),
            ),
          ),
        ],
        if (actionLabel != null) ...[
          SizedBox(height: compact ? VoltiSpacing.s12 : VoltiSpacing.s20),
          VoltiFadeUp(
            delay: const Duration(milliseconds: 170),
            child: VoltiButton(
              label: actionLabel!,
              icon: actionIcon,
              variant: VoltiButtonVariant.secondary,
              onPressed: onAction,
            ),
          ),
        ],
      ],
    );
    if (compact) return content;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 360), child: content),
      ),
    );
  }
}

enum VoltiStatusTone { info, warning, danger, offline }

/// Faixa de status que entra e sai com animacao de tamanho + fade
/// (evolucao E-08: zona, sem conexao). Com [visible] falso ocupa 0 px. Trocar
/// [message] com a faixa visivel faz cross-fade, sem salto. E uma live region:
/// leitores de tela anunciam a mudanca. Reduced motion: aparece/some seco.
class VoltiStatusBanner extends StatelessWidget {
  const VoltiStatusBanner({
    super.key,
    required this.visible,
    required this.message,
    this.title,
    this.icon,
    this.tone = VoltiStatusTone.warning,
    this.padding = const EdgeInsets.only(top: VoltiSpacing.s10),
  });

  final bool visible;
  final String message;
  final String? title;
  final IconData? icon;
  final VoltiStatusTone tone;

  /// Espaco externo quando visivel (some junto com a faixa).
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final d = VoltiMotion.scaled(context, VoltiMotion.durSlow);
    final p = VoltiPalette.of(context);
    final (bg, fg) = switch (tone) {
      VoltiStatusTone.info => (p.infoSoft, p.infoInk),
      VoltiStatusTone.warning => (p.warningSoft, p.warningInkStrong),
      VoltiStatusTone.danger => (p.dangerSoft, p.dangerInkStrong),
      VoltiStatusTone.offline => (p.pill, Colors.white),
    };
    final body = Padding(
      key: ValueKey('$tone|$title|$message'),
      padding: padding,
      child: Semantics(
        liveRegion: true,
        container: true,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(VoltiSpacing.s12),
          decoration: BoxDecoration(color: bg, borderRadius: VoltiRadii.rMd, boxShadow: VoltiShadows.shadow1),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (icon != null) ...[Icon(icon, size: 20, color: fg), const SizedBox(width: VoltiSpacing.s10)],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (title != null) Text(title!, style: VoltiTypography.bodyStrong.copyWith(color: fg)),
                    Text(message, style: VoltiTypography.caption.copyWith(color: fg)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
    if (VoltiMotion.reduced(context)) {
      return visible ? body : const SizedBox(width: double.infinity);
    }
    return AnimatedSize(
      duration: d,
      curve: VoltiMotion.easeScreen,
      alignment: Alignment.topCenter,
      child: AnimatedSwitcher(
        duration: d,
        switchInCurve: VoltiMotion.easeOut,
        switchOutCurve: VoltiMotion.easeOut,
        transitionBuilder: (child, a) => FadeTransition(
          opacity: a,
          child: SlideTransition(
            position: Tween(begin: const Offset(0, -.15), end: Offset.zero).animate(a),
            child: child,
          ),
        ),
        layoutBuilder: (current, previous) => Stack(
          alignment: Alignment.topCenter,
          children: [...previous, ?current],
        ),
        child: visible ? body : const SizedBox(key: ValueKey('status-hidden'), width: double.infinity),
      ),
    );
  }
}

/// Puxar para atualizar com a cor da marca (evolucao E-07): indicador verde
/// sobre superficie, haptica leve ao disparar. Repassa [onRefresh].
class VoltiRefresh extends StatelessWidget {
  const VoltiRefresh({super.key, required this.onRefresh, required this.child, this.semanticsLabel});

  final Future<void> Function() onRefresh;
  final Widget child;
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: VoltiColors.brand,
      backgroundColor: Theme.of(context).colorScheme.surface,
      strokeWidth: 2.5,
      displacement: 28,
      semanticsLabel: semanticsLabel,
      onRefresh: () async {
        VoltiHaptics.tap();
        try {
          await onRefresh();
        } catch (_) {
          // A tela mostra o erro (ex.: AsyncView); aqui so encerra o indicador
          // sem deixar a excecao sem tratamento.
        }
      },
      child: child,
    );
  }
}
