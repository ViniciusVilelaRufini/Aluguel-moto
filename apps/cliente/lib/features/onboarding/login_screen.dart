import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/session.dart';
import '../../core/widgets.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
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
                  const SizedBox(height: VoltiSpacing.s24),
                  Container(
                    height: 220,
                    decoration: BoxDecoration(color: VoltiColors.sky100, borderRadius: VoltiRadii.rXl),
                    alignment: Alignment.center,
                    child: const Icon(LucideIcons.bike, size: 72, color: VoltiColors.blue600),
                  ),
                  const SizedBox(height: VoltiSpacing.s20),
                  Wrap(spacing: 8, children: [
                    for (final t in [l.badgeNoLicense, l.badgeNoPlate, l.badgeAdult])
                      Chip(label: Text(t), visualDensity: VisualDensity.compact),
                  ]),
                  const SizedBox(height: VoltiSpacing.s12),
                  Text(l.welcomeTitle, style: VoltiTypography.display),
                  const SizedBox(height: VoltiSpacing.s8),
                  Text(l.welcomeSubtitle, style: VoltiTypography.body),
                  const SizedBox(height: VoltiSpacing.s24),
                  VoltiButton(
                    label: l.continueWithEmail,
                    icon: LucideIcons.mail,
                    size: VoltiButtonSize.lg,
                    fullWidth: true,
                    onPressed: () => context.go('/login'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
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
    final isDev = ref.watch(authRepositoryProvider).mode == AuthMode.dev;
    return VoltiScaffold(
      title: l.loginTitle,
      body: ListView(
        padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
        children: [
          Text(isDev ? l.loginDevHint : l.loginCognitoPending, style: VoltiTypography.body),
          const SizedBox(height: VoltiSpacing.s16),
          if (isDev) ...[
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
        ],
      ),
    );
  }
}
