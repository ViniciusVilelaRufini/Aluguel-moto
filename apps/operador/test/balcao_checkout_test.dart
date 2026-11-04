import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/features/pickups/counter_checkout_page.dart';
import 'package:volti_operador/features/pickups/handover_status_page.dart';

import 'helpers.dart';

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 4; i++) {
    await t.pump(const Duration(milliseconds: 100));
  }
}

Future<void> _tap(WidgetTester t, Finder f) async {
  await t.ensureVisible(f);
  await t.pump();
  await t.tap(f);
  await _settle(t);
}

Future<void> _tapKey(WidgetTester t, String key) => _tap(t, find.byKey(Key(key)));

VoidCallback? _plus(WidgetTester t) =>
    t.widget<VoltiIconButton>(find.byKey(const Key('counter-quantity-plus'))).onPressed;

String _quantity(WidgetTester t) => t.widget<Text>(find.byKey(const Key('counter-quantity'))).data!;

VoidCallback? _start(WidgetTester t) =>
    t.widget<VoltiButton>(find.byKey(const Key('counter-start'))).onPressed;

Future<Harness> _open(WidgetTester t) async {
  final h = Harness();
  final ho = fakePendingHandover();
  h.repo.handovers[ho.id] = ho;
  await h.pump(t, CounterCheckoutPage(handover: ho));
  await _settle(t);
  return h;
}

/// Foto do contrato + Dinheiro: pronto para iniciar.
Future<void> _ready(WidgetTester t) async {
  await _tapKey(t, 'counter-contract-photo');
  await _tapKey(t, 'counter-method-cash');
}

void main() {
  testWidgets('limites de quantidade por plano', (t) async {
    final h = await _open(t);
    expect(_quantity(t), '1');
    expect(h.repo.quoteQueries.last, ('ho-1', CounterPlanCode.day, InsuranceCoverage.basic, 1));

    await _tap(t, find.text('Semanal'));
    for (var i = 0; i < 3; i++) {
      await _tapKey(t, 'counter-quantity-plus');
    }
    expect(_quantity(t), '4');
    expect(_plus(t), isNull, reason: 'semanal até 4');
    expect(h.repo.quoteQueries.last, ('ho-1', CounterPlanCode.weekly, InsuranceCoverage.basic, 4));

    // Mensal: a quantidade cai para o limite (3) e para em 3.
    await _tap(t, find.text('Mensal'));
    expect(_quantity(t), '3');
    expect(_plus(t), isNull, reason: 'mensal até 3');

    await _tap(t, find.text('Diária'));
    for (var i = 0; i < 40; i++) {
      if (_plus(t) == null) break;
      await _tapKey(t, 'counter-quantity-plus');
    }
    expect(_quantity(t), '30');
    expect(_plus(t), isNull, reason: 'diária até 30');
    expect(h.repo.quoteQueries.last.$4, 30);
  });

  testWidgets('seguro completo pede nova cotação e o total vem da API', (t) async {
    final h = await _open(t);
    expect(find.descendant(of: find.byKey(const Key('counter-total')), matching: find.text('R\$ 75,00')),
        findsOneWidget);
    h.repo.quoteTotalCents = 9900;
    await _tapKey(t, 'counter-coverage-full');
    expect(h.repo.quoteQueries.last.$3, InsuranceCoverage.full);
    expect(find.descendant(of: find.byKey(const Key('counter-total')), matching: find.text('R\$ 99,00')),
        findsOneWidget);
  });

  testWidgets('sem foto do contrato não inicia', (t) async {
    await _open(t);
    await _tapKey(t, 'counter-method-cash');
    expect(_start(t), isNull);
    await _tapKey(t, 'counter-contract-photo');
    expect(_start(t), isNotNull);
  });

  testWidgets('envia o valor da cotação e a mesma chave no duplo toque', (t) async {
    final h = await _open(t);
    await _ready(t);
    await t.enterText(find.byKey(const Key('counter-reference')), ' 123456 ');
    await t.pump();
    h.repo.checkoutGate = Completer<void>();
    await t.ensureVisible(find.byKey(const Key('counter-start')));
    await t.tap(find.byKey(const Key('counter-start')));
    await t.pump();
    await t.tap(find.byKey(const Key('counter-start')), warnIfMissed: false);
    await t.pump();
    h.repo.checkoutGate!.complete();
    await _settle(t);

    final c = h.repo.checkouts.single;
    expect(c.handoverId, 'ho-1');
    expect(c.request.payment.amountCents, 7500);
    expect(c.request.payment.method, CounterPaymentMethod.cash);
    expect(c.request.payment.reference, '123456');
    expect(c.request.planCode, CounterPlanCode.day);
    expect(c.request.quantity, 1);
    expect(c.request.coverage, InsuranceCoverage.basic);
    expect(c.request.contractPhotoKeys, ['contracts/1.jpg']);
    expect(c.request.deposit, isNull);
    expect(h.repo.checkoutKeys.toSet(), hasLength(1));

    expect(find.byType(HandoverStatusPage), findsOneWidget);
    expect(find.text('Aluguel iniciado — moto liberada'), findsOneWidget);
  });

  testWidgets('falha de rede tenta de novo com a mesma chave; mudar os dados troca a chave',
      (t) async {
    final h = await _open(t);
    await _ready(t);
    h.repo.checkoutRejectOnce =
        const RepositoryException(FailureKind.network, 'Sem conexão com o servidor.');
    await _tapKey(t, 'counter-start');
    expect(find.byKey(const Key('counter-error')), findsOneWidget);
    h.repo.checkoutRejectOnce =
        const RepositoryException(FailureKind.network, 'Sem conexão com o servidor.');
    await _tapKey(t, 'counter-start');
    expect(h.repo.checkoutKeys, hasLength(2));
    expect(h.repo.checkoutKeys[0], h.repo.checkoutKeys[1]);
    // Foto ja enviada nao sobe de novo.
    expect(h.repo.contractUploads, hasLength(1));

    await _tapKey(t, 'counter-method-counter_pix');
    await _tapKey(t, 'counter-start');
    expect(h.repo.checkoutKeys, hasLength(3));
    expect(h.repo.checkoutKeys[2], isNot(h.repo.checkoutKeys[0]));
    expect(h.repo.checkouts.single.request.payment.method, CounterPaymentMethod.counterPix);
  });

  testWidgets('caução opcional vai com valor em centavos e método', (t) async {
    final h = await _open(t);
    await _ready(t);
    await t.enterText(find.byKey(const Key('counter-deposit-amount')), '150,50');
    await t.pump();
    expect(_start(t), isNull, reason: 'caução sem método');
    await _tapKey(t, 'counter-deposit-method-counter_card');
    await t.enterText(find.byKey(const Key('counter-deposit-reference')), 'NSU9');
    await t.pump();
    await _tapKey(t, 'counter-start');
    final d = h.repo.checkouts.single.request.deposit!;
    expect(d.amountCents, 15050);
    expect(d.method, CounterPaymentMethod.counterCard);
    expect(d.reference, 'NSU9');
  });

  testWidgets('valor divergente recarrega a cotação', (t) async {
    final h = await _open(t);
    await _ready(t);
    final before = h.repo.quoteQueries.length;
    h.repo.quoteTotalCents = 8000;
    h.repo.checkoutRejectOnce = const RepositoryException(FailureKind.rejected,
        'O valor não confere com o calculado.',
        status: 422, slug: 'counter-amount-mismatch');
    await _tapKey(t, 'counter-start');
    expect(h.repo.quoteQueries.length, before + 1);
    expect(find.text('O valor mudou. Confira e toque de novo.'), findsOneWidget);
    expect(find.descendant(of: find.byKey(const Key('counter-total')), matching: find.text('R\$ 80,00')),
        findsOneWidget);
    expect(h.repo.checkouts, isEmpty);

    await _tapKey(t, 'counter-start');
    expect(h.repo.checkouts.single.request.payment.amountCents, 8000);
    expect(h.repo.checkoutKeys[1], isNot(h.repo.checkoutKeys[0]), reason: 'valor mudou: nova chave');
  });

  testWidgets('consentimento revogado mostra o pedido ao cliente', (t) async {
    final h = await _open(t);
    await _ready(t);
    h.repo.checkoutRejectOnce = const RepositoryException(FailureKind.rejected,
        'Peça ao cliente para permitir a localização no app.',
        status: 422, slug: 'location-consent-required');
    await _tapKey(t, 'counter-start');
    expect(find.text('Peça ao cliente para permitir a localização no app'), findsOneWidget);
    expect(find.byType(HandoverStatusPage), findsNothing);
  });

  testWidgets('moto sem conexão (409) mostra o texto da API', (t) async {
    final h = await _open(t);
    await _ready(t);
    h.repo.checkoutRejectOnce = const RepositoryException(FailureKind.rejected,
        'Não conseguimos falar com a moto agora.',
        status: 409, slug: 'vehicle-offline');
    await _tapKey(t, 'counter-start');
    expect(find.text('Não conseguimos falar com a moto agora.'), findsOneWidget);
  });

  testWidgets('sem rede não envia (sem fila offline)', (t) async {
    final h = await _open(t);
    await _ready(t);
    h.goOffline();
    await _settle(t);
    await _tapKey(t, 'counter-start');
    expect(h.repo.checkoutKeys, isEmpty);
    expect(find.byKey(const Key('counter-error')), findsOneWidget);
  });

  testWidgets('estado da entrega pendente oferece "Contrato e pagamento"', (t) async {
    final h = Harness();
    h.repo.handovers['ho-1'] = fakePendingHandover();
    await h.pump(t, const HandoverStatusPage(handoverId: 'ho-1'));
    await _settle(t);
    expect(find.text('Aguardando o cliente'), findsNothing);
    await _tapKey(t, 'handover-counter-checkout');
    expect(find.byType(CounterCheckoutPage), findsOneWidget);

    await _ready(t);
    await _tapKey(t, 'counter-start');
    await _settle(t);
    expect(find.byType(CounterCheckoutPage), findsNothing);
    expect(find.byType(HandoverStatusPage), findsOneWidget, reason: 'volta ao mesmo estado');
    expect(find.text('Aluguel iniciado — moto liberada'), findsOneWidget);
    expect(find.byKey(const Key('handover-counter-checkout')), findsNothing);
    expect(find.byKey(const Key('handover-cancel')), findsNothing);
  });

  testWidgets('aluguel ja aceito nao oferece o balcao', (t) async {
    final h = Harness();
    h.repo.handovers['ho-1'] =
        fakePendingHandover().rebuild((b) => b.status = HandoverStatus.accepted);
    await h.pump(t, const HandoverStatusPage(handoverId: 'ho-1', openCounterCheckout: true));
    await _settle(t);
    expect(find.byType(CounterCheckoutPage), findsNothing);
    expect(find.text('Aluguel iniciado — moto liberada'), findsOneWidget);
  });
}
