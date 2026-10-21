import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Estado de sessao: e-mail logado ou `null`.
class SessionController extends Notifier<String?> {
  @override
  String? build() {
    final auth = ref.watch(authRepositoryProvider);
    return auth.session?.email;
  }

  /// Modo `dev`: `POST /dev/token` (pool `staff`, grupo `campo`).
  /// Modo `cognito`: mesma interface; o login hospedado ainda nao esta ligado.
  Future<void> signIn(String email) async {
    final auth = ref.read(authRepositoryProvider);
    if (auth is DevAuthRepository) {
      final name = email.split('@').first.trim().toLowerCase();
      await auth.signIn(
        sub: 'dev-$name',
        email: email.trim(),
        groups: const ['campo'],
        pool: DevAuthPool.staff,
      );
      state = email.trim();
    } else if (auth is CognitoAuthRepository) {
      await auth.signIn(pool: DevAuthPool.staff); // lanca UnimplementedError
    }
  }

  Future<void> signOut() async {
    await ref.read(authRepositoryProvider).signOut();
    state = null;
  }
}

final sessionProvider = NotifierProvider<SessionController, String?>(SessionController.new);

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _email = TextEditingController(text: 'campo@volti.dev');
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final t = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).signIn(_email.text);
    } on UnimplementedError {
      _error = t.loginCognitoUnavailable;
    } catch (e) {
      // Nunca falha em silencio: mostra o erro (detalhe so em debug).
      _error = kDebugMode ? '${t.loginError}\n($e)' : t.loginError;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      body: Column(
        children: [
          OperatorHeader(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.loginSubtitle,
                    style: VoltiTypography.caption.copyWith(color: const Color(0x99FFFFFF))),
                const SizedBox(height: VoltiSpacing.s4),
                Text(t.appTitle, style: VoltiTypography.title.copyWith(color: VoltiColors.white)),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
              children: [
                const SizedBox(height: VoltiSpacing.s16),
                TextField(
                  key: const Key('login-email'),
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(labelText: t.loginEmail),
                ),
                if (_error != null) ...[
                  const SizedBox(height: VoltiSpacing.s12),
                  Notice(
                      tone: NoticeTone.danger,
                      icon: LucideIcons.circleAlert,
                      title: _error!),
                ],
                const SizedBox(height: VoltiSpacing.s20),
                VoltiButton(
                  key: const Key('login-submit'),
                  label: t.loginAction,
                  fullWidth: true,
                  size: VoltiButtonSize.lg,
                  onPressed: _busy ? null : _submit,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
