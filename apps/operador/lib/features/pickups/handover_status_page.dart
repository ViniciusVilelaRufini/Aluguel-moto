import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart' hide VehicleStatus;
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/handover_events.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Estado ao vivo da entrega de saida: "Aguardando o cliente", "Aceito — moto
/// liberada", "Pagamento nao aprovado" (`lastError`) ou "Problema apontado".
/// Atualiza com `handover.updated` + `GET /handovers/{id}`.
class HandoverStatusPage extends ConsumerStatefulWidget {
  const HandoverStatusPage({super.key, required this.handoverId, this.initial});

  final String handoverId;
  final Handover? initial;

  @override
  ConsumerState<HandoverStatusPage> createState() => _HandoverStatusPageState();
}

class _HandoverStatusPageState extends ConsumerState<HandoverStatusPage> {
  Handover? _handover;
  HandoverStatus? _status;
  String? _lastError;
  bool _loading = false;
  bool _loadFailed = false;
  StreamSubscription<HandoverUpdate>? _updates;
  StreamSubscription<bool>? _conn;

  @override
  void initState() {
    super.initState();
    _apply(widget.initial);
    final events = ref.read(handoverEventsProvider);
    _updates = events.updates.where((u) => u.handoverId == widget.handoverId).listen((u) {
      // Mostra ja o status do evento; o GET completa (motivo, disputa).
      setState(() {
        _status = u.status;
        _lastError = u.lastError;
      });
      _refresh();
    });
    _conn = events.connected.listen((ok) {
      if (ok) _refresh();
    });
    if (widget.initial == null) {
      _loading = true;
      _refresh(initial: true);
    }
  }

  @override
  void dispose() {
    _updates?.cancel();
    _conn?.cancel();
    super.dispose();
  }

  void _apply(Handover? h) {
    if (h == null) return;
    _handover = h;
    _status = h.status;
    _lastError = h.lastError;
  }

  Future<void> _refresh({bool initial = false}) async {
    if (!initial) setState(() => _loading = true);
    try {
      final h = await ref.read(fieldRepositoryProvider).getHandover(widget.handoverId);
      if (!mounted) return;
      setState(() {
        _apply(h);
        _loadFailed = false;
      });
    } on RepositoryException {
      if (mounted) setState(() => _loadFailed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final status = _status;
    final h = _handover;
    final (NoticeTone tone, IconData icon, String title, String? body) = switch (status) {
      HandoverStatus.accepted =>
        (NoticeTone.success, LucideIcons.circleCheck, t.handoverAccepted, t.handoverAcceptedBody),
      HandoverStatus.disputed => (
          NoticeTone.danger,
          LucideIcons.triangleAlert,
          t.handoverDisputed,
          (h?.disputeReason?.trim().isNotEmpty ?? false)
              ? t.handoverDisputedBody(h!.disputeReason!.trim())
              : t.handoverDisputedNoReason,
        ),
      HandoverStatus.canceled => (NoticeTone.neutral, LucideIcons.circleX, t.handoverCanceled, null),
      HandoverStatus.pendingCustomer when _lastError != null => (
          NoticeTone.warning,
          LucideIcons.creditCard,
          t.handoverPaymentDeclined,
          t.handoverPaymentDeclinedBody,
        ),
      _ => (NoticeTone.info, LucideIcons.hourglass, t.handoverWaiting, t.handoverWaitingBody),
    };
    return Scaffold(
      body: Column(
        children: [
          OperatorTopBar(title: t.handoverTitle),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              children: [
                const ConnectivityBanner(padding: EdgeInsets.only(bottom: VoltiSpacing.s10)),
                if (status == null && _loading)
                  const Center(child: CircularProgressIndicator())
                else ...[
                  if (status == HandoverStatus.accepted)
                    const Padding(
                      padding: EdgeInsets.only(bottom: VoltiSpacing.s16),
                      child: Center(child: VoltiSuccessCheck()),
                    ),
                  Notice(
                    key: const Key('handover-status'),
                    tone: tone,
                    icon: icon,
                    title: title,
                    body: body,
                  ),
                ],
                if (h?.vehicleCode != null) ...[
                  const SizedBox(height: VoltiSpacing.s12),
                  Text(t.handoverVehicle(h!.vehicleCode!),
                      style: VoltiTypography.body.copyWith(fontFamily: VoltiTypography.fontMono)),
                ],
                if (_loadFailed) ...[
                  const SizedBox(height: VoltiSpacing.s12),
                  Notice(
                    key: const Key('handover-load-error'),
                    tone: NoticeTone.neutral,
                    icon: LucideIcons.cloudOff,
                    title: t.handoverLoadError,
                  ),
                ],
                const SizedBox(height: VoltiSpacing.s20),
                VoltiButton(
                  key: const Key('handover-refresh'),
                  label: t.handoverRefresh,
                  icon: LucideIcons.refreshCw,
                  variant: VoltiButtonVariant.secondary,
                  fullWidth: true,
                  loading: _loading,
                  onPressed: _loading ? null : _refresh,
                ),
                const SizedBox(height: VoltiSpacing.s10),
                VoltiButton(
                  key: const Key('handover-back'),
                  label: t.handoverBackToAgenda,
                  variant: VoltiButtonVariant.ghost,
                  fullWidth: true,
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
