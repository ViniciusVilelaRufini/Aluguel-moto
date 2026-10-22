import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/depot_state.dart';
import 'package:volti_operador/data/handover_events.dart';
import 'package:volti_operador/data/handover_models.dart';
import 'package:volti_operador/features/arrivals/arrival_checklist_page.dart';
import 'package:volti_operador/features/pickups/handover_status_page.dart';
import 'package:volti_operador/features/pickups/handover_ui.dart';
import 'package:volti_operador/features/pickups/pickup_checklist_page.dart';
import 'package:volti_operador/features/pickups/pickup_scan_page.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Aba "Retiradas": agenda do dia do galpao (acionaveis primeiro; concluidas
/// recolhidas), leitura do QR da reserva e registro de chegada.
class PickupsPage extends ConsumerStatefulWidget {
  const PickupsPage({super.key});

  @override
  ConsumerState<PickupsPage> createState() => _PickupsPageState();
}

class _PickupsPageState extends ConsumerState<PickupsPage> {
  bool _showDone = false;
  bool _choosing = false;
  StreamSubscription<Object>? _events;
  StreamSubscription<bool>? _conn;

  @override
  void initState() {
    super.initState();
    final events = ref.read(handoverEventsProvider);
    // Aceite, disputa ou falha: a agenda muda de status.
    _events = events.updates.listen((_) => _refreshPickups());
    _conn = events.connected.listen((ok) {
      if (ok) _refreshPickups();
    });
  }

  @override
  void dispose() {
    _events?.cancel();
    _conn?.cancel();
    super.dispose();
  }

  String? get _depotId {
    final depots = ref.read(depotsProvider).value?.depots ?? const <Depot>[];
    return effectiveDepotId(depots, ref.read(selectedDepotProvider));
  }

  void _refreshPickups() {
    final id = _depotId;
    if (id != null && mounted) ref.invalidate(pickupsProvider(id));
  }

  Future<void> _push(Widget page) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
    _refreshPickups();
  }

  void _open(Reservation r) {
    final draft = ref.read(pickupDraftsProvider.notifier).forReservation(r.id);
    if (r.status == ReservationStatus.active && draft != null) {
      _push(PickupChecklistPage(pickupCode: draft.pickupCode, reservation: r));
    } else if (r.status == ReservationStatus.active) {
      _push(const PickupScanPage());
    } else if (r.handoverId != null) {
      _push(HandoverStatusPage(handoverId: r.handoverId!));
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final depotsAsync = ref.watch(depotsProvider);
    final depots = depotsAsync.value?.depots ?? const <Depot>[];
    final selected = ref.watch(selectedDepotProvider);
    final depotId = effectiveDepotId(depots, selected);
    final depot = depotsAsync.value?.byId(depotId);
    final choose = depotsAsync.hasValue && depots.isNotEmpty && (depotId == null || _choosing);

    final children = <Widget>[
      _header(t, depot, canSwitch: depots.length > 1 && !choose),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: VoltiSpacing.screenGutter),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const ConnectivityBanner(),
            const SizedBox(height: VoltiSpacing.s16),
            ..._body(t, depotsAsync, depots, depotId, choose),
          ],
        ),
      ),
    ];

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(depotsProvider);
          final id = depotId;
          if (id != null) {
            ref.invalidate(pickupsProvider(id));
            await ref.read(pickupsProvider(id).future).catchError((_) => <Reservation>[]);
          }
        },
        child: ListView(
          padding: const EdgeInsets.only(bottom: VoltiSpacing.s40),
          children: children,
        ),
      ),
    );
  }

  Widget _header(AppLocalizations t, Depot? depot, {required bool canSwitch}) {
    return OperatorHeader(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(depot?.name ?? t.pickupsDepotLabel,
                    style: VoltiTypography.caption.copyWith(color: const Color(0x99FFFFFF))),
                Semantics(
                  header: true,
                  child: Text(t.pickupsTitle,
                      style: VoltiTypography.title
                          .copyWith(color: VoltiColors.white, letterSpacing: -0.4)),
                ),
              ],
            ),
          ),
          if (canSwitch)
            VoltiIconButton(
              key: const Key('depot-switch'),
              icon: LucideIcons.warehouse,
              variant: VoltiIconButtonVariant.dark,
              label: t.depotChoose,
              onPressed: () => setState(() => _choosing = true),
            ),
        ],
      ),
    );
  }

  List<Widget> _body(AppLocalizations t, AsyncValue<DepotsResult> depotsAsync, List<Depot> depots,
      String? depotId, bool choose) {
    if (depotsAsync.isLoading && !depotsAsync.hasValue) {
      return [const _Skeleton()];
    }
    if (depotsAsync.hasError && !depotsAsync.hasValue) {
      return [
        VoltiEmptyState(
          icon: LucideIcons.cloudOff,
          title: t.depotsError,
          actionLabel: t.retry,
          actionIcon: LucideIcons.refreshCw,
          onAction: () => ref.invalidate(depotsProvider),
          compact: true,
        ),
      ];
    }
    if (depots.isEmpty) {
      return [VoltiEmptyState(icon: LucideIcons.warehouse, title: t.depotsEmpty, compact: true)];
    }
    if (choose) {
      return [
        Semantics(header: true, child: Text(t.depotChooseTitle, style: VoltiTypography.heading)),
        const SizedBox(height: VoltiSpacing.s4),
        Text(t.depotChooseHint,
            style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
        const SizedBox(height: VoltiSpacing.s12),
        DepotPicker(
          depots: depots,
          selected: depotId,
          onSelect: (id) {
            ref.read(selectedDepotProvider.notifier).select(id);
            setState(() => _choosing = false);
          },
        ),
      ];
    }
    return [
      VoltiButton(
        key: const Key('scan-qr'),
        label: t.pickupScanAction,
        icon: LucideIcons.qrCode,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        onPressed: () => _push(const PickupScanPage()),
      ),
      const SizedBox(height: VoltiSpacing.s10),
      VoltiButton(
        key: const Key('register-arrival'),
        label: t.arrivalAction,
        icon: LucideIcons.packageCheck,
        variant: VoltiButtonVariant.secondary,
        fullWidth: true,
        onPressed: () => _push(const ArrivalChecklistPage()),
      ),
      const SizedBox(height: VoltiSpacing.s8),
      ..._agenda(t, depotId!),
    ];
  }

  List<Widget> _agenda(AppLocalizations t, String depotId) {
    final pickups = ref.watch(pickupsProvider(depotId));
    final drafts = ref.watch(pickupDraftsProvider);
    final zone = depotZone(ref.watch(depotsProvider).value, depotId);
    return pickups.when(
      skipLoadingOnRefresh: true,
      loading: () => [const _Skeleton()],
      error: (e, _) => [
        VoltiEmptyState(
          icon: LucideIcons.cloudOff,
          title: t.pickupsError,
          actionLabel: t.retry,
          actionIcon: LucideIcons.refreshCw,
          onAction: () => ref.invalidate(pickupsProvider(depotId)),
          compact: true,
        ),
      ],
      data: (items) {
        final open = items.where(isActionablePickup).toList();
        final done = items.where((r) => !isActionablePickup(r)).toList();
        final draftIds = {
          for (final d in drafts.values) PickupCode.parse(d.pickupCode)?.reservationId,
        };
        Widget card(Reservation r) => Padding(
              padding: const EdgeInsets.only(bottom: VoltiSpacing.s10),
              child: _PickupCard(
                reservation: r,
                zone: zone,
                hasDraft: draftIds.contains(r.id),
                onTap: r.status == ReservationStatus.active || r.handoverId != null
                    ? () => _open(r)
                    : null,
              ),
            );
        return [
          SectionLabel(t.pickupsTitle),
          if (open.isEmpty)
            VoltiEmptyState(icon: LucideIcons.coffee, title: t.pickupsEmpty, compact: true),
          for (final r in open) card(r),
          if (done.isNotEmpty) ...[
            Semantics(
              key: const Key('pickups-done-toggle'),
              button: true,
              expanded: _showDone,
              label: t.pickupsDoneToday(done.length),
              hint: _showDone ? t.pickupsHideDone : t.pickupsShowDone,
              onTap: () => setState(() => _showDone = !_showDone),
              excludeSemantics: true,
              child: InkWell(
                borderRadius: VoltiRadii.rMd,
                onTap: () => setState(() => _showDone = !_showDone),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 48),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(t.pickupsDoneToday(done.length),
                            style: VoltiTypography.label),
                      ),
                      Icon(_showDone ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                          size: 20, color: VoltiColors.textSecondary),
                    ],
                  ),
                ),
              ),
            ),
            if (_showDone) for (final r in done) card(r),
          ],
        ];
      },
    );
  }
}

class _PickupCard extends StatelessWidget {
  const _PickupCard(
      {required this.reservation, required this.zone, required this.hasDraft, this.onTap});

  final Reservation reservation;
  final String zone;
  final bool hasDraft;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final r = reservation;
    final name = firstNameOf(r.customerFirstName, t.customerFallback);
    final vehicle = r.vehicle?.code ?? '-';
    final when = pickupWhen(t, r, zone);
    final (status, tone) = reservationStatusBadge(t, r.status);
    return Semantics(
      key: Key('pickup-${r.id}'),
      button: onTap != null,
      label: t.pickupCardSemantics(name, vehicle, when, status),
      excludeSemantics: true,
      onTap: onTap,
      child: SectionCard(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: VoltiTypography.bodyStrong),
                      Text(vehicle,
                          style: VoltiTypography.body.copyWith(
                              fontFamily: VoltiTypography.fontMono,
                              color: VoltiColors.textSecondary)),
                    ],
                  ),
                ),
                if (onTap != null)
                  const Padding(
                    padding: EdgeInsets.only(top: 2),
                    child: Icon(LucideIcons.chevronRight, size: 20, color: VoltiColors.ink400),
                  ),
              ],
            ),
            const SizedBox(height: VoltiSpacing.s4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 2, right: 6),
                  child: Icon(LucideIcons.clock, size: 14, color: VoltiColors.textSecondary),
                ),
                Expanded(
                  child: Text(when,
                      style: VoltiTypography.caption.copyWith(color: VoltiColors.textSecondary)),
                ),
              ],
            ),
            const SizedBox(height: VoltiSpacing.s6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                StatusTag(status, tone: tone),
                if (hasDraft)
                  StatusTag(t.pickupDraftSaved, icon: LucideIcons.filePen, tone: VoltiBadgeTone.info),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Skeleton extends StatelessWidget {
  const _Skeleton();

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return VoltiSkeleton(
      label: t.loadingTasks,
      child: const Column(
        children: [
          VoltiSkeletonBox(width: double.infinity, height: 72, radius: 20),
          SizedBox(height: VoltiSpacing.s10),
          VoltiSkeletonBox(width: double.infinity, height: 72, radius: 20),
        ],
      ),
    );
  }
}
