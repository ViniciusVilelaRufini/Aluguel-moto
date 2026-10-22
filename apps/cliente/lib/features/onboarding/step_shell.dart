import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/widgets.dart';

/// Total de passos do cadastro no design: codigo, dados, identidade e pagamento.
const onboardingTotalSteps = 4;

/// Moldura dos passos do cadastro (Onboarding.jsx `shell`): voltar (soft 40) +
/// `ProgressSteps` de 4, titulo, subtitulo, conteudo rolavel e CTA embaixo.
class OnboardingStepShell extends StatelessWidget {
  const OnboardingStepShell({
    super.key,
    required this.step,
    required this.title,
    required this.subtitle,
    required this.children,
    required this.cta,
    this.onBack,
  });

  /// Indice base 0 do passo (0 = codigo ... 3 = pagamento).
  final int step;
  final String title, subtitle;
  final List<Widget> children;
  final Widget cta;

  /// `null` desabilita o voltar (ex.: durante um envio); o botao continua visivel.
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, VoltiSpacing.s12, VoltiSpacing.screenGutter, 0),
              child: Row(children: [
                VoltiIconButton(
                  icon: LucideIcons.arrowLeft,
                  variant: VoltiIconButtonVariant.soft,
                  label: l.back,
                  onPressed: onBack,
                ),
                const SizedBox(width: VoltiSpacing.s14),
                Expanded(
                  child: ProgressSteps(
                    total: onboardingTotalSteps,
                    current: step,
                    label: l.stepOf(step + 1, onboardingTotalSteps),
                  ),
                ),
              ]),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
                children: [
                  Semantics(header: true, child: Text(title, style: VoltiTypography.title)),
                  const SizedBox(height: VoltiSpacing.s6),
                  Text(subtitle, style: VoltiTypography.body),
                  const SizedBox(height: VoltiSpacing.s20),
                  ...children,
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(VoltiSpacing.screenGutter, 0, VoltiSpacing.screenGutter, VoltiSpacing.s16),
              child: cta,
            ),
          ],
        ),
      ),
    );
  }
}
