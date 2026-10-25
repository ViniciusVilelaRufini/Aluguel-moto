import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
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
import '../pickup/depot_refresh.dart';
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

class _PickScreenState extends ConsumerState<PickScreen> with WidgetsBindingObserver, DepotRefreshOnResume<PickScreen> {
  String? _model;
  String? _selectedId;
  bool _sawLoading = false;

  /// Cartao aberto com os detalhes (um por vez; pressionar e segurar abre/fecha).
  String? _expandedId;

  /// Altura medida do rodape flutuante: a lista ganha esse espaco embaixo para o
  /// ultimo cartao subir acima do botao.
  double _footerHeight = 120;

  void _toggleExpanded(String id) {
    final opening = _expandedId != id;
    if (opening) VoltiHaptics.selection();
    setState(() => _expandedId = opening ? id : null);
  }

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
    final depotAsync = ref.watch(currentDepotProvider);
    final depot = depotAsync.value;
    final vehiclesAsync = depot == null ? const AsyncLoading<List<Vehicle>>() : ref.watch(depotVehiclesProvider(depot.id));
    final models = ref.watch(vehicleModelsProvider).value ?? const <String, VehicleModel>{};
    final fallbackPrice = ref.watch(minutePriceProvider).value;
    final unlockFee = ref.watch(minuteUnlockFeeProvider).value;
    final session = ref.watch(sessionProvider).value;
    final hasReservation = ref.watch(currentReservationProvider).value != null;
    final hasRental = ref.watch(currentRentalProvider).value != null;

    // E-01: depois do esqueleto os cartoes entram direto (sem fade em branco).
    if (!vehiclesAsync.hasValue) _sawLoading = true;
    final all = vehiclesAsync.value ?? const <Vehicle>[];
    final modelNames = modelsIn(all, models);
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
      body = VoltiEmptyState(
        icon: LucideIcons.warehouse,
        title: l.depotsEmpty,
        message: l.depotsEmptyText,
        actionLabel: l.retry,
        actionIcon: LucideIcons.refreshCw,
        onAction: () => ref.invalidate(depotsProvider),
      );
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
        VoltiEmptyState(
          icon: LucideIcons.motorbike,
          title: l.pickDepotEmpty,
          message: l.pickDepotEmptyText,
          actionLabel: l.retry,
          actionIcon: LucideIcons.refreshCw,
          onAction: () => ref.invalidate(depotVehiclesProvider(depot.id)),
        ),
      );
    } else if (visible.isEmpty) {
      body = _pullable(
        depot!.id,
        VoltiEmptyState(
          icon: LucideIcons.motorbike,
          title: l.pickEmptyModel,
          message: l.pickEmptyModelText,
          actionLabel: l.pickAllModels,
          onAction: () => setState(() => _model = null),
        ),
      );
    } else {
      body = VoltiRefresh(
        semanticsLabel: l.loading,
        onRefresh: () => _refresh(depot!.id),
        child: Semantics(
          explicitChildNodes: true,
          child: ListView.separated(
            key: const Key('pick-list'),
            // O botao flutua por cima: espaco para o ultimo cartao subir acima dele.
            padding: EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 8, VoltiSpacing.screenGutter, _footerHeight + 16),
            itemCount: visible.length,
            separatorBuilder: (_, _) => const SizedBox(height: VoltiSpacing.s10),
            itemBuilder: (context, i) {
              final v = visible[i];
              final card = _PickCard(
                key: Key('pick-card-${v.id}'),
                vehicle: v,
                category: categoryOf(v, models),
                photoUrl: models[v.vehicleModelId]?.photoUrl,
                description: models[v.vehicleModelId]?.description,
                priceCents: v.pricePerMinuteCents ?? models[v.vehicleModelId]?.pricePerMinuteCents ?? fallbackPrice,
                selected: v.id == selected?.id,
                expanded: v.id == _expandedId,
                unlockFeeCents: unlockFee,
                onToggleExpanded: () => _toggleExpanded(v.id),
                onTap: () {
                  if (v.id != selected?.id) VoltiHaptics.selection();
                  setState(() => _selectedId = v.id);
                },
              );
              // Cascata so nos primeiros itens (lista preguicosa).
              return i < 8 && !_sawLoading ? VoltiFadeUp(delay: VoltiMotion.staggerDelay(i), child: card) : card;
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
                child: _ModelFilters(
                  models: modelNames,
                  selected: model,
                  allLabel: l.pickAllModels,
                  onSelect: (m) {
                    if (model != m) VoltiHaptics.selection();
                    setState(() => _model = m);
                  },
                ),
              ),
            // A lista rola por baixo do botao flutuante (sem rodape opaco).
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(child: body),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: SizeReporter(
                      onSize: (size) {
                        if (mounted && (size.height - _footerHeight).abs() > .5) setState(() => _footerHeight = size.height);
                      },
                      child: _Footer(
                        selected: selected,
                        block: block,
                        onContinue: selected == null || depot == null
                            ? null
                            : () => context.push(
                                '/plan',
                                extra: DepotSelection(depot: depot, vehicle: selected!),
                              ),
                      ),
                    ),
                  ),
                ],
              ),
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
      reasonView = isKyc
          ? VoltiPressable(semanticLabel: [?reason.$1, reason.$2].join('. '), onTap: () => context.push('/account/verification'), child: banner)
          : banner;
    }
    // Botao flutuante: sem fundo opaco; so um veu suave (transparente -> superficie
    // a 60%) para o texto do botao e do aviso ficar legivel sobre os cartoes.
    return Stack(
      key: const Key('pick-footer'),
      children: [
        // O veu nao recebe toques: so o botao e o aviso; o resto vai para a lista.
        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              key: const Key('pick-footer-veil'),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [scheme.surface.withValues(alpha: 0), scheme.surface.withValues(alpha: .6)],
                ),
              ),
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(VoltiSpacing.s16, 20, VoltiSpacing.s16, VoltiSpacing.s16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Texto grande: o motivo tem teto e rola, para a lista continuar visivel.
                if (reasonView != null) ...[
                  ConstrainedBox(
                    // Com moto escolhida o botao tem a segunda linha (modelo · codigo): teto menor.
                    constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * (v != null ? .17 : .22)),
                    child: SingleChildScrollView(child: reasonView),
                  ),
                  const SizedBox(height: VoltiSpacing.s10),
                ],
                VoltiButton(
                  key: const Key('pick-continue'),
                  // Modelo e codigo na segunda linha: "Continuar com <modelo> · <codigo>" numa
                  // linha so cortava o codigo ("VLT-0…") no emulador.
                  label: v == null ? l.selectABike : l.pickContinueLabel,
                  subtitle: v == null ? null : l.pickContinueBike(v.model, v.code),
                  icon: LucideIcons.arrowRight,
                  size: VoltiButtonSize.lg,
                  fullWidth: true,
                  onPressed: block == ReserveBlock.none ? onContinue : null,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Cartao da lista: foto do modelo (ou icone), modelo + codigo, categoria,
/// bateria/autonomia, preco por modelo e radio. Sem distancia (a moto esta no galpao).
class _PickCard extends StatefulWidget {
  const _PickCard({
    super.key,
    required this.vehicle,
    this.category,
    required this.photoUrl,
    this.description,
    required this.priceCents,
    required this.selected,
    required this.onTap,
    this.expanded = false,
    this.onToggleExpanded,
    this.unlockFeeCents,
  });

  /// Detalhes abertos (pressionar e segurar, a seta ou a acao do leitor de tela).
  final bool expanded;
  final VoidCallback? onToggleExpanded;

  /// Taxa de desbloqueio do plano avulso (detalhes).
  final int? unlockFeeCents;
  final Vehicle vehicle;

  /// Categoria da moto ou, sem ela, a do modelo no catalogo.
  final String? category;
  final String? photoUrl;

  /// Descricao curta do modelo no catalogo (ex.: "1000 W · 32 km/h · cesto e garupa · sem CNH").
  final String? description;
  final int? priceCents;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_PickCard> createState() => _PickCardState();
}

class _PickCardState extends State<_PickCard> {
  bool _down = false;

  /// Ficha da moto com o que o contrato traz: categoria, potencia e velocidade
  /// (lidas da descricao do catalogo, ex.: "1000 W · 32 km/h"), bateria e
  /// autonomia, preco por minuto, taxa de desbloqueio e codigo.
  List<(String, String)> _specs(AppLocalizations l, String? category, String? description, int range) {
    final v = widget.vehicle;
    final power = RegExp(r'(\d[\d.]*)\s*W\b').firstMatch(description ?? '')?.group(0);
    final speed = RegExp(r'(\d+)\s*km/h').firstMatch(description ?? '')?.group(0);
    return [
      if (category != null) (l.pickSpecCategory, category),
      if (power != null) (l.pickSpecPower, power),
      if (speed != null) (l.pickSpecSpeed, speed),
      (l.pickSpecBattery, l.pickSpecBatteryValue(v.batteryPct, range)),
      if (widget.priceCents != null) (l.pickSpecPrice, perMinuteLabel(widget.priceCents!)),
      if (widget.unlockFeeCents != null) (l.pickSpecUnlock, money(widget.unlockFeeCents!)),
      (l.pickSpecCode, v.code),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final v = widget.vehicle;
    final on = widget.selected;
    final category = widget.category;
    final range = v.estimatedRangeKm.round();
    final price = widget.priceCents == null ? null : perMinuteLabel(widget.priceCents!);
    final description = widget.description?.trim();
    final hasDescription = description != null && description.isNotEmpty;
    final semantics = [
      '${v.model} ${v.code}',
      ?category,
      if (hasDescription) description,
      l.batterySemantics(v.batteryPct),
      l.rangeSemantics(range),
      if (widget.priceCents != null) l.priceSemantics(money(widget.priceCents!)),
    ].join(', ');
    final dur = VoltiMotion.scaled(context, VoltiMotion.durSpring);
    final url = widget.photoUrl;
    final expanded = widget.expanded;
    final specs = expanded ? _specs(l, category, description, range) : const <(String, String)>[];

    return Semantics(
      container: true,
      inMutuallyExclusiveGroup: true,
      checked: on,
      button: true,
      expanded: widget.onToggleExpanded == null ? null : expanded,
      label: expanded ? '$semantics. ${[for (final (k, v) in specs) '$k: $v'].join(', ')}' : semantics,
      onTap: widget.onTap,
      customSemanticsActions: widget.onToggleExpanded == null
          ? null
          : {CustomSemanticsAction(label: expanded ? l.pickCollapse : l.pickDetails): widget.onToggleExpanded!},
      child: ExcludeSemantics(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (_) => setState(() => _down = true),
          onTapUp: (_) => setState(() => _down = false),
          onTapCancel: () => setState(() => _down = false),
          onTap: widget.onTap,
          onLongPress: widget.onToggleExpanded == null
              ? null
              : () {
                  setState(() => _down = false);
                  widget.onToggleExpanded!();
                },
          child: AnimatedScale(
            scale: _down ? VoltiMotion.pressScale : (on ? 1.01 : 1),
            duration: dur,
            curve: VoltiMotion.easeSpring,
            child: AnimatedContainer(
              duration: dur,
              curve: VoltiMotion.easeOut,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: on ? context.palette.brandSoft : scheme.surface,
                borderRadius: VoltiRadii.rLg,
                border: Border.all(color: on ? VoltiColors.brand : Colors.transparent, width: 1.5),
                boxShadow: on ? null : VoltiShadows.shadow1,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      // Mesmo elemento compartilhado do cabecalho do plano (E-15); sem voo em reduced motion.
                      VehicleHero(
                        code: v.code,
                        child: VehicleThumb(
                          size: 88,
                          image: url == null || url.isEmpty
                              ? null
                              // Foto de produto sobre fundo branco: inteira (contain) num quadro branco, sem
                              // faixas cinza quando a proporcao nao e quadrada.
                              : ColoredBox(
                                  key: const Key('pick-photo-bg'),
                                  color: Colors.white,
                                  child: SizedBox.expand(
                                    child: Image.network(
                                      url,
                                      fit: BoxFit.contain,
                                      // Decodifica no tamanho da miniatura (88 px x densidade), nao no da foto original.
                                      cacheWidth: (88 * MediaQuery.devicePixelRatioOf(context)).round(),
                                      errorBuilder: (_, _, _) => const Icon(LucideIcons.motorbike, size: 32, color: VoltiColors.blue600),
                                    ),
                                  ),
                                ),
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
                                  style: TextStyle(
                                    fontFamily: VoltiTypography.fontMono,
                                    fontWeight: VoltiTypography.fwMedium,
                                    fontSize: 11,
                                    height: 1.6,
                                    color: scheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                            if (category != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                category,
                                style: TextStyle(
                                  fontFamily: VoltiTypography.fontSans,
                                  fontWeight: VoltiTypography.fwSemibold,
                                  fontSize: 12,
                                  // Laranja escuro: contraste AA sobre branco e sobre o verde suave.
                                  color: context.palette.warningInkStrong,
                                ),
                              ),
                            ],
                            if (hasDescription) ...[
                              const SizedBox(height: 2),
                              Text(
                                description,
                                key: const Key('pick-description'),
                                // Fechado: ate 2 linhas (fatos-chave primeiro). Aberto: inteira.
                                // Fonte grande: inteira (sem reticencias).
                                maxLines: expanded || MediaQuery.textScalerOf(context).scale(10) > 13 ? null : 2,
                                overflow: expanded || MediaQuery.textScalerOf(context).scale(10) > 13 ? null : TextOverflow.ellipsis,
                                style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant),
                              ),
                            ],
                            const SizedBox(height: 6),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: BatteryPill(v.batteryPct, rangeKm: range, light: true),
                            ),
                            if (price != null) ...[
                              const SizedBox(height: 6),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.centerLeft,
                                child: VoltiBadge(price, tone: VoltiBadgeTone.info),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      VoltiRadio(selected: on),
                    ],
                  ),
                  // Detalhes: altura animada com os tokens (reduced motion: instantaneo).
                  // Reduced motion: sem AnimatedSize (troca instantanea; com duracao zero ele
                  // se re-marca no proprio layout).
                  _ExpandSize(
                    child: expanded
                        ? Padding(
                            key: const Key('pick-details'),
                            padding: const EdgeInsets.fromLTRB(4, 10, 0, 2),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Divider(height: 1, color: scheme.outlineVariant),
                                const SizedBox(height: 8),
                                for (final (k, val) in specs)
                                  Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 3),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: Text(k, style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant)),
                                        ),
                                        const SizedBox(width: 12),
                                        Flexible(
                                          child: Text(
                                            val,
                                            textAlign: TextAlign.end,
                                            style: VoltiTypography.caption.copyWith(color: scheme.onSurface, fontWeight: VoltiTypography.fwSemibold),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: IconButton(
                                    key: const Key('pick-collapse'),
                                    tooltip: l.pickCollapse,
                                    icon: const Icon(LucideIcons.chevronUp, size: 20),
                                    onPressed: widget.onToggleExpanded,
                                  ),
                                ),
                              ],
                            ),
                          )
                        // Fechado: "Detalhes ⌄" pequeno, dica do pressionar e segurar (o toque tambem abre).
                        : widget.onToggleExpanded == null
                        ? const SizedBox(width: double.infinity)
                        : Align(
                            alignment: Alignment.centerRight,
                            child: GestureDetector(
                              key: const Key('pick-expand'),
                              behavior: HitTestBehavior.opaque,
                              onTap: widget.onToggleExpanded,
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(12, 6, 2, 0),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      l.pickDetailsShort,
                                      style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant, fontWeight: VoltiTypography.fwSemibold),
                                    ),
                                    const SizedBox(width: 2),
                                    Icon(LucideIcons.chevronDown, size: 16, color: scheme.onSurfaceVariant),
                                  ],
                                ),
                              ),
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Altura animada dos detalhes com os tokens; com reduced motion, sem animacao.
class _ExpandSize extends StatelessWidget {
  const _ExpandSize({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (VoltiMotion.reduced(context)) return child;
    return AnimatedSize(duration: VoltiMotion.durBase, curve: VoltiMotion.easeOut, alignment: Alignment.topCenter, child: child);
  }
}

/// Filtros por modelo ("Todas" + modelos). Fonte normal: uma linha que rola;
/// fonte grande: os chips quebram linha, sem ficar cortados na borda.
class _ModelFilters extends StatelessWidget {
  const _ModelFilters({required this.models, required this.selected, required this.allLabel, required this.onSelect});
  final List<String> models;
  final String? selected;
  final String allLabel;
  final ValueChanged<String?> onSelect;

  @override
  Widget build(BuildContext context) {
    final chips = [
      for (final m in <String?>[null, ...models])
        VoltiChip(label: m ?? allLabel, selected: selected == m, onTap: () => onSelect(m)),
    ];
    const padding = EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 10, VoltiSpacing.screenGutter, 2);
    if (MediaQuery.textScalerOf(context).scale(10) > 13) {
      return Padding(padding: padding, child: Wrap(spacing: VoltiSpacing.s8, children: chips));
    }
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: padding,
      child: Row(children: [for (final c in chips) ...[c, const SizedBox(width: VoltiSpacing.s8)]]),
    );
  }
}
