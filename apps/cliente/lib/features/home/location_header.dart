import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/session.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../pick/pick_logic.dart';
import '../pickup/depot_labels.dart';
import 'depot_providers.dart';
import 'providers.dart';

/// Segunda linha da pilula "Sua localização". "Perto do Galpão Volti · Pinheiros"
/// so quando a posicao do cliente e conhecida **e** o galpao mostrado e o mais
/// perto pela `distanceM` da API; senao so "Galpão Volti · Pinheiros" (sem
/// afirmar proximidade). Sem galpao, "Perto de você". Nunca o nome de uma zona de
/// devolucao: ela nao e onde o cliente esta (spec do galpao, emulador 2026-10-22).
String locationPlaceLabel(AppLocalizations l, Depot? depot, {required bool located, Depot? nearest}) {
  if (depot == null) return l.nearYou;
  final isNearest = located && depot.distanceM != null && nearest?.id == depot.id;
  return isNearest ? l.nearDepot(depotTitle(l, depot)) : depotTitle(l, depot);
}

/// Cabecalho do mapa (design `LocationHeader`): avatar com as iniciais (abre a
/// conta), pilula "Sua localização · lugar" e sino. Usado no mapa e na reserva.
class LocationHeader extends ConsumerWidget {
  const LocationHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final session = ref.watch(sessionProvider).value;
    final unread = ref.watch(supportUnreadProvider).value ?? false;
    final located = ref.watch(userLocationProvider).value != null;
    final nearest = ref.watch(depotsProvider).value?.firstOrNull;
    final place = locationPlaceLabel(l, ref.watch(currentDepotProvider).value, located: located, nearest: nearest);
    return Row(children: [
      _Avatar(
        initials: initialsOf(session?.customer?.name),
        label: l.account,
        onTap: () => context.push('/account'),
      ),
      const SizedBox(width: VoltiSpacing.s12),
      // heightFactor 1: sem ele o Center ocupa a altura toda numa Stack e a barra desce ao meio da tela.
      Expanded(child: Center(heightFactor: 1, child: _LocationPill(label: l.yourLocation, place: place))),
      const SizedBox(width: VoltiSpacing.s12),
      VoltiIconButton(
        key: const Key('home-bell'),
        icon: LucideIcons.bell,
        dot: unread,
        label: unread ? l.notificationsUnread : l.notifications,
        onPressed: () => context.push('/account/support'),
      ),
    ]);
  }
}

/// Avatar com as iniciais (design `LocationHeader`): abre a conta.
class _Avatar extends StatelessWidget {
  const _Avatar({required this.initials, required this.label, required this.onTap});
  final String? initials;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return VoltiPressable(
      onTap: onTap,
      scale: VoltiMotion.iconPressScale,
      semanticLabel: label,
      child: Container(
        key: const Key('home-avatar'),
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: VoltiColors.sun300,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: VoltiShadows.shadow1,
        ),
        child: initials == null
            ? const Icon(LucideIcons.user, size: 20, color: VoltiColors.ink900)
            : Text(
                initials!,
                // Cabe no disco de 44 px em qualquer escala de texto (a semantica diz "Conta").
                textScaler: TextScaler.noScaling,
                style: const TextStyle(
                  fontFamily: VoltiTypography.fontSans,
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  height: 1,
                  color: VoltiColors.ink900,
                ),
              ),
      ),
    );
  }
}

/// Pilula central "Sua localizacao · lugar".
class _LocationPill extends StatelessWidget {
  const _LocationPill({required this.label, required this.place});
  final String label, place;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      container: true,
      label: '$label · $place',
      child: ExcludeSemantics(
        child: Container(
          key: const Key('home-location'),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: const BoxDecoration(color: VoltiColors.glassBg, borderRadius: VoltiRadii.rPill, boxShadow: VoltiShadows.shadow1),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(LucideIcons.navigation, size: 12, color: VoltiColors.brand),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant),
                ),
              ),
            ]),
            Text(
              place,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: VoltiTypography.bodyStrong.copyWith(color: VoltiColors.ink900),
            ),
          ]),
        ),
      ),
    );
  }
}
