import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/geo.dart';
import '../../core/widgets.dart';
import 'account_common.dart';

/// `DisputeCreate.reason`: 3 a 200 caracteres; `description` ate 2000 (openapi).
const kDisputeReasonMin = 3;
const kDisputeReasonMax = 200;
const kDisputeDescriptionMax = 2000;

/// Contestacao de cobranca de um aluguel. Devolve `true` quando enviada.
class DisputeSheet extends ConsumerStatefulWidget {
  const DisputeSheet({super.key, required this.rentalId});
  final String rentalId;

  static Future<bool?> show(BuildContext context, String rentalId) =>
      VoltiBottomSheet.show<bool>(context, builder: (_) => DisputeSheet(rentalId: rentalId));

  @override
  ConsumerState<DisputeSheet> createState() => _DisputeSheetState();
}

class _DisputeSheetState extends ConsumerState<DisputeSheet> {
  final _reason = TextEditingController();
  final _desc = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _reason.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l = context.l;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final d = _desc.text.trim();
      await ref.read(backendProvider).dispute(widget.rentalId, _reason.text.trim(), d.isEmpty ? null : d);
      ref.invalidate(disputesProvider);
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
    final ok = _reason.text.trim().length >= kDisputeReasonMin && !_busy;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Semantics(header: true, child: Text(l.disputeTitle, style: VoltiTypography.title)),
          const SizedBox(height: VoltiSpacing.s12),
          TextField(
            key: const Key('dispute-reason'),
            controller: _reason,
            maxLength: kDisputeReasonMax,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: l.disputeReasonLabel, hintText: l.disputeHint),
          ),
          TextField(
            controller: _desc,
            maxLines: 3,
            maxLength: kDisputeDescriptionMax,
            decoration: InputDecoration(labelText: l.disputeDetailsLabel),
          ),
          if (_error != null) NoticeBanner(danger: true, icon: LucideIcons.circleAlert, message: _error!),
          const SizedBox(height: VoltiSpacing.s12),
          VoltiButton(label: l.send, icon: LucideIcons.send, fullWidth: true, loading: _busy, onPressed: ok ? _send : null),
          const SizedBox(height: VoltiSpacing.s8),
          VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
        ]),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Minhas solicitacoes: contestacoes e sinistros com o status
// ---------------------------------------------------------------------------

class RequestsScreen extends ConsumerWidget {
  const RequestsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    return VoltiScaffold(
      title: l.requestsTitle,
      bottom: VoltiButton(
        label: l.requestsNew,
        icon: LucideIcons.plus,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        onPressed: () => context.push('/account/history?pick=1'),
      ),
      body: VoltiRefresh(
        onRefresh: () async {
          ref.invalidate(disputesProvider);
          ref.invalidate(claimsProvider);
          await Future.wait([ref.read(disputesProvider.future), ref.read(claimsProvider.future)]);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
          children: [
            SectionTitle(l.requestsClaims),
            AsyncView<List<Claim>>(
              value: ref.watch(claimsProvider),
              onRetry: () => ref.invalidate(claimsProvider),
              loading: (_) => VoltiSkeleton.list(rows: 2, label: l.loading),
              data: (list) => list.isEmpty
                  ? Text(l.requestsClaimsEmpty, style: VoltiTypography.body)
                  : Column(children: [
                      for (final c in list)
                        _RequestRow(
                          icon: LucideIcons.shieldAlert,
                          title: claimTypeLabel(context, c.type),
                          subtitle: c.statusNote == null
                              ? formatDateTimeSp(c.createdAt)
                              : '${formatDateTimeSp(c.createdAt)} · ${c.statusNote}',
                          status: claimStatusLabel(context, c.status),
                          tone: switch (c.status) {
                            ClaimStatus.approved || ClaimStatus.paid => VoltiBadgeTone.success,
                            ClaimStatus.rejected => VoltiBadgeTone.danger,
                            ClaimStatus.underReview => VoltiBadgeTone.info,
                            _ => VoltiBadgeTone.neutral,
                          },
                        ),
                    ]),
            ),
            SectionTitle(l.requestsDisputes),
            AsyncView<List<Dispute>>(
              value: ref.watch(disputesProvider),
              onRetry: () => ref.invalidate(disputesProvider),
              loading: (_) => VoltiSkeleton.list(rows: 2, label: l.loading),
              data: (list) => list.isEmpty
                  ? Text(l.requestsDisputesEmpty, style: VoltiTypography.body)
                  : Column(children: [
                      for (final d in list)
                        _RequestRow(
                          icon: LucideIcons.fileText,
                          title: d.reason,
                          subtitle: [
                            formatDateTimeSp(d.createdAt),
                            if (d.refundAmountCents != null && d.refundAmountCents! > 0) l.disputeRefund(money(d.refundAmountCents!)),
                            if (d.resolution != null) d.resolution!,
                          ].join(' · '),
                          status: disputeStatusLabel(context, d.status),
                          tone: switch (d.status) {
                            DisputeStatus.accepted => VoltiBadgeTone.success,
                            DisputeStatus.rejected => VoltiBadgeTone.danger,
                            DisputeStatus.underReview => VoltiBadgeTone.info,
                            _ => VoltiBadgeTone.neutral,
                          },
                        ),
                    ]),
            ),
          ],
        ),
      ),
    );
  }
}

String claimTypeLabel(BuildContext context, ClaimType t) {
  final l = context.l;
  return switch (t) {
    ClaimType.accident => l.claimAccident,
    ClaimType.theft => l.claimTheft,
    ClaimType.damage => l.claimDamage,
    _ => l.claimInjury,
  };
}

String claimStatusLabel(BuildContext context, ClaimStatus s) {
  final l = context.l;
  return switch (s) {
    ClaimStatus.underReview => l.statusUnderReview,
    ClaimStatus.approved => l.statusApproved,
    ClaimStatus.rejected => l.statusRejected,
    ClaimStatus.paid => l.statusPaid,
    _ => l.statusSubmitted,
  };
}

String disputeStatusLabel(BuildContext context, DisputeStatus s) {
  final l = context.l;
  return switch (s) {
    DisputeStatus.underReview => l.statusUnderReview,
    DisputeStatus.accepted => l.statusAccepted,
    DisputeStatus.rejected => l.statusRejected,
    _ => l.statusOpen,
  };
}

class _RequestRow extends StatelessWidget {
  const _RequestRow({required this.icon, required this.title, required this.subtitle, required this.status, required this.tone});
  final IconData icon;
  final String title;
  final String subtitle;
  final String status;
  final VoltiBadgeTone tone;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: VoltiSpacing.s4),
        child: Row(children: [
          Expanded(child: ListRow(title: title, subtitle: subtitle, icon: icon, trailing: ListRowTrailing.none)),
          VoltiBadge(label: status, tone: tone, size: VoltiBadgeSize.sm),
          const SizedBox(width: VoltiSpacing.s8),
        ]),
      );
}
