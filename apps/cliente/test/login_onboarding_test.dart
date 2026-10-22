import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/auth_store.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/cognito.dart';
import 'package:volti_cliente/core/cognito_auth.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/onboarding/login_screen.dart';
import 'package:volti_cliente/features/onboarding/onboarding_screen.dart';
import 'package:volti_cliente/features/onboarding/otp_flow.dart';
import 'package:volti_cliente/features/onboarding/payment_step.dart';
import 'package:volti_cliente/features/plan/plan_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'cognito_test.dart' show FakeTransport, config;
import 'helpers.dart';
import 'otp_flow_test.dart' show FakeOtpClient;
import 'screens_test.dart' show PlanBackend;

class _Session extends FakeSession {
  _Session([SessionState? s]) : super(s ?? const SessionState.signedOut());
  final providers = <IdentityProvider>[];
  final completed = <String?>[];
  bool signedOut = false;

  @override
  Future<void> signInWithProvider(IdentityProvider provider) async => providers.add(provider);

  @override
  Future<void> completeSignIn({String? phone}) async => completed.add(phone);

  @override
  Future<void> signOut() async => signedOut = true;

  @override
  Future<void> refresh() async {}
}

/// Grava o que o passo de dados envia.
class _ProfileBackend extends FakeBackend {
  bool? location;
  String? name;
  KycStatus status = KycStatus.rejected;
  @override
  Future<void> updateProfile({String? name, String? phone, String? emergencyName, String? emergencyPhone}) async =>
      this.name = name;
  @override
  Future<Consents> updateConsents({required bool terms, required bool location, required bool marketing}) async {
    this.location = location;
    return Consents((b) => b
      ..termsAccepted = terms
      ..locationTracking = location
      ..marketing = marketing);
  }
  @override
  Future<KycStatusResponse> kycStatus() async => KycStatusResponse((b) => b..status = status);
}

Future<void> fillData(WidgetTester t, {bool tapTerms = true}) async {
  final fields = find.byType(TextField);
  await t.enterText(fields.at(0), 'Ana Lima');
  await t.enterText(fields.at(1), '52998224725');
  await t.enterText(fields.at(2), '14/03/1998');
  await t.pump();
  if (!tapTerms) return;
  await t.tap(find.byKey(const Key('consent-terms')));
  await t.pump();
}

DevAuthRepository devAuth() => DevAuthRepository(baseUrl: 'http://x');

CognitoCustomerAuthRepository cognitoAuth(CognitoConfig c) =>
    CognitoCustomerAuthRepository(config: c, client: CognitoIdentityClient(c, FakeTransport()), store: MemoryCognitoTokenStore());

PaymentCard visa({bool isDefault = true}) => PaymentCard((b) => b
  ..id = 'card1'
  ..brand = 'visa'
  ..last4 = '4242'
  ..expMonth = 12
  ..expYear = 2030
  ..isDefault = isDefault
  ..createdAt = DateTime.utc(2026, 10, 21));

class _CardsBackend extends FakeBackend {
  _CardsBackend([List<PaymentCard>? initial]) : list = [...?initial];
  final List<PaymentCard> list;
  final tokens = <String>[];
  @override
  Future<List<PaymentCard>> cards() async => list;
  @override
  Future<PaymentCard> addCard(String token) async {
    tokens.add(token);
    final c = visa();
    list.add(c);
    return c;
  }
}

void main() {
  group('boas-vindas', () {
    testWidgets('dev: opcoes do design, badges e aviso de dev; Google so avisa', (t) async {
      tallScreen(t);
      final s = _Session();
      await t.pumpWidget(testApp(const WelcomeScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(devAuth()),
        sessionProvider.overrideWith(() => s),
      ]));
      await t.pumpAndSettle();

      expect(find.text('Continuar com celular'), findsOneWidget);
      expect(find.text('Apple'), findsOneWidget);
      expect(find.text('Google'), findsOneWidget);
      expect(find.text('Entrar com e-mail'), findsOneWidget);
      for (final b in ['Sem CNH', 'Sem placa', '18+']) {
        expect(find.widgetWithText(SuccessBadge, b), findsOneWidget);
      }
      expect(t.widget<VoltiButton>(find.byKey(const Key('welcome-email'))).variant, VoltiButtonVariant.ghost);
      expect(find.byKey(const Key('welcome-dev-hint')), findsOneWidget);
      expect(find.bySemanticsLabel('Entrar com Google'), findsOneWidget);

      await t.tap(find.byKey(const Key('welcome-google')));
      await t.pump();
      expect(find.text('No modo dev, Google e Apple não estão disponíveis. Entre com celular ou e-mail.'), findsOneWidget);
      expect(s.providers, isEmpty);
    });

    testWidgets('cognito: sem aviso de dev; Apple e Google vao ao Hosted UI', (t) async {
      tallScreen(t);
      final s = _Session();
      await t.pumpWidget(testApp(const WelcomeScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(cognitoAuth(config)),
        sessionProvider.overrideWith(() => s),
      ]));
      await t.pumpAndSettle();
      expect(find.byKey(const Key('welcome-dev-hint')), findsNothing);

      await t.tap(find.byKey(const Key('welcome-apple')));
      await t.pump();
      await t.tap(find.byKey(const Key('welcome-google')));
      await t.pump();
      expect(s.providers, [IdentityProvider.apple, IdentityProvider.google]);
    });

    testWidgets('cognito sem dominio do Hosted UI: avisa e nao abre o navegador', (t) async {
      tallScreen(t);
      final s = _Session();
      await t.pumpWidget(testApp(const WelcomeScreen(), overrides: [
        authRepositoryProvider.overrideWithValue(
            cognitoAuth(const CognitoConfig(region: 'sa-east-1', userPoolId: 'p', clientId: 'c'))),
        sessionProvider.overrideWith(() => s),
      ]));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('welcome-google')));
      await t.pump();
      expect(find.text('A entrada pelo Cognito ainda não está configurada neste ambiente.'), findsOneWidget);
      expect(s.providers, isEmpty);
    });
  });

  group('login por e-mail', () {
    testWidgets('dev: login de desenvolvimento', (t) async {
      await t.pumpWidget(testApp(const LoginScreen(via: 'email'), overrides: [
        authRepositoryProvider.overrideWithValue(devAuth()),
        sessionProvider.overrideWith(() => _Session()),
      ]));
      await t.pumpAndSettle();
      expect(find.byKey(const Key('login-dev-hint')), findsOneWidget);
      expect(find.text('cliente@volti.dev'), findsOneWidget);
    });

    testWidgets('cognito: codigo por e-mail', (t) async {
      tallScreen(t);
      await t.pumpWidget(testApp(const LoginScreen(via: 'email'), overrides: [
        authRepositoryProvider.overrideWithValue(cognitoAuth(config)),
        sessionProvider.overrideWith(() => _Session()),
      ]));
      await t.pumpAndSettle();
      expect(find.text('Seu e-mail'), findsOneWidget);
      expect(find.byKey(const Key('login-dev-hint')), findsNothing);
      expect(find.text('Passo 1 de 4'), findsOneWidget);
    });
  });

  group('codigo por SMS', () {
    Future<(FakeOtpClient, _Session)> pumpPhone(WidgetTester t, {bool dev = false}) async {
      tallScreen(t);
      final client = FakeOtpClient();
      final s = _Session();
      await t.pumpWidget(testApp(const LoginScreen(via: 'phone'), overrides: [
        authRepositoryProvider.overrideWithValue(dev ? devAuth() : cognitoAuth(config)),
        otpAuthClientProvider.overrideWithValue(client),
        sessionProvider.overrideWith(() => s),
      ]));
      await t.pumpAndSettle();
      return (client, s);
    }

    testWidgets('celular invalido nao envia', (t) async {
      final (client, _) = await pumpPhone(t);
      expect(find.text('Seu celular'), findsOneWidget);
      await t.enterText(find.byKey(const Key('otp-destination')), '1187654321');
      await t.pump();
      await t.tap(find.byKey(const Key('otp-send')));
      await t.pump();
      expect(find.text('Informe um celular com DDD, ex.: (11) 98765-4321.'), findsOneWidget);
      expect(client.starts, 0);
    });

    testWidgets('envia, conta 60 s, recusa codigo errado e entra com o certo', (t) async {
      final (client, s) = await pumpPhone(t);
      await t.enterText(find.byKey(const Key('otp-destination')), '11987654321');
      await t.pump();
      expect(t.widget<TextField>(find.byKey(const Key('otp-destination'))).controller!.text, '(11) 98765-4321',
          reason: 'mascara aplicada');
      await t.tap(find.byKey(const Key('otp-send')));
      await t.pump();

      expect(find.text('Digite o código'), findsOneWidget);
      expect(find.text('Enviamos 6 dígitos por SMS para (11) 98765-4321.'), findsOneWidget);
      expect(find.text('Reenviar em 1:00'), findsOneWidget);
      await t.pump(const Duration(seconds: 18));
      expect(find.text('Reenviar em 0:42'), findsOneWidget);
      expect(find.byKey(const Key('otp-resend')), findsNothing);

      VoltiButton confirm() => t.widget<VoltiButton>(find.byKey(const Key('otp-confirm')));
      await t.enterText(find.byKey(const Key('otp-field')), '00000');
      await t.pump();
      expect(confirm().onPressed, isNull, reason: 'so libera com 6 digitos');

      await t.enterText(find.byKey(const Key('otp-field')), '000000');
      await t.pump();
      await t.tap(find.byKey(const Key('otp-confirm')));
      await t.pump();
      expect(find.text('Código inválido. Confira e tente de novo.'), findsOneWidget);
      expect(s.completed, isEmpty);

      await t.enterText(find.byKey(const Key('otp-field')), '123456');
      await t.pump();
      expect(find.byKey(const Key('otp-error')), findsNothing, reason: 'digitar limpa o erro');
      await t.tap(find.byKey(const Key('otp-confirm')));
      await t.pump();
      expect(client.verified, ['123456']);
      expect(s.completed, ['+5511987654321'], reason: 'grava o telefone no perfil');
    });

    testWidgets('reenviar libera ao fim da contagem e reinicia', (t) async {
      final (client, _) = await pumpPhone(t);
      await t.enterText(find.byKey(const Key('otp-destination')), '11987654321');
      await t.pump();
      await t.tap(find.byKey(const Key('otp-send')));
      await t.pump();
      await t.pump(const Duration(seconds: 60));
      expect(find.byKey(const Key('otp-resend')), findsOneWidget);
      await t.tap(find.byKey(const Key('otp-resend')));
      await t.pump();
      expect(client.resends, 1);
      expect(find.text('Enviamos um novo código.'), findsOneWidget);
      expect(find.text('Reenviar em 1:00'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('Corrigir + Enviar dentro de 60 s nao manda outro SMS', (t) async {
      final (client, _) = await pumpPhone(t);
      await t.enterText(find.byKey(const Key('otp-destination')), '11987654321');
      await t.pump();
      await t.tap(find.byKey(const Key('otp-send')));
      await t.pump();
      await t.tap(find.text('Corrigir'));
      await t.pump();
      await t.enterText(find.byKey(const Key('otp-destination')), '11911112222');
      await t.pump();
      final send = t.widget<VoltiButton>(find.byKey(const Key('otp-send')));
      expect(send.onPressed, isNull);
      expect(send.label, 'Enviar código em 1:00');
      await t.tap(find.byKey(const Key('otp-send')));
      await t.pump();
      expect(client.starts, 1);

      await t.pump(const Duration(seconds: 60));
      await t.tap(find.byKey(const Key('otp-send')));
      await t.pump();
      expect(client.starts, 2);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('conta confirmada pede outro codigo: aviso e segue no codigo', (t) async {
      final (client, s) = await pumpPhone(t);
      client.nextChallenge = const OtpChallenge(channel: OtpChannel.sms, destination: '+5511987654321', signUp: false);
      await t.enterText(find.byKey(const Key('otp-destination')), '11987654321');
      await t.pump();
      await t.tap(find.byKey(const Key('otp-send')));
      await t.pump();
      await t.enterText(find.byKey(const Key('otp-field')), '123456');
      await t.pump();
      await t.tap(find.byKey(const Key('otp-confirm')));
      await t.pump();
      expect(find.text('Conta confirmada. Enviamos um novo código para entrar.'), findsOneWidget);
      expect(s.completed, isEmpty);
      await t.enterText(find.byKey(const Key('otp-field')), '123456');
      await t.pump();
      await t.tap(find.byKey(const Key('otp-confirm')));
      await t.pump();
      expect(s.completed, ['+5511987654321']);
    });

    testWidgets('voltar no codigo volta para o numero', (t) async {
      await pumpPhone(t);
      await t.enterText(find.byKey(const Key('otp-destination')), '11987654321');
      await t.pump();
      await t.tap(find.byKey(const Key('otp-send')));
      await t.pump();
      await t.tap(find.bySemanticsLabel('Voltar'));
      await t.pump();
      expect(find.text('Seu celular'), findsOneWidget);
    });

    testWidgets('dev: mostra o codigo fixo', (t) async {
      await pumpPhone(t, dev: true);
      expect(find.byKey(const Key('otp-dev-hint')), findsOneWidget);
    });
  });

  group('cadastro', () {
    testWidgets('dados: passo 2 de 4 com voltar que sai do cadastro', (t) async {
      tallScreen(t);
      final s = _Session(session(terms: false, kyc: KycStatus.notStarted));
      await t.pumpWidget(testApp(const OnboardingScreen(), overrides: [
        backendProvider.overrideWithValue(FakeBackend()),
        sessionProvider.overrideWith(() => s),
      ]));
      await t.pumpAndSettle();
      expect(find.text('Passo 2 de 4'), findsOneWidget);
      expect(t.widget<ProgressSteps>(find.byType(ProgressSteps)).total, 4);
      await t.tap(find.bySemanticsLabel('Voltar'));
      await t.pump();
      expect(s.signedOut, isTrue);
    });

    testWidgets('LGPD: sem marcar a localizacao nada e consentido e o Plano pede antes do aluguel', (t) async {
      tallScreen(t);
      final backend = _ProfileBackend();
      await t.pumpWidget(testApp(const OnboardingScreen(), overrides: [
        backendProvider.overrideWithValue(backend),
        sessionProvider.overrideWith(() => _Session(session(terms: false, location: false, kyc: KycStatus.notStarted))),
      ]));
      await t.pumpAndSettle();
      expect(t.widget<CheckboxListTile>(find.byKey(const Key('consent-location'))).value, isFalse);
      await fillData(t);
      await t.tap(find.widgetWithText(VoltiButton, 'Continuar'));
      await t.pumpAndSettle();
      expect(backend.location, isFalse, reason: 'caixa intocada nao vira consentimento');
      expect(find.text('Verificação de identidade'), findsOneWidget);

      // Com o consentimento gravado como falso, o Plano pede antes de iniciar.
      final plan = PlanBackend();
      await t.pumpWidget(testApp(PlanScreen(vehicle: sampleVehicle()), overrides: [
        backendProvider.overrideWithValue(plan),
        sessionProvider.overrideWith(() => FakeSession(session(location: backend.location!))),
      ]));
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(VoltiButton, 'Confirmar e destravar'));
      await t.pumpAndSettle();
      expect(find.text('Permitir localização?'), findsOneWidget);
      expect(plan.startCalls, 0);
    });

    testWidgets('recusado: refaz os dados e o passo de documentos pede novo envio', (t) async {
      tallScreen(t);
      final backend = _ProfileBackend();
      await t.pumpWidget(testApp(const OnboardingScreen(), overrides: [
        backendProvider.overrideWithValue(backend),
        sessionProvider.overrideWith(() => _Session(session(kyc: KycStatus.rejected))),
      ]));
      await t.pumpAndSettle();
      await t.tap(find.text('Enviar de novo'));
      await t.pumpAndSettle();
      await fillData(t, tapTerms: false);
      await t.tap(find.widgetWithText(VoltiButton, 'Continuar'));
      await t.pumpAndSettle();
      expect(find.text('Documentos já enviados para análise.'), findsNothing);
      expect(t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Enviar para análise')).onPressed, isNull,
          reason: 'sem fotos novas');
    });

    test('CPF: digitos verificadores', () {
      expect(isValidCpf('529.982.247-25'), isTrue);
      expect(isValidCpf('52998224725'), isTrue);
      expect(isValidCpf('529.982.247-24'), isFalse);
      expect(isValidCpf('111.111.111-11'), isFalse);
      expect(isValidCpf('123'), isFalse);
    });
  });

  group('forma de pagamento', () {
    Future<_CardsBackend> pumpPay(WidgetTester t, {List<PaymentCard>? cards, VoidCallback? onDone, bool reduced = false}) async {
      tallScreen(t);
      final backend = _CardsBackend(cards);
      Widget app = testApp(PaymentStep(onBack: () {}, onDone: onDone ?? () {}), overrides: [
        backendProvider.overrideWithValue(backend),
      ]);
      if (reduced) app = MediaQuery(data: const MediaQueryData(disableAnimations: true), child: app);
      await t.pumpWidget(app);
      await t.pumpAndSettle();
      return backend;
    }

    VoltiButton finish(WidgetTester t) => t.widget<VoltiButton>(find.byKey(const Key('pay-finish')));

    testWidgets('sem cartao: adiciona pelo tokenizador e libera "Concluir cadastro"', (t) async {
      var done = 0;
      final backend = await pumpPay(t, onDone: () => done++);
      expect(find.text('Forma de pagamento'), findsOneWidget);
      expect(find.text('Passo 4 de 4'), findsOneWidget);
      expect(find.text('Adicione um cartão para a caução'), findsOneWidget);
      expect(finish(t).onPressed, isNull);

      await t.tap(find.byKey(const Key('pay-add-card')));
      await t.pumpAndSettle();
      expect(backend.tokens, ['tok_visa_4242'], reason: 'so o token vai a API');
      expect(find.text('visa •••• 4242'), findsOneWidget);
      expect(find.byKey(const Key('pay-add-card')), findsNothing);

      await t.tap(find.byKey(const Key('pay-finish')));
      expect(done, 1);
    });

    testWidgets('Pix: explica a caucao por deposito e libera sem cartao', (t) async {
      await pumpPay(t);
      await t.tap(find.byKey(const Key('pay-pix')));
      await t.pumpAndSettle();
      expect(find.text('Pix + carteira Volti'), findsOneWidget);
      expect(find.byKey(const Key('pay-pix-explain')), findsOneWidget);
      expect(t.widget<OptionCard>(find.byKey(const Key('pay-pix'))).selected, isTrue);
      expect(finish(t).onPressed, isNotNull);
      expect(find.textContaining('Chave Pix'), findsNothing, reason: 'chave para estornos fora do contrato');
    });

    testWidgets('cartao ja cadastrado vem selecionado; reduced motion', (t) async {
      await pumpPay(t, cards: [visa()], reduced: true);
      expect(find.text('visa •••• 4242'), findsOneWidget);
      expect(finish(t).onPressed, isNotNull);
      expect(t.takeException(), isNull);
    });
  });
}
