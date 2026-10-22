import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/geo.dart';
import '../../core/widgets.dart';
import '../pick/depot_selection.dart';
import 'plan_screen.dart';

/// Seguro (spec 2026-10-22 §3.4): basico obrigatorio, pre-marcado e nao
/// removivel; completo opcional; o que cada um cobre.
class InsuranceScreen extends ConsumerStatefulWidget {
  const InsuranceScreen({super.key, required this.selection});
  final DepotSelection selection;
  @override
  ConsumerState<InsuranceScreen> createState() => _InsuranceScreenState();
}

class _InsuranceScreenState extends ConsumerState<InsuranceScreen> {
  late InsuranceCoverage _coverage = widget.selection.coverage;

  void _toggle(InsuranceCoverage c) {
    // O basico nao sai: tocar nele volta para o basico; o completo liga e desliga.
    final next = c == InsuranceCoverage.full && _coverage == InsuranceCoverage.full ? InsuranceCoverage.basic : c;
    if (next != _coverage) VoltiHaptics.selection();
    setState(() => _coverage = next);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final coverages = ref.watch(coveragesProvider);
    final v = widget.selection.vehicle;
    final scheme = Theme.of(context).colorScheme;
    final list = coverages.value ?? const <InsuranceCoverageOption>[];
    String? nameOf(InsuranceCoverage c) => list.where((o) => o.coverage == c).map((o) => o.name).firstOrNull;

    return Scaffold(
      bottomNavigationBar: Container(
        decoration: BoxDecoration(color: scheme.surface, boxShadow: VoltiShadows.shadowSheet),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, VoltiSpacing.s16),
            child: VoltiButton(
              key: const Key('insurance-continue'),
              label: l.continueLabel,
              icon: LucideIcons.arrowRight,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              onPressed: !coverages.hasValue
                  ? null
                  : () => context.push('/pickup', extra: widget.selection.withCoverage(_coverage, nameOf(_coverage))),
            ),
          ),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FlowHeader(title: l.insuranceTitle, subtitle: l.vehicleModelCode(v.model, v.code), heroCode: v.code, heroModelId: v.vehicleModelId),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4, VoltiSpacing.screenGutter, VoltiSpacing.s16),
                children: VoltiStagger.wrap([
                  Text(l.insuranceSubtitle, style: VoltiTypography.body.copyWith(color: scheme.onSurfaceVariant)),
                  const SizedBox(height: VoltiSpacing.s12),
                  AsyncView<List<InsuranceCoverageOption>>(
                    value: coverages,
                    onRetry: () => ref.invalidate(coveragesProvider),
                    loading: (_) => VoltiSkeleton.card(height: 120, count: 2, label: l.loading),
                    data: (list) => Column(
                      children: [
                        for (final c in list)
                          Padding(
                            padding: const EdgeInsets.only(bottom: VoltiSpacing.s10),
                            child: OptionCard(
                              key: Key('coverage-${c.coverage.name}'),
                              title: c.name,
                              description: c.mandatory ? withoutMandatoryPrefix(c.description) : c.description,
                              icon: c.coverage == InsuranceCoverage.full ? LucideIcons.shieldCheck : LucideIcons.shield,
                              price: c.premiumCents == 0 ? l.included : money(c.premiumCents),
                              priceNote: c.premiumCents == 0 ? null : l.perRental,
                              badge: c.coverage == InsuranceCoverage.basic ? l.mandatory : null,
                              selected: c.coverage == _coverage,
                              onTap: () => _toggle(c.coverage),
                              child: c.items.isEmpty
                                  ? null
                                  : Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        for (final i in c.items)
                                          Padding(
                                            padding: const EdgeInsets.only(top: 4),
                                            child: Row(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Padding(padding: EdgeInsets.only(top: 2), child: Icon(LucideIcons.check, size: 14, color: VoltiColors.successInk)),
                                                const SizedBox(width: 6),
                                                Expanded(child: Text(i.description, style: VoltiTypography.caption)),
                                              ],
                                            ),
                                          ),
                                      ],
                                    ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
