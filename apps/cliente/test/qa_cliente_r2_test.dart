// Achados da rodada 2 do QA do app do cliente (Task 15): cada achado com teste a 100% e a 200% de fonte.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/code_sheet.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/account/help_screens.dart';
import 'package:volti_cliente/features/payments/card_form_sheet.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart' show RideScreen;
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';
import 'qa_cliente_test.dart' show phone;
import 'swap_fixtures.dart';

/// Backend de corrida cujo aluguel (e portanto `startedAt`/`pausedSeconds`) o teste controla.
class _Ride extends FakeBackend {
  _Ride(this.rentalNow);
  Rental rentalNow;
  int reads = 0;
  @override
  Future<Rental?> currentRental() async {
    reads++;
    return rentalNow;
  }

  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<List<GeoZone>> zones() async => const [];
  @override
  Future<List<PricingPlan>> plans() async => const [];
}

String clockText(WidgetTester t) => t.widget<VoltiTicker>(find.byKey(const Key('ride-clock')).first).text;

void main() {
  for (final scale in [1.0, 2.0]) {
    final pct = (scale * 100).round();


    testWidgets('R2-26 Aplicar so habilita com 3+ caracteres a $pct%', (t) async {
      phone(t, scale: scale);
      await t.pumpWidget(testApp(const Scaffold(
        body: CodeEntrySheet(title: 'Cupom', actionLabel: 'Aplicar', fieldKey: Key('f'), actionKey: Key('a')),
      )));
      await settle(t);
      expect(t.widget<VoltiButton>(find.byKey(const Key('a'))).onPressed, isNull);
      await t.enterText(find.byKey(const Key('f')), 'AB');
      await t.pump();
      expect(t.widget<VoltiButton>(find.byKey(const Key('a'))).onPressed, isNull);
      await t.enterText(find.byKey(const Key('f')), 'ABC');
      await t.pump();
      expect(t.widget<VoltiButton>(find.byKey(const Key('a'))).onPressed, isNotNull);
      expect(t.takeException(), isNull);
    });

    testWidgets('R2-07 selo do OptionCard abraca o texto, nao a coluna a $pct%', (t) async {
      phone(t, scale: scale);
      await t.pumpWidget(testApp(const Scaffold(
        body: Padding(
          padding: EdgeInsets.all(16),
          child: OptionCard(title: 'Seguro básico', badge: 'Obrigatório', description: 'Danos a terceiros', selected: true),
        ),
      )));
      await settle(t);
      final badge = t.getSize(find.ancestor(of: find.text('Obrigatório'), matching: find.byType(Container)).first);
      final text = t.getSize(find.text('Obrigatório'));
      expect(badge.width, lessThanOrEqualTo(text.width + 12 * (scale > 1 ? scale : 1) + 1));
      expect(t.takeException(), isNull);
    });

    testWidgets('R2-29 CVV curto explica o erro a $pct%', (t) async {
      phone(t, scale: scale, size: const Size(412, 1800));
      await t.pumpWidget(testApp(Scaffold(body: CardFormSheet(submit: (_) async => 'tok'))));
      await settle(t);
      final cvv = find.widgetWithText(TextField, 'CVV');
      await t.enterText(cvv, '12');
      await t.pump();
      expect(find.text('CVV com 3 ou 4 dígitos'), findsOneWidget);
      await t.enterText(cvv, '123');
      await t.pump();
      expect(find.text('CVV com 3 ou 4 dígitos'), findsNothing);
    });

    group('R2-02 folha do cupom acompanha o teclado a $pct%', () {
      testWidgets('o campo e o botao ficam acima do teclado', (t) async {
        phone(t, scale: scale, size: const Size(412, 700));
        await t.pumpWidget(testApp(Builder(
          builder: (ctx) => Scaffold(
            body: Center(
              child: VoltiButton(
                label: 'abrir',
                onPressed: () => VoltiBottomSheet.show<String>(
                  ctx,
                  builder: (_) => const CodeEntrySheet(
                    title: 'Cupom',
                    actionLabel: 'Aplicar',
                    fieldKey: Key('f'),
                    actionKey: Key('a'),
                  ),
                ),
              ),
            ),
          ),
        )));
        await t.tap(find.text('abrir'));
        await settle(t);
        t.view.viewInsets = const FakeViewPadding(bottom: 300);
        addTearDown(t.view.resetViewInsets);
        await settle(t);
        final top = 700 - 300;
        expect(t.getBottomLeft(find.byKey(const Key('a'))).dy, lessThanOrEqualTo(top));
        expect(t.getBottomLeft(find.byKey(const Key('f'))).dy, lessThanOrEqualTo(top));
        expect(t.takeException(), isNull);
        await t.pumpWidget(const SizedBox());
      });
    });

    testWidgets('R2-03 ajuda descreve o fluxo do galpao a $pct%', (t) async {
      phone(t, scale: scale, size: const Size(412, 4000));
      await t.pumpWidget(testApp(const HelpScreen()));
      await settle(t);
      await t.tap(find.text('Como destravo uma moto?'));
      await settle(t);
      expect(find.textContaining('Escanear'), findsNothing);
      expect(find.textContaining('guidão'), findsNothing);
      expect(find.textContaining('galpão'), findsWidgets);
      await t.tap(find.text('Como encerro a corrida?'));
      await settle(t);
      expect(find.textContaining('Devolva a moto no galpão'), findsOneWidget);
      expect(find.textContaining('estação'), findsWidgets);
      expect(t.takeException(), isNull);
    });

    group('R2-04 cronometro pelo startedAt a $pct%', () {
      final start = DateTime.utc(2026, 10, 25, 12);
      Rental rental({int paused = 0, RentalStatus status = RentalStatus.active, int elapsed = 0}) => sampleRental(status: status).rebuild((b) => b
        ..startedAt = start
        ..pausedSeconds = paused
        ..elapsedSeconds = elapsed);

      Future<void> pump(WidgetTester t, _Ride b, DateTime Function() clock) async {
        phone(t, scale: scale, size: const Size(412, 1800));
        await t.pumpWidget(testApp(const RideScreen(), overrides: [
          backendProvider.overrideWithValue(b),
          realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
          locationServiceProvider.overrideWithValue(FakeLocation()),
          clockProvider.overrideWithValue(clock),
        ]));
        await t.pump();
        await t.pump(const Duration(milliseconds: 50));
      }

      testWidgets('tempo = agora - startedAt - pausas, mesmo sem o timer ter corrido', (t) async {
        var now = start.add(const Duration(seconds: 38));
        final b = _Ride(rental(paused: 8));
        await pump(t, b, () => now);
        await t.pump(const Duration(seconds: 1));
        expect(clockText(t), '00:30'); // 38 - 8
        // Segundo plano de 28 s: o relogio do servidor andou, o Timer nao.
        now = now.add(const Duration(seconds: 28));
        await t.pump(const Duration(seconds: 1));
        expect(clockText(t), '00:58'); // 66 - 8
        await t.pumpWidget(const SizedBox());
      });

      testWidgets('ao voltar do segundo plano relê o aluguel e corrige o tempo', (t) async {
        var now = start.add(const Duration(seconds: 30));
        final b = _Ride(rental());
        await pump(t, b, () => now);
        final reads = b.reads;
        // O servidor passou a contar uma pausa de 20 s que o app nao viu.
        b.rentalNow = rental(paused: 20);
        now = now.add(const Duration(seconds: 70));
        t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
        await t.pump();
        await t.pump(const Duration(milliseconds: 50));
        expect(b.reads, greaterThan(reads));
        expect(clockText(t), '01:20'); // 100 - 20
        await t.pumpWidget(const SizedBox());
      });
    });

    group('R2-05 home com corrida ativa a $pct%', () {
      testWidgets('mostra a corrida, sem "Escolher moto" nem o passe', (t) async {
        phone(t, scale: scale, size: const Size(412, 915));
        final router = GoRouter(initialLocation: '/home', routes: appRoutes());
        addTearDown(router.dispose);
        await t.pumpWidget(testRouterApp(router, overrides: [
          backendProvider.overrideWithValue(SwapBackend()),
          pushServiceProvider.overrideWithValue(NoopPushService()),
          locationServiceProvider.overrideWithValue(FakeLocation()),
          sessionProvider.overrideWith(() => FakeSession(session())),
          clockProvider.overrideWithValue(() => thu10),
          realtimeFactoryProvider.overrideWithValue(() => FakeRealtime()),
        ]));
        await settle(t);
        expect(find.byKey(const Key('home-ride-card')), findsOneWidget);
        expect(find.text('Corrida em andamento'), findsOneWidget);
        expect(find.text('Voltar à corrida'), findsOneWidget);
        expect(find.text('Escolher moto'), findsNothing);
        expect(find.byKey(const Key('home-promos')), findsNothing);
        expect(find.textContaining('passe'), findsNothing);
        expect(t.takeException(), isNull);
        await t.pumpWidget(const SizedBox());
      });
    });
  }
}
