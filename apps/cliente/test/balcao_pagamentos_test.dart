import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/push_routing.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/account/account_screens.dart';
import 'package:volti_cliente/features/home/pending_payment_banner.dart';
import 'package:volti_cliente/features/ride/ride_data.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';
import 'package:volti_cliente/features/summary/summary_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

/// Task 10 do balcao: nada se paga no app. Carteira, plano e cartoes somem (so leitura com saldo
/// ou assinatura ativa), debito vira "Valor a acertar no galpao" sem "Pagar agora" e a corrida do
/// balcao avisa o fim do periodo pre-pago.

final _until = DateTime.utc(2026, 11, 5, 15, 30);

Wallet _wallet(int cents, {int minutes = 0}) => Wallet((b) => b
  ..balanceCents = cents
  ..minutesBalance = minutes
  ..updatedAt = DateTime.utc(2026, 11, 4));

Subscription _sub() => Subscription((b) => b
  ..id = 's1'
  ..planCode = SubscriptionPlanCode.weekly
  ..status = SubscriptionStatus.active
  ..cardId = 'card1'
  ..priceCents = 24900
  ..currentPeriodStart = DateTime.utc(2026, 11, 1, 12)
  ..currentPeriodEnd = DateTime.utc(2026, 11, 8, 12)
  ..cancelAtPeriodEnd = false
  ..createdAt = DateTime.utc(2026, 11, 1));

Payment payment({required PaymentMethod method, required PaymentStatus status, required int outstandingCents, String id = 'pay-1'}) => Payment((b) => b
  ..id = id
  ..customerId = 'c1'
  ..kind = PaymentKind.rental
  ..method = method
  ..status = status
  ..amountCents = outstandingCents
  ..refundedCents = 0
  ..outstandingCents = outstandingCents
  ..createdAt = DateTime.utc(2026, 11, 4)
  ..updatedAt = DateTime.utc(2026, 11, 4));

Receipt _receipt({ReceiptPaymentStatus status = ReceiptPaymentStatus.pending, PaymentMethod? method}) => Receipt((b) => b
  ..rentalId = 'r1'
  ..number = 'VLT-20261105-R1'
  ..issuedAt = DateTime.utc(2026, 11, 5, 18)
  ..vehicleCode = 'VLT-001'
  ..planCode = PlanCode.day
  ..coverage = InsuranceCoverage.basic
  ..startedAt = DateTime.utc(2026, 11, 4, 15, 30)
  ..endedAt = DateTime.utc(2026, 11, 5, 18)
  ..durationSeconds = 95400
  ..paymentId = 'pay-1'
  ..paymentStatus = status
  ..paymentMethod = method
  ..amountDueCents = status == ReceiptPaymentStatus.pending ? 6000 : null
  ..breakdown = PriceBreakdown((p) => p
    ..lines.addAll([
      PriceLine((l) => l
        ..code = 'counter_plan'
        ..description = 'Plano diário (balcão)'
        ..amountCents = 8900),
      PriceLine((l) => l
        ..code = 'excess_day'
        ..description = 'Excedente (por dia iniciado)'
        ..amountCents = 6000),
      PriceLine((l) => l
        ..code = 'counter_prepaid'
        ..description = 'Pago no balcão'
        ..amountCents = -8900),
    ])
    ..subtotalCents = 14900
    ..discountCents = 0
    ..insuranceCents = 0
    ..feesCents = 0
    ..totalCents = 6000).toBuilder());

class PagamentosBackend extends FakeBackend {
  int balance = 0;
  int minutes = 0;
  List<Subscription> subs = const [];
  List<Payment> debts = const [];
  Receipt receiptValue = _receipt();
  Rental rentalValue = counterRental();

  @override
  Future<Wallet> wallet() async => _wallet(balance, minutes: minutes);
  @override
  Future<List<WalletEntry>> walletLedger() async => const [];
  @override
  Future<List<Subscription>> subscriptions() async => subs;
  @override
  Future<List<PricingPlan>> plans() async => const [];
  @override
  Future<List<PaymentCard>> cards() async => const [];
  @override
  Future<List<Rental>> rentals() async => [sampleRental(status: RentalStatus.ended)];
  @override
  Future<List<Payment>> openDebts() async => debts;
  @override
  Future<Receipt> receipt(String rentalId) async => receiptValue;
  @override
  Future<Rental?> currentRental() async => rentalValue;
  @override
  Future<Rental> rental(String id) async => rentalValue;
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<List<GeoZone>> zones() async => const [];
  @override
  Future<Me> me() async => Me((b) => b
    ..id = 'c1'
    ..pool = AuthPool.customer
    ..email = 'a@b.c'
    ..customer = customer().toBuilder());
}

Rental counterRental({int costCents = 0}) => sampleRental().rebuild((b) => b
  ..planCode = PlanCode.day
  ..startedAt = DateTime.utc(2026, 11, 4, 15, 30)
  ..costCents = costCents
  ..prepaidUntil = _until);

late PagamentosBackend backend;

Future<void> _pump(WidgetTester t, Widget child, {DateTime? now}) async {
  tallScreen(t);
  await t.pumpWidget(testApp(child, overrides: [
    backendProvider.overrideWithValue(backend),
    sessionProvider.overrideWith(() => FakeSession(session())),
    realtimeFactoryProvider.overrideWithValue(FakeRealtime.new),
    locationServiceProvider.overrideWithValue(FakeLocation()),
    rentalTrackProvider.overrideWith((ref, id) async => const []),
    if (now != null) clockProvider.overrideWithValue(() => now),
  ]));
  await t.pump();
  await t.pump(const Duration(milliseconds: 50));
  await t.pump(const Duration(milliseconds: 50));
}

void main() {
  setUp(() => backend = PagamentosBackend());

  group('conta', () {
    testWidgets('conta sem cartões, carteira nem plano', (t) async {
      await _pump(t, const AccountScreen());
      expect(find.text('Cartões'), findsNothing);
      expect(find.byKey(const Key('account-cards')), findsNothing);
      expect(find.text('Carteira'), findsNothing);
      expect(find.text('Meu plano'), findsNothing);
      expect(find.text('Recarregar carteira'), findsNothing);
      // O resto da conta continua.
      expect(find.text('Histórico e recibos'), findsOneWidget);
    });

    testWidgets('carteira com saldo aparece só leitura', (t) async {
      backend.balance = 1500;
      await _pump(t, const AccountScreen());
      expect(find.text('Carteira'), findsOneWidget);
      expect(find.text('Recarregar carteira'), findsNothing);
      expect(find.text('Cartões'), findsNothing);

      await _pump(t, const WalletScreen());
      await t.pump(const Duration(seconds: 2)); // saldo conta ate o valor
      expect(find.text('R\$ 15,00'), findsOneWidget);
      expect(find.text('Recarregar carteira'), findsNothing);
      expect(find.text('Pacotes de minutos'), findsNothing);
      expect(find.byKey(const Key('read-only-counter-notice')), findsOneWidget);
      expect(find.text('Fale com o galpão para usar ou cancelar'), findsOneWidget);
    });

    testWidgets('plano ativo aparece só leitura, sem cancelar nem assinar', (t) async {
      backend.subs = [_sub()];
      await _pump(t, const AccountScreen());
      expect(find.text('Plano semanal'), findsOneWidget);

      await _pump(t, const SubscriptionsScreen());
      expect(find.text('Plano semanal'), findsOneWidget);
      expect(find.text('Cancelar renovação'), findsNothing);
      expect(find.text('Continuar'), findsNothing);
      expect(find.byKey(const Key('read-only-counter-notice')), findsOneWidget);
      expect(find.text('Fale com o galpão para usar ou cancelar'), findsOneWidget);
    });

    testWidgets('sem assinatura a tela do plano não oferece assinar', (t) async {
      await _pump(t, const SubscriptionsScreen());
      expect(find.text('Continuar'), findsNothing);
      expect(find.text('Assinar agora'), findsNothing);
      expect(find.byKey(const Key('read-only-counter-notice')), findsOneWidget);
    });
  });

  group('débito', () {
    testWidgets('débito a acertar no galpão sem botão de pagar', (t) async {
      backend.debts = [payment(method: PaymentMethod.cash, status: PaymentStatus.pending, outstandingCents: 6000)];
      await _pump(t, const Scaffold(body: PendingPaymentBanner()));
      expect(find.byKey(const Key('home-counter-debt')), findsOneWidget);
      expect(find.text('Valor a acertar no galpão: R\$ 60,00'), findsOneWidget);
      expect(find.byKey(const Key('home-pay-now')), findsNothing);
    });

    testWidgets('débito antigo failed (cartão) também só a acertar no galpão, somando os saldos', (t) async {
      backend.debts = [
        payment(method: PaymentMethod.card, status: PaymentStatus.failed, outstandingCents: 2500),
        payment(id: 'pay-2', method: PaymentMethod.counterPix, status: PaymentStatus.pending, outstandingCents: 6000),
      ];
      await _pump(t, const Scaffold(body: PendingPaymentBanner()));
      expect(find.text('Valor a acertar no galpão: R\$ 85,00'), findsOneWidget);
      expect(find.byKey(const Key('home-pay-now')), findsNothing);
      expect(find.text('Pagar agora'), findsNothing);
    });

    testWidgets('histórico mostra o valor a acertar no galpão', (t) async {
      backend.debts = [payment(method: PaymentMethod.cash, status: PaymentStatus.pending, outstandingCents: 6000)];
      await _pump(t, const HistoryScreen());
      expect(find.text('Valor a acertar no galpão: R\$ 60,00'), findsOneWidget);
      expect(find.text('Pagar agora'), findsNothing);
    });

    testWidgets('histórico sem débito não mostra o aviso', (t) async {
      await _pump(t, const HistoryScreen());
      expect(find.textContaining('Valor a acertar no galpão'), findsNothing);
    });
  });

  group('corrida do balcão', () {
    testWidgets('mostra o período até HH:MM (São Paulo) antes da última hora', (t) async {
      await _pump(t, const RideScreen(), now: _until.subtract(const Duration(hours: 3)));
      expect(find.byKey(const Key('ride-prepaid-until')), findsOneWidget);
      expect(find.text('Período até 12:30'), findsOneWidget);
      expect(find.byKey(const Key('ride-prepaid-ending')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('aviso 1 h antes do fim do período', (t) async {
      // clock = prepaidUntil − 59 min; prepaidUntil = 2026-11-05T15:30:00Z
      await _pump(t, const RideScreen(), now: _until.subtract(const Duration(minutes: 59)));
      expect(find.byKey(const Key('ride-prepaid-ending')), findsOneWidget);
      expect(find.text('Seu período termina às 12:30. O excedente é acertado no galpão.'), findsOneWidget);
      expect(find.byKey(const Key('ride-prepaid-until')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('depois do fim do período o custo vira a acertar no galpão', (t) async {
      backend.rentalValue = counterRental(costCents: 6000);
      await _pump(t, const RideScreen(), now: _until.add(const Duration(minutes: 10)));
      expect(find.text('A acertar no galpão: R\$ 60,00'), findsOneWidget);
      expect(find.text('Custo acumulado'), findsNothing);
      expect(find.byKey(const Key('ride-prepaid-ending')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('aluguel comum (sem prepaidUntil) fica como antes', (t) async {
      backend.rentalValue = sampleRental();
      await _pump(t, const RideScreen(), now: _until);
      expect(find.byKey(const Key('ride-prepaid-until')), findsNothing);
      expect(find.byKey(const Key('ride-prepaid-ending')), findsNothing);
      expect(find.text('Custo acumulado'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    for (final phase in ['ending', 'over']) {
      testWidgets('faixa do período ($phase) a 200% em 360×740 sem estouro', (t) async {
        backend.rentalValue = counterRental(costCents: 6000);
        final now = phase == 'ending' ? _until.subtract(const Duration(minutes: 30)) : _until.add(const Duration(minutes: 5));
        await _pump(t, const RideScreen(), now: now);
        t.view.physicalSize = const Size(360, 740);
        t.platformDispatcher.textScaleFactorTestValue = 2;
        addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
        await t.pump();
        await t.pump(const Duration(milliseconds: 300));
        expect(t.takeException(), isNull);
        final strip = find.byKey(Key(phase == 'ending' ? 'ride-prepaid-ending' : 'ride-prepaid-over'));
        await t.scrollUntilVisible(strip, 100, scrollable: find.byType(Scrollable).last);
        expect(strip, findsOneWidget);
        expect(t.takeException(), isNull);
        await t.pumpWidget(const SizedBox());
      });
    }

    test('push rental.prepaid_ending abre a corrida', () {
      expect(routeForPush(const {'type': 'rental.prepaid_ending', 'rentalId': 'r1'}), '/ride');
    });

    test('fases do período pré-pago', () {
      expect(prepaidPhase(null, _until), isNull);
      expect(prepaidPhase(_until, _until.subtract(const Duration(minutes: 61))), PrepaidPhase.running);
      expect(prepaidPhase(_until, _until.subtract(const Duration(hours: 1))), PrepaidPhase.ending);
      expect(prepaidPhase(_until, _until.subtract(const Duration(seconds: 1))), PrepaidPhase.ending);
      expect(prepaidPhase(_until, _until), PrepaidPhase.over);
    });
  });

  group('recibo', () {
    testWidgets('resumo com excedente mostra a acertar no galpão', (t) async {
      await _pump(t, const SummaryScreen(rentalId: 'r1'));
      await t.pump(const Duration(seconds: 2));
      expect(find.text('Valor a acertar no galpão: R\$ 60,00'), findsOneWidget);
      expect(find.byKey(const Key('receipt-pay-now')), findsNothing);
      expect(find.text('Pagar agora'), findsNothing);
      expect(find.textContaining('Pix'), findsNothing);
      expect(find.text('Pago no balcão'), findsOneWidget);
      expect(find.text('-R\$ 89,00'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('recibo pago no balcão mostra o método com o rótulo do balcão', (t) async {
      backend.receiptValue = _receipt(status: ReceiptPaymentStatus.paid, method: PaymentMethod.counterCard);
      await _pump(t, const SummaryScreen(rentalId: 'r1'));
      await t.pump(const Duration(seconds: 2));
      expect(find.text('Maquininha (cartão) · Recibo VLT-20261105-R1'), findsOneWidget);
      expect(find.textContaining('Valor a acertar no galpão'), findsNothing);

      backend.receiptValue = _receipt(status: ReceiptPaymentStatus.paid, method: PaymentMethod.cash);
      await _pump(t, const SummaryScreen(rentalId: 'r2'));
      await t.pump(const Duration(seconds: 2));
      expect(find.text('Dinheiro · Recibo VLT-20261105-R1'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('ApiBackend.openDebts', () {
    test('soma os failed e os pending do balcão com saldo; pending de gateway fica fora', () async {
      final adapter = _PaymentsAdapter({
        'failed': [_json('f1', 'card', 'failed', 2500, '2026-11-01T10:00:00Z'), _json('f0', 'card', 'failed', null, '2026-10-01T10:00:00Z')],
        'pending': [
          _json('p1', 'cash', 'pending', 6000, '2026-11-03T10:00:00Z'),
          _json('p2', 'counter_card', 'pending', 0, '2026-11-02T10:00:00Z'),
          _json('p3', 'pix', 'pending', 4000, '2026-11-02T10:00:00Z'),
        ],
      });
      final api = ApiBackend(buildVoltiApi(baseUrl: 'http://x', auth: _StubAuth(), httpClientAdapter: adapter, maxAttempts: 1));
      final debts = await api.openDebts();
      expect(debts.map((p) => p.id), ['f1', 'p1']);
      expect(adapter.statuses, containsAll(['failed', 'pending']));
    });
  });
}

Map<String, Object?> _json(String id, String method, String status, int? outstanding, String at) => {
      'id': id,
      'customerId': 'c1',
      'kind': 'rental',
      'method': method,
      'status': status,
      'amountCents': outstanding ?? 1000,
      'refundedCents': 0,
      'outstandingCents': ?outstanding,
      'createdAt': at,
      'updatedAt': at,
    };

class _PaymentsAdapter implements HttpClientAdapter {
  _PaymentsAdapter(this.byStatus);
  final Map<String, List<Map<String, Object?>>> byStatus;
  final statuses = <String>[];
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async {
    final status = o.uri.queryParameters['status'] ?? '';
    statuses.add(status);
    return ResponseBody.fromString(jsonEncode({'items': byStatus[status] ?? const []}), 200, headers: {
      Headers.contentTypeHeader: ['application/json'],
    });
  }

  @override
  void close({bool force = false}) {}
}

class _StubAuth implements AuthRepository {
  @override
  AuthMode get mode => AuthMode.dev;
  @override
  AuthSession? get session => null;
  @override
  Future<String?> accessToken() async => 'tok';
  @override
  Future<void> signOut() async {}
}
