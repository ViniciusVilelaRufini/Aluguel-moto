import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/location.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/l10n/app_localizations.dart';

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

/// Faixa de aviso (`Alert` do VDS): modo servico ativo, moto fora do limite
/// legal, aguardando sincronizacao.
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
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.s14, vertical: VoltiSpacing.s12),
        decoration: BoxDecoration(color: bg, borderRadius: VoltiRadii.rMd),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Icon(icon, color: fg, size: 20),
            ),
            const SizedBox(width: VoltiSpacing.s12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: VoltiTypography.label.copyWith(color: fg)),
                  if (body != null) ...[
                    const SizedBox(height: VoltiSpacing.s2),
                    Text(body!, style: VoltiTypography.caption.copyWith(color: VoltiColors.ink700)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Cartao branco padrao das telas (`Card` do VDS).
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.child, this.padding = 14, this.onTap});

  final Widget child;
  final double padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      width: double.infinity,
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLowest,
        borderRadius: VoltiRadii.rLg,
        boxShadow: VoltiShadows.shadow1,
      ),
      child: child,
    );
    if (onTap == null) return card;
    return VoltiPressable(onTap: onTap, scale: .99, child: card);
  }
}

/// Barra do topo das telas internas (checklist, troca, pendencias): botao
/// voltar (44 px) e titulo, no lugar da AppBar Material.
class OperatorTopBar extends StatelessWidget {
  const OperatorTopBar({super.key, required this.title, this.trailing, this.onBack});

  final String title;
  final Widget? trailing;

  /// Padrao: `Navigator.maybePop`.
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(VoltiSpacing.s12, MediaQuery.paddingOf(context).top + 8,
          VoltiSpacing.screenGutter, VoltiSpacing.s8),
      child: Row(
        children: [
          VoltiIconButton(
            key: const Key('top-bar-back'),
            icon: LucideIcons.arrowLeft,
            label: t.back,
            onPressed: onBack ?? () => Navigator.of(context).maybePop(),
          ),
          const SizedBox(width: VoltiSpacing.s12),
          Expanded(
            child: Semantics(
              header: true,
              child: Text(title, style: VoltiTypography.heading, maxLines: 2),
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// Faixa global "Sem conexao" (some sozinha quando a rede volta).
class ConnectivityBanner extends ConsumerWidget {
  const ConnectivityBanner(
      {super.key, this.padding = const EdgeInsets.only(top: VoltiSpacing.s10)});

  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final online = ref.watch(onlineProvider).value ?? true;
    return VoltiStatusBanner(
      key: const Key('offline-banner'),
      visible: !online,
      icon: LucideIcons.wifiOff,
      title: t.offlineTitle,
      message: t.offlineBody,
      tone: VoltiStatusTone.offline,
      padding: padding,
    );
  }
}

/// Marca de item do checklist no estilo do `Checkbox` do VDS (22 px, raio 7):
/// ok = verde com check; com problema = coral com x; vazio = so a borda.
class ChecklistMark extends StatelessWidget {
  const ChecklistMark({super.key, required this.value});

  final bool? value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (bg, border, icon) = switch (value) {
      true => (VoltiColors.brand, VoltiColors.brand, LucideIcons.check),
      false => (VoltiColors.danger, VoltiColors.danger, LucideIcons.x),
      null => (scheme.surfaceContainerLowest, scheme.outline, null),
    };
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(7),
        border: Border.all(color: border, width: 1.5),
      ),
      child: icon == null ? null : Icon(icon, size: 14, color: VoltiColors.white),
    );
  }
}

/// Miniaturas das fotos anexadas, cada uma com botao de remover (alvo de 44 px).
class PhotoThumbnails extends StatelessWidget {
  const PhotoThumbnails({super.key, required this.paths, required this.onRemove});

  final List<String> paths;
  final void Function(int index) onRemove;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Wrap(
      spacing: VoltiSpacing.s8,
      runSpacing: VoltiSpacing.s8,
      children: [
        for (var i = 0; i < paths.length; i++)
          SizedBox(
            key: Key('photo-thumb-$i'),
            width: 88,
            height: 88,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned.fill(
                  child: Semantics(
                    image: true,
                    label: t.photoThumb(i + 1),
                    child: ClipRRect(
                      borderRadius: VoltiRadii.rMd,
                      child: Image.file(
                        File(paths[i]),
                        fit: BoxFit.cover,
                        cacheWidth: 264,
                        errorBuilder: (_, _, _) => Container(
                          color: VoltiColors.surfaceSunken,
                          alignment: Alignment.center,
                          child: const Icon(LucideIcons.image, color: VoltiColors.ink500),
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 0,
                  right: 0,
                  child: Semantics(
                    button: true,
                    label: t.photoRemove(i + 1),
                    excludeSemantics: true,
                    child: GestureDetector(
                      key: Key('photo-remove-$i'),
                      behavior: HitTestBehavior.opaque,
                      onTap: () => onRemove(i),
                      child: SizedBox(
                        width: 44,
                        height: 44,
                        child: Center(
                          child: Container(
                            width: 26,
                            height: 26,
                            decoration: const BoxDecoration(
                              color: VoltiColors.ink900,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(LucideIcons.x, size: 14, color: VoltiColors.white),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Explica o uso da localizacao antes de pedir a permissao (rationale).
class LocationRationale extends ConsumerStatefulWidget {
  const LocationRationale({super.key});

  @override
  ConsumerState<LocationRationale> createState() => _LocationRationaleState();
}

class _LocationRationaleState extends ConsumerState<LocationRationale> {
  bool _dismissed = false;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final loc = watchLocationWhenVisible(ref, context);
    if (loc == null || _dismissed || !loc.checked || loc.access == LocationAccess.granted) {
      return const SizedBox.shrink();
    }
    final (body, action) = switch (loc.access) {
      LocationAccess.deniedForever => (t.locationDeniedBody, t.locationOpenSettings),
      LocationAccess.serviceDisabled => (t.locationServiceOff, t.locationOpenSettings),
      _ => (t.locationRationaleBody, t.locationAllow),
    };
    return Padding(
      key: const Key('location-rationale'),
      padding: const EdgeInsets.only(top: VoltiSpacing.s10),
      child: Container(
        padding: const EdgeInsets.all(VoltiSpacing.s14),
        decoration: const BoxDecoration(color: VoltiColors.infoSoft, borderRadius: VoltiRadii.rMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(LucideIcons.locateFixed, color: VoltiColors.infoInk, size: 20),
                const SizedBox(width: VoltiSpacing.s12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t.locationRationaleTitle,
                          style: VoltiTypography.label.copyWith(color: VoltiColors.infoInk)),
                      const SizedBox(height: VoltiSpacing.s2),
                      Text(body,
                          style: VoltiTypography.caption.copyWith(color: VoltiColors.ink700)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: VoltiSpacing.s10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                VoltiButton(
                  label: t.notNow,
                  variant: VoltiButtonVariant.ghost,
                  onPressed: () => setState(() => _dismissed = true),
                ),
                const SizedBox(width: VoltiSpacing.s8),
                VoltiButton(
                  key: const Key('location-allow'),
                  label: action,
                  onPressed: () => ref.read(locationProvider.notifier).requestAccess(),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
