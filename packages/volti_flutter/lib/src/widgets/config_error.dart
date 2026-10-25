import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../theme.dart';
import '../tokens/spacing.dart';
import '../tokens/typography.dart';
import 'logo.dart';
import 'states.dart';

/// App minimo de tela cheia para build release mal configurado (define
/// obrigatorio ausente, ex.: `API_BASE_URL`, `SUPPORT_PHONE`). Mostra o que
/// falta em pt-BR em vez de encerrar a inicializacao com uma excecao.
class ConfigErrorApp extends StatelessWidget {
  const ConfigErrorApp({super.key, required this.problems});

  /// Um item por problema (ex.: `SUPPORT_PHONE ausente ...`).
  final List<String> problems;

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Volti',
        debugShowCheckedModeBanner: false,
        theme: VoltiTheme.light(),
        darkTheme: VoltiTheme.dark(),
        locale: const Locale('pt', 'BR'),
        home: ConfigErrorPage(problems: problems),
      );
}

class ConfigErrorPage extends StatelessWidget {
  const ConfigErrorPage({super.key, required this.problems});
  final List<String> problems;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            key: const Key('config-error-scroll'),
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                VoltiLogo(
                  key: const Key('config-error-logo'),
                  variant: VoltiLogoVariant.adaptive(Theme.of(context).brightness),
                  fontSize: 26,
                ),
                const SizedBox(height: VoltiSpacing.s24),
                const VoltiEmptyState(
                  icon: LucideIcons.triangleAlert,
                  title: 'Configuração inválida do app',
                  message: 'Esta versão foi gerada sem informações obrigatórias. Gere o app de novo com os valores abaixo.',
                ),
                const SizedBox(height: VoltiSpacing.s16),
                for (final p in problems)
                  Padding(
                    padding: const EdgeInsets.only(bottom: VoltiSpacing.s8),
                    child: Semantics(
                      container: true,
                      child: Text(p, textAlign: TextAlign.center, style: VoltiTypography.bodyStrong.copyWith(color: scheme.error)),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
