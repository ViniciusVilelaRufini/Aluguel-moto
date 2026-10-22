import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/code_sheet.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/services.dart';
import '../../core/session.dart';
import '../../core/shared_vehicle.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../home/providers.dart';
import 'pix_sheet.dart';

final plansProvider = FutureProvider.autoDispose<List<PricingPlan>>((ref) async {
  final plans = await ref.watch(backendProvider).plans();
  return plans.where((p) => p.active && !p.recurring).toList();
});
final coveragesProvider = FutureProvider.autoDispose<List<InsuranceCoverageOption>>(
  (ref) async => (await ref.watch(backendProvider).coverages()).where((c) => c.active).toList(),
);
final cardsProvider = FutureProvider.autoDispose<List<PaymentCard>>((ref) => ref.watch(backendProvider).cards());
final walletProvider = FutureProvider.autoDispose<Wallet>((ref) => ref.watch(backendProvider).wallet());

/// Contratacao (design `PlanScreen`): plano, seguro (basico obrigatorio), cupom
/// ou credito, resumo e caucao (cartao ou Pix). Os planos recorrentes (semanal e
/// mensal) ficam em Conta > Meu plano ate o contrato dizer como `POST /rentals`
/// usa uma assinatura (proposta em docs/decisoes.md).
class PlanScreen extends ConsumerStatefulWidget {
  const PlanScreen({super.key, required this.vehicle});
  final Vehicle vehicle;
  @override
  ConsumerState<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends ConsumerState<PlanScreen> {
  PlanCode? _plan;
  InsuranceCoverage _coverage = InsuranceCoverage.basic; // basico pre-selecionado e nao removivel
  late String _coupon = ref.read(pendingCouponProvider);
  DepositMethod _method = DepositMethod.card;
  String? _cardId;
  bool _useWallet = false;
  bool _busy = false;
  AsyncValue<Quote> _quote = const AsyncLoading();

  /// Recotando com um resumo ja na tela: mantem os valores (o total rola) e escurece.
  bool _requoting = false;

  /// Numero da ultima cotacao pedida: so a mais recente vale (respostas fora
  /// de ordem sao descartadas e o pagamento fica bloqueado ate ela chegar).
  int _quoteSeq = 0;
  String? _error;

  Future<void> _loadQuote() async {
    final plan = _plan;
    if (plan == null) return;
    final seq = ++_quoteSeq;
    setState(() {
      if (_quote.hasValue) {
        _requoting = true;
      } else {
        _quote = const AsyncLoading();
      }
    });
    final result = await AsyncValue.guard(() => ref.read(backendProvider).quote(plan, _coverage, coupon: _coupon));
    if (!mounted || seq != _quoteSeq) return;
    setState(() {
      _quote = result;
      _requoting = false;
    });
  }

  Future<bool> _ensureLocationConsent() async {
    final session = ref.read(sessionProvider).value;
    if (session?.locationConsent ?? false) return true;
    final l = context.l;
    final ok = await VoltiDialog.show<bool>(
      context,
      title: l.locationConsentTitle,
      icon: const Icon(LucideIcons.mapPin, size: 32, color: VoltiColors.brand),
      message: Text(l.locationConsentText),
      actions: [
        VoltiButton(label: l.allowAndContinue, fullWidth: true, onPressed: () => Navigator.of(context).pop(true)),
        VoltiButton(label: l.notNow, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    if (ok != true) return false;
    await ref
        .read(sessionProvider.notifier)
        .saveConsents(terms: session?.termsAccepted ?? true, location: true, marketing: session?.consents?.marketing ?? false);
    return true;
  }

  Future<void> _pay() async {
    final l = context.l;
    // Consentimento antes do spinner: o dialogo nao fica com o botao "carregando" atras.
    if (_busy || !await _ensureLocationConsent() || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final backend = ref.read(backendProvider);
      final request = StartRentalRequest(
        (b) => b
          ..vehicleId = widget.vehicle.id
          ..planCode = _plan
          ..coverage = _coverage
          ..depositMethod = _method
          ..couponCode = _coupon.isEmpty ? null : _coupon
          ..cardId = _method == DepositMethod.card ? _cardId : null
          ..useWalletCredits = _useWallet,
      );
      var result = await backend.startRental(request);
      if (result.outcome == RentalStartOutcome.awaitingDeposit) {
        if (!mounted) return;
        final paid = await PixDepositSheet.show(context, result.deposit);
        if (paid != true) return;
        // Decisao #1: depois do Pix pago, chama POST /rentals de novo com nova Idempotency-Key e depositId.
        result = await backend.startRental(request.rebuild((b) => b..depositId = result.deposit.id));
      }
      ref.invalidate(currentRentalProvider);
      ref.invalidate(currentReservationProvider);
      if (mounted) context.go('/ride');
    } catch (e) {
      if (mounted) setState(() => _error = failureText(l, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addCard() async {
    final l = context.l;
    try {
      final token = await ref.read(cardTokenizerProvider).tokenize(context);
      if (token == null) return;
      final card = await ref.read(backendProvider).addCard(token);
      ref.invalidate(cardsProvider);
      setState(() => _cardId = card.id);
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  /// "Cupom ou credito": codigo do cupom e uso dos creditos da carteira num sheet.
  Future<void> _editCoupon(Wallet? wallet) async {
    final l = context.l;
    var useWallet = _useWallet;
    final hasCredit = wallet != null && (wallet.balanceCents > 0 || wallet.minutesBalance > 0);
    final code = await VoltiBottomSheet.show<String>(
      context,
      builder: (ctx) => CodeEntrySheet(
        title: l.couponOrCredit,
        actionLabel: l.apply,
        initial: _coupon,
        fieldKey: const Key('plan-coupon-field'),
        actionKey: const Key('plan-coupon-apply'),
        extra: !hasCredit
            ? null
            : StatefulBuilder(
                builder: (ctx, setSheet) => SwitchListTile(
                  key: const Key('plan-wallet-switch'),
                  contentPadding: EdgeInsets.zero,
                  value: useWallet,
                  onChanged: (x) => setSheet(() => useWallet = x),
                  title: Text(l.useWallet),
                  subtitle: Text(l.walletBalance(money(wallet.balanceCents), wallet.minutesBalance)),
                ),
              ),
      ),
    );
    if (code == null || !mounted) return;
    final couponChanged = code != _coupon;
    setState(() {
      _coupon = code;
      _useWallet = useWallet;
    });
    ref.read(pendingCouponProvider.notifier).set(code);
    if (couponChanged) _loadQuote();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final plans = ref.watch(plansProvider);
    final coverages = ref.watch(coveragesProvider);
    final cards = ref.watch(cardsProvider);
    final wallet = ref.watch(walletProvider).value;
    final v = widget.vehicle;

    if (_plan == null && plans.hasValue && plans.value!.isNotEmpty) {
      _plan = plans.value!.first.code;
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadQuote());
    }
    final cardList = cards.value ?? const <PaymentCard>[];
    _cardId ??= cardList.where((c) => c.isDefault).map((c) => c.id).firstOrNull ?? cardList.map((c) => c.id).firstOrNull;
    final needsCard = _method == DepositMethod.card && _cardId == null;
    final quote = _quote.value;
    final canPay = !_busy && !_requoting && _plan != null && quote != null && !needsCard;

    final scheme = Theme.of(context).colorScheme;
    final couponValue = quote != null && quote.couponApplied && quote.breakdown.discountCents > 0
        ? money(quote.breakdown.discountCents)
        : (_coupon.isNotEmpty ? _coupon : (_useWallet ? l.walletCredits : null));
    return Scaffold(
      bottomNavigationBar: Container(
        decoration: BoxDecoration(color: scheme.surface, boxShadow: VoltiShadows.shadowSheet),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, VoltiSpacing.s16),
            child: VoltiButton(
              key: const Key('plan-confirm'),
              label: l.payAndUnlock,
              icon: LucideIcons.lockOpen,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              loading: _busy,
              onPressed: canPay ? _pay : null,
            ),
          ),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Cabecalho do design: voltar, titulo e "VT-4821 · Volti Flash · 90%"; a miniatura e o
            // elemento compartilhado que vem do mapa e do scan (E-15).
            Padding(
              padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, VoltiSpacing.s12),
              child: Row(
                children: [
                  if (Navigator.of(context).canPop()) ...[
                    VoltiIconButton(
                      icon: LucideIcons.arrowLeft,
                      size: 40,
                      label: l.back,
                      onPressed: () => Navigator.of(context).maybePop(),
                    ),
                    const SizedBox(width: VoltiSpacing.s12),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Semantics(header: true, child: Text(l.planTitle, style: VoltiTypography.heading)),
                        Text(
                          l.planSubtitle(v.code, v.model, v.batteryPct),
                          key: const Key('plan-subtitle'),
                          style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: VoltiSpacing.s12),
                  VehicleHero(code: v.code, child: const VehicleThumb(size: 48)),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4, VoltiSpacing.screenGutter, VoltiSpacing.s16),
                children: VoltiStagger.wrap([
                  SectionTitle(l.choosePlan),
                  AsyncView<List<PricingPlan>>(
                    value: plans,
                    onRetry: () => ref.invalidate(plansProvider),
                    loading: (_) => VoltiSkeleton.card(height: 76, count: 2, label: l.loading),
                    data: (list) => Column(
                      children: [
                        for (final p in list)
                          Padding(
                            padding: const EdgeInsets.only(bottom: VoltiSpacing.s10),
                            child: OptionCard(
                              title: p.name,
                              description: p.description ?? l.unlockFee(money(p.unlockFeeCents)),
                              price: money(p.unitPriceCents),
                              priceNote: l.perUnitShort(unitShortLabel(l, p.unit)),
                              selected: _plan == p.code,
                              onTap: () {
                                if (_plan != p.code) VoltiHaptics.selection();
                                setState(() => _plan = p.code);
                                _loadQuote();
                              },
                            ),
                          ),
                      ],
                    ),
                  ),
                  SectionTitle(l.chooseInsurance),
                  AsyncView<List<InsuranceCoverageOption>>(
                    value: coverages,
                    onRetry: () => ref.invalidate(coveragesProvider),
                    loading: (_) => VoltiSkeleton.card(height: 88, count: 2, label: l.loading),
                    data: (list) => Column(
                      children: [
                        for (final c in list)
                          Padding(
                            padding: const EdgeInsets.only(bottom: VoltiSpacing.s10),
                            child: OptionCard(
                              key: Key('coverage-${c.coverage.name}'),
                              title: c.name,
                              description: c.description,
                              icon: c.coverage == InsuranceCoverage.full ? LucideIcons.shieldCheck : LucideIcons.shield,
                              price: c.premiumCents == 0 ? l.included : money(c.premiumCents),
                              priceNote: c.premiumCents == 0 ? null : l.perRental,
                              badge: c.coverage == InsuranceCoverage.basic ? l.mandatory : null,
                              selected: c.coverage == _coverage,
                              onTap: () {
                                // O basico nao pode ser removido: tocar nele volta para o basico; o completo e adicional.
                                final next = c.coverage == InsuranceCoverage.full && _coverage == InsuranceCoverage.full
                                    ? InsuranceCoverage.basic
                                    : c.coverage;
                                if (next != _coverage) VoltiHaptics.selection();
                                setState(() => _coverage = next);
                                _loadQuote();
                              },
                              child: c.items.isEmpty
                                  ? null
                                  : Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        for (final i in c.items)
                                          Padding(
                                            padding: const EdgeInsets.only(top: 4),
                                            child: Row(
                                              children: [
                                                const Icon(LucideIcons.check, size: 14),
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
                  const SizedBox(height: VoltiSpacing.s8),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                    child: ListRow(
                      key: const Key('plan-coupon'),
                      icon: LucideIcons.ticket,
                      iconTone: ListRowTone.sun,
                      title: l.couponOrCredit,
                      value: couponValue,
                      trailing: ListRowTrailing.chevron,
                      onTap: () => _editCoupon(wallet),
                    ),
                  ),
                  if (quote != null && _coupon.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        quote.couponApplied ? l.couponApplied : (quote.couponMessage ?? l.couponInvalid),
                        style: VoltiTypography.caption.copyWith(color: quote.couponApplied ? VoltiColors.successInk : VoltiColors.danger),
                      ),
                    ),
                  SectionTitle(l.summary),
                  AnimatedOpacity(
                    opacity: _requoting ? .5 : 1,
                    duration: VoltiMotion.scaled(context, VoltiMotion.durBase),
                    child: _QuoteSummary(quote: _quote, onRetry: _loadQuote),
                  ),
                  SectionTitle(l.deposit),
                  OptionCard(
                    title: l.payCard,
                    icon: LucideIcons.creditCard,
                    description: _cardId == null
                        ? l.noCard
                        : cardList.where((c) => c.id == _cardId).map((c) => '${c.brand} •••• ${c.last4}').firstOrNull,
                    selected: _method == DepositMethod.card,
                    onTap: () {
                      if (_method != DepositMethod.card) VoltiHaptics.selection();
                      setState(() => _method = DepositMethod.card);
                    },
                  ),
                  if (_method == DepositMethod.card && cardList.isEmpty && !cards.isLoading)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: VoltiButton(
                        label: l.addCard,
                        icon: LucideIcons.plus,
                        variant: VoltiButtonVariant.secondary,
                        fullWidth: true,
                        onPressed: _addCard,
                      ),
                    ),
                  const SizedBox(height: VoltiSpacing.s10),
                  OptionCard(
                    title: l.payPix,
                    icon: LucideIcons.wallet,
                    description: l.payPixHint,
                    selected: _method == DepositMethod.pix,
                    onTap: () {
                      if (_method != DepositMethod.pix) VoltiHaptics.selection();
                      setState(() => _method = DepositMethod.pix);
                    },
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _error!),
                    ),
                  const SizedBox(height: VoltiSpacing.s16),
                  Text(l.noKmNotice, style: VoltiTypography.caption),
                ]),
              ),
            ),
          ],
        ),
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

class _QuoteSummary extends StatelessWidget {
  const _QuoteSummary({required this.quote, required this.onRetry});
  final AsyncValue<Quote> quote;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return quote.when(
      loading: () => VoltiSkeleton.card(height: 132, label: l.loading),
      error: (e, _) => ErrorState(error: e, onRetry: onRetry),
      data: (q) {
        Widget row(String a, String b, {bool strong = false, bool tick = false}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(a, style: strong ? VoltiTypography.bodyStrong : VoltiTypography.body)),
              const SizedBox(width: VoltiSpacing.s12),
              // O total rola os digitos quando o seguro ou o cupom mudam.
              tick
                  ? VoltiTicker(b, key: const Key('quote-total'), style: VoltiTypography.bodyStrong)
                  : Text(b, style: strong ? VoltiTypography.bodyStrong : VoltiTypography.body),
            ],
          ),
        );
        final bd = q.breakdown;
        return Container(
          padding: const EdgeInsets.all(VoltiSpacing.s16),
          decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: VoltiRadii.rMd),
          child: Column(
            children: [
              for (final line in bd.lines) row(line.description, money(line.amountCents)),
              if (bd.insuranceCents > 0) row(l.insurance, money(bd.insuranceCents)),
              if (bd.feesCents > 0) row(l.fees, money(bd.feesCents)),
              if (bd.discountCents > 0) row(l.discount, money(-bd.discountCents)),
              const Divider(),
              row(l.estimatedTotal, money(bd.totalCents), strong: true, tick: true),
              row(l.depositAmount, money(q.depositCents)),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(l.depositHint, style: VoltiTypography.caption),
              ),
            ],
          ),
        );
      },
    );
  }
}
