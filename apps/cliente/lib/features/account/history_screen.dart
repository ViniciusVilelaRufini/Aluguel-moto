import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/geo.dart';
import '../../core/widgets.dart';
import 'account_common.dart';
import 'requests_screen.dart';

/// Historico e recibos. Com [pick], abre no modo "escolha a corrida" para
/// contestar uma cobranca ou abrir sinistro.
class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key, this.pick = false});
  final bool pick;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    return VoltiScaffold(
      title: pick ? l.historyPickTitle : l.historyTitle,
      body: AsyncView<List<Rental>>(
        value: ref.watch(historyProvider),
        onRetry: () => ref.invalidate(historyProvider),
        loading: (_) => accountListSkeleton(l.loading),
        data: (list) {
          final rentals = list.where((r) => !pick || r.status == RentalStatus.ended || r.status == RentalStatus.forceEnded).toList();
          if (rentals.isEmpty) {
            return VoltiEmptyState(
              icon: LucideIcons.history,
              title: l.historyEmptyTitle,
              message: l.historyEmpty,
              actionLabel: l.goToMap,
              actionIcon: LucideIcons.map,
              onAction: () => context.go('/home'),
            );
          }
          return VoltiRefresh(
            onRefresh: () => ref.refresh(historyProvider.future),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              children: [
                if (pick)
                  Padding(
                    padding: const EdgeInsets.only(bottom: VoltiSpacing.s12),
                    child: Text(l.historyPickHint, style: VoltiTypography.body),
                  ),
                // Cascata so nos primeiros itens (lista pode ser longa).
                ...VoltiStagger.wrap([
                  for (final r in rentals.take(8)) _row(context, r),
                ]),
                for (final r in rentals.skip(8)) _row(context, r),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _row(BuildContext context, Rental r) {
    final l = context.l;
    return ListRow(
      title: l.historyItem(r.vehicleCode, formatDateTimeSp(r.startedAt)),
      icon: LucideIcons.motorbike,
      subtitle: durationLabel(r.elapsedSeconds),
      value: money(r.costCents),
      trailing: ListRowTrailing.chevron,
      onTap: () => RentalActionsSheet.show(context, r, pick: pick),
    );
  }
}

/// Acoes de uma corrida: recibo (com trajeto, nota fiscal e avaliacao), contestar e sinistro.
class RentalActionsSheet extends StatelessWidget {
  const RentalActionsSheet({super.key, required this.rental, required this.onAction, this.pick = false});
  final Rental rental;
  final bool pick;
  final void Function(String action) onAction;

  static Future<void> show(BuildContext context, Rental r, {bool pick = false}) async {
    final action = await VoltiBottomSheet.show<String>(
      context,
      builder: (ctx) => RentalActionsSheet(rental: r, pick: pick, onAction: (a) => Navigator.of(ctx).pop(a)),
    );
    if (!context.mounted) return;
    switch (action) {
      case 'receipt':
        context.push('/summary/${r.id}');
      case 'claim':
        context.push('/account/claim/${r.id}');
      case 'dispute':
        final ok = await DisputeSheet.show(context, r.id);
        if (ok == true && context.mounted) VoltiToast.show(context, context.l.disputeSent, tone: VoltiToastTone.success);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Semantics(header: true, child: Text(l.historyItem(rental.vehicleCode, formatDateTimeSp(rental.startedAt)), style: VoltiTypography.heading)),
      const SizedBox(height: VoltiSpacing.s4),
      Text('${durationLabel(rental.elapsedSeconds)} · ${money(rental.costCents)}', style: VoltiTypography.caption),
      const SizedBox(height: VoltiSpacing.s16),
      if (!pick) ...[
        VoltiButton(label: l.viewReceipt, icon: LucideIcons.receipt, fullWidth: true, onPressed: () => onAction('receipt')),
        const SizedBox(height: 8),
      ],
      VoltiButton(
          label: l.disputeCharge,
          icon: LucideIcons.fileText,
          variant: VoltiButtonVariant.secondary,
          fullWidth: true,
          onPressed: () => onAction('dispute')),
      const SizedBox(height: 8),
      VoltiButton(
          label: l.openClaim,
          icon: LucideIcons.shieldAlert,
          variant: VoltiButtonVariant.secondary,
          fullWidth: true,
          onPressed: () => onAction('claim')),
    ]);
  }
}
