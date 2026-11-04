import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/shared_vehicle.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../home/depot_providers.dart';

/// Planos ativos. No balcao o plano e escolhido no galpao: o app so mostra os
/// precos de referencia (diario, semanal e mensal, [kReferencePlans]).
final plansProvider = FutureProvider.autoDispose<List<PricingPlan>>((ref) async {
  final plans = await ref.watch(backendProvider).plans();
  return plans.where((p) => p.active).toList();
});
final coveragesProvider = FutureProvider.autoDispose<List<InsuranceCoverageOption>>(
  (ref) async => (await ref.watch(backendProvider).coverages()).where((c) => c.active).toList(),
);
final walletProvider = FutureProvider.autoDispose<Wallet>((ref) => ref.watch(backendProvider).wallet());

/// Planos dos precos de referencia da pre-reserva, nesta ordem.
const kReferencePlans = [PlanCode.day, PlanCode.weekly, PlanCode.monthly];

/// Cabecalho das telas do fluxo (pre-reserva): voltar, titulo,
/// "modelo · codigo" e a miniatura da moto, elemento compartilhado com a lista (E-15).
/// Com [heroModelId], mostra a foto do modelo (a mesma do cartao da lista).
class FlowHeader extends ConsumerWidget {
  const FlowHeader({super.key, required this.title, required this.subtitle, this.heroCode, this.heroModelId});
  final String title, subtitle;
  final String? heroCode;
  final String? heroModelId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final photoUrl = heroModelId == null ? null : ref.watch(vehicleModelsProvider).value?[heroModelId]?.photoUrl;
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, VoltiSpacing.s12),
      child: Row(
        children: [
          if (Navigator.of(context).canPop()) ...[
            VoltiIconButton(icon: LucideIcons.arrowLeft, size: 40, label: l.back, onPressed: () => Navigator.of(context).maybePop()),
            const SizedBox(width: VoltiSpacing.s12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(header: true, child: Text(title, style: VoltiTypography.heading)),
                Text(subtitle, key: const Key('flow-subtitle'), style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
              ],
            ),
          ),
          if (heroCode != null) ...[
            const SizedBox(width: VoltiSpacing.s12),
            VehicleHero(code: heroCode!, child: VehicleThumb(size: 48, image: vehiclePhoto(photoUrl, iconSize: 20))),
          ],
        ],
      ),
    );
  }
}

/// Unidade curta para a nota de preco ("/min", "/hora").
String unitShortLabel(AppLocalizations l, PlanUnit u) => switch (u) {
      PlanUnit.minute => l.unitMinuteShort,
      PlanUnit.hour => l.unitHourShort,
      PlanUnit.day => l.unitDayShort,
      PlanUnit.week => l.unitWeekShort,
      PlanUnit.month => l.unitMonthShort,
      _ => u.name,
    };

/// Unidade do plano em pt-BR (o enum vem em ingles do contrato).
String unitLabel(AppLocalizations l, PlanUnit u) => switch (u) {
      PlanUnit.minute => l.unitMinute,
      PlanUnit.hour => l.unitHour,
      PlanUnit.day => l.unitDay,
      PlanUnit.week => l.unitWeek,
      PlanUnit.month => l.unitMonth,
      _ => u.name,
    };
