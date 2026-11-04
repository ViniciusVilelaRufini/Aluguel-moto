import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/geo.dart';
import '../../core/widgets.dart';
import 'account_common.dart';
import 'wallet_screen.dart' show ReadOnlyCounterNotice;

String subscriptionName(BuildContext context, SubscriptionPlanCode code) =>
    code == SubscriptionPlanCode.weekly ? context.l.planWeekly : context.l.planMonthly;

String _cardLabel(PaymentCard c) => '${c.brand[0].toUpperCase()}${c.brand.substring(1)} •••• ${c.last4}';

// ---------------------------------------------------------------------------
// Plano semanal e mensal (so leitura)
// ---------------------------------------------------------------------------

/// Assinatura ativa e planos anteriores. Nada se paga no app (balcao): sem assinar nem
/// cancelar; o cliente fala com o galpao. A Conta so abre esta tela com assinatura ativa.
class SubscriptionsScreen extends ConsumerWidget {
  const SubscriptionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    return VoltiScaffold(
      title: l.myPlan,
      body: AsyncView<List<Subscription>>(
        value: ref.watch(subscriptionsProvider),
        onRetry: () => ref.invalidate(subscriptionsProvider),
        loading: (_) => accountListSkeleton(l.loading),
        data: (list) {
          final active = activeSubscription(list);
          final past = list.where((s) => s != active).toList();
          return VoltiRefresh(
            onRefresh: () => ref.refresh(subscriptionsProvider.future),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              children: [
                if (active != null) _ActivePlanCard(sub: active) else Text(l.subscriptionsEmpty, style: VoltiTypography.body),
                const SizedBox(height: VoltiSpacing.s16),
                const ReadOnlyCounterNotice(),
                if (past.isNotEmpty) ...[
                  SectionTitle(l.subscriptionsPast),
                  for (final s in past)
                    ListRow(
                      title: subscriptionName(context, s.planCode),
                      icon: LucideIcons.calendarX,
                      subtitle: l.subscriptionEndedOn(formatDaySp(s.currentPeriodEnd)),
                      value: money(s.priceCents),
                      trailing: ListRowTrailing.none,
                    ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ActivePlanCard extends ConsumerWidget {
  const _ActivePlanCard({required this.sub});
  final Subscription sub;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final ending = sub.cancelAtPeriodEnd == true;
    final cards = ref.watch(accountCardsProvider).value ?? const [];
    final card = cards.where((c) => c.id == sub.cardId).firstOrNull ?? cards.where((c) => c.isDefault).firstOrNull;
    final end = formatDaySp(sub.currentPeriodEnd);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(
        padding: const EdgeInsets.all(VoltiSpacing.s16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: VoltiRadii.rLg,
          boxShadow: VoltiShadows.shadow1,
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(subscriptionName(context, sub.planCode), style: VoltiTypography.title)),
            VoltiBadge(
              switch ((sub.status, ending)) {
                (SubscriptionStatus.pastDue, _) => l.subscriptionPastDue,
                (_, true) => l.subscriptionEndingBadge,
                _ => l.subscriptionActive,
              },
              tone: sub.status == SubscriptionStatus.pastDue
                  ? VoltiBadgeTone.danger
                  : (ending ? VoltiBadgeTone.warning : VoltiBadgeTone.success),
            ),
          ]),
          const SizedBox(height: VoltiSpacing.s4),
          Text(money(sub.priceCents), style: VoltiTypography.heading),
          const SizedBox(height: VoltiSpacing.s12),
          _InfoLine(
            icon: LucideIcons.calendarClock,
            text: ending ? l.subscriptionEndsOn(end) : l.subscriptionNextCharge(end, money(sub.priceCents)),
          ),
          if (card != null) _InfoLine(icon: LucideIcons.creditCard, text: l.subscriptionCard(_cardLabel(card))),
          _InfoLine(icon: LucideIcons.motorbike, text: l.subscriptionBenefit),
        ]),
      ),
      if (ending) ...[
        const SizedBox(height: VoltiSpacing.s12),
        Text(l.subscriptionEndingText(end), style: VoltiTypography.caption),
      ],
    ]);
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: VoltiSpacing.s6),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: VoltiTypography.body)),
        ]),
      );
}
