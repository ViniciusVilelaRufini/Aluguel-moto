import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/payments/debt_pix_sheet.dart';
import 'package:volti_cliente/features/summary/summary_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';

/// Task 16 das lacunas (R2-01): fechamento sem cartao. Recibo com a situacao do pagamento
/// (pago / pendente / processando, caucao usada), "Pagar agora" por Pix (mesmo componente
/// da recarga), aviso de pendencia na home e reserva recusada com 409 `payment-pending`.

const _due = 21635;
const _deposit = 5000;

Receipt _receipt(ReceiptPaymentStatus status) => Receipt((b) => b
  ..rentalId = 'r1'
  ..number = 'VLT-20261024-R1'
  ..issuedAt = DateTime.utc(2026, 10, 24)
  ..vehicleCode = 'VLT-001'
  ..planCode = PlanCode.day
  ..coverage = InsuranceCoverage.basic
  ..startedAt = DateTime.utc(2026, 10, 24, 10)
  ..endedAt = DateTime.utc(2026, 10, 24, 13)
  ..durationSeconds = 10800
  ..paymentId = 'pay-r1'
  ..paymentStatus = status
  ..depositUsedCents = _deposit
  ..depositReleasedCents = 0
  ..amountDueCents = status == ReceiptPaymentStatus.pending ? _due : null
  ..paymentMethod = status == ReceiptPaymentStatus.paid ? PaymentMethod.pix : null
  ..pdfUrl = status == ReceiptPaymentStatus.paid ? 'https://files.volti.app/r1.pdf' : null
  ..breakdown = PriceBreakdown((p) => p
    ..lines.add(PriceLine((l) => l
      ..code = 'time'
      ..description = 'Tempo de uso (por dia)'
      ..amountCents = 26635))
    ..subtotalCents = 26635
    ..discountCents = 0
    ..insuranceCents = 0
    ..feesCents = 0
    ..totalCents = 26635).toBuilder());

Payment _payment(String id, {PaymentKind kind = PaymentKind.rental, PaymentStatus status = PaymentStatus.failed, int amount = 26635, int? outstanding, bool pix = false}) =>
    Payment((b) => b
      ..id = id
      ..customerId = 'c1'
      ..kind = kind
      ..method = pix ? PaymentMethod.pix : PaymentMethod.card
      ..status = status
      ..amountCents = amount
      ..refundedCents = 0
      ..outstandingCents = outstanding
      ..settlesPaymentId = kind == PaymentKind.debtSettlement ? 'pay-r1' : null
      ..pix = pix
          ? (PixChargeBuilder()
            ..chargeId = 'pix-1'
            ..qrCodeBase64 = ''
            ..copyPaste = '00020126580014br.gov.bcb.pix0136volti-quitacao'
            ..expiresAt = DateTime.now().toUtc().add(const Duration(minutes: 15)))
          : null
      ..createdAt = DateTime.utc(2026, 10, 24)
      ..updatedAt = DateTime.utc(2026, 10, 24));

class _DebtBackend extends GalpaoBackend {
  _DebtBackend({this.status = ReceiptPaymentStatus.pending, this.debts = const []});
  ReceiptPaymentStatus status;
  List<Payment> debts;
  final paidDebtIds = <String>[];
  final keys = <String?>[];
  int polls = 0;

  @override
  Future<Receipt> receipt(String rentalId) async => _receipt(status);

  @override
  Future<List<Payment>> openDebts() async => debts;

  @override
  Future<Payment> payDebtPix(String paymentId, {String? idempotencyKey}) async {
    paidDebtIds.add(paymentId);
    keys.add(idempotencyKey);
    return _payment('settle-1', kind: PaymentKind.debtSettlement, status: PaymentStatus.pending, amount: _due, pix: true);
  }

  @override
  Future<Payment> payment(String id) async {
    polls++;
    // Segunda consulta: o webhook do Pix caiu e a divida foi quitada.
    if (polls < 2) return _payment(id, kind: PaymentKind.debtSettlement, status: PaymentStatus.pending, amount: _due, pix: true);
    status = ReceiptPaymentStatus.paid;
    debts = const [];
    return _payment(id, kind: PaymentKind.debtSettlement, status: PaymentStatus.paid, amount: _due, pix: true);
  }
}

void _screen(WidgetTester t, {double scale = 1, Size size = const Size(412, 915)}) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

Future<void> _summary(WidgetTester t, _DebtBackend b) async {
  await t.pumpWidget(testApp(const SummaryScreen(rentalId: 'r1'), overrides: [backendProvider.overrideWithValue(b)]));
  await t.pump();
  await t.pump(const Duration(seconds: 2));
}

Future<GoRouter> _app(WidgetTester t, _DebtBackend b, {String initial = '/home', Object? extra}) async {
  final router = GoRouter(initialLocation: initial, initialExtra: extra, routes: appRoutes());
  addTearDown(router.dispose);
  await t.pumpWidget(testRouterApp(router, overrides: [
    backendProvider.overrideWithValue(b),
    pushServiceProvider.overrideWithValue(NoopPushService()),
    locationServiceProvider.overrideWithValue(FakeLocation()),
    sessionProvider.overrideWith(() => FakeSession(session())),
    clockProvider.overrideWithValue(() => thu10),
  ]));
  await _settle(t);
  return router;
}

void main() {
  group('recibo (R2-01)', () {
    testWidgets('pendente: situacao, caucao usada, saldo a pagar e PDF so depois do pagamento', (t) async {
      _screen(t, size: const Size(412, 2000));
      final b = _DebtBackend();
      await _summary(t, b);
      expect(find.text('Moto travada. Falta pagar R\$ 216,35.'), findsOneWidget);
      expect(find.text('Moto travada. Caução liberada.'), findsNothing);
      expect(find.widgetWithText(VoltiBadge, 'Pendente'), findsOneWidget);
      expect(find.text('Caução usada'), findsOneWidget);
      expect(find.text('R\$ 50,00'), findsOneWidget);
      expect(find.text('A pagar'), findsOneWidget);
      expect(find.text('R\$ 216,35'), findsOneWidget);
      expect(find.text('Não conseguimos cobrar R\$ 216,35. Pague com Pix para liberar o recibo e novos aluguéis.'), findsOneWidget);
      expect(find.text('Aguardando pagamento · Recibo VLT-20261024-R1'), findsOneWidget);
      // O PDF nao e prometido: avisa que sai depois do pagamento.
      await t.tap(find.byKey(const Key('receipt-invoice')));
      await t.pump();
      expect(find.text('O recibo fica disponível depois do pagamento.'), findsOneWidget);
      await t.pump(const Duration(seconds: 4));
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('"Pagar agora": Pix com QR e copia e cola (componente da recarga); pago → recibo vira Pago', (t) async {
      _screen(t, size: const Size(412, 2000));
      final b = _DebtBackend();
      await _summary(t, b);
      await t.tap(find.byKey(const Key('receipt-pay-now')));
      await _settle(t);
      expect(b.paidDebtIds, ['pay-r1']);
      expect(b.keys.single, isNotNull, reason: 'Idempotency-Key por tentativa');
      expect(find.byType(DebtPixSheet), findsOneWidget);
      expect(find.text('Pague a pendência com Pix'), findsOneWidget);
      expect(find.text('Pague R\$ 216,35 com o QR ou o código copia e cola no app do seu banco.'), findsOneWidget);
      expect(find.byKey(const Key('debt-qr')), findsOneWidget);
      expect(find.text('00020126580014br.gov.bcb.pix0136volti-quitacao'), findsOneWidget);
      expect(find.text('Copiar código Pix'), findsOneWidget);
      expect(find.text('Aguardando o pagamento…'), findsOneWidget);
      // Duas consultas (3 s cada): a segunda ve a quitacao paga.
      await t.pump(const Duration(seconds: 3));
      await t.pump(const Duration(seconds: 3));
      await t.pump();
      expect(find.text('Pendência paga'), findsOneWidget);
      await t.pump(const Duration(milliseconds: 1500));
      await _settle(t);
      expect(find.byType(DebtPixSheet), findsNothing);
      expect(find.widgetWithText(VoltiBadge, 'Pago'), findsOneWidget);
      expect(find.text('Moto travada. Usamos R\$ 50,00 da caução.'), findsOneWidget);
      expect(find.byKey(const Key('receipt-pay-now')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('processando: aviso sem botao de pagar', (t) async {
      _screen(t, size: const Size(412, 2000));
      await _summary(t, _DebtBackend(status: ReceiptPaymentStatus.processing));
      expect(find.widgetWithText(VoltiBadge, 'Processando'), findsOneWidget);
      expect(find.text('Moto travada. Pagamento em processamento.'), findsOneWidget);
      expect(find.text('Estamos confirmando o pagamento. O recibo fica pronto em seguida.'), findsOneWidget);
      expect(find.byKey(const Key('receipt-pay-now')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    for (final scale in [1.0, 2.0]) {
      testWidgets('pendente a ${(scale * 100).round()}%: sem estouro e "Pagar agora" alcancavel', (t) async {
        _screen(t, scale: scale);
        final b = _DebtBackend();
        await _summary(t, b);
        await t.scrollUntilVisible(find.byKey(const Key('receipt-pay-now')), 200, scrollable: find.byType(Scrollable).first);
        await t.pump(const Duration(seconds: 1));
        expect(t.takeException(), isNull);
        final button = t.getSize(find.byKey(const Key('receipt-pay-now')));
        expect(button.height, greaterThanOrEqualTo(48));
        await t.scrollUntilVisible(find.byKey(const Key('receipt-status')), -200, scrollable: find.byType(Scrollable).first);
        expect(t.takeException(), isNull);
        await t.pumpWidget(const SizedBox());
      });
    }
  });

  group('home e reserva (R2-01)', () {
    final debt = _payment('pay-r1', outstanding: _due);

    for (final scale in [1.0, 2.0]) {
      testWidgets('home a ${(scale * 100).round()}% mostra a pendencia com "Pagar agora" e abre o Pix', (t) async {
        _screen(t, scale: scale, size: scale == 2 ? const Size(360, 740) : const Size(412, 915));
        final b = _DebtBackend(debts: [debt]);
        await _app(t, b);
        expect(t.takeException(), isNull);
        expect(find.text('Pagamento pendente'), findsOneWidget);
        expect(find.text('R\$ 216,35 em aberto. Pague para alugar de novo.'), findsOneWidget);
        await t.ensureVisible(find.byKey(const Key('home-pay-now')));
        await t.pump();
        await t.tap(find.byKey(const Key('home-pay-now')));
        await _settle(t);
        expect(find.byType(DebtPixSheet), findsOneWidget);
        expect(b.paidDebtIds, ['pay-r1']);
        expect(t.takeException(), isNull);
        await t.pumpWidget(const SizedBox());
      });
    }

    testWidgets('sem divida a home nao mostra o aviso', (t) async {
      _screen(t);
      await _app(t, _DebtBackend());
      expect(find.byKey(const Key('home-pending-payment')), findsNothing);
    });

    testWidgets('reserva com divida: 409 payment-pending → aviso "Pague o valor pendente" e volta a home com a pendencia', (t) async {
      _screen(t);
      final b = _DebtBackend(debts: [debt])..createError = conflict('payment-pending');
      final dayPlan = plan(PlanCode.day, 'Diário', PlanUnit.day, 8900);
      final router = await _app(t, b, initial: '/pickup', extra: selection(p: dayPlan));
      await t.ensureVisible(find.text('Confirmar reserva').last);
      await t.pump();
      await t.tap(find.text('Confirmar reserva').last);
      await t.pump();
      await t.pump(const Duration(milliseconds: 300));
      expect(find.text('Pague o valor pendente para alugar de novo.'), findsOneWidget);
      await _settle(t);
      expect(router.state.uri.path, '/home');
      expect(find.byKey(const Key('home-pay-now')), findsOneWidget);
    });
  });
}
