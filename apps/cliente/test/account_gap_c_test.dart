import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/account/account_screens.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

const _png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

PresignedUpload _target(String key) => PresignedUpload((b) => b
  ..objectKey = key
  ..uploadUrl = 'https://s3.local/$key'
  ..method = PresignedUploadMethodEnum.PUT
  ..expiresAt = DateTime.utc(2026, 10, 21, 12));

Wallet _wallet({int cents = 3850, int minutes = 120}) => Wallet((b) => b
  ..balanceCents = cents
  ..minutesBalance = minutes
  ..updatedAt = DateTime.utc(2026, 10, 21));

Subscription _sub({bool ending = false}) => Subscription((b) => b
  ..id = 's1'
  ..planCode = SubscriptionPlanCode.weekly
  ..status = SubscriptionStatus.active
  ..cardId = 'card1'
  ..priceCents = 24900
  ..currentPeriodStart = DateTime.utc(2026, 10, 21, 12)
  ..currentPeriodEnd = DateTime.utc(2026, 10, 28, 12)
  ..cancelAtPeriodEnd = ending
  ..createdAt = DateTime.utc(2026, 10, 21));

PaymentCard _card() => PaymentCard((b) => b
  ..id = 'card1'
  ..brand = 'visa'
  ..last4 = '4821'
  ..expMonth = 12
  ..expYear = 2030
  ..isDefault = true
  ..createdAt = DateTime.utc(2026));

PricingPlan _plan(PlanCode code, int price) => PricingPlan((b) => b
  ..id = code.name
  ..code = code
  ..name = code.name
  ..unit = code == PlanCode.weekly ? PlanUnit.week : PlanUnit.month
  ..unlockFeeCents = 0
  ..unitPriceCents = price
  ..pausePerMinuteCents = 0
  ..recurring = true
  ..active = true
  ..createdAt = DateTime.utc(2026)
  ..updatedAt = DateTime.utc(2026));

/// Backend unico para a conta: grava o que as telas chamam.
class AccountBackend extends FakeBackend {
  // sinistro
  final sentClaims = <(String, ClaimType, String, List<String>)>[];
  int uploadsRequested = 0;
  bool failNextUpload = false;
  final uploadedBytes = <Uint8List>[];
  // carteira
  final topUps = <(String?, int?)>[];
  TopUpStatus statusAfterPoll = TopUpStatus.paid;
  int statusCalls = 0;
  // plano
  final subscribed = <SubscriptionPlanCode>[];
  List<Subscription> subs = [];
  int cancels = 0;
  // contato
  final profileUpdates = <(String?, String?)>[];

  @override
  Future<PresignedUpload> supportUpload(UploadContentType contentType) async {
    uploadsRequested++;
    return _target('support/c1/anexo-$uploadsRequested.jpg');
  }

  @override
  Future<void> upload(PresignedUpload target, Uint8List bytes, String contentType) async {
    if (failNextUpload) {
      failNextUpload = false;
      throw AppFailure(kind: FailureKind.network);
    }
    uploadedBytes.add(bytes);
  }

  @override
  Future<Claim> claim(String rentalId, ClaimType type, String description, {List<String> photoKeys = const []}) async {
    sentClaims.add((rentalId, type, description, photoKeys));
    return Claim((b) => b
      ..id = 'cl1'
      ..customerId = 'c1'
      ..rentalId = rentalId
      ..type = type
      ..status = ClaimStatus.submitted
      ..description = description
      ..occurredAt = DateTime.utc(2026, 10, 21)
      ..createdAt = DateTime.utc(2026, 10, 21)
      ..updatedAt = DateTime.utc(2026, 10, 21));
  }

  @override
  Future<Wallet> wallet() async => _wallet();

  @override
  Future<List<MinutePackage>> minutePackages() async => [
        MinutePackage((b) => b
          ..id = 'pk60'
          ..name = 'Pacote 60 minutos'
          ..minutes = 60
          ..priceCents = 3990
          ..active = true),
      ];

  @override
  Future<List<WalletEntry>> walletLedger() async => [
        WalletEntry((b) => b
          ..id = 'e1'
          ..type = WalletEntryType.topUp
          ..amountCents = 5000
          ..balanceAfterCents = 5000
          ..description = 'Recarga Pix'
          ..createdAt = DateTime.utc(2026, 10, 20, 15)),
      ];

  TopUp _topUp(TopUpStatus status, {String? packageId, int amount = 2000, int? minutes}) => TopUp((b) => b
    ..id = 't1'
    ..status = status
    ..method = TopUpMethod.pix
    ..amountCents = amount
    ..packageId = packageId
    ..minutes = minutes
    ..pix = PixCharge((p) => p
      ..chargeId = 'ch1'
      ..qrCodeBase64 = _png1x1
      ..copyPaste = '00020126PIXCOPIAECOLA'
      ..expiresAt = DateTime.utc(2026, 10, 21, 13)).toBuilder()
    ..createdAt = DateTime.utc(2026, 10, 21));

  @override
  Future<TopUp> topUp({String? packageId, int? amountCents}) async {
    topUps.add((packageId, amountCents));
    return last = _topUp(TopUpStatus.pending, packageId: packageId, amount: amountCents ?? 3990, minutes: packageId == null ? null : 60);
  }

  TopUp? last;

  @override
  Future<TopUp> topUpStatus(String id) async {
    statusCalls++;
    return last!.rebuild((b) => b.status = statusAfterPoll);
  }

  @override
  Future<List<Subscription>> subscriptions() async => subs;

  @override
  Future<List<PricingPlan>> plans() async => [_plan(PlanCode.weekly, 24900), _plan(PlanCode.monthly, 79900)];

  @override
  Future<List<PaymentCard>> cards() async => [_card()];

  @override
  Future<Subscription> subscribe(SubscriptionPlanCode code) async {
    subscribed.add(code);
    subs = [_sub()];
    return subs.first;
  }

  @override
  Future<void> cancelSubscription(String id) async {
    cancels++;
    subs = [_sub(ending: true)];
  }

  @override
  Future<List<Rental>> rentals() async => [sampleRental(status: RentalStatus.ended)];

  @override
  Future<void> updateProfile({String? name, String? phone, String? emergencyName, String? emergencyPhone}) async {
    profileUpdates.add((emergencyName, emergencyPhone));
  }
}

class _CountingPicker implements PhotoPicker {
  int n = 0;
  @override
  Future<Uint8List?> take({bool front = false}) async => Uint8List.fromList([++n, 2, 3]);
}

class _RefreshingSession extends FakeSession {
  _RefreshingSession(super.initial);
  int refreshes = 0;
  @override
  Future<void> refresh() async => refreshes++;
}

/// Abre o sheet do Pix sem `pumpAndSettle` (que avancaria o relogio ate o polling).
Future<void> openSheet(WidgetTester t) async {
  await t.pump();
  await t.pump(const Duration(seconds: 1));
}

void main() {
  group('F5/F4 sinistro', () {
    Future<AccountBackend> pumpClaim(WidgetTester t) async {
      tallScreen(t);
      final backend = AccountBackend();
      await t.pumpWidget(testApp(const ClaimScreen(rentalId: 'r1'), overrides: [
        backendProvider.overrideWithValue(backend),
        photoPickerProvider.overrideWithValue(_CountingPicker()),
      ]));
      await t.pumpAndSettle();
      return backend;
    }

    VoltiButton sendButton(WidgetTester t) =>
        t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Enviar sinistro'));

    testWidgets('descricao com 9 caracteres nao envia; 10 libera (minLength do contrato)', (t) async {
      final backend = await pumpClaim(t);
      expect(sendButton(t).onPressed, isNull);
      await t.enterText(find.byKey(const Key('claim-description')), '123456789');
      await t.pump();
      expect(sendButton(t).onPressed, isNull);
      expect(find.text('Falta 1 caractere (mínimo de 10)'), findsOneWidget);
      // Espacos nas pontas nao contam (a API recebe o texto aparado).
      await t.enterText(find.byKey(const Key('claim-description')), '  123456789  ');
      await t.pump();
      expect(sendButton(t).onPressed, isNull);
      await t.enterText(find.byKey(const Key('claim-description')), '1234567890');
      await t.pump();
      expect(sendButton(t).onPressed, isNotNull);
      expect(find.textContaining('mínimo de 10'), findsNothing);
      await t.tap(find.text('Enviar sinistro'));
      await t.pumpAndSettle();
      expect(backend.sentClaims.single.$3, '1234567890');
      expect(backend.sentClaims.single.$4, isEmpty);
    });

    testWidgets('fotos e boletim de ocorrencia sobem pelo /support/uploads e vao no photoObjectKeys', (t) async {
      final backend = await pumpClaim(t);
      await t.tap(find.text('Furto'));
      await t.tap(find.byKey(const Key('claim-add-photo')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('claim-add-photo')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('claim-add-report')));
      await t.pumpAndSettle();
      expect(backend.uploadsRequested, 3);
      expect(backend.uploadedBytes.length, 3);
      expect(find.byKey(const Key('claim-thumb-0')), findsNWidgets(2)); // 1a foto e 1a pagina do BO
      expect(find.byKey(const Key('claim-thumb-1')), findsOneWidget);
      expect(find.text('Em furto ou acidente, o boletim de ocorrência agiliza a análise. Fotografe as páginas.'), findsOneWidget);

      await t.enterText(find.byKey(const Key('claim-description')), 'Levaram a moto na frente da padaria.');
      await t.pump();
      await t.tap(find.text('Enviar sinistro'));
      await t.pumpAndSettle();
      final c = backend.sentClaims.single;
      expect(c.$2, ClaimType.theft);
      expect(c.$4, ['support/c1/anexo-1.jpg', 'support/c1/anexo-2.jpg', 'support/c1/anexo-3.jpg']);
    });

    testWidgets('anexo que falhou bloqueia o envio ate tentar de novo ou remover', (t) async {
      final backend = await pumpClaim(t);
      backend.failNextUpload = true;
      await t.tap(find.byKey(const Key('claim-add-photo')));
      await t.pumpAndSettle();
      expect(find.text('Tentar'), findsOneWidget);
      await t.enterText(find.byKey(const Key('claim-description')), 'Bati numa guia e o pneu furou.');
      await t.pump();
      await t.tap(find.text('Enviar sinistro'));
      await t.pumpAndSettle();
      expect(backend.sentClaims, isEmpty);
      await t.tap(find.text('Tentar'));
      await t.pumpAndSettle();
      expect(find.text('Tentar'), findsNothing);
      await t.tap(find.text('Enviar sinistro'));
      await t.pumpAndSettle();
      expect(backend.sentClaims.single.$4, ['support/c1/anexo-2.jpg']);
    });

    testWidgets('remover anexo tira a chave do envio', (t) async {
      final backend = await pumpClaim(t);
      await t.tap(find.byKey(const Key('claim-add-photo')));
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('Remover anexo 1'));
      await t.pumpAndSettle();
      expect(find.byKey(const Key('claim-thumb-0')), findsNothing);
      await t.enterText(find.byKey(const Key('claim-description')), 'Arranhão no paralama traseiro.');
      await t.pump();
      await t.tap(find.text('Enviar sinistro'));
      await t.pumpAndSettle();
      expect(backend.sentClaims.single.$4, isEmpty);
    });
  });

  group('F1/A4 recarga Pix', () {
    Future<AccountBackend> pumpWallet(WidgetTester t, {TopUpStatus result = TopUpStatus.paid}) async {
      tallScreen(t);
      final backend = AccountBackend()..statusAfterPoll = result;
      await t.pumpWidget(testApp(const WalletScreen(), overrides: [backendProvider.overrideWithValue(backend)]));
      await t.pumpAndSettle();
      return backend;
    }

    testWidgets('valor livre: QR + copia e cola, polling ate pago, saldo atualiza', (t) async {
      final backend = await pumpWallet(t);
      expect(find.text('Extrato'), findsOneWidget);
      expect(find.text('Recarga Pix'), findsOneWidget);
      await t.tap(find.text('Recarregar carteira'));
      await t.pumpAndSettle();
      await t.tap(find.text('R\$ 20,00'));
      await t.pump();
      await t.tap(find.text('Gerar Pix de R\$ 20,00'));
      await openSheet(t);
      expect(backend.topUps.single, (null, 2000));
      expect(find.byKey(const Key('topup-qr')), findsOneWidget);
      expect(find.text('00020126PIXCOPIAECOLA'), findsOneWidget);
      expect(find.text('Copiar código Pix'), findsOneWidget);
      expect(find.text('Aguardando o pagamento…'), findsOneWidget);

      await t.pump(const Duration(seconds: 2));
      await t.pump();
      expect(backend.statusCalls, 1);
      expect(find.text('Pix confirmado'), findsOneWidget);
      expect(find.text('R\$ 20,00 já estão na sua carteira.'), findsOneWidget);
      await t.pump(const Duration(milliseconds: 1500));
      await t.pumpAndSettle();
      expect(find.text('Pix confirmado'), findsNothing);
      expect(find.text('Carteira recarregada'), findsOneWidget);
      await t.pump(const Duration(seconds: 5));
      await t.pumpAndSettle();
    });

    testWidgets('valor fora de R\$ 10 a R\$ 1.000 mostra erro e nao gera Pix', (t) async {
      final backend = await pumpWallet(t);
      await t.tap(find.text('Recarregar carteira'));
      await t.pumpAndSettle();
      await t.enterText(find.byKey(const Key('topup-amount')), '5');
      await t.pump();
      expect(find.text('Escolha um valor entre R\$ 10 e R\$ 1.000'), findsOneWidget);
      final btn = t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Gerar Pix'));
      expect(btn.onPressed, isNull);
      await t.enterText(find.byKey(const Key('topup-amount')), '1001');
      await t.pump();
      expect(find.text('Escolha um valor entre R\$ 10 e R\$ 1.000'), findsOneWidget);
      await t.enterText(find.byKey(const Key('topup-amount')), '37,5');
      await t.pump();
      await t.tap(find.text('Gerar Pix de R\$ 37,50'));
      await openSheet(t);
      expect(backend.topUps.single, (null, 3750));
      await t.tap(find.text('Pagar depois'));
      await t.pumpAndSettle();
    });

    testWidgets('pacote de minutos: confirma e paga com Pix pelo packageId', (t) async {
      final backend = await pumpWallet(t);
      await t.tap(find.text('Pacote 60 minutos'));
      await t.pumpAndSettle();
      expect(find.text('Comprar Pacote 60 minutos?'), findsOneWidget);
      await t.tap(find.text('Pagar com Pix'));
      await openSheet(t);
      expect(backend.topUps.single, ('pk60', null));
      await t.pump(const Duration(seconds: 2));
      await t.pump();
      expect(find.text('60 minutos já estão na sua carteira.'), findsOneWidget);
      await t.pump(const Duration(milliseconds: 1500));
      await t.pumpAndSettle();
      await t.pump(const Duration(seconds: 5));
      await t.pumpAndSettle();
    });

    testWidgets('Pix expirado para o polling e avisa', (t) async {
      await pumpWallet(t, result: TopUpStatus.expired);
      await t.tap(find.text('Recarregar carteira'));
      await t.pumpAndSettle();
      await t.tap(find.text('Gerar Pix de R\$ 50,00'));
      await openSheet(t);
      await t.pump(const Duration(seconds: 2));
      await t.pump();
      expect(find.text('O Pix expirou. Gere um novo código.'), findsOneWidget);
      await t.tap(find.text('Fechar'));
      await t.pumpAndSettle();
    });

    test('parseReaisToCents', () {
      expect(parseReaisToCents('50'), 5000);
      expect(parseReaisToCents('50,9'), 5090);
      expect(parseReaisToCents('1.000,00'), 100000);
      expect(parseReaisToCents('abc'), isNull);
      expect(parseReaisToCents(''), isNull);
    });
  });

  group('F3/A6 gestao do plano', () {
    testWidgets('sem plano: escolhe mensal, ve preco, recorrencia e cartao, assina', (t) async {
      tallScreen(t);
      final backend = AccountBackend();
      await t.pumpWidget(testApp(const SubscriptionsScreen(), overrides: [backendProvider.overrideWithValue(backend)]));
      await t.pumpAndSettle();
      expect(find.text('R\$ 249,00'), findsOneWidget);
      expect(find.text('R\$ 799,00'), findsOneWidget);
      await t.tap(find.text('Plano mensal'));
      await t.pump();
      await t.tap(find.text('Continuar'));
      await t.pumpAndSettle();
      expect(find.text('Assinar o Plano mensal'), findsOneWidget);
      expect(find.text('R\$ 799,00 por mês'), findsOneWidget);
      expect(find.textContaining('renovamos todo mês no cartão'), findsOneWidget);
      expect(find.text('Visa •••• 4821'), findsOneWidget);
      await t.tap(find.text('Assinar agora'));
      await t.pumpAndSettle();
      expect(backend.subscribed, [SubscriptionPlanCode.monthly]);
      expect(find.text('Próxima cobrança 28/10 · R\$ 249,00'), findsOneWidget);
      await t.pump(const Duration(seconds: 5));
      await t.pumpAndSettle();
    });

    testWidgets('com plano: proxima cobranca, cartao e cancelar a renovacao com confirmacao', (t) async {
      tallScreen(t);
      final backend = AccountBackend()..subs = [_sub()];
      await t.pumpWidget(testApp(const SubscriptionsScreen(), overrides: [backendProvider.overrideWithValue(backend)]));
      await t.pumpAndSettle();
      expect(find.text('Plano semanal'), findsOneWidget);
      expect(find.text('Ativo'), findsOneWidget);
      expect(find.text('Próxima cobrança 28/10 · R\$ 249,00'), findsOneWidget);
      expect(find.text('Cartão Visa •••• 4821'), findsOneWidget);
      await t.tap(find.text('Cancelar renovação'));
      await t.pumpAndSettle();
      expect(find.text('Cancelar a renovação?'), findsOneWidget);
      await t.tap(find.text('Manter plano'));
      await t.pumpAndSettle();
      expect(backend.cancels, 0);
      await t.tap(find.text('Cancelar renovação'));
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(VoltiButton, 'Cancelar renovação').last);
      await t.pumpAndSettle();
      expect(backend.cancels, 1);
      expect(find.text('Termina em 28/10'), findsOneWidget);
      expect(find.text('A renovação foi cancelada. O plano vale até 28/10.'), findsOneWidget);
      await t.pump(const Duration(seconds: 5));
      await t.pumpAndSettle();
    });
  });

  group('C11 contato de emergencia', () {
    testWidgets('valida o celular, grava em E.164 e recarrega a sessao', (t) async {
      tallScreen(t);
      final backend = AccountBackend();
      final s = _RefreshingSession(session());
      await t.pumpWidget(testApp(const EmergencyContactScreen(), overrides: [
        backendProvider.overrideWithValue(backend),
        sessionProvider.overrideWith(() => s),
      ]));
      await t.pumpAndSettle();
      await t.tap(find.text('Salvar'));
      await t.pump();
      expect(find.text('Informe o nome do contato'), findsOneWidget);
      expect(find.text('Celular inválido. Use DDD + número.'), findsOneWidget);
      expect(backend.profileUpdates, isEmpty);

      await t.enterText(find.byKey(const Key('emergency-name')), 'Maria Lima');
      await t.enterText(find.byKey(const Key('emergency-phone')), '98765-4321');
      await t.tap(find.text('Salvar'));
      await t.pump();
      expect(find.text('Celular inválido. Use DDD + número.'), findsOneWidget);
      expect(backend.profileUpdates, isEmpty);

      await t.enterText(find.byKey(const Key('emergency-phone')), '(11) 98765-4321');
      await t.tap(find.text('Salvar'));
      await t.pumpAndSettle();
      expect(backend.profileUpdates.single, ('Maria Lima', '+5511987654321'));
      expect(s.refreshes, 1);
      expect(find.text('Contato de emergência salvo'), findsOneWidget);
      await t.pump(const Duration(seconds: 5));
      await t.pumpAndSettle();
    });

    testWidgets('preenche com o contato ja salvo', (t) async {
      final c = customer().rebuild((b) => b
        ..emergencyContactName = 'João'
        ..emergencyContactPhone = '+5521912345678');
      await t.pumpWidget(testApp(const EmergencyContactScreen(), overrides: [
        backendProvider.overrideWithValue(AccountBackend()),
        sessionProvider.overrideWith(() => FakeSession(SessionState(signedIn: true, customer: c))),
      ]));
      await t.pumpAndSettle();
      expect(find.text('João'), findsOneWidget);
      expect(find.text('(21) 91234-5678'), findsOneWidget);
    });

    test('toE164', () {
      expect(toE164('(11) 98765-4321'), '+5511987654321');
      expect(toE164('11 3456-7890'), '+551134567890');
      expect(toE164('5511987654321'), '+5511987654321');
      expect(toE164('+351 912 345 678'), '+351912345678');
      expect(toE164('98765-4321'), isNull);
      expect(toE164('+0123'), isNull);
      expect(formatPhoneBr('+5511987654321'), '(11) 98765-4321');
    });
  });

  group('A1-A15 conta', () {
    testWidgets('perfil com selos, StatTiles, recarga e grupos do design', (t) async {
      tallScreen(t);
      final backend = AccountBackend()..subs = [_sub()];
      await t.pumpWidget(testApp(const AccountScreen(), overrides: [
        backendProvider.overrideWithValue(backend),
        sessionProvider.overrideWith(() => FakeSession(session())),
      ]));
      await t.pumpAndSettle();
      expect(find.text('Minha conta'), findsOneWidget);
      expect(find.text('AL'), findsOneWidget);
      expect(find.text('Verificada'), findsOneWidget);
      expect(find.text('18+'), findsOneWidget);
      expect(find.byType(StatTile), findsNWidgets(2));
      expect(find.text('R\$ 38,50'), findsOneWidget);
      expect(find.text('120 min'), findsOneWidget);
      expect(find.text('Recarregar carteira'), findsOneWidget);
      for (final g in ['PLANO', 'VIAGENS', 'AJUDA', 'PRIVACIDADE (LGPD)']) {
        expect(find.text(g), findsOneWidget, reason: g);
      }
      expect(find.text('Plano semanal'), findsOneWidget);
      expect(find.text('Próxima cobrança 28/10 · R\$ 249,00'), findsOneWidget);
      expect(find.text('Histórico e recibos'), findsOneWidget);
      expect(find.text('1'), findsOneWidget); // contagem do historico
      expect(find.text('Contestar cobrança / sinistro'), findsOneWidget);
      expect(find.text('Chat com o suporte'), findsOneWidget);
      expect(find.text('Central de ajuda'), findsOneWidget);
      expect(find.text('Regras de trânsito para autopropelidos'), findsOneWidget);
      expect(find.text('Contato de emergência'), findsOneWidget);
      expect(find.text('Baixar meus dados'), findsOneWidget);
      expect(find.text('Excluir conta'), findsOneWidget);
      // Dependem de contrato (docs/decisoes.md): fora da UI.
      expect(find.textContaining('Cupons'), findsNothing);
      expect(find.textContaining('Estações'), findsNothing);
      expect(find.textContaining('manutenção'), findsNothing);
      expect(t.takeException(), isNull);
    });

    testWidgets('a 200% de fonte nao estoura', (t) async {
      t.view.physicalSize = const Size(390, 3000);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(MediaQuery(
        data: const MediaQueryData(textScaler: TextScaler.linear(2)),
        child: testApp(const AccountScreen(), overrides: [
          backendProvider.overrideWithValue(AccountBackend()),
          sessionProvider.overrideWith(() => FakeSession(session())),
        ]),
      ));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
    });

    testWidgets('regras de transito abrem direto', (t) async {
      await t.pumpWidget(testApp(const TrafficRulesScreen()));
      await t.pumpAndSettle();
      expect(find.text('Regras de trânsito'), findsOneWidget);
      expect(find.text('Velocidade máxima'), findsOneWidget);
    });

    testWidgets('contestacao limita o motivo a 200 caracteres', (t) async {
      final completer = Completer<void>();
      await t.pumpWidget(testApp(Builder(
        builder: (context) => Center(
          child: TextButton(
            onPressed: () => DisputeSheet.show(context, 'r1').then((_) => completer.complete()),
            child: const Text('abrir'),
          ),
        ),
      ), overrides: [backendProvider.overrideWithValue(AccountBackend())]));
      await t.tap(find.text('abrir'));
      await t.pumpAndSettle();
      final field = t.widget<TextField>(find.byKey(const Key('dispute-reason')));
      expect(field.maxLength, 200);
    });
  });
}
