import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/session.dart';
import '../../core/widgets.dart';
import '../home/depot_providers.dart';
import '../home/providers.dart';
import 'swap_logic.dart';

/// Abre o leitor do QR da estacao ([stationId]: a estacao perto, so dica) e,
/// quando ele devolve a troca criada (ou a ja aberta), a tela de progresso.
/// O futuro so termina quando o cliente sai do fluxo inteiro, entao quem chama
/// pode travar toques repetidos ate la (com `pushReplacement` o futuro do
/// leitor nunca terminava).
Future<void> openSwapScan(BuildContext context, {String? stationId}) async {
  final swap = await context.push<StationSwap>(
    Uri(path: '/station-swap/scan', queryParameters: stationId == null ? null : {'station': stationId}).toString(),
  );
  if (swap != null && context.mounted) await openSwapProgress(context, swap);
}

/// Abre (ou reabre) a tela de progresso da troca.
Future<void> openSwapProgress(BuildContext context, StationSwap swap) =>
    context.push('/station-swap/${swap.stationId}/${swap.id}', extra: swap);

/// Estacao a ate 50 m do celular na home (aluguel em andamento + consentimento).
/// A posicao e a mesma do mapa da home (`userLocationProvider`, consulta unica,
/// sem rastreio fora da corrida); na corrida a tela usa o fluxo de localizacao
/// dela ([swapPromptStation]).
final homeNearbySwapStationProvider = Provider.autoDispose<SwapStation?>((ref) {
  final rental = ref.watch(currentRentalProvider).value;
  if (!rentalAllowsSwap(rental)) return null;
  return swapPromptStation(
    rental: rental,
    locationConsent: ref.watch(sessionProvider.select((s) => s.value?.locationConsent ?? false)),
    phone: ref.watch(userLocationProvider).value,
    stations: ref.watch(swapStationsProvider).value ?? const [],
  );
});

/// Troca na estacao em andamento no aluguel atual (`currentStationSwap`).
final homeOpenSwapProvider = Provider.autoDispose<StationSwap?>((ref) {
  final s = ref.watch(currentRentalStateProvider).value?.stationSwap;
  return isOpenSwap(s) ? s : null;
});

/// Cartao `Voce esta na <estacao> · Trocar bateria` (home e corrida).
class SwapNearbyCard extends StatelessWidget {
  const SwapNearbyCard({super.key = const Key('swap-nearby-card'), required this.station, required this.onSwap});
  final SwapStation station;
  final VoidCallback onSwap;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    return VoltiEnter(
      duration: VoltiMotion.durScreen,
      curve: VoltiMotion.easeScreen,
      fromOffset: const Offset(0, 12),
      child: Container(
        padding: const EdgeInsets.fromLTRB(VoltiSpacing.s12, VoltiSpacing.s10, VoltiSpacing.s8, VoltiSpacing.s10),
        decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow2),
        child: Row(
          children: [
            Container(
              width: VoltiSpacing.s40,
              height: VoltiSpacing.s40,
              decoration: BoxDecoration(color: context.palette.infoSoft, borderRadius: VoltiRadii.rMd),
              child: Icon(LucideIcons.batteryCharging, color: context.palette.infoInk, size: VoltiSpacing.s20),
            ),
            const SizedBox(width: VoltiSpacing.s10),
            Expanded(
              child: Semantics(
                liveRegion: true,
                child: Text(l.swapNearbyTitle(station.name), style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
              ),
            ),
            const SizedBox(width: VoltiSpacing.s8),
            Flexible(
              child: VoltiButton(
                key: const Key('swap-nearby-action'),
                label: l.swapNearbyAction,
                size: VoltiButtonSize.sm,
                wrap: true,
                onPressed: onSwap,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Cartao "Troca de bateria em andamento · Continuar" (retomar a tela da troca).
class SwapResumeCard extends StatelessWidget {
  const SwapResumeCard({super.key = const Key('swap-resume-card'), required this.onResume});
  final VoidCallback onResume;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return VoltiPressable(
      semanticLabel: '${l.swapResumeTitle}. ${l.swapResumeText}',
      onTap: onResume,
      child: Container(
        padding: const EdgeInsets.fromLTRB(VoltiSpacing.s12, VoltiSpacing.s10, VoltiSpacing.s8, VoltiSpacing.s10),
        decoration: BoxDecoration(color: context.palette.pill, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow2),
        child: Row(
          children: [
            const Icon(LucideIcons.batteryCharging, color: VoltiColors.green400, size: 20),
            const SizedBox(width: VoltiSpacing.s10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l.swapResumeTitle, style: VoltiTypography.bodyStrong.copyWith(color: VoltiColors.white)),
                  Text(l.swapResumeText, style: VoltiTypography.caption.copyWith(color: VoltiColors.ink300)),
                ],
              ),
            ),
            Flexible(
              child: TextButton(
                key: const Key('swap-resume-action'),
                onPressed: onResume,
                style: TextButton.styleFrom(minimumSize: const Size(48, VoltiSpacing.hitMin)),
                child: Text(
                  l.swapResumeAction,
                  textAlign: TextAlign.end,
                  style: const TextStyle(color: VoltiColors.green400, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
