import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/cognito_auth.dart';
import 'package:volti_operador/data/depot_state.dart';
import 'package:volti_operador/data/local_state.dart';
import 'package:volti_operador/data/service_unlock.dart';
import 'package:volti_operador/l10n/app_localizations.dart';
import 'package:volti_operador/ui/widgets.dart';

/// Identificador da sessao (e-mail, ou o nome quando o token nao traz e-mail).
String? _sessionId(AuthSession? s) => switch (s) {
      null => null,
      OperatorSession(:final email, :final name) => email ?? name ?? campoGroup,
      _ => s.email,
    };

/// Estado de sessao: e-mail logado ou `null`.
class SessionController extends Notifier<String?> {
  @override
  String? build() {
    final auth = ref.watch(authRepositoryProvider);
    return _sessionId(auth.session);
  }

  /// Modo `dev`: `POST /dev/token` (pool `staff`, grupo `campo`).
  /// Modo `cognito`: Hosted UI do pool interno (PKCE, MFA no Hosted UI);
  /// [email] e ignorado.
  Future<void> signIn([String email = '']) async {
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
    } else if (auth is OperatorCognitoAuthRepository) {
      state = _sessionId(await auth.signIn());
    } else if (auth is CognitoAuthRepository) {
      await auth.signIn(pool: DevAuthPool.staff); // lanca UnimplementedError
    }
  }

  /// [userInitiated] = o operador tocou em "Sair" (encerra tambem o Hosted UI).
  /// A saida forcada (token expirado, na sincronizacao) usa o padrao `false`.
  Future<void> signOut({bool userInitiated = false}) async {
    try {
      // Nada do operador anterior fica destravado nem em rascunho.
      await ref.read(serviceUnlockProvider.notifier).clearAll();
    } catch (e) {
      // Falha local (Hive) nunca impede a saida da conta.
      debugPrint('falha ao limpar o modo servico: $e');
    } finally {
      ref.invalidate(inspectionDraftsProvider);
      ref.invalidate(pickupDraftsProvider);
      final auth = ref.read(authRepositoryProvider);
      try {
        if (auth is OperatorCognitoAuthRepository) {
          await auth.signOut(endHostedSession: userInitiated);
        } else {
          await auth.signOut();
        }
      } finally {
        state = null;
      }
    }
  }
}

final sessionProvider = NotifierProvider<SessionController, String?>(SessionController.new);

/// Nome para a saudacao: `given_name` do id token (Cognito) ou a parte local
/// do e-mail (dev), com a inicial maiuscula.
final operatorNameProvider = Provider<String>((ref) {
  final id = ref.watch(sessionProvider) ?? '';
  final s = ref.watch(authRepositoryProvider).session;
  final raw = (s is OperatorSession ? s.name : null) ?? id.split('@').first.trim();
  if (raw.isEmpty) return raw;
  return raw[0].toUpperCase() + raw.substring(1);
});

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
    } on CognitoSignInCancelled {
      // Fechou o Hosted UI: volta sem erro.
    } on CampoGroupRequired {
      _error = t.loginCampoRequired;
    } on CognitoNotConfigured catch (e) {
      _error = t.loginCognitoMissing(e.missing.join(', '));
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
    final cognito = ref.watch(authRepositoryProvider).mode == AuthMode.cognito;
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
                if (cognito)
                  Notice(
                    tone: NoticeTone.info,
                    icon: LucideIcons.shieldCheck,
                    title: t.loginCognitoAction,
                    body: t.loginCognitoHint,
                  )
                else
                  TextField(
                    key: const Key('login-email'),
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
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
                  label: cognito ? t.loginCognitoAction : t.loginAction,
                  icon: cognito ? LucideIcons.logIn : null,
                  fullWidth: true,
                  size: VoltiButtonSize.lg,
                  loading: _busy,
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
