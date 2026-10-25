// Correcoes do QA exploratorio do app do cliente (Task 13): cada achado com teste a 100% e a 200% de fonte.

import 'dart:typed_data';

import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/router.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/widgets.dart' show VoltiMap;
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/account/account_screen.dart';
import 'package:volti_cliente/features/account/history_screen.dart';
import 'package:volti_cliente/features/account/privacy_screen.dart';
import 'package:volti_cliente/features/home/providers.dart';
import 'package:volti_cliente/features/onboarding/onboarding_screen.dart';
import 'package:volti_cliente/features/pickup/pickup_screen.dart';
import 'package:volti_cliente/features/plan/insurance_screen.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'account_gap_c_test.dart' show AccountBackend;
import 'galpao_fixtures.dart';
import 'helpers.dart';
import 'pick_catalog_test.dart' show CatalogBackend, loadFonts;

void phone(WidgetTester t, {double scale = 1, Size size = const Size(412, 915)}) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  t.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
}

Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 300));
  }
}

PriceBreakdown _breakdown({required int unitCents}) => PriceBreakdown((b) => b
  ..lines = ListBuilder<PriceLine>([
    PriceLine((l) => l
      ..code = 'time'
      ..description = 'Tempo de uso (por minuto)'
      ..quantity = 5
      ..unitCents = unitCents
      ..amountCents = unitCents * 5),
  ])
  ..subtotalCents = unitCents * 5
  ..discountCents = 0
  ..insuranceCents = 0
  ..feesCents = 0
  ..totalCents = unitCents * 5);

/// Corrida do modelo Touring: R$ 0,99/min no breakdown; o plano por minuto custa R$ 0,79.
class _RideB extends FakeBackend {
  _RideB({this.fixed});
  final Rental? fixed;
  @override
  Future<Rental?> currentRental() async => fixed ?? sampleRental();
  @override
  Future<Rental> rental(String id) async => fixed ?? sampleRental();
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<List<GeoZone>> zones() async => [];
  @override
  Future<List<PricingPlan>> plans() async => [plan(PlanCode.minute, 'Por minuto', PlanUnit.minute, 79)];
}

void main() {
  setUpAll(loadFonts);

  group('Q-01 / Q-05 corrida: tarifa do aluguel e layout em 200%', () {
    late FakeRealtime rt;

    Future<void> pumpRide(WidgetTester t, {double scale = 1, Rental? rental}) async {
      phone(t, scale: scale);
      rt = FakeRealtime();
      await t.pumpWidget(testApp(const RideScreen(), overrides: [
        backendProvider.overrideWithValue(_RideB(fixed: rental)),
        realtimeFactoryProvider.overrideWithValue(() => rt),
        locationServiceProvider.overrideWithValue(FakeLocation()),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
    }

    final touring = sampleRental().rebuild((b) => b.breakdown.replace(_breakdown(unitCents: 99)));

    for (final scale in [1.0, 2.0]) {
      testWidgets('tarifa do modelo (R\$ 0,99/min) e nao a do plano (R\$ 0,79/min) a ${(scale * 100).round()}%', (t) async {
        await pumpRide(t, scale: scale, rental: touring);
        expect(t.widget<Text>(find.descendant(of: find.byKey(const Key('ride-fare')), matching: find.byType(Text)).last).data, 'R\$ 0,99/min');
        expect(find.text('R\$ 0,79/min'), findsNothing);
        expect(t.takeException(), isNull);
        await t.pumpWidget(const SizedBox());
      });
    }

    testWidgets('sem breakdown no aluguel, cai no preco do plano', (t) async {
      await pumpRide(t);
      expect(find.text('R\$ 0,79/min'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('100%: titulo com plano e seguro e as tres metricas lado a lado', (t) async {
      await pumpRide(t, rental: touring);
      expect(find.text('Em corrida · Por minuto · Seguro básico'), findsOneWidget);
      final fare = t.getTopLeft(find.text('Tarifa')), cost = t.getTopLeft(find.text('Custo acumulado'));
      expect(fare.dy, cost.dy);
      expect(fare.dx, lessThan(cost.dx));
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('200%: titulo so com o estado, plano e seguro em chips, metricas empilhadas sem quebra de palavra', (t) async {
      await pumpRide(t, scale: 2, rental: touring);
      expect(find.text('Em corrida'), findsOneWidget);
      expect(find.widgetWithText(VoltiChip, 'Por minuto'), findsOneWidget);
      expect(find.widgetWithText(VoltiChip, 'Seguro básico'), findsOneWidget);
      // Uma metrica por linha, todas alinhadas a esquerda.
      final fare = t.getTopLeft(find.text('Tarifa')), cost = t.getTopLeft(find.text('Custo acumulado')), bat = t.getTopLeft(find.text('Bateria'));
      expect(fare.dx, cost.dx);
      expect(cost.dx, bat.dx);
      expect(fare.dy, lessThan(cost.dy));
      expect(cost.dy, lessThan(bat.dy));
      // "Custo acumulado" cabe numa linha (sem "Custo ac / umulado") e o valor tambem.
      expect(t.getSize(find.text('Custo acumulado')).height, lessThan(40));
      expect(t.getSize(find.text('R\$ 0,99/min')).height, lessThan(50));
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('Q-08 seguro: selo "Obrigatório" cresce com o texto', () {
    for (final scale in [1.0, 2.0]) {
      testWidgets('selo inteiro a ${(scale * 100).round()}%', (t) async {
        phone(t, scale: scale);
        await t.pumpWidget(testApp(InsuranceScreen(selection: selection(p: plan(PlanCode.day, 'Diário', PlanUnit.day, 8900))), overrides: [
          backendProvider.overrideWithValue(GalpaoBackend()),
        ]));
        await settle(t);
        final text = find.text('Obrigatório');
        expect(text, findsOneWidget);
        final pill = find.ancestor(of: text, matching: find.byType(Container)).first;
        expect(t.getSize(pill).height, greaterThanOrEqualTo(t.getSize(text).height));
        expect(t.getSize(pill).width, greaterThanOrEqualTo(t.getSize(text).width));
        expect(t.takeException(), isNull);
      });
    }

    testWidgets('VoltiBadge a 200%: a altura acompanha o texto', (t) async {
      phone(t, scale: 2);
      await t.pumpWidget(testApp(const Scaffold(body: Center(child: VoltiBadge('Verificada 18+')))));
      expect(t.getSize(find.byKey(const Key('volti-badge'))).height, greaterThanOrEqualTo(t.getSize(find.text('Verificada 18+')).height));
      expect(t.takeException(), isNull);
    });
  });

  group('Q-02 / Q-06 retirada: resumo', () {
    final dayPlan = plan(PlanCode.day, 'Diário', PlanUnit.day, 8900);

    Future<void> pumpPickup(WidgetTester t, GalpaoBackend b, {double scale = 1, String coupon = '', PricingPlan? p, DateTime? now}) async {
      phone(t, scale: scale);
      await t.pumpWidget(testApp(PickupScreen(selection: selection(p: p ?? dayPlan)), overrides: [
        backendProvider.overrideWithValue(b),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => now ?? thu10),
        if (coupon.isNotEmpty) pendingCouponProvider.overrideWith(() => _Coupon(coupon)),
      ]));
      await settle(t);
    }

    for (final scale in [1.0, 2.0]) {
      final pct = (scale * 100).round();

      testWidgets('cupom de valor fixo no plano por minuto: "até -R\$ 10,00" e a nota do fechamento a $pct%', (t) async {
        final b = _CouponBackend(quotedDiscount: 399, rule: _rule(fixed: 1000));
        await pumpPickup(t, b, scale: scale, coupon: 'BEMVINDO10', p: plan(PlanCode.minute, 'Por minuto', PlanUnit.minute, 79));
        expect(find.byKey(const Key('pickup-coupon-discount')), findsOneWidget);
        expect(t.widget<Text>(find.byKey(const Key('pickup-coupon-discount'))).data, 'até -R\$ 10,00');
        expect(find.text('-R\$ 3,99'), findsNothing);
        expect(find.byKey(const Key('pickup-coupon-note')), findsOneWidget);
        expect(t.takeException(), isNull);
      });

      testWidgets('cupom percentual: "-10% do tempo" a $pct%', (t) async {
        final b = _CouponBackend(quotedDiscount: 890, rule: _rule(percent: 10));
        await pumpPickup(t, b, scale: scale, coupon: 'DEZ');
        expect(t.widget<Text>(find.byKey(const Key('pickup-coupon-discount'))).data, '-10% do tempo');
        expect(find.byKey(const Key('pickup-coupon-note')), findsOneWidget);
        expect(t.takeException(), isNull);
      });

      testWidgets('cupom que ja cabe inteiro na cotacao: valor exato, sem nota a $pct%', (t) async {
        final b = _CouponBackend(quotedDiscount: 1000, rule: _rule(fixed: 1000));
        await pumpPickup(t, b, scale: scale, coupon: 'BEMVINDO10');
        expect(t.widget<Text>(find.byKey(const Key('pickup-coupon-discount'))).data, '-R\$ 10,00');
        expect(find.byKey(const Key('pickup-coupon-note')), findsNothing);
      });

      testWidgets('valores do resumo alinhados na mesma borda direita a $pct%', (t) async {
        final b = _CouponBackend(quotedDiscount: 1000, rule: _rule(fixed: 1000));
        await pumpPickup(t, b, scale: scale, coupon: 'BEMVINDO10');
        final plan_ = find.byKey(const Key('pickup-plan-price')), deposit = find.byKey(const Key('pickup-deposit'));
        final card = t.getRect(find.ancestor(of: plan_, matching: find.byType(Container)).first);
        // Valor colado a direita do cartao (menos o respiro de 16), nao no meio.
        expect(t.getTopRight(plan_).dx, closeTo(card.right - VoltiSpacing.s16, 1));
        expect(t.getTopRight(deposit).dx, closeTo(card.right - VoltiSpacing.s16, 1));
        // "R$ 89,00/dia" inteiro numa linha.
        expect(t.getSize(plan_).height, lessThan(60));
        expect(t.takeException(), isNull);
      });
    }

    testWidgets('sem a regra do cupom (falha), mostra o minimo cotado e a nota', (t) async {
      final b = _CouponBackend(quotedDiscount: 399, rule: null);
      await pumpPickup(t, b, coupon: 'BEMVINDO10');
      expect(t.widget<Text>(find.byKey(const Key('pickup-coupon-discount'))).data, '-R\$ 3,99');
      expect(find.byKey(const Key('pickup-coupon-note')), findsOneWidget);
    });

    for (final scale in [1.0, 2.0]) {
      testWidgets('Q-12 agenda com o expediente encerrado: "Hoje · Encerrado" a ${(scale * 100).round()}%', (t) async {
        // Quinta 20:30 em Sao Paulo: o galpao fechou as 20h, entao hoje nao tem mais horario.
        await pumpPickup(t, GalpaoBackend(), scale: scale, now: DateTime.utc(2026, 10, 22, 23, 30));
        expect(find.text('Hoje · Encerrado'), findsOneWidget);
        expect(t.widget<VoltiChip>(find.widgetWithText(VoltiChip, 'Hoje · Encerrado')).enabled, isFalse);
        expect(find.text('dom. 25/10 · Fechado'), findsOneWidget);
        expect(t.takeException(), isNull);
      });
    }
  });

  group('Q-03 KYC: CPF ja usado em outra conta', () {
    for (final scale in [1.0, 2.0]) {
      testWidgets('o erro leva ao campo de CPF, sem reenviar, a ${(scale * 100).round()}%', (t) async {
        phone(t, scale: scale, size: const Size(412, 2400));
        final b = _KycB();
        var fixes = 0;
        await t.pumpWidget(testApp(
          DocumentsStep(name: 'Ana Lima', cpf: '529.982.247-25', birth: '10/10/1990', onBack: () {}, onSubmitted: () {}, onCpfRejected: () => fixes++),
          overrides: [
            backendProvider.overrideWithValue(b),
            photoPickerProvider.overrideWithValue(_Picker()),
            sessionProvider.overrideWith(() => FakeSession(session(kyc: KycStatus.notStarted))),
          ],
        ));
        await t.pumpAndSettle();
        await t.tap(find.text('Foto do documento (RG ou CNH)'));
        await t.pump();
        await t.tap(find.text('Selfie com prova de vida'));
        await t.pump();
        await t.tap(find.text('Enviar para análise'));
        await t.pumpAndSettle();

        expect(b.submits, 1);
        expect(find.text('Este CPF já está cadastrado em outra conta.'), findsOneWidget);
        expect(find.text('Tentar de novo'), findsNothing);
        await t.tap(find.text('Corrigir CPF'));
        await t.pump();
        expect(fixes, 1);
        expect(b.submits, 1, reason: 'corrigir nao repete o mesmo envio');
        expect(t.takeException(), isNull);
      });

      testWidgets('o passo de dados volta com o CPF preenchido e o erro no campo, ate editar (${(scale * 100).round()}%)', (t) async {
        phone(t, scale: scale, size: const Size(412, 2400));
        await t.pumpWidget(testApp(
          ConsentStep(
            onDone: (_, _, _) {},
            initialName: 'Ana Lima',
            initialCpf: '529.982.247-25',
            initialBirth: '10/10/1990',
            rejectedCpf: '529.982.247-25',
            initialTerms: true,
          ),
          overrides: [backendProvider.overrideWithValue(_KycB()), sessionProvider.overrideWith(() => FakeSession(session(kyc: KycStatus.notStarted)))],
        ));
        await t.pumpAndSettle();
        expect(find.text('Este CPF já está cadastrado em outra conta.'), findsOneWidget);
        var cont = t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Continuar'));
        expect(cont.onPressed, isNull, reason: 'o mesmo CPF recusado nao segue');
        // Outro CPF valido limpa o erro e libera.
        await t.enterText(find.widgetWithText(TextField, '529.982.247-25').first, '111.444.777-35');
        await t.pump();
        expect(find.text('Este CPF já está cadastrado em outra conta.'), findsNothing);
        cont = t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Continuar'));
        expect(cont.onPressed, isNotNull);
        expect(t.takeException(), isNull);
      });
    }
  });

  group('Q-04 Termos e Politica em Conta e Privacidade', () {
    final termsUri = Uri.parse('https://volti.example/termos');
    final privacyUri = Uri.parse('https://volti.example/privacidade');

    for (final scale in [1.0, 2.0]) {
      testWidgets('Conta > Privacidade (LGPD) abre os mesmos links do rodape a ${(scale * 100).round()}%', (t) async {
        phone(t, scale: scale, size: const Size(412, 3000));
        final opened = <Uri>[];
        await t.pumpWidget(testApp(const AccountScreen(), overrides: [
          backendProvider.overrideWithValue(AccountBackend()),
          sessionProvider.overrideWith(() => FakeSession(session())),
          legalLinksProvider.overrideWithValue(LegalLinks(terms: termsUri, privacy: privacyUri)),
          urlLauncherProvider.overrideWithValue((u) async {
            opened.add(u);
            return true;
          }),
        ]));
        await t.pumpAndSettle();
        await t.ensureVisible(find.byKey(const Key('account-terms')));
        await t.tap(find.byKey(const Key('account-terms')));
        await t.pump();
        await t.ensureVisible(find.byKey(const Key('account-privacy-policy')));
        await t.tap(find.byKey(const Key('account-privacy-policy')));
        await t.pump();
        expect(opened, [termsUri, privacyUri]);
        expect(t.takeException(), isNull);
      });

      testWidgets('tela Privacidade tem as duas linhas e avisa quando o documento nao esta publicado (${(scale * 100).round()}%)', (t) async {
        phone(t, scale: scale, size: const Size(412, 3000));
        await t.pumpWidget(testApp(const PrivacyScreen(), overrides: [
          backendProvider.overrideWithValue(AccountBackend()),
          sessionProvider.overrideWith(() => FakeSession(session())),
          legalLinksProvider.overrideWithValue(const LegalLinks()),
        ]));
        await t.pumpAndSettle();
        expect(find.text('Termos de uso'), findsOneWidget);
        expect(find.text('Política de privacidade'), findsOneWidget);
        await t.tap(find.byKey(const Key('privacy-terms')));
        await t.pump();
        expect(find.text('Este documento ainda não está publicado neste ambiente.'), findsOneWidget);
        expect(t.takeException(), isNull);
        await t.pumpAndSettle(const Duration(seconds: 6));
      });
    }
  });

  group('Q-14 historico: duracao com unidade', () {
    for (final scale in [1.0, 2.0]) {
      testWidgets('"4 min 9 s" e nao "04:09" a ${(scale * 100).round()}%', (t) async {
        phone(t, scale: scale);
        await t.pumpWidget(testApp(const HistoryScreen(), overrides: [backendProvider.overrideWithValue(_HistoryB())]));
        await t.pumpAndSettle();
        expect(find.text('4 min 9 s'), findsOneWidget);
        expect(find.text('04:09'), findsNothing);
        expect(t.takeException(), isNull);
      });
    }
  });

  group('Q-10 lista de motos em 200%', () {
    testWidgets('filtros de modelo quebram linha e a descricao nao termina em reticencias', (t) async {
      phone(t, scale: 2);
      final router = GoRouter(initialLocation: '/pick', routes: appRoutes());
      addTearDown(router.dispose);
      await t.pumpWidget(testRouterApp(router, overrides: [
        backendProvider.overrideWithValue(CatalogBackend()),
        pushServiceProvider.overrideWithValue(NoopPushService()),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => thu10),
      ]));
      await settle(t);
      // Nenhum chip passa da borda da tela (sem rolagem horizontal escondendo "Volti Sport").
      for (final name in ['Todas', 'Volti Touring', 'Volti Sport', 'Volti Urbana']) {
        final chip = find.widgetWithText(VoltiChip, name);
        expect(chip, findsOneWidget, reason: name);
        expect(t.getRect(chip).right, lessThanOrEqualTo(412), reason: name);
      }
      final desc = t.renderObject<RenderParagraph>(find.byKey(const Key('pick-description')).first);
      expect(desc.didExceedMaxLines, isFalse);
      expect(t.takeException(), isNull);
    });
  });

  group('Q-09 mapa: tiles que falharam sao recarregados ao reabrir o app', () {
    testWidgets('voltar do segundo plano nao quebra o mapa', (t) async {
      phone(t);
      await t.pumpWidget(testApp(
        const SizedBox(width: 300, height: 300, child: VoltiMap(center: LatLng(-23.56, -46.65), zoom: 15))));
      await t.pump();
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await t.pump();
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });
  });
}

class _Coupon extends PendingCouponNotifier {
  _Coupon(this.code);
  final String code;
  @override
  String build() => code;
}

CouponValidation _rule({int? fixed, int? percent}) => CouponValidation((b) => b
  ..code = 'X'
  ..valid = true
  ..discountType = fixed != null ? DiscountType.fixed : DiscountType.percent
  ..amountOffCents = fixed
  ..percentOff = percent);

/// Cotacao com a linha do cupom que a API calcula para o minimo estimado.
class _CouponBackend extends GalpaoBackend {
  _CouponBackend({required this.quotedDiscount, required this.rule});
  final int quotedDiscount;
  final CouponValidation? rule;

  @override
  Future<CouponValidation> validateCoupon(String code, {PlanCode? plan}) async {
    if (rule == null) throw DioException(requestOptions: RequestOptions(path: '/me/coupons/validate'));
    return rule!;
  }

  @override
  Future<Quote> quote(PlanCode plan, InsuranceCoverage coverage, {String? coupon, String? vehicleId}) async {
    final base = await super.quote(plan, coverage, coupon: coupon, vehicleId: vehicleId);
    return base.rebuild((b) {
      b.couponApplied = true;
      b.breakdown.lines.add(PriceLine((l) => l
        ..code = 'coupon'
        ..description = 'Cupom $coupon'
        ..amountCents = -quotedDiscount));
    });
  }
}

class _Picker implements PhotoPicker {
  @override
  Future<Uint8List?> take({bool front = false}) async => Uint8List.fromList([1, 2, 3]);
}

class _KycB extends FakeBackend {
  int submits = 0;
  @override
  Future<KycUploads> kycUploads(DocumentType type) async => KycUploads((b) => b
    ..documentFront.replace(_target('front'))
    ..selfie.replace(_target('selfie')));
  @override
  Future<void> upload(PresignedUpload target, Uint8List bytes, String contentType) async {}
  @override
  Future<KycStatusResponse> submitKyc(KycSubmitRequest request) async {
    submits++;
    throw DioException(
      requestOptions: RequestOptions(path: '/kyc/submit'),
      response: Response(
        requestOptions: RequestOptions(path: '/kyc/submit'),
        statusCode: 409,
        data: {'type': 'https://api.volti.com.br/problems/conflict', 'title': 'Conflito', 'status': 409, 'detail': 'Este CPF já está cadastrado em outra conta.'},
      ),
    );
  }

  PresignedUpload _target(String key) => PresignedUpload((b) => b
    ..uploadUrl = 'http://minio/$key'
    ..method = PresignedUploadMethodEnum.PUT
    ..objectKey = 'kyc/c1/$key.jpg'
    ..expiresAt = DateTime.utc(2030));
}

class _HistoryB extends FakeBackend {
  @override
  Future<List<Rental>> rentals() async => [sampleRental().rebuild((b) => b..elapsedSeconds = 249)];
}
