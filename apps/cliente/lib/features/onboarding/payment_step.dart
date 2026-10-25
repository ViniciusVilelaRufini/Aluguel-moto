import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/services.dart';
import '../../core/widgets.dart';
import 'step_shell.dart';

enum OnboardingPayMethod { card, pix }

final onboardingCardsProvider =
    FutureProvider.autoDispose<List<PaymentCard>>((ref) => ref.watch(backendProvider).cards());

/// Passo 4 de 4 (Onboarding.jsx "Forma de pagamento"): cartao de credito
/// (tokenizado pelo [CardTokenizer] → `POST /payments/cards`) ou Pix + carteira.
/// A caucao de cada aluguel e escolhida de novo no Plano; aqui o cliente deixa o
/// cartao pronto ou entende como funciona o Pix. A chave Pix para estornos nao
/// existe no contrato (proposta em docs/decisoes.md) e fica fora da tela.
class PaymentStep extends ConsumerStatefulWidget {
  const PaymentStep({super.key, required this.onBack, required this.onDone});
  final VoidCallback onBack;
  final VoidCallback onDone;

  @override
  ConsumerState<PaymentStep> createState() => _PaymentStepState();
}

class _PaymentStepState extends ConsumerState<PaymentStep> {
  OnboardingPayMethod _method = OnboardingPayMethod.card;
  PaymentCard? _added;
  bool _adding = false;

  Future<void> _addCard() async {
    final l = context.l;
    setState(() => _adding = true);
    try {
      final token = await ref.read(cardTokenizerProvider).tokenize(context);
      if (token == null) return;
      final card = await ref.read(backendProvider).addCard(token);
      ref.invalidate(onboardingCardsProvider);
      if (mounted) setState(() => _added = card);
      VoltiHaptics.success();
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  void _select(OnboardingPayMethod m) {
    if (_method == m) return;
    VoltiHaptics.selection();
    setState(() => _method = m);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final cards = ref.watch(onboardingCardsProvider);
    final list = cards.value ?? const <PaymentCard>[];
    final card = _added ?? list.where((c) => c.isDefault).firstOrNull ?? list.firstOrNull;
    final ready = _method == OnboardingPayMethod.pix || card != null;
    return OnboardingStepShell(
      step: 3,
      title: l.payTitle,
      subtitle: l.paySubtitle,
      onBack: _adding ? null : widget.onBack,
      cta: VoltiButton(
        key: const Key('pay-finish'),
        label: l.payFinish,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        onPressed: ready && !_adding ? widget.onDone : null,
      ),
      children: [
        OptionCard(
          key: const Key('pay-card'),
          title: l.payCard,
          icon: LucideIcons.creditCard,
          description: card == null ? l.payCardMissing : '${card.brand} •••• ${card.last4}',
          selected: _method == OnboardingPayMethod.card,
          onTap: () => _select(OnboardingPayMethod.card),
        ),
        if (_method == OnboardingPayMethod.card && card == null && !cards.isLoading)
          Padding(
            padding: const EdgeInsets.only(top: VoltiSpacing.s8),
            child: VoltiButton(
              key: const Key('pay-add-card'),
              label: l.addCard,
              icon: LucideIcons.plus,
              variant: VoltiButtonVariant.secondary,
              fullWidth: true,
              loading: _adding,
              onPressed: _adding ? null : _addCard,
            ),
          ),
        const SizedBox(height: VoltiSpacing.s14),
        OptionCard(
          key: const Key('pay-pix'),
          title: l.payPixWallet,
          icon: LucideIcons.wallet,
          description: l.payPixHint,
          selected: _method == OnboardingPayMethod.pix,
          onTap: () => _select(OnboardingPayMethod.pix),
        ),
        if (_method == OnboardingPayMethod.pix) ...[
          const SizedBox(height: VoltiSpacing.s14),
          _InfoAlert(key: const Key('pay-pix-explain'), message: l.payPixExplain),
        ],
      ],
    );
  }
}

/// `Alert tone="info"` do DS (fundo info-soft, texto info-ink).
class _InfoAlert extends StatelessWidget {
  const _InfoAlert({super.key, required this.message});
  final String message;

  @override
  Widget build(BuildContext context) => Semantics(
        container: true,
        liveRegion: true,
        child: Container(
          padding: const EdgeInsets.all(VoltiSpacing.s12),
          decoration: BoxDecoration(color: context.palette.infoSoft, borderRadius: VoltiRadii.rMd),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(LucideIcons.info, size: 18, color: context.palette.infoInk),
              const SizedBox(width: VoltiSpacing.s10),
              Expanded(child: Text(message, style: VoltiTypography.caption.copyWith(color: context.palette.infoInk))),
            ],
          ),
        ),
      );
}
