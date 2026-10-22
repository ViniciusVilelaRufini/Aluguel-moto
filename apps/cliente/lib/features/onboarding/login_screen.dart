import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/session.dart';
import '../../core/widgets.dart';
import 'otp_flow.dart';
import 'otp_step.dart';

export 'welcome_screen.dart';

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
