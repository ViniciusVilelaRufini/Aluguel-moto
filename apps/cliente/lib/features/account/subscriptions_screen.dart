import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/services.dart';
import '../../core/widgets.dart';
import 'account_common.dart';

String subscriptionName(BuildContext context, SubscriptionPlanCode code) =>
    code == SubscriptionPlanCode.weekly ? context.l.planWeekly : context.l.planMonthly;

/// Preco vigente do plano recorrente (catalogo de planos), quando houver.
PricingPlan? _planFor(List<PricingPlan> plans, SubscriptionPlanCode code) {
  for (final p in plans) {
    if (p.code.name == code.name) return p;
  }
  return null;
}

String _cardLabel(PaymentCard c) => '${c.brand[0].toUpperCase()}${c.brand.substring(1)} •••• ${c.last4}';

// ---------------------------------------------------------------------------
// Plano semanal e mensal: proxima cobranca, cancelar, contratar
// ---------------------------------------------------------------------------

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
                if (active != null) _ActivePlanCard(sub: active) else _ChoosePlan(),
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
      const SizedBox(height: VoltiSpacing.s16),
      if (!ending)
        VoltiButton(
          label: l.cancelRenewalConfirm,
          icon: LucideIcons.calendarX,
          variant: VoltiButtonVariant.secondary,
          fullWidth: true,
          onPressed: () => _confirmCancel(context, ref),
        )
      else
        Text(l.subscriptionEndingText(end), style: VoltiTypography.caption),
    ]);
  }

  Future<void> _confirmCancel(BuildContext context, WidgetRef ref) async {
    final l = context.l;
    // Acao destrutiva: confirma antes.
    final ok = await VoltiDialog.show<bool>(
      context,
      title: l.cancelRenewalTitle,
      message: Text(l.cancelRenewalText(formatDaySp(sub.currentPeriodEnd))),
      actions: [
        VoltiButton(
            label: l.cancelRenewalConfirm,
            variant: VoltiButtonVariant.danger,
            fullWidth: true,
            onPressed: () => Navigator.of(context).pop(true)),
        VoltiButton(
            label: l.keepPlan, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    if (ok != true) return;
    try {
      await ref.read(backendProvider).cancelSubscription(sub.id);
      ref.invalidate(subscriptionsProvider);
      if (context.mounted) VoltiToast.show(context, l.subscriptionCanceled);
    } catch (e) {
      if (context.mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
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

/// Sem assinatura: escolhe semanal ou mensal e segue para a confirmacao.
class _ChoosePlan extends ConsumerStatefulWidget {
  @override
  ConsumerState<_ChoosePlan> createState() => _ChoosePlanState();
}

class _ChoosePlanState extends ConsumerState<_ChoosePlan> {
  SubscriptionPlanCode _code = SubscriptionPlanCode.weekly;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final plansAsync = ref.watch(recurringPlansProvider);
    final plans = plansAsync.value ?? const <PricingPlan>[];
    final selectedPlan = _planFor(plans, _code);
    String? priceOf(SubscriptionPlanCode c) {
      final p = _planFor(plans, c);
      return p == null ? null : money(p.unitPriceCents);
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l.subscriptionsEmpty, style: VoltiTypography.body),
      SectionTitle(l.subscribe),
      OptionCard(
        title: l.planWeekly,
        description: l.planWeeklyDescription,
        price: priceOf(SubscriptionPlanCode.weekly),
        priceNote: l.perWeek,
        icon: LucideIcons.motorbike,
        selected: _code == SubscriptionPlanCode.weekly,
        onTap: () => setState(() => _code = SubscriptionPlanCode.weekly),
      ),
      const SizedBox(height: VoltiSpacing.s10),
      OptionCard(
        title: l.planMonthly,
        description: l.planMonthlyDescription,
        price: priceOf(SubscriptionPlanCode.monthly),
        priceNote: l.perMonth,
        icon: LucideIcons.calendarClock,
        selected: _code == SubscriptionPlanCode.monthly,
        onTap: () => setState(() => _code = SubscriptionPlanCode.monthly),
      ),
      const SizedBox(height: VoltiSpacing.s16),
      // Sem preco vigente nao da para assinar sabendo o valor cobrado.
      if (selectedPlan == null && !plansAsync.isLoading) ...[
        NoticeBanner(icon: LucideIcons.circleAlert, message: l.subscriptionPriceUnavailable),
        const SizedBox(height: VoltiSpacing.s12),
      ],
      VoltiButton(
        label: l.subscribeContinue,
        icon: LucideIcons.arrowRight,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        onPressed: selectedPlan == null
            ? null
            : () async {
          final done = await VoltiBottomSheet.show<bool>(
            context,
            builder: (_) => SubscribeSheet(code: _code, plan: selectedPlan),
          );
          if (done == true) {
            ref.invalidate(subscriptionsProvider);
            if (context.mounted) VoltiToast.show(context, l.subscriptionCreated, tone: VoltiToastTone.success);
          }
        },
      ),
    ]);
  }
}

/// Confirmacao da assinatura: preco, cobranca recorrente e cartao.
class SubscribeSheet extends ConsumerStatefulWidget {
  const SubscribeSheet({super.key, required this.code, this.plan});
  final SubscriptionPlanCode code;
  final PricingPlan? plan;

  @override
  ConsumerState<SubscribeSheet> createState() => _SubscribeSheetState();
}

class _SubscribeSheetState extends ConsumerState<SubscribeSheet> {
  bool _busy = false;
  String? _error;

  Future<void> _addCard() async {
    final l = context.l;
    try {
      final token = await ref.read(cardTokenizerProvider).tokenize(context);
      if (token == null) return;
      await ref.read(backendProvider).addCard(token);
      ref.invalidate(accountCardsProvider);
    } catch (e) {
      if (mounted) setState(() => _error = failureText(l, e));
    }
  }

  Future<void> _confirm(PaymentCard card) async {
    final l = context.l;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final attempt = ref.read(subscribeAttemptProvider);
      // Repetir a mesma assinatura (plano + cartao) depois de falha de rede reusa a chave.
      final key = attempt.keyFor(('subscribe', widget.code, card.id));
      try {
        // O cartao cobrado e o mesmo mostrado na confirmacao.
        await ref.read(backendProvider).subscribe(widget.code, cardId: card.id, idempotencyKey: key);
        attempt.settle();
      } catch (e) {
        if (AttemptKeys.isDefinitive(e)) attempt.settle();
        rethrow;
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = failureText(l, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final cards = ref.watch(accountCardsProvider);
    final list = cards.value ?? const <PaymentCard>[];
    final card = list.where((c) => c.isDefault).firstOrNull ?? list.firstOrNull;
    final price = widget.plan == null ? null : money(widget.plan!.unitPriceCents);
    final weekly = widget.code == SubscriptionPlanCode.weekly;
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text(l.subscribeConfirmTitle(subscriptionName(context, widget.code)), style: VoltiTypography.title)),
          const SizedBox(height: VoltiSpacing.s8),
          if (price != null)
            Text(weekly ? l.subscribePriceWeekly(price) : l.subscribePriceMonthly(price), style: VoltiTypography.heading)
          else
            NoticeBanner(icon: LucideIcons.circleAlert, message: l.subscriptionPriceUnavailable),
          const SizedBox(height: VoltiSpacing.s8),
          Text(weekly ? l.subscribeRecurringWeekly : l.subscribeRecurringMonthly, style: VoltiTypography.body),
          const SizedBox(height: VoltiSpacing.s16),
          if (cards.isLoading && !cards.hasValue)
            VoltiSkeleton.list(rows: 1, label: l.loading)
          else if (card != null)
            ListRow(
              title: _cardLabel(card),
              subtitle: l.subscribeCardHint,
              icon: LucideIcons.creditCard,
              trailing: ListRowTrailing.none,
            )
          else
            VoltiButton(
              label: l.addCard,
              icon: LucideIcons.plus,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              onPressed: _addCard,
            ),
          if (_error != null) ...[
            const SizedBox(height: VoltiSpacing.s12),
            NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _error!),
          ],
          const SizedBox(height: VoltiSpacing.s16),
          VoltiButton(
            label: l.subscribeConfirm,
            icon: LucideIcons.check,
            size: VoltiButtonSize.lg,
            fullWidth: true,
            loading: _busy,
            onPressed: card == null || price == null || _busy ? null : () => _confirm(card),
          ),
          const SizedBox(height: VoltiSpacing.s8),
          VoltiButton(
              label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
        ],
      ),
    );
  }
}
