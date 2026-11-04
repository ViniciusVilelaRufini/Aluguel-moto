import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/handover_models.dart';
import 'package:volti_operador/features/arrivals/arrival_checklist_page.dart';
import 'package:volti_operador/features/arrivals/counter_settle_page.dart';

import 'helpers.dart';

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 4; i++) {
    await t.pump(const Duration(milliseconds: 100));
  }
  await t.pumpAndSettle();
}

/// Rola a lista ate o widget (as listas sao preguicosas).
Future<void> _reveal(WidgetTester t, Finder f) async {
  if (f.evaluate().isEmpty) {
    await t.scrollUntilVisible(f, 150, scrollable: find.byType(Scrollable).first);
  }
  await t.ensureVisible(f);
  await t.pump();
}

Future<void> _tap(WidgetTester t, String key) async {
  final f = find.byKey(Key(key));
  await _reveal(t, f);
  await t.tap(f);
  await _settle(t);
}

Future<void> _enter(WidgetTester t, String key, String text) async {
  final f = find.byKey(Key(key));
  await _reveal(t, f);
  await t.enterText(f, text);
  await t.pump();
}

VoidCallback? _confirm(WidgetTester t) =>
    t.widget<VoltiButton>(find.byKey(const Key('settle-confirm'))).onPressed;

Future<Harness> _open(WidgetTester t, CounterBalance balance) async {
  final h = Harness();
  h.repo.balance = balance;
  await h.pump(t, const CounterSettlePage(rentalId: 'rental-1'));
  await _settle(t);
  return h;
}

void main() {
  testWidgets('abate da caução e devolve o resto', (t) async {
    final h = await _open(t, fakeCounterBalance());
    expect(find.text('R\$ 60,00'), findsWidgets);

    await _tap(t, 'settle-from-deposit-pay1');
    await _enter(t, 'settle-amount', '60,00');
    await _tap(t, 'settle-confirm');
    final s = h.repo.settles.single;
    expect(s.paymentId, 'pay1');
    expect(s.request.fromDepositId, 'dep1');
    expect(s.request.method, isNull);
    expect(s.request.amountCents, 6000);
    expect(h.repo.balanceReads, 2, reason: 'recarrega o saldo depois da ação');
    expect(find.byKey(const Key('settle-receive-pay1')), findsNothing, reason: 'débito quitado');

    await _tap(t, 'refund-dep1');
    await _enter(t, 'settle-amount', '40,00');
    await _enter(t, 'settle-reference', 'devolvido em dinheiro');
    await _tap(t, 'settle-confirm');
    final r = h.repo.refunds.single;
    expect(r.depositId, 'dep1');
    expect(r.request.amountCents, 4000);
    expect(r.request.reference, 'devolvido em dinheiro');
    expect(r.key, isNot(s.key), reason: 'uma chave por ação');
    expect(h.repo.balanceReads, 3);
    expect(find.byKey(const Key('refund-dep1')), findsNothing, reason: 'caução zerada');
  });

  testWidgets('receber com método e referência', (t) async {
    final h = await _open(t, fakeCounterBalance());
    await _tap(t, 'settle-receive-pay1');
    expect(_confirm(t), isNull, reason: 'sem método');
    await _tap(t, 'settle-method-counter_pix');
    await _enter(t, 'settle-amount', '25,5');
    await _enter(t, 'settle-reference', ' E2E123 ');
    await _tap(t, 'settle-confirm');
    final s = h.repo.settles.single;
    expect(s.request.method, CounterPaymentMethod.counterPix);
    expect(s.request.fromDepositId, isNull);
    expect(s.request.amountCents, 2550);
    expect(s.request.reference, 'E2E123');
    // Quitação parcial: o débito continua com o resto.
    expect(find.byKey(const Key('settle-receive-pay1')), findsOneWidget);
    expect(find.text('R\$ 34,50'), findsWidgets);
  });

  testWidgets('valor acima do disponível não envia', (t) async {
    final h = await _open(t, fakeCounterBalance(debtCents: 0));
    await _tap(t, 'refund-dep1');
    await _enter(t, 'settle-amount', '120,00');
    expect(find.text('O valor passa do disponível (R\$ 100,00).'), findsOneWidget);
    expect(_confirm(t), isNull);
    await t.tap(find.byKey(const Key('settle-confirm')), warnIfMissed: false);
    await _settle(t);
    expect(h.repo.refunds, isEmpty);
    expect(h.repo.settles, isEmpty);
  });

  testWidgets('recusa da API fica na folha e a mesma ação reusa a chave', (t) async {
    final h = await _open(t, fakeCounterBalance());
    h.repo.settleRejectOnce =
        const RepositoryException(FailureKind.network, 'Sem conexão com o servidor.');
    await _tap(t, 'settle-receive-pay1');
    await _tap(t, 'settle-method-cash');
    await _tap(t, 'settle-confirm');
    expect(find.byKey(const Key('settle-error')), findsOneWidget);
    expect(h.repo.settles, isEmpty);
    await _tap(t, 'settle-confirm');
    expect(h.repo.settles.single.request.amountCents, 6000);
  });

  testWidgets('aluguel ainda aberto mostra aguardando', (t) async {
    final h = await _open(t, fakeCounterBalance(status: RentalStatus.ending));
    expect(find.text('Aguardando o encerramento do aluguel'), findsOneWidget);
    expect(find.byKey(const Key('settle-receive-pay1')), findsNothing);
    expect(find.byKey(const Key('refund-dep1')), findsNothing);

    h.repo.balance = fakeCounterBalance();
    await _tap(t, 'settle-refresh');
    expect(find.text('Aguardando o encerramento do aluguel'), findsNothing);
    expect(find.byKey(const Key('settle-receive-pay1')), findsOneWidget);
  });

  testWidgets('sem débito nem caução: nada a acertar', (t) async {
    await _open(t, fakeCounterBalance(debtCents: 0, depositCents: 0));
    expect(find.text('Nada a acertar no balcão.'), findsOneWidget);
  });

  testWidgets('a chegada oferece o acerto no balcão', (t) async {
    final h = Harness();
    h.repo.vehiclesByCode['VLT-0009'] = rentedVehicle();
    h.repo.balance = fakeCounterBalance();
    await h.pump(t, const ArrivalChecklistPage());
    await _settle(t);
    await _enter(t, 'arrival-vehicle', 'VLT-0009');
    await _tap(t, 'arrival-find');
    for (final code in arrivalChecklistCodes) {
      await _tap(t, 'arr-$code-ok');
    }
    await _enter(t, 'arrival-battery', '35');
    await _tap(t, 'arrival-photo');
    await _tap(t, 'submit-arrival');
    expect(find.byKey(const Key('arrival-sent')), findsOneWidget);
    await _tap(t, 'arrival-counter-settle');
    expect(find.byType(CounterSettlePage), findsOneWidget);
    expect(h.repo.balanceReads, 1);
  });
}
