import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/features/auth/auth.dart';

import 'helpers.dart';

class _FailingAuth extends DevAuthRepository {
  _FailingAuth() : super(baseUrl: 'http://127.0.0.1:1');

  @override
  Future<AuthSession> signIn({
    required String sub,
    required String email,
    List<String> groups = const [],
    DevAuthPool pool = DevAuthPool.customer,
  }) async =>
      throw StateError('cleartext bloqueado');
}

void main() {
  testWidgets('falha de login mostra erro, nunca silencio', (tester) async {
    final h = Harness();
    await h.pump(tester, const LoginPage(), extraOverrides: [
      authRepositoryProvider.overrideWithValue(_FailingAuth()),
    ]);
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pump();
    await tester.pump();
    expect(find.textContaining('Não foi possível entrar. Verifique a conexão'), findsOneWidget);
    // O botao volta a ficar ativo.
    expect(tester.widget<VoltiButton>(find.byKey(const Key('login-submit'))).onPressed, isNotNull);
  });
}
