import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/geo.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';

/// Dividas em aberto do cliente (R2-01). Falha (rede, teste sem backend) = sem aviso.
final openDebtsProvider = FutureProvider.autoDispose<List<Payment>>((ref) => ref.watch(backendProvider).openDebts());

/// Aviso da home com divida em aberto. Nada se paga no app (balcao): mostra so
/// "Valor a acertar no galpao: R$ X" (soma do saldo devedor), sem botao, tambem para
/// dividas antigas `failed` de cartao. Sem divida, mas com o cliente inadimplente (a cobranca
/// do ultimo aluguel ainda esta sendo retentada no cartao), mostra so "Cobranca em andamento".
/// Sem nenhum dos dois (ou sem resposta) nao ocupa espaco.
class PendingPaymentBanner extends ConsumerWidget {
  const PendingPaymentBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final debtsAsync = ref.watch(openDebtsProvider);
    final debts = debtsAsync.value ?? const [];
    final l = context.l;
    if (debts.isEmpty) {
      // So depois de saber que nao ha divida (evita piscar antes de carregar).
      final delinquent = ref.watch(sessionProvider).value?.customer?.delinquent ?? false;
      if (!delinquent || !debtsAsync.hasValue || debtsAsync.hasError) return const SizedBox.shrink();
      return Padding(
        key: const Key('home-payment-processing'),
        padding: const EdgeInsets.only(top: 8),
        child: NoticeBanner(info: true, icon: LucideIcons.hourglass, title: l.paymentProcessingHomeTitle, message: l.paymentProcessingHomeText),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: CounterDebtNotice(key: const Key('home-counter-debt'), debts: debts),
    );
  }
}

/// "Valor a acertar no galpao: R$ X" com a soma de `outstandingCents` das [debts].
class CounterDebtNotice extends StatelessWidget {
  const CounterDebtNotice({super.key, required this.debts});
  final List<Payment> debts;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final total = debts.fold<int>(0, (acc, p) => acc + (p.outstandingCents ?? 0));
    return NoticeBanner(danger: true, icon: LucideIcons.warehouse, title: l.counterDebtTitle(money(total)), message: l.counterDebtHomeText);
  }
}

/// O mesmo aviso no historico: so com divida em aberto (sem "Cobranca em andamento").
class HistoryCounterDebtBanner extends ConsumerWidget {
  const HistoryCounterDebtBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final debts = ref.watch(openDebtsProvider).value ?? const [];
    if (debts.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: VoltiSpacing.s12),
      child: CounterDebtNotice(key: const Key('history-counter-debt'), debts: debts),
    );
  }
}
