import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/account/account_screens.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

Widget _router({bool reduced = false}) {
  final router = GoRouter(routes: [
    GoRoute(
      path: '/',
      pageBuilder: (c, s) => voltiPage(
        c,
        s,
        Scaffold(body: Builder(builder: (c) => TextButton(onPressed: () => c.push('/modal'), child: const Text('abrir')))),
      ),
    ),
    GoRoute(path: '/modal', pageBuilder: (c, s) => voltiPage(c, s, const Scaffold(body: Text('modal')), modal: true)),
  ]);
  return MediaQuery(
    data: MediaQueryData(disableAnimations: reduced),
    child: MaterialApp.router(routerConfig: router),
  );
}

void main() {
  testWidgets('router: scan abre como modal de baixo e a tela de tras recua', (t) async {
    await t.pumpWidget(_router());
    await t.tap(find.text('abrir'));
    await t.pump();
    await t.pump(const Duration(milliseconds: 120));
    final h = t.view.physicalSize.height / t.view.devicePixelRatio;
    final dy = t.getTopLeft(find.text('modal')).dy;
    expect(dy, allOf(greaterThan(0), lessThan(h)));
    await t.pump(const Duration(milliseconds: 100));
    expect(VoltiPageTransitions.recede.value, greaterThan(0));
    await t.pumpAndSettle();
    expect(find.text('modal'), findsOneWidget);
  });

  testWidgets('router: reduced motion abre sem transicao', (t) async {
    await t.pumpWidget(_router(reduced: true));
    await t.tap(find.text('abrir'));
    await t.pump();
    await t.pump(const Duration(milliseconds: 1));
    expect(t.getTopLeft(find.text('modal')).dy, 0);
  });

  testWidgets('conta: cascata entra e termina visivel; reduced mostra tudo de imediato', (t) async {
    tallScreen(t);
    Widget app({required bool reduced}) => MediaQuery(
          data: MediaQueryData(disableAnimations: reduced),
          child: testApp(const AccountScreen(), overrides: [
            backendProvider.overrideWithValue(_AccountBackend()),
            sessionProvider.overrideWith(() => FakeSession(session())),
          ]),
        );
    await t.pumpWidget(app(reduced: false));
    await t.pump(const Duration(milliseconds: 50));
    expect(find.byType(VoltiFadeUp), findsWidgets);
    final first = find.byType(VoltiFadeUp).first;
    expect(t.widget<Opacity>(find.descendant(of: first, matching: find.byType(Opacity)).first).opacity, lessThan(1));
    await t.pumpAndSettle();
    expect(find.descendant(of: find.byType(VoltiFadeUp).first, matching: find.byType(Opacity)), findsNothing);

    await t.pumpWidget(const SizedBox());
    await t.pumpWidget(app(reduced: true));
    await t.pump();
    expect(find.descendant(of: find.byType(VoltiFadeUp).first, matching: find.byType(Opacity)), findsNothing);
    expect(find.descendant(of: find.byType(VoltiFadeUp).first, matching: find.byType(Transform)), findsNothing);
  });
}

class _AccountBackend extends FakeBackend {
  @override
  Future<Wallet> wallet() async => Wallet((b) => b
    ..balanceCents = 0
    ..minutesBalance = 0
    ..updatedAt = DateTime.utc(2026));
  @override
  Future<List<Subscription>> subscriptions() async => [];
  @override
  Future<List<Rental>> rentals() async => [];
}
