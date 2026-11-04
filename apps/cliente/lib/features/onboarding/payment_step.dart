import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/widgets.dart';
import 'step_shell.dart';

/// Passo 4 de 4: "O pagamento é feito no galpão" (pré-reserva/balcão). Nada se
/// paga no app nesta fase: contrato, plano, pré-pago e caução são acertados no
/// balcão na retirada. So informa; nenhum dado de pagamento e pedido aqui.
class PaymentStep extends StatelessWidget {
  const PaymentStep({super.key, required this.onBack, required this.onDone});
  final VoidCallback onBack;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return OnboardingStepShell(
      step: 3,
      title: l.payTitle,
      subtitle: l.paySubtitle,
      onBack: onBack,
      cta: VoltiButton(
        key: const Key('pay-finish'),
        label: l.payFinish,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        onPressed: onDone,
      ),
      children: [
        _CounterItem(key: const Key('pay-counter-contract'), icon: LucideIcons.fileSignature, title: l.payCounterContractTitle, text: l.payCounterContractText),
        const SizedBox(height: VoltiSpacing.s14),
        _CounterItem(key: const Key('pay-counter-plan'), icon: LucideIcons.calendarClock, title: l.payCounterPlanTitle, text: l.payCounterPlanText),
        const SizedBox(height: VoltiSpacing.s14),
        _CounterItem(key: const Key('pay-counter-payment'), icon: LucideIcons.store, title: l.payCounterPaymentTitle, text: l.payCounterPaymentText),
      ],
    );
  }
}

/// Item informativo (icone + titulo + texto), sem toque.
class _CounterItem extends StatelessWidget {
  const _CounterItem({super.key, required this.icon, required this.title, required this.text});
  final IconData icon;
  final String title, text;

  @override
  Widget build(BuildContext context) => Semantics(
        container: true,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 22, color: VoltiColors.brand),
            const SizedBox(width: VoltiSpacing.s12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: VoltiTypography.bodyStrong),
                const SizedBox(height: 2),
                Text(text, style: VoltiTypography.caption.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ]),
            ),
          ],
        ),
      );
}
