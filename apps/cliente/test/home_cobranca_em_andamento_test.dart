import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/home/pending_payment_banner.dart';
import 'package:volti_cliente/features/payments/debt_pix_sheet.dart';

import 'helpers.dart';

/// Cobranca presa em "Processando" (2026-10-26): cliente inadimplente sem divida `failed`
/// (a liquidacao ainda retenta) ve "Cobranca em andamento", sem "Pagar agora"; com divida
/// `failed` o aviso de pagar tem precedencia; sem inadimplencia nada aparece.

Payment _debt() => Payment((b) => b
  ..id = 'pay-1'
  ..customerId = 'c1'
  ..kind = PaymentKind.rental
  ..method = PaymentMethod.card
  ..status = PaymentStatus.failed
  ..amountCents = 7000
  ..refundedCents = 0
  ..outstandingCents = 7000
  ..createdAt = DateTime.utc(2026, 10, 26)
  ..updatedAt = DateTime.utc(2026, 10, 26));

SessionState _session({required bool delinquent}) {
  final base = session();
  return SessionState(signedIn: true, customer: base.customer!.rebuild((c) => c.delinquent = delinquent), consents: base.consents);
}

Future<void> _pump(WidgetTester t, {required bool delinquent, List<Payment> debts = const []}) async {
  await t.pumpWidget(testApp(
    const Scaffold(body: PendingPaymentBanner()),
    overrides: [
      sessionProvider.overrideWith(() => FakeSession(_session(delinquent: delinquent))),
      openDebtsProvider.overrideWith((ref) async => debts),
    ],
  ));
  await t.pump();
  await t.pump();
}

void main() {
  testWidgets('inadimplente sem divida em aberto → "Cobrança em andamento", sem "Pagar agora"', (t) async {
    await _pump(t, delinquent: true);
    expect(find.byKey(const Key('home-payment-processing')), findsOneWidget);
    expect(find.text('Cobrança em andamento'), findsOneWidget);
    expect(find.text('Estamos processando a cobrança da sua última corrida. Assim que concluir, você poderá reservar de novo.'), findsOneWidget);
    expect(find.byKey(const Key('home-pay-now')), findsNothing);
    expect(find.byKey(const Key('home-pending-payment')), findsNothing);
  });

  testWidgets('divida failed → aviso de pagamento pendente com "Pagar agora" (tem precedencia)', (t) async {
    await _pump(t, delinquent: true, debts: [_debt()]);
    expect(find.byKey(const Key('home-pending-payment')), findsOneWidget);
    expect(find.byKey(const Key('home-pay-now')), findsOneWidget);
    expect(find.byKey(const Key('home-payment-processing')), findsNothing);
  });

  testWidgets('nao inadimplente e sem divida → nada', (t) async {
    await _pump(t, delinquent: false);
    expect(find.byKey(const Key('home-payment-processing')), findsNothing);
    expect(find.byKey(const Key('home-pending-payment')), findsNothing);
  });
}
