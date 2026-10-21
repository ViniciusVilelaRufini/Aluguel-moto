import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/services.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import '../home/providers.dart';
import 'pix_sheet.dart';

final plansProvider = FutureProvider.autoDispose<List<PricingPlan>>((ref) async {
  final plans = await ref.watch(backendProvider).plans();
  return plans.where((p) => p.active && !p.recurring).toList();
});
final coveragesProvider = FutureProvider.autoDispose<List<InsuranceCoverageOption>>(
    (ref) async => (await ref.watch(backendProvider).coverages()).where((c) => c.active).toList());
final cardsProvider = FutureProvider.autoDispose<List<PaymentCard>>((ref) => ref.watch(backendProvider).cards());
final walletProvider = FutureProvider.autoDispose<Wallet>((ref) => ref.watch(backendProvider).wallet());

/// Contratacao: plano, seguro (basico obrigatorio), cupom, resumo e caucao (cartao ou Pix).
class PlanScreen extends ConsumerStatefulWidget {
  const PlanScreen({super.key, required this.vehicle});
  final Vehicle vehicle;
  @override
  ConsumerState<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends ConsumerState<PlanScreen> {
  PlanCode? _plan;
  InsuranceCoverage _coverage = InsuranceCoverage.basic; // basico pre-selecionado e nao removivel
  String _coupon = '';
  final _couponCtrl = TextEditingController();
  DepositMethod _method = DepositMethod.card;
  String? _cardId;
  bool _useWallet = false;
  bool _busy = false;
  AsyncValue<Quote> _quote = const AsyncLoading();
  String? _error;

  @override
  void dispose() {
    _couponCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadQuote() async {
    final plan = _plan;
    if (plan == null) return;
    setState(() => _quote = const AsyncLoading());
    final result = await AsyncValue.guard(() => ref.read(backendProvider).quote(plan, _coverage, coupon: _coupon));
    if (mounted && plan == _plan) setState(() => _quote = result);
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
        VoltiButton(
            label: l.notNow, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
      ],
    );
    if (ok != true) return false;
    await ref.read(sessionProvider.notifier).saveConsents(
          terms: session?.termsAccepted ?? true,
          location: true,
          marketing: session?.consents?.marketing ?? false,
        );
    return true;
  }

  Future<void> _pay() async {
    final l = context.l;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (!await _ensureLocationConsent()) return;
      final backend = ref.read(backendProvider);
      final request = StartRentalRequest((b) => b
        ..vehicleId = widget.vehicle.id
        ..planCode = _plan
        ..coverage = _coverage
        ..depositMethod = _method
        ..couponCode = _coupon.isEmpty ? null : _coupon
        ..cardId = _method == DepositMethod.card ? _cardId : null
        ..useWalletCredits = _useWallet);
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
    final canPay = !_busy && _plan != null && quote != null && !needsCard;

    return VoltiScaffold(
      title: l.planTitle,
      bottom: VoltiButton(
        label: _busy ? l.loading : l.payAndUnlock,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        onPressed: canPay ? _pay : null,
      ),
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: VoltiStagger.wrap([
          Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(v.model, style: VoltiTypography.heading),
                Text(l.vehicleCode(v.code), style: VoltiTypography.caption),
              ]),
            ),
            BatteryPill(v.batteryPct, rangeKm: v.estimatedRangeKm.round()),
          ]),
          SectionTitle(l.choosePlan),
          AsyncView<List<PricingPlan>>(
            value: plans,
            onRetry: () => ref.invalidate(plansProvider),
            data: (list) => Column(children: [
              for (final p in list)
                Padding(
                  padding: const EdgeInsets.only(bottom: VoltiSpacing.s10),
                  child: OptionCard(
                    title: p.name,
                    description: p.description ?? l.unlockFee(money(p.unlockFeeCents)),
                    price: money(p.unitPriceCents),
                    priceNote: l.perUnit(p.unit.name),
                    selected: _plan == p.code,
                    onTap: () {
                      setState(() => _plan = p.code);
                      _loadQuote();
                    },
                  ),
                ),
            ]),
          ),
          SectionTitle(l.chooseInsurance),
          AsyncView<List<InsuranceCoverageOption>>(
            value: coverages,
            onRetry: () => ref.invalidate(coveragesProvider),
            data: (list) => Column(children: [
              for (final c in list)
                Padding(
                  padding: const EdgeInsets.only(bottom: VoltiSpacing.s10),
                  child: OptionCard(
                    key: Key('coverage-${c.coverage.name}'),
                    title: c.name,
                    description: c.description,
                    price: c.premiumCents == 0 ? l.included : money(c.premiumCents),
                    badge: c.coverage == InsuranceCoverage.basic ? l.mandatory : null,
                    selected: c.coverage == _coverage,
                    onTap: () {
                      // O basico nao pode ser removido: tocar nele volta para o basico; o completo e adicional.
                      final next = c.coverage == InsuranceCoverage.full && _coverage == InsuranceCoverage.full
                          ? InsuranceCoverage.basic
                          : c.coverage;
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
                                  child: Row(children: [
                                    const Icon(LucideIcons.check, size: 14),
                                    const SizedBox(width: 6),
                                    Expanded(child: Text(i.description, style: VoltiTypography.caption)),
                                  ]),
                                ),
                            ],
                          ),
                  ),
                ),
            ]),
          ),
          SectionTitle(l.coupon),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _couponCtrl,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(hintText: l.couponHint, prefixIcon: const Icon(LucideIcons.ticket)),
              ),
            ),
            const SizedBox(width: 8),
            VoltiButton(
              label: l.apply,
              variant: VoltiButtonVariant.secondary,
              onPressed: () {
                _coupon = _couponCtrl.text.trim();
                _loadQuote();
              },
            ),
          ]),
          if (quote != null && _coupon.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(quote.couponApplied ? l.couponApplied : (quote.couponMessage ?? l.couponInvalid),
                  style: VoltiTypography.caption.copyWith(color: quote.couponApplied ? VoltiColors.successInk : VoltiColors.danger)),
            ),
          SectionTitle(l.summary),
          _QuoteSummary(quote: _quote, onRetry: _loadQuote),
          SectionTitle(l.deposit),
          OptionCard(
            title: l.payCard,
            icon: LucideIcons.creditCard,
            description: _cardId == null
                ? l.noCard
                : cardList.where((c) => c.id == _cardId).map((c) => '${c.brand} •••• ${c.last4}').firstOrNull,
            selected: _method == DepositMethod.card,
            onTap: () => setState(() => _method = DepositMethod.card),
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
            onTap: () => setState(() => _method = DepositMethod.pix),
          ),
          if (wallet != null && (wallet.balanceCents > 0 || wallet.minutesBalance > 0))
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _useWallet,
              onChanged: (x) => setState(() => _useWallet = x),
              title: Text(l.useWallet),
              subtitle: Text(l.walletBalance(money(wallet.balanceCents), wallet.minutesBalance)),
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
    );
  }
}

class _QuoteSummary extends StatelessWidget {
  const _QuoteSummary({required this.quote, required this.onRetry});
  final AsyncValue<Quote> quote;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return quote.when(
      loading: () => const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator())),
      error: (e, _) => ErrorState(error: e, onRetry: onRetry),
      data: (q) {
        Widget row(String a, String b, {bool strong = false}) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(children: [
                Expanded(child: Text(a, style: strong ? VoltiTypography.bodyStrong : VoltiTypography.body)),
                Text(b, style: strong ? VoltiTypography.bodyStrong : VoltiTypography.body),
              ]),
            );
        final bd = q.breakdown;
        return Container(
          padding: const EdgeInsets.all(VoltiSpacing.s16),
          decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: VoltiRadii.rMd),
          child: Column(children: [
            for (final line in bd.lines) row(line.description, money(line.amountCents)),
            if (bd.insuranceCents > 0) row(l.insurance, money(bd.insuranceCents)),
            if (bd.feesCents > 0) row(l.fees, money(bd.feesCents)),
            if (bd.discountCents > 0) row(l.discount, money(-bd.discountCents)),
            const Divider(),
            row(l.estimatedTotal, money(bd.totalCents), strong: true),
            row(l.depositAmount, money(q.depositCents)),
            Align(alignment: Alignment.centerLeft, child: Text(l.depositHint, style: VoltiTypography.caption)),
          ]),
        );
      },
    );
  }
}
