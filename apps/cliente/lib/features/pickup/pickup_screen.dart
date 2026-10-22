import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/breakdown.dart';
import '../../core/clock.dart';
import '../../core/code_sheet.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/services.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import '../home/depot_providers.dart';
import '../home/providers.dart';
import '../pick/depot_selection.dart';
import '../plan/pix_sheet.dart';
import '../plan/plan_screen.dart';
import 'depot_hours.dart';
import 'depot_labels.dart';

/// Cotacao do resumo da retirada (plano, seguro e caucao). O plano so e cobrado
/// na entrega; aqui a cotacao mostra o preco e a caucao que sera bloqueada.
/// Chave: plano, cobertura, cupom e moto (o plano `minute` usa o preco do modelo).
final pickupQuoteProvider = FutureProvider.autoDispose.family<Quote, (PlanCode, InsuranceCoverage, String, String)>(
  (ref, k) => ref.watch(backendProvider).quote(k.$1, k.$2, coupon: k.$3, vehicleId: k.$4),
);

/// Retirada (spec 2026-10-22 §3.5): "Retirar agora (até HH:MM)" ou "Agendar"
/// dia e hora no funcionamento do galpao (ate `maxScheduleDays`), resumo (plano,
/// seguro, caucao), caucao no cartao ou Pix (Pix pre-selecionado sem cartao) e
/// **Confirmar reserva**, que bloqueia so a caucao.
///
/// O app calcula aberto/fechado e os horarios a partir de `openingHours` (ver
/// [DepotHours]); o servidor valida de novo.
class PickupScreen extends ConsumerStatefulWidget {
  const PickupScreen({super.key, required this.selection});
  final DepotSelection selection;
  @override
  ConsumerState<PickupScreen> createState() => _PickupScreenState();
}

class _PickupScreenState extends ConsumerState<PickupScreen> {
  PickupMode? _mode;
  LocalDay? _day;
  DateTime? _slot;
  DepositMethod? _method;
  String? _cardId;
  late String _coupon = ref.read(pendingCouponProvider);
  bool _busy = false;
  String? _error;

  /// Uma Idempotency-Key por pedido: repetir o mesmo pedido (rede caiu) reaproveita a chave.
  String? _idemKey;
  ReservationCreate? _idemFor;

  /// Atualiza "Até HH:MM" e os horarios quando o minuto vira.
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  DepotSelection get _sel => widget.selection;
  DepotHours get _hours => DepotHours.of(_sel.depot);

  Future<void> _addCard() async {
    final l = context.l;
    try {
      final token = await ref.read(cardTokenizerProvider).tokenize(context);
      if (token == null) return;
      final card = await ref.read(backendProvider).addCard(token);
      ref.invalidate(cardsProvider);
      setState(() {
        _cardId = card.id;
        _method = DepositMethod.card;
      });
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    }
  }

  Future<void> _editCoupon() async {
    final l = context.l;
    final code = await VoltiBottomSheet.show<String>(
      context,
      builder: (ctx) => CodeEntrySheet(
        title: l.couponOrCredit,
        actionLabel: l.apply,
        initial: _coupon,
        fieldKey: const Key('pickup-coupon-field'),
        actionKey: const Key('pickup-coupon-apply'),
      ),
    );
    if (code == null || !mounted) return;
    setState(() => _coupon = code.trim().toUpperCase());
    ref.read(pendingCouponProvider.notifier).set(code);
  }

  /// Decisao #8: a corrida so comeca com o consentimento de localizacao. Pede aqui,
  /// antes de reservar, para o cliente nao ficar travado no galpao na hora de aceitar a moto.
  Future<bool> _ensureLocationConsent() async {
    // Espera a sessao carregar: sem isso, um provider ainda frio pediria o consentimento a toa.
    final session = ref.read(sessionProvider).value ?? await ref.read(sessionProvider.future).catchError((Object _) => const SessionState.signedOut());
    if (session.locationConsent) return true;
    if (!mounted) return false;
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
    try {
      await ref
          .read(sessionProvider.notifier)
          .saveConsents(terms: session.termsAccepted, location: true, marketing: session.consents?.marketing ?? false);
      return true;
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
      return false;
    }
  }

  Future<void> _confirm(ReservationCreate request) async {
    // Consentimento antes do spinner: o dialogo nao fica com o botao "carregando" atras.
    if (_busy || !await _ensureLocationConsent() || !mounted) return;
    final l = context.l;
    setState(() {
      _busy = true;
      _error = null;
    });
    if (_idemFor != request) {
      _idemFor = request;
      _idemKey = newIdempotencyKey();
    }
    final depotId = _sel.depot.id;
    try {
      final r = await ref.read(backendProvider).createDepotReservation(request, idempotencyKey: _idemKey);
      VoltiHaptics.success();
      ref.read(pendingCouponProvider.notifier).clear();
      // A resposta da criacao ja traz o `pickupCode` (so vai ao dono): semeia a tela da
      // reserva com ela, sem depender do GET /reservations/current.
      ref.read(createdReservationProvider.notifier).set(r);
      ref.invalidate(currentReservationProvider);
      ref.invalidate(depotVehiclesProvider(depotId));
      ref.invalidate(depotsProvider);
      final deposit = r.deposit;
      if (request.depositMethod == DepositMethod.pix && deposit?.pix != null && deposit!.status != DepositStatus.held && mounted) {
        // Caucao Pix: o QR sai do copia e cola; a reserva fica aberta mesmo se o cliente fechar.
        await PixDepositSheet.show(context, deposit);
      }
      if (mounted) context.go('/reservation/${r.id}');
    } catch (e) {
      final f = toFailure(e);
      if (!mounted) return;
      if (f.status == 409 && f.slug == 'vehicle-unavailable') {
        ref.invalidate(depotVehiclesProvider(depotId));
        ref.invalidate(depotsProvider);
        VoltiToast.show(context, l.vehicleJustTaken, tone: VoltiToastTone.warning);
        context.go('/pick');
      } else if (f.status == 409 && f.slug == 'reservation-already-active') {
        ref.invalidate(currentReservationProvider);
        VoltiToast.show(context, l.blockActiveReservation, tone: VoltiToastTone.warning);
        context.go('/home');
      } else {
        setState(() => _error = f.message(l));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final now = ref.watch(clockProvider)();
    final hours = _hours;
    final openNow = hours.isOpenAt(now);
    final days = hours.scheduleDays(now);
    final today = days.first.day;
    _mode ??= openNow ? PickupMode.now : PickupMode.scheduled;
    final mode = openNow ? _mode! : PickupMode.scheduled;
    final firstWithSlots = days.where((d) => d.slots.isNotEmpty).firstOrNull;
    final day = days.where((d) => d.day == _day && d.slots.isNotEmpty).firstOrNull ?? firstWithSlots;
    final slot = day != null && day.slots.contains(_slot) ? _slot : null;

    final cards = ref.watch(cardsProvider);
    final cardList = cards.value ?? const <PaymentCard>[];
    _cardId ??= cardList.where((c) => c.isDefault).map((c) => c.id).firstOrNull ?? cardList.map((c) => c.id).firstOrNull;
    // Pix pre-selecionado quando o cliente nao tem cartao.
    if (_method == null && cards.hasValue) _method = cardList.isEmpty ? DepositMethod.pix : DepositMethod.card;
    final method = _method;
    final plan = _sel.plan!;
    final quoteKey = (plan.code, _sel.coverage, _coupon, _sel.vehicle.id);
    final quote = ref.watch(pickupQuoteProvider(quoteKey));

    final whenReady = mode == PickupMode.now ? openNow : slot != null;
    final payReady = method == DepositMethod.pix || (method == DepositMethod.card && _cardId != null);
    final request = !whenReady || !payReady
        ? null
        : ReservationCreate((b) => b
          ..vehicleId = _sel.vehicle.id
          ..depotId = _sel.depot.id
          ..pickupMode = mode
          ..pickupAt = mode == PickupMode.scheduled ? slot!.toUtc() : null
          ..planCode = plan.code
          ..coverage = _sel.coverage
          ..depositMethod = method
          ..cardId = method == DepositMethod.card ? _cardId : null
          ..couponCode = _coupon.isEmpty ? null : _coupon);

    final nowExpiry = hhmm(hours.toLocal(hours.pickupNowExpiry(now)));
    // Cartao escolhido sem cartao salvo: o botao desligado diz o motivo.
    final blockedReason = method == DepositMethod.card && _cardId == null && cards.hasValue ? l.planNeedsCard : null;

    return Scaffold(
      bottomNavigationBar: Container(
        decoration: BoxDecoration(color: scheme.surface, boxShadow: VoltiShadows.shadowSheet),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, VoltiSpacing.s16),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              if (blockedReason != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
                  child: Semantics(
                    liveRegion: true,
                    child: Text(
                      blockedReason,
                      key: const Key('plan-confirm-reason'),
                      textAlign: TextAlign.center,
                      style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ),
                ),
              VoltiButton(
              key: const Key('pickup-confirm'),
              label: mode == PickupMode.scheduled && slot == null ? l.pickupChooseTime : l.confirmReservation,
              icon: LucideIcons.calendarCheck,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              loading: _busy,
              onPressed: request == null || _busy ? null : () => _confirm(request),
            ),
            ]),
          ),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FlowHeader(title: l.pickupTitle, subtitle: depotTitle(l, _sel.depot), heroCode: _sel.vehicle.code),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 4, VoltiSpacing.screenGutter, VoltiSpacing.s16),
                children: VoltiStagger.wrap([
                  OptionCard(
                    key: const Key('pickup-now'),
                    title: l.pickupNow,
                    description: openNow ? l.pickupNowUntil(nowExpiry) : l.pickupNowClosed,
                    icon: LucideIcons.zap,
                    disabled: !openNow,
                    selected: mode == PickupMode.now,
                    onTap: openNow
                        ? () {
                            if (_mode != PickupMode.now) VoltiHaptics.selection();
                            setState(() => _mode = PickupMode.now);
                          }
                        : null,
                  ),
                  const SizedBox(height: VoltiSpacing.s10),
                  OptionCard(
                    key: const Key('pickup-scheduled'),
                    title: l.pickupSchedule,
                    description: l.pickupScheduleHint,
                    icon: LucideIcons.calendarDays,
                    selected: mode == PickupMode.scheduled,
                    onTap: () {
                      if (_mode != PickupMode.scheduled) VoltiHaptics.selection();
                      setState(() => _mode = PickupMode.scheduled);
                    },
                  ),
                  if (mode == PickupMode.scheduled) ...[
                    SectionTitle(l.pickupDay),
                    Semantics(
                      container: true,
                      label: l.pickupDay,
                      child: SingleChildScrollView(
                        key: const Key('pickup-days'),
                        scrollDirection: Axis.horizontal,
                        clipBehavior: Clip.none,
                        child: Row(children: [
                          for (final d in days) ...[
                            VoltiChip(
                              key: Key('pickup-day-${d.day}'),
                              label: d.closed ? l.dayChipClosed(dayChipLabel(l, d.day, today)) : dayChipLabel(l, d.day, today),
                              selected: d.day == day?.day,
                              enabled: d.slots.isNotEmpty,
                              onTap: () {
                                if (d.day != day?.day) VoltiHaptics.selection();
                                setState(() {
                                  _day = d.day;
                                  _slot = null;
                                });
                              },
                            ),
                            const SizedBox(width: VoltiSpacing.s8),
                          ],
                        ]),
                      ),
                    ),
                    SectionTitle(l.pickupTime),
                    if (day == null)
                      Text(l.pickupNoSlots, style: VoltiTypography.body.copyWith(color: scheme.onSurfaceVariant))
                    else
                      Semantics(
                        container: true,
                        label: l.pickupTime,
                        child: Wrap(
                          key: const Key('pickup-slots'),
                          spacing: VoltiSpacing.s8,
                          children: [
                            for (final s in day.slots)
                              VoltiChip(
                                key: Key('pickup-slot-${s.toIso8601String()}'),
                                label: hhmm(hours.toLocal(s)),
                                selected: s == slot,
                                onTap: () {
                                  if (s != slot) VoltiHaptics.selection();
                                  setState(() {
                                    _day = day.day;
                                    _slot = s;
                                  });
                                },
                              ),
                          ],
                        ),
                      ),
                  ],
                  SectionTitle(l.summary),
                  _Summary(selection: _sel, quote: quote, onRetry: () => ref.invalidate(pickupQuoteProvider(quoteKey))),
                  const SizedBox(height: VoltiSpacing.s10),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
                    child: ListRow(
                      key: const Key('pickup-coupon'),
                      icon: LucideIcons.ticket,
                      iconTone: ListRowTone.sun,
                      title: l.couponOrCredit,
                      value: _coupon.isEmpty ? null : _coupon,
                      trailing: ListRowTrailing.chevron,
                      onTap: _editCoupon,
                    ),
                  ),
                  if (quote.value case final q? when _coupon.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        q.couponApplied ? l.couponApplied : (q.couponMessage ?? l.couponInvalid),
                        style: VoltiTypography.caption.copyWith(color: q.couponApplied ? VoltiColors.successInk : VoltiColors.dangerInkStrong),
                      ),
                    ),
                  SectionTitle(l.deposit),
                  OptionCard(
                    key: const Key('pickup-card'),
                    title: l.payCard,
                    icon: LucideIcons.creditCard,
                    description: _cardId == null ? l.noCard : cardList.where((c) => c.id == _cardId).map((c) => '${c.brand} •••• ${c.last4}').firstOrNull,
                    selected: method == DepositMethod.card,
                    onTap: () {
                      if (_method != DepositMethod.card) VoltiHaptics.selection();
                      setState(() => _method = DepositMethod.card);
                    },
                  ),
                  if (method == DepositMethod.card && cardList.isEmpty && !cards.isLoading)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: VoltiButton(label: l.addCard, icon: LucideIcons.plus, variant: VoltiButtonVariant.secondary, fullWidth: true, onPressed: _addCard),
                    ),
                  const SizedBox(height: VoltiSpacing.s10),
                  OptionCard(
                    key: const Key('pickup-pix'),
                    title: l.payPix,
                    icon: LucideIcons.qrCode,
                    description: l.payPixHint,
                    selected: method == DepositMethod.pix,
                    onTap: () {
                      if (_method != DepositMethod.pix) VoltiHaptics.selection();
                      setState(() => _method = DepositMethod.pix);
                    },
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Semantics(liveRegion: true, child: NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _error!)),
                    ),
                  const SizedBox(height: VoltiSpacing.s16),
                  Text(l.pickupDepositNote, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Resumo: plano (preco do periodo; no plano por minuto, o da moto), as linhas
/// da cotacao sem repetir valores ([breakdownRows]) e a caucao que sera bloqueada.
class _Summary extends StatelessWidget {
  const _Summary({required this.selection, required this.quote, required this.onRetry});
  final DepotSelection selection;
  final AsyncValue<Quote> quote;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final plan = selection.plan!;
    Widget row(String a, String b, {bool strong = false, Key? key}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(a, style: strong ? VoltiTypography.bodyStrong : VoltiTypography.body)),
              const SizedBox(width: VoltiSpacing.s12),
              Flexible(child: Text(b, key: key, textAlign: TextAlign.end, style: strong ? VoltiTypography.bodyStrong : VoltiTypography.body)),
            ],
          ),
        );
    final q = quote.value;
    // A linha de tempo da cotacao e o preco do plano: vira a linha "Plano" com o valor cotado.
    final timeLine = q?.breakdown.lines.where((x) => x.code == 'time').firstOrNull;
    final unitCents = plan.code == PlanCode.minute && timeLine != null ? timeLine.amountCents : planUnitCents(plan, selection.vehicle);
    final rows = q == null
        ? const <BreakdownRow>[]
        : breakdownRows(
            q.breakdown.rebuild((b) => b.lines.removeWhere((x) => x.code == 'time')),
            insuranceLabel: l.insurance,
            feesLabel: l.fees,
            discountLabel: l.discount,
          );
    return Container(
      padding: const EdgeInsets.all(VoltiSpacing.s16),
      decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: VoltiRadii.rMd),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          row('${l.pickupPlan} · ${plan.name}', '${money(unitCents)}${l.perUnitShort(unitShortLabel(l, plan.unit))}', key: const Key('pickup-plan-price')),
          for (final r in rows) row(r.label, money(r.cents)),
          const Divider(),
          if (quote.hasError && q == null)
            ErrorState(error: quote.error!, onRetry: onRetry)
          else if (q == null)
            VoltiSkeleton.card(height: 24, label: l.loading)
          else
            row(l.deposit, money(q.depositCents), strong: true, key: const Key('pickup-deposit')),
          if (plan.recurring)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(l.planRenews, style: VoltiTypography.caption),
            ),
        ],
      ),
    );
  }
}
