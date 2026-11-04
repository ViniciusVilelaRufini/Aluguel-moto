import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/geo.dart';
import '../../core/widgets.dart';
import 'account_common.dart';

/// Aviso das telas da conta que ficaram so de leitura no balcao (carteira e plano).
class ReadOnlyCounterNotice extends StatelessWidget {
  const ReadOnlyCounterNotice({super.key});

  @override
  Widget build(BuildContext context) => NoticeBanner(
        key: const Key('read-only-counter-notice'),
        info: true,
        icon: LucideIcons.warehouse,
        message: context.l.readOnlyCounterNotice,
      );
}

// ---------------------------------------------------------------------------
// Carteira de creditos (so leitura)
// ---------------------------------------------------------------------------

/// Saldo e extrato da carteira. Nada se paga no app (balcao): sem recarga nem pacotes de
/// minutos; o saldo que sobrou e usado ou devolvido pelo galpao. A Conta so abre esta tela
/// com saldo.
class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    return VoltiScaffold(
      title: l.wallet,
      body: VoltiRefresh(
        onRefresh: () async {
          ref.invalidate(ledgerProvider);
          ref.invalidate(walletProvider);
          await ref.read(walletProvider.future);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
          children: [
            AsyncView<Wallet>(
              value: ref.watch(walletProvider),
              onRetry: () => ref.invalidate(walletProvider),
              loading: (_) => VoltiSkeleton.card(height: 96, label: l.loading),
              data: (w) => Semantics(
                container: true,
                label: '${l.walletBalanceTitle}: ${money(w.balanceCents)}, ${l.minutesBalance(w.minutesBalance)}',
                excludeSemantics: true,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(VoltiSpacing.s16),
                  decoration: BoxDecoration(color: context.palette.pill, borderRadius: VoltiRadii.rLg),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(l.walletBalanceTitle, style: VoltiTypography.caption.copyWith(color: Colors.white70)),
                    VoltiCountUp(value: w.balanceCents, format: money, style: VoltiTypography.title.copyWith(color: Colors.white)),
                    Text(l.minutesBalance(w.minutesBalance), style: VoltiTypography.caption.copyWith(color: Colors.white70)),
                  ]),
                ),
              ),
            ),
            const SizedBox(height: VoltiSpacing.s10),
            const ReadOnlyCounterNotice(),
            SectionTitle(l.walletLedgerTitle),
            AsyncView<List<WalletEntry>>(
              value: ref.watch(ledgerProvider),
              onRetry: () => ref.invalidate(ledgerProvider),
              loading: (_) => VoltiSkeleton.list(rows: 3, label: l.loading),
              data: (list) => list.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: VoltiSpacing.s12),
                      child: Text(l.walletLedgerEmpty, style: VoltiTypography.body),
                    )
                  : Column(children: [for (final e in list) _LedgerRow(entry: e)]),
            ),
          ],
        ),
      ),
    );
  }
}

class _LedgerRow extends StatelessWidget {
  const _LedgerRow({required this.entry});
  final WalletEntry entry;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final credit = entry.amountCents >= 0;
    final amount = entry.amountCents == 0 && (entry.minutes ?? 0) != 0
        ? l.minutesDelta(entry.minutes!)
        : '${credit ? '+' : ''}${money(entry.amountCents)}';
    return ListRow(
      title: entry.description,
      icon: credit ? LucideIcons.arrowDownLeft : LucideIcons.arrowUpRight,
      iconTone: credit ? ListRowTone.brand : ListRowTone.neutral,
      subtitle: formatDateTimeSp(entry.createdAt),
      value: amount,
      trailing: ListRowTrailing.none,
    );
  }
}
