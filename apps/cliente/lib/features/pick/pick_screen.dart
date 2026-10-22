import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../home/nearby_refresh.dart';
import '../home/providers.dart';
import 'pick_logic.dart';

/// "Escolha sua moto" (PickScreen do design): lista das motos livres por perto,
/// filtro por modelo, selecao em radio e reserva de [kReservationMinutes] min.
class PickScreen extends ConsumerStatefulWidget {
  const PickScreen({super.key});
  @override
  ConsumerState<PickScreen> createState() => _PickScreenState();
}

class _PickScreenState extends ConsumerState<PickScreen> {
  String? _model;
  String? _selectedId;
  bool _busy = false;

  /// Motos recusadas com 409 nesta tela: saem da lista ate a proxima busca confirmar.
  final _taken = <String>{};

  void _back() {
    final router = GoRouter.maybeOf(context);
    if (router == null) {
      Navigator.of(context).maybePop();
    } else if (router.canPop()) {
      router.pop();
    } else {
      router.go('/home');
    }
  }

  Future<void> _reserve(VehicleSummary v) async {
    final l = context.l;
    setState(() => _busy = true);
    try {
      await ref.read(backendProvider).reserve(v.id);
      VoltiHaptics.success();
      ref.invalidate(currentReservationProvider);
      ref.invalidate(nearbyProvider);
      if (mounted) context.pushReplacement('/reserved');
    } catch (e) {
      final f = toFailure(e);
      if (f.status == 409) {
        // Moto reservada por outra pessoa ou reserva ja ativa: atualiza a lista e a reserva.
        ref.invalidate(nearbyProvider);
        ref.invalidate(currentReservationProvider);
        if (mounted) {
          setState(() {
            _selectedId = null;
            if (f.slug != 'reservation-already-active') _taken.add(v.id);
          });
          if (f.slug == 'reservation-already-active') {
            VoltiToast.show(context, l.blockActiveReservation, tone: VoltiToastTone.warning, actionLabel: l.seeReservation, onAction: () => context.push('/reserved'));
          } else if (f.slug == 'vehicle-unavailable') {
            VoltiToast.show(context, l.pickVehicleTaken, tone: VoltiToastTone.warning);
          } else {
            VoltiToast.show(context, f.message(l), tone: VoltiToastTone.danger);
          }
        }
      } else if (mounted) {
        VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _retry() => ref.invalidate(nearbyProvider);

  Future<void> _refresh() async {
    ref.invalidate(nearbyProvider);
    try {
      await ref.read(nearbyProvider.future);
    } catch (_) {}
  }

  /// Estado vazio que tambem aceita puxar para atualizar.
  Widget _pullable(Widget child) => VoltiRefresh(
    semanticsLabel: context.l.loading,
    onRefresh: _refresh,
    child: LayoutBuilder(
      builder: (context, c) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: c.maxHeight),
          child: Center(child: child),
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final nearby = ref.watch(nearbyProvider);
    // Busca nova chegou: ela ja reflete as motos reservadas, entao a lista local de recusadas zera.
    ref.listen(nearbyProvider, (_, next) {
      if (next is AsyncData && !next.isLoading && _taken.isNotEmpty) setState(_taken.clear);
    });
    final user = ref.watch(userLocationProvider).value;
    final price = ref.watch(minutePriceProvider).value;
    final session = ref.watch(sessionProvider).value;
    final hasReservation = ref.watch(currentReservationProvider).value != null;
    final hasRental = ref.watch(currentRentalProvider).value != null;
    final promo = firstRideFree(session?.customer, promoActive: kFirstRidePromo);

    final all = sortByWalk([
      for (final v in nearby.value ?? const <VehicleSummary>[])
        if (!_taken.contains(v.id)) v,
    ], user);
    final models = modelsIn(all);
    final model = models.contains(_model) ? _model : null;
    final visible = filterByModel(all, model);
    // Radio sempre com uma escolha: a tocada, se ainda visivel; senao a mais proxima.
    VehicleSummary? selected;
    for (final v in visible) {
      if (v.id == _selectedId) selected = v;
    }
    selected ??= visible.isEmpty ? null : visible.first;
    final block = reserveBlock(session: session, selected: selected != null, hasReservation: hasReservation, hasRental: hasRental);

    Widget body;
    if (nearby.hasError && !nearby.hasValue) {
      body = ErrorState(error: nearby.error!, onRetry: _retry);
    } else if (!nearby.hasValue) {
      body = SingleChildScrollView(
        key: const Key('pick-skeleton'),
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 8, VoltiSpacing.screenGutter, 16),
        child: VoltiSkeleton.card(height: 116, count: 4, label: l.loading),
      );
    } else if (all.isEmpty) {
      body = _pullable(VoltiEmptyState(icon: LucideIcons.bike, title: l.noVehiclesNearby, message: l.noVehiclesNearbyText, actionLabel: l.retry, actionIcon: LucideIcons.refreshCw, onAction: _retry));
    } else if (visible.isEmpty) {
      body = _pullable(VoltiEmptyState(icon: LucideIcons.bike, title: l.pickEmptyModel, message: l.pickEmptyModelText, actionLabel: l.pickAllModels, onAction: () => setState(() => _model = null)));
    } else {
      body = VoltiRefresh(
        semanticsLabel: l.loading,
        onRefresh: _refresh,
        child: Semantics(
          explicitChildNodes: true,
          child: ListView.separated(
            key: const Key('pick-list'),
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 8, VoltiSpacing.screenGutter, 16),
            itemCount: visible.length,
            separatorBuilder: (_, _) => const SizedBox(height: VoltiSpacing.s10),
            itemBuilder: (context, i) {
              final v = visible[i];
              final card = _PickCard(
                key: Key('pick-card-${v.id}'),
                vehicle: v,
                walkMeters: walkMetersTo(v, user),
                priceCents: price,
                firstRideFree: promo,
                selected: v.id == selected?.id,
                onTap: () {
                  if (v.id != selected?.id) VoltiHaptics.selection();
                  setState(() => _selectedId = v.id);
                },
              );
              // Cascata so nos primeiros itens (lista preguicosa).
              return i < 8 ? VoltiFadeUp(delay: VoltiMotion.staggerDelay(i), child: card) : card;
            },
          ),
        ),
      );
    }

    return NearbyAutoRefresh(
      child: Scaffold(
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, 0),
                child: Row(
                  children: [
                    VoltiIconButton(icon: LucideIcons.arrowLeft, label: l.back, onPressed: _back),
                    const SizedBox(width: VoltiSpacing.s12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Semantics(header: true, child: Text(l.pickTitle, style: VoltiTypography.heading)),
                          if (nearby.hasValue)
                            Semantics(
                              liveRegion: true,
                              child: Text(l.pickAvailable(visible.length), style: VoltiTypography.caption.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: VoltiSpacing.s12),
                    VoltiIconButton(icon: LucideIcons.map, label: l.pickSeeMap, onPressed: _back),
                  ],
                ),
              ),
              if (models.isNotEmpty)
                Semantics(
                  label: l.pickModelFilters,
                  container: true,
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 10, VoltiSpacing.screenGutter, 2),
                    child: Row(
                      children: [
                        for (final m in [null, ...models]) ...[
                          VoltiChip(
                            label: m ?? l.pickAllModels,
                            selected: model == m,
                            onTap: () {
                              if (model != m) VoltiHaptics.selection();
                              setState(() => _model = m);
                            },
                          ),
                          const SizedBox(width: VoltiSpacing.s8),
                        ],
                      ],
                    ),
                  ),
                ),
              Expanded(child: body),
              _Footer(selected: selected, block: block, busy: _busy, kyc: session?.kyc, onReserve: selected == null ? null : () => _reserve(selected!)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.selected, required this.block, required this.busy, required this.kyc, required this.onReserve});
  final VehicleSummary? selected;
  final ReserveBlock block;
  final bool busy;
  final KycStatus? kyc;
  final VoidCallback? onReserve;

  (String?, String)? _reason(AppLocalizations l) => switch (block) {
    ReserveBlock.none || ReserveBlock.noSelection || ReserveBlock.sessionLoading => null,
    ReserveBlock.kycPending => (l.kycPendingTitle, l.blockKycPending),
    ReserveBlock.kycRejected => (l.kycRejectedTitle, l.blockKycRejected),
    ReserveBlock.delinquent => (null, l.blockDelinquent),
    ReserveBlock.activeReservation => (null, l.blockActiveReservation),
    ReserveBlock.activeRental => (null, l.blockActiveRental),
  };

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final reason = _reason(l);
    final v = selected;
    final isKyc = block == ReserveBlock.kycPending || block == ReserveBlock.kycRejected;
    Widget? reasonView;
    if (reason != null) {
      final banner = NoticeBanner(
        icon: isKyc ? LucideIcons.shieldCheck : LucideIcons.info,
        title: reason.$1,
        message: reason.$2,
        danger: block == ReserveBlock.kycRejected || block == ReserveBlock.delinquent,
      );
      reasonView = isKyc ? VoltiPressable(semanticLabel: [?reason.$1, reason.$2].join('. '), onTap: () => context.push('/account/verification'), child: banner) : banner;
    }
    return Container(
      decoration: BoxDecoration(color: scheme.surface, boxShadow: VoltiShadows.shadowSheet),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 14, VoltiSpacing.screenGutter, VoltiSpacing.s16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (reasonView != null) ...[reasonView, const SizedBox(height: VoltiSpacing.s10)],
              if (v != null && reason == null) ...[
                Row(
                  children: [
                    Icon(LucideIcons.clock, size: 14, color: scheme.onSurfaceVariant),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(l.pickHoldNote(kReservationMinutes), style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                    ),
                  ],
                ),
                const SizedBox(height: VoltiSpacing.s10),
              ],
              VoltiButton(
                key: const Key('pick-reserve'),
                label: v == null ? l.selectABike : l.reserveModelCode(v.model, v.code),
                icon: LucideIcons.bookmark,
                size: VoltiButtonSize.lg,
                fullWidth: true,
                loading: busy,
                onPressed: block == ReserveBlock.none ? onReserve : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Cartao da lista: foto (placeholder ate termos fotos por modelo), modelo + codigo,
/// categoria, bateria/autonomia, distancia a pe, preco por minuto e radio.
class _PickCard extends StatefulWidget {
  const _PickCard({super.key, required this.vehicle, required this.walkMeters, required this.priceCents, required this.firstRideFree, required this.selected, required this.onTap});
  final VehicleSummary vehicle;
  final int? walkMeters;
  final int? priceCents;
  final bool firstRideFree;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_PickCard> createState() => _PickCardState();
}

class _PickCardState extends State<_PickCard> {
  bool _down = false;

  String? _category(AppLocalizations l) => switch (categoryFor(widget.vehicle.model)) {
    ModelCategory.urban => l.categoryUrban,
    ModelCategory.doubleSeat => l.categoryDoubleSeat,
    ModelCategory.cargo => l.categoryCargo,
    null => null,
  };

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final v = widget.vehicle;
    final on = widget.selected;
    final category = _category(l);
    final range = v.estimatedRangeKm.round();
    final walk = widget.walkMeters;
    final price = widget.priceCents == null ? null : perMinuteLabel(widget.priceCents!);
    final semantics = [
      '${v.model} ${v.code}',
      ?category,
      l.batterySemantics(v.batteryPct),
      l.rangeSemantics(range),
      if (walk != null) l.walkSemantics(walkingDistanceLabel(walk), walkingMinutes(walk)),
      if (widget.priceCents != null) l.priceSemantics(money(widget.priceCents!)),
      if (widget.firstRideFree) l.firstRideFreeBadge,
    ].join(', ');
    final dur = VoltiMotion.scaled(context, VoltiMotion.durSpring);

    return Semantics(
      container: true,
      inMutuallyExclusiveGroup: true,
      checked: on,
      button: true,
      label: semantics,
      onTap: widget.onTap,
      child: ExcludeSemantics(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (_) => setState(() => _down = true),
          onTapUp: (_) => setState(() => _down = false),
          onTapCancel: () => setState(() => _down = false),
          onTap: widget.onTap,
          child: AnimatedScale(
            scale: _down ? VoltiMotion.pressScale : (on ? 1.01 : 1),
            duration: dur,
            curve: VoltiMotion.easeSpring,
            child: AnimatedContainer(
              duration: dur,
              curve: VoltiMotion.easeOut,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: on ? VoltiColors.brandSoft : scheme.surface,
                borderRadius: VoltiRadii.rLg,
                border: Border.all(color: on ? VoltiColors.brand : Colors.transparent, width: 1.5),
                boxShadow: on ? null : VoltiShadows.shadow1,
              ),
              child: Row(
                children: [
                  _PhotoTile(model: v.model),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          crossAxisAlignment: WrapCrossAlignment.end,
                          children: [
                            Text(v.model, style: VoltiTypography.bodyStrong.copyWith(color: scheme.onSurface)),
                            Text(
                              v.code,
                              style: TextStyle(fontFamily: VoltiTypography.fontMono, fontWeight: VoltiTypography.fwMedium, fontSize: 11, height: 1.6, color: scheme.onSurfaceVariant),
                            ),
                          ],
                        ),
                        if (category != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            category,
                            style: const TextStyle(
                              fontFamily: VoltiTypography.fontSans,
                              fontWeight: VoltiTypography.fwSemibold,
                              fontSize: 12,
                              // Laranja escuro: contraste AA sobre branco e sobre o verde suave.
                              color: VoltiColors.warningInkStrong,
                            ),
                          ),
                        ],
                        const SizedBox(height: 6),
                        BatteryPill(v.batteryPct, rangeKm: range),
                        if (walk != null || price != null || widget.firstRideFree) ...[
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              if (walk != null) _Tag(text: walkLabel(walk), icon: LucideIcons.footprints, bg: VoltiColors.ink100, fg: VoltiColors.ink700),
                              if (price != null) _Tag(text: price, bg: VoltiColors.infoSoft, fg: VoltiColors.infoInk),
                              if (widget.firstRideFree) _Tag(text: l.firstRideFreeBadge, bg: VoltiColors.green100, fg: VoltiColors.successInk),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  _Radio(on: on),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PhotoTile extends StatelessWidget {
  const _PhotoTile({required this.model});
  final String model;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 96,
      height: 96,
      decoration: BoxDecoration(color: VoltiColors.surfaceMedia, borderRadius: BorderRadius.circular(16)),
      padding: const EdgeInsets.all(6),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(LucideIcons.bike, size: 32, color: VoltiColors.blue600),
          const SizedBox(height: 4),
          Flexible(
            child: Text(
              shortModel(model),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              // Rotulo decorativo: nao cresce com a escala de texto (a semantica do cartao ja diz o modelo).
              textScaler: TextScaler.noScaling,
              style: VoltiTypography.caption.copyWith(color: VoltiColors.blue600),
            ),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.text, required this.bg, required this.fg, this.icon});
  final String text;
  final Color bg, fg;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: VoltiRadii.rPill),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 12, color: fg), const SizedBox(width: 4)],
          Flexible(
            child: Text(
              text,
              style: TextStyle(fontFamily: VoltiTypography.fontSans, fontWeight: VoltiTypography.fwSemibold, fontSize: 12, height: 1.2, color: fg),
            ),
          ),
        ],
      ),
    );
  }
}

class _Radio extends StatelessWidget {
  const _Radio({required this.on});
  final bool on;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: VoltiMotion.scaled(context, VoltiMotion.durBase),
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        border: Border.all(color: on ? VoltiColors.brand : VoltiColors.ink300, width: 1.5),
      ),
      alignment: Alignment.center,
      child: on
          ? const VoltiCheckPop(
              child: SizedBox(
                width: 12,
                height: 12,
                child: DecoratedBox(
                  decoration: BoxDecoration(color: VoltiColors.brand, shape: BoxShape.circle),
                ),
              ),
            )
          : null,
    );
  }
}
