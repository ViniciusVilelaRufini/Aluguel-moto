import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/clock.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../home/depot_providers.dart';
import '../home/providers.dart';
import '../home/pending_payment_banner.dart' show openDebtsProvider;
import '../pick/depot_selection.dart';
import '../plan/plan_common.dart';
import 'depot_hours.dart';
import 'depot_refresh.dart';
import 'depot_labels.dart';

/// Pre-reserva no galpao (pre-reserva/balcao, 2026-11-04): "Retirar agora (até
/// HH:MM)" ou "Agendar" dia e hora no funcionamento do galpao (ate
/// `maxScheduleDays`), resumo (moto, galpao, horario e o aviso do balcao), os
/// precos de referencia (diario, semanal, mensal e o seguro basico) e
/// **Pré-reservar**. Nada se paga no app: plano, seguro, caucao e contrato sao
/// feitos no balcao. A pre-reserva so vai com o consentimento de localizacao.
///
/// O app calcula aberto/fechado e os horarios a partir de `openingHours` (ver
/// [DepotHours]); o servidor valida de novo.
class PickupScreen extends ConsumerStatefulWidget {
  const PickupScreen({super.key, required this.selection});
  final DepotSelection selection;
  @override
  ConsumerState<PickupScreen> createState() => _PickupScreenState();
}

class _PickupScreenState extends ConsumerState<PickupScreen> with WidgetsBindingObserver, DepotRefreshOnResume<PickupScreen> {
  PickupMode? _mode;
  LocalDay? _day;
  DateTime? _slot;
  bool _busy = false;

  /// Pre-reserva criada: o botao mostra o check por [VoltiMotion.successHold].
  bool _done = false;
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

  /// Selecao com o galpao mais recente (E-02): o horario muda quando ele abre/fecha.
  DepotSelection get _sel {
    final s = widget.selection;
    final fresh = ref.read(depotsProvider).value?.where((d) => d.id == s.depot.id).firstOrNull;
    return fresh == null ? s : DepotSelection(depot: fresh, vehicle: s.vehicle);
  }

  DepotHours get _hours => DepotHours.of(_sel.depot);

  /// O aluguel do balcao so comeca com o consentimento de localizacao (LGPD): pede
  /// aqui, antes de pre-reservar, para o cliente nao ficar travado no galpao.
  /// [force]: a API recusou (`403 location-consent-required`) mesmo com a sessao
  /// dizendo que havia consentimento (revogado em outro aparelho).
  Future<bool> _ensureLocationConsent({bool force = false}) async {
    // Espera a sessao carregar: sem isso, um provider ainda frio pediria o consentimento a toa.
    final session = ref.read(sessionProvider).value ?? await ref.read(sessionProvider.future).catchError((Object _) => const SessionState.signedOut());
    if (session.locationConsent && !force) return true;
    if (!mounted) return false;
    final l = context.l;
    final ok = await showDialog<bool>(
      context: context,
      barrierColor: context.palette.scrim,
      builder: (ctx) => VoltiDialog(
        key: const Key('pickup-consent-dialog'),
        title: l.pickupLocationConsentTitle,
        icon: const Icon(LucideIcons.mapPin, size: 32, color: VoltiColors.brand),
        message: Text(l.locationConsentText),
        actions: [
          VoltiButton(label: l.allowAndContinue, fullWidth: true, onPressed: () => Navigator.of(ctx).pop(true)),
          VoltiButton(label: l.notNow, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(ctx).pop(false)),
        ],
      ),
    );
    if (ok != true) return false;
    try {
      // Termos e marketing ficam como estao no servidor (LGPD): le de novo antes de gravar,
      // para uma sessao sem consentimentos carregados nunca revogar termos ou marketing.
      // Se a leitura falha, nada e gravado nem enviado.
      final current = await ref.read(backendProvider).consents();
      await ref
          .read(sessionProvider.notifier)
          .saveConsents(terms: current.termsAccepted, location: true, marketing: current.marketing);
      return true;
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
      return false;
    }
  }

  Future<void> _preReserve(ReservationCreate request, {bool forceConsent = false}) async {
    // Consentimento antes do spinner: o dialogo nao fica com o botao "carregando" atras.
    if (_busy || !await _ensureLocationConsent(force: forceConsent) || !mounted) return;
    final l = context.l;
    setState(() {
      _busy = true;
      _error = null;
    });
    final depotId = _sel.depot.id;
    var askConsentAgain = false;
    try {
      if (_idemFor != request) {
        _idemFor = request;
        _idemKey = newIdempotencyKey();
      }
      final r = await ref.read(backendProvider).createDepotReservation(request, idempotencyKey: _idemKey);
      VoltiHaptics.success();
      // A resposta da criacao ja traz o `pickupCode` (so vai ao dono): semeia a tela da
      // reserva com ela, sem depender do GET /reservations/current.
      ref.read(createdReservationProvider.notifier).set(r);
      ref.invalidate(currentReservationProvider);
      ref.invalidate(depotVehiclesProvider(depotId));
      ref.invalidate(depotsProvider);
      if (mounted) {
        // Micro-animacao de sucesso no botao antes de abrir a pre-reserva.
        setState(() => _done = true);
        await Future<void>.delayed(VoltiMotion.successHoldOf(context));
      }
      if (mounted) context.go('/reservation/${r.id}');
    } catch (e) {
      final f = toFailure(e);
      if (!mounted) return;
      if (f.status == 403 && f.slug == 'location-consent-required') {
        // Consentimento revogado fora deste aparelho: pede de novo e reenvia.
        askConsentAgain = true;
      } else if (f.status == 409 && f.slug == 'vehicle-unavailable') {
        ref.invalidate(depotVehiclesProvider(depotId));
        ref.invalidate(depotsProvider);
        VoltiToast.show(context, l.vehicleJustTaken, tone: VoltiToastTone.warning);
        context.go('/pick');
      } else if ((f.status == 409 && f.slug == 'payment-pending') || (f.status == 403 && f.slug == 'customer-delinquent')) {
        // Valor em aberto: acertado no balcao. A home mostra a pendencia.
        ref.invalidate(openDebtsProvider);
        VoltiToast.show(context, l.pickupDebtAtCounter, tone: VoltiToastTone.warning);
        context.go('/home');
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
    if (askConsentAgain && mounted) await _preReserve(request, forceConsent: true);
  }

  /// "Amanhã", "Amanhã · Fechado" (sem expediente), "Hoje · Encerrado" (expediente
  /// ja passou) ou "... · Indisponível" (fora da janela de agendamento).
  String _dayLabel(AppLocalizations l, ScheduleDay d, LocalDay today) {
    final label = dayChipLabel(l, d.day, today);
    if (d.slots.isNotEmpty) return label;
    if (d.closed) return l.dayChipClosed(label);
    return d.day == today ? l.dayChipEnded(label) : l.dayChipUnavailable(label);
  }

  /// "seg. 26/10 às 09:00" (horario de parede do galpao).
  String _whenText(AppLocalizations l, DateTime wall) {
    String two(int n) => n.toString().padLeft(2, '0');
    return l.pickupWhenValue(l.weekdayShort('${wall.weekday % 7}'), '${two(wall.day)}/${two(wall.month)}', hhmm(wall));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final now = ref.watch(clockProvider)();
    ref.watch(depotsProvider); // rebuild quando o galpao atualiza
    final sel = _sel;
    final hours = _hours;
    final openNow = hours.isOpenAt(now);
    final days = hours.scheduleDays(now);
    final today = days.first.day;
    _mode ??= openNow ? PickupMode.now : PickupMode.scheduled;
    final mode = openNow ? _mode! : PickupMode.scheduled;
    final firstWithSlots = days.where((d) => d.slots.isNotEmpty).firstOrNull;
    final day = days.where((d) => d.day == _day && d.slots.isNotEmpty).firstOrNull ?? firstWithSlots;
    final slot = day != null && day.slots.contains(_slot) ? _slot : null;

    final whenReady = mode == PickupMode.now ? openNow : slot != null;
    // So galpao, moto e horario: plano, seguro e pagamento ficam para o balcao.
    final request = !whenReady
        ? null
        : ReservationCreate((b) => b
          ..vehicleId = sel.vehicle.id
          ..depotId = sel.depot.id
          ..pickupMode = mode
          ..pickupAt = mode == PickupMode.scheduled ? slot!.toUtc() : null);

    final nowExpiry = hhmm(hours.toLocal(hours.pickupNowExpiry(now)));
    final String? when = mode == PickupMode.now
        ? (openNow ? l.reservationPickupUntil(nowExpiry) : null)
        : (slot == null ? null : _whenText(l, hours.toLocal(slot)));

    return Scaffold(
      bottomNavigationBar: Container(
        decoration: BoxDecoration(color: scheme.surface, boxShadow: VoltiShadows.shadowSheet),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, VoltiSpacing.s16),
            child: VoltiButton(
              key: const Key('pickup-pre-reserve'),
              label: mode == PickupMode.scheduled && slot == null ? l.pickupChooseTime : l.pickupPreReserve,
              icon: mode == PickupMode.now ? LucideIcons.zap : LucideIcons.calendarCheck,
              size: VoltiButtonSize.lg,
              fullWidth: true,
              loading: _busy && !_done,
              success: _done,
              haptic: VoltiHapticKind.tap,
              onPressed: request == null || _busy || _done ? null : () => _preReserve(request),
            ),
          ),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FlowHeader(title: l.pickupPreReserveTitle, subtitle: depotTitle(l, sel.depot), heroCode: sel.vehicle.code, heroModelId: sel.vehicle.vehicleModelId),
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
                              label: _dayLabel(l, d, today),
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
                  _Summary(selection: sel, when: when),
                  SectionTitle(l.pickupReferencePrices),
                  const _ReferencePrices(),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Semantics(liveRegion: true, child: NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _error!)),
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

/// Linha "rotulo · valor" com o valor a direita; com texto grande, o valor desce
/// para baixo do rotulo (sem quebrar no meio da palavra).
class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.valueKey});
  final String label, value;
  final Key? valueKey;

  @override
  Widget build(BuildContext context) {
    final big = MediaQuery.textScalerOf(context).scale(10) > 13;
    final a = Text(label, style: VoltiTypography.body);
    final b = Text(value, key: valueKey, textAlign: TextAlign.end, style: VoltiTypography.bodyStrong);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s6),
      child: MergeSemantics(
        child: big
            ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [a, b])
            : Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: a),
                  const SizedBox(width: VoltiSpacing.s12),
                  // Valor colado a direita; quebra linha se for longo (nome do galpao).
                  Flexible(child: Align(alignment: AlignmentDirectional.topEnd, child: b)),
                ],
              ),
      ),
    );
  }
}

/// Resumo: moto, galpao, horario (quando ja escolhido) e o aviso do balcao.
class _Summary extends StatelessWidget {
  const _Summary({required this.selection, required this.when});
  final DepotSelection selection;

  /// "Retire até 12:00" (agora) ou "sáb. 24/10 às 09:00" (agendado); `null` sem horario.
  final String? when;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final v = selection.vehicle;
    return Container(
      padding: const EdgeInsets.all(VoltiSpacing.s16),
      decoration: BoxDecoration(color: scheme.surfaceContainerHighest, borderRadius: VoltiRadii.rMd),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Row(l.pickupVehicleLine, l.vehicleModelCode(v.model, v.code), valueKey: const Key('pickup-vehicle')),
          _Row(l.pickupDepotLine, depotTitle(l, selection.depot), valueKey: const Key('pickup-depot')),
          if (when != null) _Row(l.pickupWhenLine, when!, valueKey: const Key('pickup-when')),
          const Divider(),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(LucideIcons.idCard, size: 18, color: context.palette.textBrand),
            ),
            const SizedBox(width: VoltiSpacing.s8),
            Expanded(
              child: Text(
                l.pickupCounterNote,
                key: const Key('pickup-counter-note'),
                style: VoltiTypography.body.copyWith(color: scheme.onSurface),
              ),
            ),
          ]),
        ],
      ),
    );
  }
}

/// Precos de referencia: diario, semanal e mensal (`GET /plans`) e o seguro
/// basico (`GET /insurance/coverages`). Sem escolha: o plano e escolhido no
/// balcao. Falha ao carregar nao trava a pre-reserva (o bloco mostra o erro).
class _ReferencePrices extends ConsumerWidget {
  const _ReferencePrices();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final plans = ref.watch(plansProvider);
    final coverages = ref.watch(coveragesProvider);
    final Widget body;
    if (plans.hasError && !plans.hasValue) {
      body = ErrorState(error: plans.error!, onRetry: () => ref.invalidate(plansProvider));
    } else if (!plans.hasValue) {
      body = VoltiSkeleton.card(height: 96, label: l.loading);
    } else {
      final list = plans.value!;
      final reference = [
        for (final code in kReferencePlans) ...list.where((p) => p.code == code),
      ];
      final basic = coverages.value?.where((c) => c.coverage == InsuranceCoverage.basic).firstOrNull;
      body = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (final p in reference)
          _Row(p.name, '${money(p.unitPriceCents)}${l.perUnitShort(unitShortLabel(l, p.unit))}', valueKey: Key('pickup-price-${p.code.name}')),
        if (basic != null)
          _Row(
            l.pickupInsuranceLine(basic.name),
            basic.premiumCents == 0 ? l.included : money(basic.premiumCents),
            valueKey: const Key('pickup-price-insurance'),
          ),
      ]);
    }
    return Container(
      key: const Key('pickup-reference-prices'),
      padding: const EdgeInsets.all(VoltiSpacing.s16),
      decoration: BoxDecoration(color: scheme.surface, borderRadius: VoltiRadii.rLg, boxShadow: VoltiShadows.shadow1),
      child: body,
    );
  }
}
