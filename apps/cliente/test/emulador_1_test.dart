// Achados do teste no emulador, rodada 1 (2026-10-22): reserva igual ao
// design, contagem com o relogio do servidor, plano, Pix, recibo, corrida
// pausada e devolucao.
import 'dart:convert';

import 'package:built_collection/built_collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/features/account/account_common.dart';
import 'package:volti_cliente/features/account/account_screen.dart';
import 'package:volti_cliente/features/account/wallet_screen.dart';
import 'package:volti_cliente/core/geo.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/plan/pix_sheet.dart';
import 'package:volti_cliente/features/pickup/pickup_screen.dart';
import 'package:volti_cliente/features/plan/insurance_screen.dart';
import 'package:volti_cliente/features/return_flow/return_screen.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';
import 'package:volti_cliente/features/summary/summary_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'account_gap_c_test.dart' show AccountBackend;
import 'galpao_fixtures.dart';
import 'helpers.dart';
import 'zone_fixtures.dart';

const _png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/// Fontes reais do design: a fonte de teste tem glifos quadrados e mede
/// "cabe ou nao" bem diferente do aparelho.
Future<void> _loadFonts() async {
  final raw = await rootBundle.loadString('FontManifest.json');
  for (final fam in (json.decode(raw) as List).cast<Map<String, dynamic>>()) {
    final loader = FontLoader(fam['family'] as String);
    for (final f in fam['fonts'] as List) {
      loader.addFont(rootBundle.load((f as Map)['asset'] as String));
    }
    await loader.load();
  }
}

void _screen(WidgetTester t, {Size size = const Size(412, 915), double scale = 1, double top = 24}) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  t.view.padding = FakeViewPadding(top: top, bottom: 16);
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

/// Galpao com cotacao que ja traz a linha do seguro (como a API real).
class _PlanBackend extends GalpaoBackend {
  _PlanBackend({this.withInsuranceLine = true, this.savedCards = const []});
  final bool withInsuranceLine;
  final List<PaymentCard> savedCards;

  @override
  Future<List<PaymentCard>> cards() async => savedCards;

  @override
  Future<List<InsuranceCoverageOption>> coverages() async => [
        InsuranceCoverageOption((b) => b
          ..coverage = InsuranceCoverage.basic
          ..name = 'Básico'
          ..description = 'Obrigatório. Danos a terceiros e acidentes pessoais.'
          ..premiumCents = 200
          ..mandatory = true
          ..active = true),
      ];

  @override
  Future<Quote> quote(PlanCode plan, InsuranceCoverage coverage, {String? coupon, String? vehicleId}) async => Quote((b) => b
    ..planCode = plan
    ..coverage = coverage
    ..depositCents = 15000
    ..couponApplied = false
    ..breakdown = PriceBreakdown((p) => p
      ..lines = ListBuilder<PriceLine>([
        PriceLine((l) => l
          ..code = 'unlock'
          ..description = 'Desbloqueio'
          ..amountCents = 300),
        PriceLine((l) => l
          ..code = 'time'
          ..description = 'Tempo de uso (por minuto)'
          ..amountCents = 79),
        if (withInsuranceLine)
          PriceLine((l) => l
            ..code = 'insurance_basic'
            ..description = 'Seguro básico'
            ..amountCents = 200),
      ])
      ..subtotalCents = 379
      ..discountCents = 0
      ..insuranceCents = 200
      ..feesCents = 0
      ..totalCents = 579).toBuilder());
}

PaymentCard _card() => PaymentCard((b) => b
  ..id = 'card1'
  ..brand = 'visa'
  ..last4 = '4242'
  ..expMonth = 12
  ..expYear = 2030
  ..isDefault = true
  ..createdAt = DateTime.utc(2026));

Future<void> _pumpPickup(WidgetTester t, _PlanBackend b) async {
  tallScreen(t);
  await t.pumpWidget(testApp(PickupScreen(selection: selection(p: plan(PlanCode.day, 'Diário', PlanUnit.day, 8900))), overrides: [
    backendProvider.overrideWithValue(b),
    sessionProvider.overrideWith(() => FakeSession(session())),
    clockProvider.overrideWithValue(() => thu10),
  ]));
  await t.pumpAndSettle();
}

Future<void> _pumpInsurance(WidgetTester t, _PlanBackend b) async {
  tallScreen(t);
  await t.pumpWidget(testApp(InsuranceScreen(selection: selection(p: plan(PlanCode.day, 'Diário', PlanUnit.day, 8900))), overrides: [
    backendProvider.overrideWithValue(b),
    sessionProvider.overrideWith(() => FakeSession(session())),
  ]));
  await t.pumpAndSettle();
}

Deposit _deposit(String b64) => Deposit((d) => d
  ..id = 'd1'
  ..customerId = 'c1'
  ..method = DepositMethod.pix
  ..status = DepositStatus.awaitingPix
  ..amountCents = 15000
  ..createdAt = DateTime.utc(2026)
  ..updatedAt = DateTime.utc(2026)
  ..pix = PixCharge((p) => p
    ..chargeId = 'ch1'
    ..qrCodeBase64 = b64
    ..copyPaste = '00020126580014BR.GOV.BCB.PIX0136volti-dev'
    ..expiresAt = DateTime.utc(2030)).toBuilder());

class _ReceiptBackend extends FakeBackend {
  _ReceiptBackend({required this.withInsuranceLine});
  final bool withInsuranceLine;
  @override
  Future<Receipt> receipt(String rentalId) async => Receipt((b) => b
    ..rentalId = 'r1'
    ..number = 'VLT-2026-000123'
    ..issuedAt = DateTime.utc(2026, 10, 21)
    ..vehicleCode = 'VLT-001'
    ..planCode = PlanCode.minute
    ..coverage = InsuranceCoverage.basic
    ..startedAt = DateTime.utc(2026, 10, 21, 10)
    ..endedAt = DateTime.utc(2026, 10, 21, 10, 25)
    ..durationSeconds = 1500
    ..paymentMethod = PaymentMethod.card
    ..cardLast4 = '4821'
    ..breakdown = PriceBreakdown((p) => p
      ..lines = ListBuilder<PriceLine>([
        PriceLine((l) => l
          ..code = 'time'
          ..description = 'Tempo de uso (por minuto)'
          ..amountCents = 1975),
        if (withInsuranceLine)
          PriceLine((l) => l
            ..code = 'insurance_basic'
            ..description = 'Seguro básico'
            ..amountCents = 200),
      ])
      ..subtotalCents = 1975
      ..discountCents = 0
      ..insuranceCents = 200
      ..feesCents = 0
      ..totalCents = 2175).toBuilder());
}

class _PausedRide extends FakeBackend {
  Rental _r() => sampleRental(status: RentalStatus.paused);
  @override
  Future<Rental?> currentRental() async => _r();
  @override
  Future<Rental> rental(String id) async => _r();
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<List<GeoZone>> zones() async => [];
}

class _ReturnBackend extends FakeBackend {
  _ReturnBackend(this._zones);
  final List<GeoZone> _zones;
  @override
  Future<List<GeoZone>> zones() async => _zones;
  @override
  Future<Rental> rental(String id) async => sampleRental();
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
}

void main() {
  setUpAll(_loadFonts);

  group('seguro e retirada (P)', () {
    testWidgets('seguro aparece uma vez so no resumo da retirada (a linha da API ja traz)', (t) async {
      await _pumpPickup(t, _PlanBackend());
      expect(find.text('Seguro básico'), findsOneWidget);
      expect(find.text('Seguro'), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('sem linha do seguro na API: mostra a partir de insuranceCents', (t) async {
      await _pumpPickup(t, _PlanBackend(withInsuranceLine: false));
      expect(find.text('Seguro'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('"Obrigatório" so no selo, nao repetido na descricao', (t) async {
      await _pumpInsurance(t, _PlanBackend());
      expect(find.textContaining('Obrigatório'), findsOneWidget);
      expect(find.text('Danos a terceiros e acidentes pessoais.'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('sem cartao salvo: Pix ja vem escolhido e da para confirmar', (t) async {
      await _pumpPickup(t, _PlanBackend());
      expect(t.widget<OptionCard>(find.byKey(const Key('pickup-pix'))).selected, isTrue);
      expect(t.widget<OptionCard>(find.byKey(const Key('pickup-card'))).selected, isFalse);
      expect(t.widget<VoltiButton>(find.byKey(const Key('pickup-confirm'))).onPressed, isNotNull);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('com cartao salvo: cartao continua o padrao', (t) async {
      await _pumpPickup(t, _PlanBackend(savedCards: [_card()]));
      expect(t.widget<OptionCard>(find.byKey(const Key('pickup-card'))).selected, isTrue);
      expect(find.byKey(const Key('plan-confirm-reason')), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('cartao escolhido sem cartao: botao desligado mostra o motivo', (t) async {
      final h = t.ensureSemantics();
      await _pumpPickup(t, _PlanBackend());
      await t.tap(find.byKey(const Key('pickup-card')));
      await t.pumpAndSettle();
      expect(t.widget<VoltiButton>(find.byKey(const Key('pickup-confirm'))).onPressed, isNull);
      expect(find.text('Adicione um cartão ou escolha Pix para a caução.'), findsOneWidget);
      expect(t.getSemantics(find.byKey(const Key('plan-confirm-reason'))), isSemantics(isLiveRegion: true));
      h.dispose();
      await t.pumpWidget(const SizedBox());
    });
  });

  group('folha do Pix', () {
    for (final (name, b64) in [('PNG 1x1 do fake', _png1x1), ('imagem vazia', '')]) {
      testWidgets('$name: desenha o QR a partir do copia e cola', (t) async {
        tallScreen(t);
        await t.pumpWidget(testApp(
          Scaffold(body: PixDepositSheet(deposit: _deposit(b64), pollInterval: const Duration(hours: 1))),
          overrides: [backendProvider.overrideWithValue(FakeBackend())],
        ));
        await t.pump();
        final qr = t.widget<QrImageView>(find.byType(QrImageView));
        expect(qr, isNotNull);
        expect(find.byType(Image), findsNothing, reason: 'o PNG minusculo nao aparece');
        expect(find.bySemanticsLabel('QR code do Pix'), findsOneWidget);
        await t.pumpWidget(const SizedBox());
      });
    }
  });

  group('recibo', () {
    for (final line in [true, false]) {
      testWidgets('seguro uma vez so (linha da API: $line)', (t) async {
        tallScreen(t);
        await t.pumpWidget(testApp(const SummaryScreen(rentalId: 'r1'),
            overrides: [backendProvider.overrideWithValue(_ReceiptBackend(withInsuranceLine: line))]));
        await t.pump();
        await t.pump(const Duration(seconds: 2));
        expect(find.text('Seguro básico'), findsOneWidget);
        expect(find.text(money(200)), findsOneWidget);
        await t.pumpWidget(const SizedBox());
      });
    }
  });

  group('corrida pausada', () {
    for (final scale in [1.0, 2.0]) {
      testWidgets('"Destravar" inteiro (texto $scale x)', (t) async {
        _screen(t, size: scale == 1 ? const Size(412, 915) : const Size(360, 740), scale: scale);
        await t.pumpWidget(testApp(const RideScreen(), overrides: [
          backendProvider.overrideWithValue(_PausedRide()),
          realtimeFactoryProvider.overrideWithValue(FakeRealtime.new),
          locationServiceProvider.overrideWithValue(FakeLocation()),
        ]));
        await t.pump();
        await t.pump(const Duration(milliseconds: 100));
        await t.scrollUntilVisible(find.text('Destravar'), 100, scrollable: find.byType(Scrollable).last);
        for (final s in ['Destravar', 'Devolver moto']) {
          expect(t.renderObject<RenderParagraph>(find.text(s)).didExceedMaxLines, isFalse, reason: '"$s" sem reticencias');
        }
        expect(t.takeException(), isNull);
        await t.pumpWidget(const SizedBox());
      });
    }
  });

  group('devolucao', () {
    Future<void> pumpReturn(WidgetTester t, List<GeoZone> zones) async {
      tallScreen(t);
      await t.pumpWidget(testApp(const ReturnScreen(rentalId: 'r1'), overrides: [
        backendProvider.overrideWithValue(_ReturnBackend(zones)),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      await t.pump(const Duration(milliseconds: 100));
    }

    testWidgets('dentro do ponto verde: texto positivo, sem o aviso de taxa', (t) async {
      await pumpReturn(t, [zoneAround(-23.56, -46.65)]);
      expect(find.text('Parece que a moto está num ponto verde. Se estiver, dá para encerrar sem taxa.'), findsOneWidget);
      expect(find.text('Fora dos pontos verdes não é possível encerrar sem taxa.'), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('passo 2: titulo de travar', (t) async {
      await pumpReturn(t, [zoneAround(-23.56, -46.65)]);
      expect(find.text('Fotografe a moto estacionada'), findsOneWidget);
      await t.tap(find.byType(PhotoCapture));
      await t.pump();
      await t.pump(const Duration(milliseconds: 300));
      expect(find.text('Passo 2 de 2 · Travar'), findsOneWidget);
      expect(find.text('Trave e encerre'), findsOneWidget);
      expect(find.text('Fotografe a moto estacionada'), findsNothing);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('conta', () {
    for (final (name, phone) in [('sem telefone no cadastro', null), ('com telefone', '+5511961007441')]) {
      testWidgets('cadastro por celular ($name): mostra o telefone, nunca o e-mail sintetico', (t) async {
        tallScreen(t);
        final c = customer().rebuild((b) => b
          ..email = '5511961007441@celular.volti.dev'
          ..phone = phone);
        await t.pumpWidget(testApp(const AccountScreen(), overrides: [
          backendProvider.overrideWithValue(AccountBackend()),
          sessionProvider.overrideWith(() => FakeSession(SessionState(signedIn: true, customer: c, consents: session().consents))),
        ]));
        await t.pumpAndSettle();
        expect(find.text('(11) 96100-7441'), findsOneWidget);
        expect(find.textContaining('volti.dev'), findsNothing);
        await t.pumpWidget(const SizedBox());
      });
    }

    test('linha de contato: e-mail real fica; sintetico sem telefone some', () {
      expect(contactLine(customer()), 'a@b.c');
      expect(contactLine(customer().rebuild((b) => b..email = 'sub-1@sem-email.volti.invalid')), isNull);
    });

    testWidgets('recarga paga: folha "Pix confirmado" na largura da tela', (t) async {
      _screen(t);
      final backend = AccountBackend()..statusAfterPoll = TopUpStatus.paid;
      await t.pumpWidget(testApp(const WalletScreen(), overrides: [backendProvider.overrideWithValue(backend)]));
      await t.pumpAndSettle();
      await t.tap(find.text('Recarregar carteira'));
      await t.pumpAndSettle();
      await t.tap(find.text('R\$ 20,00'));
      await t.pump();
      await t.tap(find.text('Gerar Pix de R\$ 20,00'));
      await t.pump();
      await t.pump(const Duration(seconds: 1));
      await t.pump(const Duration(seconds: 2));
      await t.pump();
      expect(find.text('Pix confirmado'), findsOneWidget);
      expect(t.getSize(find.byType(VoltiBottomSheet)).width, 412);
      await t.pumpWidget(const SizedBox());
    });
  });
}
