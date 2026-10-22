import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/geo.dart';
import '../../core/session.dart';
import '../../core/shared_vehicle.dart';
import '../../core/widgets.dart';
import '../../l10n/app_localizations.dart';
import '../home/depot_providers.dart';
import '../home/providers.dart';
import '../pickup/depot_labels.dart';
import 'depot_selection.dart';
import 'pick_logic.dart';

/// "Escolha sua moto" do galpao (spec 2026-10-22 §3.2): motos livres do galpao
/// ativo (`GET /depots/{id}/vehicles`) com foto e categoria do modelo, codigo,
/// bateria/autonomia e preco por modelo; sem distancia a pe. Filtro por modelo e
/// **Continuar com (modelo) · (codigo)** (nao reserva ainda: segue para o plano).
class PickScreen extends ConsumerStatefulWidget {
  const PickScreen({super.key});
  @override
  ConsumerState<PickScreen> createState() => _PickScreenState();
}

class _PickScreenState extends ConsumerState<PickScreen> {
  String? _model;
  String? _selectedId;

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

  Future<void> _refresh(String depotId) async {
    ref.invalidate(depotVehiclesProvider(depotId));
    try {
      await ref.read(depotVehiclesProvider(depotId).future);
    } catch (_) {}
  }

  /// Estado vazio que tambem aceita puxar para atualizar.
  Widget _pullable(String depotId, Widget child) => VoltiRefresh(
        semanticsLabel: context.l.loading,
        onRefresh: () => _refresh(depotId),
        child: LayoutBuilder(
          builder: (context, c) => SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(constraints: BoxConstraints(minHeight: c.maxHeight), child: Center(child: child)),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final depotAsync = ref.watch(currentDepotProvider);
    final depot = depotAsync.value;
    final vehiclesAsync = depot == null ? const AsyncLoading<List<Vehicle>>() : ref.watch(depotVehiclesProvider(depot.id));
    final models = ref.watch(vehicleModelsProvider).value ?? const <String, VehicleModel>{};
    final fallbackPrice = ref.watch(minutePriceProvider).value;
    final session = ref.watch(sessionProvider).value;
    final hasReservation = ref.watch(currentReservationProvider).value != null;
    final hasRental = ref.watch(currentRentalProvider).value != null;

    final all = vehiclesAsync.value ?? const <Vehicle>[];
    final modelNames = modelsIn(all);
    final model = modelNames.contains(_model) ? _model : null;
    final visible = filterByModel(all, model);
    // Radio sempre com uma escolha: a tocada, se ainda visivel; senao a primeira.
    Vehicle? selected;
    for (final v in visible) {
      if (v.id == _selectedId) selected = v;
    }
    selected ??= visible.isEmpty ? null : visible.first;
    final block = reserveBlock(session: session, selected: selected != null, hasReservation: hasReservation, hasRental: hasRental);

    Widget body;
    if (depotAsync.hasError && !depotAsync.hasValue) {
      body = ErrorState(error: depotAsync.error!, onRetry: () => ref.invalidate(depotsProvider));
    } else if (depotAsync.hasValue && depot == null) {
      body = VoltiEmptyState(icon: LucideIcons.warehouse, title: l.depotsEmpty, message: l.depotsEmptyText, actionLabel: l.retry, actionIcon: LucideIcons.refreshCw, onAction: () => ref.invalidate(depotsProvider));
    } else if (vehiclesAsync.hasError && !vehiclesAsync.hasValue) {
      body = ErrorState(error: vehiclesAsync.error!, onRetry: () => ref.invalidate(depotVehiclesProvider(depot!.id)));
    } else if (!vehiclesAsync.hasValue) {
      body = SingleChildScrollView(
        key: const Key('pick-skeleton'),
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 8, VoltiSpacing.screenGutter, 16),
        child: VoltiSkeleton.card(height: 116, count: 4, label: l.loading),
      );
    } else if (all.isEmpty) {
      body = _pullable(
        depot!.id,
        VoltiEmptyState(icon: LucideIcons.bike, title: l.pickDepotEmpty, message: l.pickDepotEmptyText, actionLabel: l.retry, actionIcon: LucideIcons.refreshCw, onAction: () => ref.invalidate(depotVehiclesProvider(depot.id))),
      );
    } else if (visible.isEmpty) {
      body = _pullable(
        depot!.id,
        VoltiEmptyState(icon: LucideIcons.bike, title: l.pickEmptyModel, message: l.pickEmptyModelText, actionLabel: l.pickAllModels, onAction: () => setState(() => _model = null)),
      );
    } else {
      body = VoltiRefresh(
        semanticsLabel: l.loading,
        onRefresh: () => _refresh(depot!.id),
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
                photoUrl: models[v.vehicleModelId]?.photoUrl,
                priceCents: v.pricePerMinuteCents ?? models[v.vehicleModelId]?.pricePerMinuteCents ?? fallbackPrice,
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

    return Scaffold(
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
                        if (depot != null)
                          Semantics(
                            liveRegion: true,
                            child: Text(
                              vehiclesAsync.hasValue ? '${depotTitle(l, depot)} · ${l.pickDepotCount(visible.length)}' : depotTitle(l, depot),
                              style: VoltiTypography.caption.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (modelNames.length > 1)
              Semantics(
                label: l.pickModelFilters,
                container: true,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 10, VoltiSpacing.screenGutter, 2),
                  child: Row(
                    children: [
                      for (final m in [null, ...modelNames]) ...[
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
            _Footer(
              selected: selected,
              block: block,
              onContinue: selected == null || depot == null ? null : () => context.push('/plan', extra: DepotSelection(depot: depot, vehicle: selected!)),
            ),
          ],
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.selected, required this.block, required this.onContinue});
  final Vehicle? selected;
  final ReserveBlock block;
  final VoidCallback? onContinue;

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
              // Texto grande: o motivo tem teto e rola, para a lista continuar visivel.
              if (reasonView != null) ...[
                ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .22),
                  child: SingleChildScrollView(child: reasonView),
                ),
                const SizedBox(height: VoltiSpacing.s10),
              ],
              VoltiButton(
                key: const Key('pick-continue'),
                label: v == null ? l.selectABike : l.pickContinue(v.model, v.code),
                icon: LucideIcons.arrowRight,
                size: VoltiButtonSize.lg,
                fullWidth: true,
                onPressed: block == ReserveBlock.none ? onContinue : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Cartao da lista: foto do modelo (ou icone), modelo + codigo, categoria,
/// bateria/autonomia, preco por modelo e radio. Sem distancia (a moto esta no galpao).
class _PickCard extends StatefulWidget {
  const _PickCard({super.key, required this.vehicle, required this.photoUrl, required this.priceCents, required this.selected, required this.onTap});
  final Vehicle vehicle;
  final String? photoUrl;
  final int? priceCents;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_PickCard> createState() => _PickCardState();
}

class _PickCardState extends State<_PickCard> {
  bool _down = false;

  String? _category(AppLocalizations l) {
    final label = widget.vehicle.categoryLabel?.trim();
    if (label != null && label.isNotEmpty) return label;
    return switch (categoryFor(widget.vehicle.model)) {
      ModelCategory.urban => l.categoryUrban,
      ModelCategory.doubleSeat => l.categoryDoubleSeat,
      ModelCategory.cargo => l.categoryCargo,
      null => null,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final v = widget.vehicle;
    final on = widget.selected;
    final category = _category(l);
    final range = v.estimatedRangeKm.round();
    final price = widget.priceCents == null ? null : perMinuteLabel(widget.priceCents!);
    final semantics = [
      '${v.model} ${v.code}',
      ?category,
      l.batterySemantics(v.batteryPct),
      l.rangeSemantics(range),
      if (widget.priceCents != null) l.priceSemantics(money(widget.priceCents!)),
    ].join(', ');
    final dur = VoltiMotion.scaled(context, VoltiMotion.durSpring);
    final url = widget.photoUrl;

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
                  // Mesmo elemento compartilhado do cabecalho do plano (E-15); sem voo em reduced motion.
                  VehicleHero(
                    code: v.code,
                    child: VehicleThumb(
                      size: 88,
                      image: url == null || url.isEmpty
                          ? null
                          : Image.network(url, fit: BoxFit.contain, errorBuilder: (_, _, _) => const Icon(LucideIcons.bike, size: 32, color: VoltiColors.blue600)),
                    ),
                  ),
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
                        FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: BatteryPill(v.batteryPct, rangeKm: range)),
                        if (price != null) ...[
                          const SizedBox(height: 6),
                          FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: VoltiBadge(price, tone: VoltiBadgeTone.info)),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  VoltiRadio(selected: on),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
