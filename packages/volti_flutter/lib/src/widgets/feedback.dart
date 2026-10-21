import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../tokens/colors.dart';
import '../tokens/shadows.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';

/// Corpo de bottom sheet: raio 28 no topo, grabber e sombra de sheet.
/// Use [VoltiBottomSheet.show] para abrir como modal.
class VoltiBottomSheet extends StatelessWidget {
  const VoltiBottomSheet({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(20, 12, 20, 28),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  static Future<T?> show<T>(
    BuildContext context, {
    required WidgetBuilder builder,
    bool isDismissible = true,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      isDismissible: isDismissible,
      backgroundColor: Colors.transparent,
      elevation: 0,
      barrierColor: VoltiColors.surfaceScrim,
      sheetAnimationStyle: const AnimationStyle(
        duration: VoltiMotion.durSlow,
        curve: VoltiMotion.easeOut,
      ),
      builder: (ctx) => VoltiBottomSheet(child: builder(ctx)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: VoltiRadii.sheetTop,
        boxShadow: VoltiShadows.shadowSheet,
      ),
      child: SafeArea(
        top: false,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 14),
            decoration: BoxDecoration(
                color: scheme.outlineVariant, borderRadius: BorderRadius.circular(2)),
          ),
          Flexible(child: child),
        ]),
      ),
    );
  }
}

/// Modal central com scrim. [actions] e uma pilha de [VoltiButton].
class VoltiDialog extends StatelessWidget {
  const VoltiDialog({
    super.key,
    this.title,
    this.message,
    this.icon,
    this.actions = const [],
  });

  final String? title;
  final Widget? message;
  final Widget? icon;
  final List<Widget> actions;

  /// Abre o dialogo. Retorna o valor passado a `Navigator.pop`.
  static Future<T?> show<T>(
    BuildContext context, {
    String? title,
    Widget? message,
    Widget? icon,
    required List<Widget> actions,
    bool barrierDismissible = true,
  }) {
    return showDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      barrierColor: VoltiColors.surfaceScrim,
      builder: (_) => VoltiDialog(title: title, message: message, icon: icon, actions: actions),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 340),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: VoltiRadii.rXl,
            boxShadow: VoltiShadows.shadow2,
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            if (icon != null) ...[icon!, const SizedBox(height: 12)],
            if (title != null)
              Text(title!,
                  textAlign: TextAlign.center,
                  style: VoltiTypography.heading.copyWith(color: scheme.onSurface)),
            if (message != null) ...[
              const SizedBox(height: 12),
              DefaultTextStyle(
                textAlign: TextAlign.center,
                style: VoltiTypography.body.copyWith(color: scheme.onSurfaceVariant),
                child: message!,
              ),
            ],
            if (actions.isNotEmpty) ...[
              const SizedBox(height: 20),
              for (var i = 0; i < actions.length; i++) ...[
                if (i > 0) const SizedBox(height: 8),
                actions[i],
              ],
            ],
          ]),
        ),
      ),
    );
  }
}

enum VoltiToastTone { success, info, warning, danger }

/// Barra de mensagem escura transitoria. Use [VoltiToast.show] para exibir.
class VoltiToast extends StatelessWidget {
  const VoltiToast({
    super.key,
    required this.message,
    this.tone = VoltiToastTone.success,
    this.actionLabel,
    this.onAction,
  });

  final String message;
  final VoltiToastTone tone;
  final String? actionLabel;
  final VoidCallback? onAction;

  static void show(
    BuildContext context,
    String message, {
    VoltiToastTone tone = VoltiToastTone.success,
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(seconds: 4),
  }) {
    final m = ScaffoldMessenger.of(context);
    m.hideCurrentSnackBar();
    m.showSnackBar(SnackBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      padding: EdgeInsets.zero,
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 0, VoltiSpacing.screenGutter, 16),
      duration: duration,
      content: VoltiToast(message: message, tone: tone, actionLabel: actionLabel, onAction: onAction),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (tone) {
      VoltiToastTone.success => (LucideIcons.circleCheck, VoltiColors.green400),
      VoltiToastTone.info => (LucideIcons.info, VoltiColors.blue500),
      VoltiToastTone.warning => (LucideIcons.circleAlert, VoltiColors.orange500),
      VoltiToastTone.danger => (LucideIcons.circleAlert, VoltiColors.coral400),
    };
    return Container(
      constraints: const BoxConstraints(minHeight: 48),
      padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
      decoration: const BoxDecoration(
        color: VoltiColors.surfaceInverse,
        borderRadius: VoltiRadii.rMd,
        boxShadow: VoltiShadows.shadow2,
      ),
      child: Row(children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 10),
        Expanded(
          child: Text(message,
              style: VoltiTypography.label.copyWith(color: Colors.white)),
        ),
        if (actionLabel != null)
          GestureDetector(
            onTap: onAction,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Text(actionLabel!,
                  style: VoltiTypography.label.copyWith(color: VoltiColors.green300)),
            ),
          ),
      ]),
    );
  }
}

/// Barra de progresso segmentada para fluxos de varias etapas.
class ProgressSteps extends StatelessWidget {
  const ProgressSteps({
    super.key,
    this.total = 4,
    this.current = 0,
    this.label,
  });

  final int total;

  /// Indice (base 0) da etapa atual.
  final int current;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      Row(children: [
        for (var i = 0; i < total; i++) ...[
          if (i > 0) const SizedBox(width: 6),
          Expanded(
            child: AnimatedContainer(
              key: Key('progress-step-$i'),
              duration: VoltiMotion.durBase,
              height: 4,
              decoration: BoxDecoration(
                color: i <= current ? VoltiColors.brand : scheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        ],
      ]),
      if (label != null) ...[
        const SizedBox(height: 8),
        Text(label!, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
      ],
    ]);
  }
}
