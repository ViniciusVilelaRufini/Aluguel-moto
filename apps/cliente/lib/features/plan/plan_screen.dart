import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/geo.dart';
import '../../core/shared_vehicle.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../pick/depot_selection.dart';

/// Planos ativos (diario/semanal/mensal em destaque; minuto e hora em "Outras opções").
final plansProvider = FutureProvider.autoDispose<List<PricingPlan>>((ref) async {
  final plans = await ref.watch(backendProvider).plans();
  return plans.where((p) => p.active).toList();
});
final coveragesProvider = FutureProvider.autoDispose<List<InsuranceCoverageOption>>(
  (ref) async => (await ref.watch(backendProvider).coverages()).where((c) => c.active).toList(),
);
final cardsProvider = FutureProvider.autoDispose<List<PaymentCard>>((ref) => ref.watch(backendProvider).cards());
final walletProvider = FutureProvider.autoDispose<Wallet>((ref) => ref.watch(backendProvider).wallet());

/// Planos em destaque, nesta ordem.
const kFeaturedPlans = [PlanCode.day, PlanCode.weekly, PlanCode.monthly];

/// Plano do galpao (spec 2026-10-22 §3.3): diario, semanal e mensal em destaque
/// com o preco do periodo; "Outras opções" (minuto, hora) recolhidas. Semanal e
/// mensal avisam que renovam. O seguro e a caucao ficam nas telas seguintes; nada
/// e cobrado aqui (o plano e cobrado quando o cliente aceita a moto no galpao).
class PlanScreen extends ConsumerStatefulWidget {
  const PlanScreen({super.key, required this.selection});
  final DepotSelection selection;
  @override
  ConsumerState<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends ConsumerState<PlanScreen> {
  late PlanCode? _plan = widget.selection.plan?.code;
  bool _showOthers = false;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final plans = ref.watch(plansProvider);
    final v = widget.selection.vehicle;
    final scheme = Theme.of(context).colorScheme;
    final list = plans.value ?? const <PricingPlan>[];
    final featured = [
      for (final code in kFeaturedPlans) ...list.where((p) => p.code == code),
    ];
    final others = [for (final p in list) if (!kFeaturedPlans.contains(p.code)) p];
    // Sem escolha ainda: o primeiro em destaque (diario).
    if (_plan == null && list.isNotEmpty) _plan = (featured.isNotEmpty ? featured : list).first.code;
    PricingPlan? chosen;
    for (final p in list) {
      if (p.code == _plan) chosen = p;
    }
    // Plano escolhido entre os "outros" deixa a secao aberta.
    final othersOpen = _showOthers || others.any((p) => p.code == _plan && featured.isNotEmpty);

    Widget option(PricingPlan p) => Padding(
          padding: const EdgeInsets.only(bottom: VoltiSpacing.s10),
          child: OptionCard(
            key: Key('plan-${p.code.name}'),
            title: p.name,
            description: p.recurring ? l.planRenews : p.description,
            price: money(p.unitPriceCents),
            priceNote: l.perUnitShort(unitShortLabel(l, p.unit)),
            selected: _plan == p.code,
            onTap: () {
              if (_plan != p.code) VoltiHaptics.selection();
              setState(() => _plan = p.code);
            },
          ),
        );

    return Scaffold(
      bottomNavigationBar: Container(
        decoration: BoxDecoration(color: scheme.surface, boxShadow: VoltiShadows.shadowSheet),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, VoltiSpacing.s16),
            child: VoltiButton(
              key: const Key('plan-continue'),
              label: l.continueLabel,
              icon: LucideIcons.arrowRight,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              onPressed: chosen == null ? null : () => context.push('/insurance', extra: widget.selection.withPlan(chosen!)),
            ),
          ),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FlowHeader(title: l.planTitle, subtitle: l.vehicleModelCode(v.model, v.code), heroCode: v.code),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4, VoltiSpacing.screenGutter, VoltiSpacing.s16),
                children: VoltiStagger.wrap([
                  SectionTitle(l.choosePlan),
                  AsyncView<List<PricingPlan>>(
                    value: plans,
                    onRetry: () => ref.invalidate(plansProvider),
                    loading: (_) => VoltiSkeleton.card(height: 76, count: 3, label: l.loading),
                    data: (_) => Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        for (final p in featured.isEmpty ? others : featured) option(p),
                        if (featured.isNotEmpty && others.isNotEmpty) ...[
                          Container(
                            decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                            padding: const EdgeInsets.all(4),
                            child: Semantics(
                              expanded: othersOpen,
                              child: ListRow(
                                key: const Key('plan-others'),
                                icon: LucideIcons.clock,
                                title: l.planOtherOptions,
                                trailing: ListRowTrailing.chevron,
                                onTap: () => setState(() => _showOthers = !othersOpen),
                              ),
                            ),
                          ),
                          const SizedBox(height: VoltiSpacing.s10),
                          if (othersOpen) ...[for (final p in others) VoltiFadeUp(child: option(p))],
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: VoltiSpacing.s8),
                  Text(l.planChargedAtPickup, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                  const SizedBox(height: VoltiSpacing.s8),
                  Text(l.noKmNotice, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Cabecalho das telas do fluxo (plano, seguro, retirada): voltar, titulo,
/// "modelo · codigo" e a miniatura da moto, elemento compartilhado com a lista (E-15).
class FlowHeader extends StatelessWidget {
  const FlowHeader({super.key, required this.title, required this.subtitle, this.heroCode});
  final String title, subtitle;
  final String? heroCode;

  @override
  Widget build(BuildContext context) {
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
            VehicleHero(code: heroCode!, child: const VehicleThumb(size: 48)),
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
