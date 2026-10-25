import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/geo.dart';
import '../../core/widgets.dart';
import '../payments/debt_pix_sheet.dart';

/// Aviso da home com divida em aberto (R2-01): soma do saldo devedor e "Pagar agora" (Pix da
/// divida mais antiga; as outras aparecem depois). Sem divida (ou sem resposta) nao ocupa espaco.
class PendingPaymentBanner extends ConsumerWidget {
  const PendingPaymentBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final debts = ref.watch(openDebtsProvider).value ?? const [];
    if (debts.isEmpty) return const SizedBox.shrink();
    final l = context.l;
    final total = debts.fold<int>(0, (acc, p) => acc + (p.outstandingCents ?? 0));
    final first = debts.first;
    return Padding(
      key: const Key('home-pending-payment'),
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          NoticeBanner(danger: true, icon: LucideIcons.circleAlert, title: l.paymentPendingTitle, message: l.paymentPendingHomeText(money(total))),
          const SizedBox(height: VoltiSpacing.s8),
          VoltiButton(
            key: const Key('home-pay-now'),
            label: l.payNow,
            icon: LucideIcons.qrCode,
            fullWidth: true,
            onPressed: () => payDebtWithPix(context, ref, paymentId: first.id, amountCents: first.outstandingCents ?? 0),
          ),
        ],
      ),
    );
  }
}
