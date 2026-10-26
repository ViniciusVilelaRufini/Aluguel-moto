import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/app_channel.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/plan/pix_sheet.dart';
import 'package:volti_cliente/features/reservation/depot_reservation_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';

/// Backend do galpao que guarda os cartoes adicionados (cartao de teste).
class _TestPayBackend extends GalpaoBackend {
  _TestPayBackend({List<PaymentCard>? saved}) : saved = [...?saved], super(withCard: false);
  final List<PaymentCard> saved;
  final tokens = <String>[];

  @override
  Future<List<PaymentCard>> cards() async => List.of(saved);
  @override
  Future<PaymentCard> addCard(String token) async {
    tokens.add(token);
    final c = PaymentCard((b) => b
      ..id = 'test-card'
      ..brand = 'visa'
      ..last4 = '4242'
      ..expMonth = 12
      ..expYear = 2030
      ..isDefault = saved.isEmpty
      ..createdAt = thu10);
    saved.add(c);
    return c;
  }
}

PaymentCard _card(String id, String last4) => PaymentCard((b) => b
  ..id = id
  ..brand = 'master'
  ..last4 = last4
  ..expMonth = 12
  ..expYear = 2030
  ..isDefault = true
  ..createdAt = thu10);

Future<void> _pump(WidgetTester t, GalpaoBackend b, AppChannel channel) async {
  t.view.physicalSize = const Size(412, 915);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  final router = GoRouter(
    initialLocation: '/pickup',
    initialExtra: selection(p: plan(PlanCode.day, 'Diário', PlanUnit.day, 8900)),
    routes: appRoutes(),
  );
  addTearDown(router.dispose);
  await t.pumpWidget(testRouterApp(router, overrides: [
    backendProvider.overrideWithValue(b),
    pushServiceProvider.overrideWithValue(NoopPushService()),
    locationServiceProvider.overrideWithValue(FakeLocation()),
    sessionProvider.overrideWith(() => FakeSession(session(kyc: KycStatus.approved))),
    clockProvider.overrideWithValue(() => thu10),
    appChannelProvider.overrideWithValue(channel),
  ]));
  await _settle(t);
}

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

Future<void> _tap(WidgetTester t, Finder f) async {
  await t.ensureVisible(f);
  await t.pump();
  await t.tap(f);
  await _settle(t);
}

void main() {
  const testOption = Key('pickup-test-pay');

  testWidgets('loja: sem a opcao "Pagamento de teste"', (t) async {
    await _pump(t, _TestPayBackend(), AppChannel.store);
    expect(find.byKey(testOption), findsNothing);
    expect(find.text('Pagamento de teste'), findsNothing);
  });

  testWidgets('teste sem cartao: "Pagamento de teste" ja vem escolhido', (t) async {
    await _pump(t, _TestPayBackend(), AppChannel.beta);
    expect(find.text('Pagamento de teste'), findsOneWidget);
    expect(t.widget<OptionCard>(find.byKey(testOption)).selected, isTrue);
    expect(t.widget<OptionCard>(find.byKey(const Key('pickup-pix'))).selected, isFalse);
    expect(t.widget<OptionCard>(find.byKey(const Key('pickup-card'))).selected, isFalse);
    expect(t.widget<VoltiButton>(find.byKey(const Key('pickup-confirm'))).onPressed, isNotNull);
  });

  testWidgets('teste: confirmar cria o cartao de teste, reserva no cartao e abre a reserva sem Pix', (t) async {
    final b = _TestPayBackend();
    await _pump(t, b, AppChannel.beta);
    await _tap(t, find.byKey(const Key('pickup-confirm')));
    expect(b.tokens, ['tok_visa_4242']);
    expect(b.sent!.depositMethod, DepositMethod.card);
    expect(b.sent!.cardId, 'test-card');
    expect(find.byType(PixDepositSheet), findsNothing);
    expect(find.byType(DepotReservationScreen), findsOneWidget);
  });

  testWidgets('teste: reaproveita o cartao de teste ja salvo', (t) async {
    final saved = _card('ja-salvo', '4242');
    final b = _TestPayBackend(saved: [_card('outro', '5555'), saved]);
    await _pump(t, b, AppChannel.beta);
    await _tap(t, find.byKey(testOption));
    await _tap(t, find.byKey(const Key('pickup-confirm')));
    expect(b.tokens, isEmpty);
    expect(b.sent!.cardId, 'ja-salvo');
  });

  testWidgets('teste com cartao salvo: cartao continua o padrao e a opcao de teste aparece', (t) async {
    await _pump(t, _TestPayBackend(saved: [_card('c1', '5555')]), AppChannel.beta);
    expect(t.widget<OptionCard>(find.byKey(const Key('pickup-card'))).selected, isTrue);
    expect(t.widget<OptionCard>(find.byKey(testOption)).selected, isFalse);
  });
}
