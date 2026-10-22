import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/cognito.dart';
import '../../core/cognito_auth.dart';
import '../../core/session.dart';
import '../../core/widgets.dart';
import 'otp_flow.dart';
import 'otp_step.dart';

/// Boas-vindas (Onboarding.jsx step 0): celular (primario), Apple + Google lado a
/// lado e "Entrar com e-mail" (ghost). No modo dev, celular usa o codigo fixo,
/// e-mail abre o login de dev e Google/Apple so mostram um aviso.
class WelcomeScreen extends ConsumerStatefulWidget {
  const WelcomeScreen({super.key});
  @override
  ConsumerState<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends ConsumerState<WelcomeScreen> {
  IdentityProvider? _busy;

  Future<void> _social(IdentityProvider provider) async {
    final l = context.l;
    final auth = ref.read(authRepositoryProvider);
    if (auth.mode == AuthMode.dev) {
      VoltiToast.show(context, l.welcomeSocialDevOnly, tone: VoltiToastTone.info);
      return;
    }
    if (auth is! CognitoCustomerAuthRepository || !auth.config.hasHostedUi) {
      VoltiToast.show(context, l.loginCognitoPending, tone: VoltiToastTone.warning);
      return;
    }
    setState(() => _busy = provider);
    try {
      await ref.read(sessionProvider.notifier).signInWithProvider(provider);
    } on CognitoException catch (e) {
      if (e.type != 'Canceled' && mounted) VoltiToast.show(context, l.socialSignInError, tone: VoltiToastTone.danger);
    } catch (_) {
      if (mounted) VoltiToast.show(context, l.socialSignInError, tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final isDev = ref.watch(authRepositoryProvider).mode == AuthMode.dev;
    final busy = _busy != null;
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, c) => SingleChildScrollView(
            padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: c.maxHeight - 2 * VoltiSpacing.screenGutter),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(
                    header: true,
                    child: Text('volti',
                        style: TextStyle(
                            fontFamily: VoltiTypography.fontSans,
                            fontWeight: FontWeight.w800,
                            fontSize: 26,
                            letterSpacing: -1,
                            color: scheme.primary)),
                  ),
                  const SizedBox(height: VoltiSpacing.s20),
                  // Slot da arte de boas-vindas (E-19): ilustracao da marca ainda nao entregue.
                  ExcludeSemantics(
                    child: Container(
                      height: 200,
                      decoration: BoxDecoration(color: VoltiColors.sky100, borderRadius: VoltiRadii.rXl),
                      alignment: Alignment.center,
                      child: const Icon(LucideIcons.bike, size: 72, color: VoltiColors.blue600),
                    ),
                  ),
                  const SizedBox(height: VoltiSpacing.s20),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final t in [l.badgeNoLicense, l.badgeNoPlate, l.badgeAdult]) SuccessBadge(label: t),
                  ]),
                  const SizedBox(height: VoltiSpacing.s14),
                  Text(l.welcomeTitle, style: VoltiTypography.display),
                  const SizedBox(height: VoltiSpacing.s8),
                  Text(l.welcomeSubtitle, style: VoltiTypography.body),
                  const SizedBox(height: VoltiSpacing.s24),
                  VoltiButton(
                    key: const Key('welcome-phone'),
                    label: l.welcomePhone,
                    icon: LucideIcons.phone,
                    size: VoltiButtonSize.lg,
                    fullWidth: true,
                    onPressed: busy ? null : () => context.go('/login?via=phone'),
                  ),
                  const SizedBox(height: VoltiSpacing.s10),
                  Row(children: [
                    Expanded(
                      child: Semantics(
                        label: l.welcomeAppleLabel,
                        button: true,
                        excludeSemantics: true,
                        child: VoltiButton(
                          key: const Key('welcome-apple'),
                          label: l.welcomeApple,
                          variant: VoltiButtonVariant.dark,
                          size: VoltiButtonSize.lg,
                          fullWidth: true,
                          loading: _busy == IdentityProvider.apple,
                          onPressed: busy ? null : () => _social(IdentityProvider.apple),
                        ),
                      ),
                    ),
                    const SizedBox(width: VoltiSpacing.s10),
                    Expanded(
                      child: Semantics(
                        label: l.welcomeGoogleLabel,
                        button: true,
                        excludeSemantics: true,
                        child: VoltiButton(
                          key: const Key('welcome-google'),
                          label: l.welcomeGoogle,
                          variant: VoltiButtonVariant.secondary,
                          size: VoltiButtonSize.lg,
                          fullWidth: true,
                          loading: _busy == IdentityProvider.google,
                          onPressed: busy ? null : () => _social(IdentityProvider.google),
                        ),
                      ),
                    ),
                  ]),
                  const SizedBox(height: VoltiSpacing.s10),
                  VoltiButton(
                    key: const Key('welcome-email'),
                    label: l.continueWithEmail,
                    icon: LucideIcons.mail,
                    variant: VoltiButtonVariant.ghost,
                    fullWidth: true,
                    onPressed: busy ? null : () => context.go('/login?via=email'),
                  ),
                  if (isDev) ...[
                    const SizedBox(height: VoltiSpacing.s8),
                    Text(
                      l.welcomeDevHint,
                      key: const Key('welcome-dev-hint'),
                      textAlign: TextAlign.center,
                      style: VoltiTypography.caption.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Badge `tone="success"` do DS (components/core/Badge.jsx): 26 px, raio xs,
/// fundo success-soft e texto success-ink semibold 12. Local ate o `VoltiBadge`
/// do lote C chegar em volti_flutter.
class SuccessBadge extends StatelessWidget {
  const SuccessBadge({super.key, required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        constraints: const BoxConstraints(minHeight: 26),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: const BoxDecoration(color: VoltiColors.successSoft, borderRadius: VoltiRadii.rXs),
        child: Text(
          label,
          style: const TextStyle(
            fontFamily: VoltiTypography.fontSans,
            fontWeight: VoltiTypography.fwSemibold,
            fontSize: 12,
            height: 1.4,
            color: VoltiColors.successInk,
          ),
        ),
      );
}

/// `/login?via=phone|email`. Celular: codigo por SMS (Cognito; no dev, codigo fixo).
/// E-mail: no modo dev, o login de desenvolvimento; no cognito, codigo por e-mail.
class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key, this.via});

  /// `phone` ou `email`. `null` le da URL (padrao `email`).
  final String? via;

  String _via(BuildContext context) {
    if (via != null) return via!;
    try {
      return GoRouterState.of(context).uri.queryParameters['via'] ?? 'email';
    } catch (_) {
      return 'email';
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDev = ref.watch(authRepositoryProvider).mode == AuthMode.dev;
    final phone = _via(context) == 'phone';
    void exit() => context.go('/welcome');
    if (phone) return OtpStep(channel: OtpChannel.sms, onExit: exit, showDevHint: isDev);
    if (!isDev) return OtpStep(channel: OtpChannel.email, onExit: exit);
    return const DevEmailLoginScreen();
  }
}

/// Login de desenvolvimento (`POST /dev/token`, pool customer). So com `AUTH_MODE=dev`.
class DevEmailLoginScreen extends ConsumerStatefulWidget {
  const DevEmailLoginScreen({super.key});
  @override
  ConsumerState<DevEmailLoginScreen> createState() => _DevEmailLoginScreenState();
}

class _DevEmailLoginScreenState extends ConsumerState<DevEmailLoginScreen> {
  final _email = TextEditingController(text: 'cliente@volti.dev');
  bool _busy = false;
  Object? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).signIn(_email.text);
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    return VoltiScaffold(
      title: l.loginTitle,
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          Text(l.loginDevHint, key: const Key('login-dev-hint'), style: VoltiTypography.body),
          const SizedBox(height: VoltiSpacing.s16),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: InputDecoration(labelText: l.email, prefixIcon: const Icon(LucideIcons.mail)),
          ),
          const SizedBox(height: VoltiSpacing.s16),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: VoltiSpacing.s12),
              child: ErrorState(error: _error!, onRetry: _busy ? null : _submit),
            ),
          VoltiButton(
            label: _busy ? l.loading : l.signIn,
            size: VoltiButtonSize.lg,
            fullWidth: true,
            onPressed: _busy ? null : _submit,
          ),
        ],
      ),
    );
  }
}
