import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_cliente/features/onboarding/onboarding_screen.dart';

import 'helpers.dart';

class _Backend extends FakeBackend {
  int uploadCalls = 0, submitCalls = 0;
  KycStatus status = KycStatus.rejected;
  @override
  Future<KycUploads> kycUploads(DocumentType type) async {
    uploadCalls++;
    throw AppFailure(kind: FailureKind.unknown);
  }

  @override
  Future<KycStatusResponse> kycStatus() async => KycStatusResponse((b) => b..status = status);
}

class _Picker implements PhotoPicker {
  @override
  Future<Uint8List?> take({bool front = false}) async => Uint8List.fromList([1, 2, 3]);
}

void main() {
  group('initialOnboardingStep', () {
    test('KYC nao iniciado comeca no passo 0 mesmo com termos aceitos', () {
      expect(initialOnboardingStep(termsAccepted: true, kyc: KycStatus.notStarted), onboardingDataStep);
    });

    test('sem termos comeca no passo de dados', () {
      expect(initialOnboardingStep(termsAccepted: false, kyc: KycStatus.pending), onboardingDataStep);
    });

    test('pendente, aprovado e recusado vao ao status', () {
      for (final k in [KycStatus.pending, KycStatus.approved, KycStatus.rejected]) {
        expect(initialOnboardingStep(termsAccepted: true, kyc: k), onboardingStatusStep, reason: '$k');
      }
    });
  });

  group('log de erros sem PII', () {
    test('FormatException nao vaza o valor de entrada', () {
      final e = FormatException('Invalid date format', '529.982.247-25 15/03/1990');
      final line = describeErrorForLog(e);
      expect(line, contains('FormatException'));
      expect(line, isNot(contains('529')));
      expect(line, isNot(contains('1990')));
    });

    test('DioException loga so status, code, title e rota sem query/corpo', () {
      final req = RequestOptions(path: '/kyc/submit?cpf=52998224725', method: 'POST', baseUrl: 'http://x');
      final e = DioException(
        requestOptions: req,
        type: DioExceptionType.badResponse,
        response: Response(requestOptions: req, statusCode: 422, data: {
          'code': 'validation',
          'title': 'Invalido',
          'detail': 'cpf 52998224725 Fulano de Tal',
        }),
        error: 'cpf 52998224725',
      );
      final line = describeErrorForLog(e);
      expect(line, contains('POST /kyc/submit'));
      expect(line, contains('status=422'));
      expect(line, contains('code=validation'));
      expect(line, isNot(contains('52998224725')));
      expect(line, isNot(contains('Fulano')));
    });
  });

  group('DocumentsStep', () {
    testWidgets('nascimento vazio: nao envia nada, avisa e volta ao passo 0', (t) async {
      tallScreen(t);
      final backend = _Backend();
      var back = 0;
      await t.pumpWidget(testApp(
        DocumentsStep(name: '', cpf: '', birth: '', onBack: () => back++, onSubmitted: () {}),
        overrides: [
          backendProvider.overrideWithValue(backend),
          photoPickerProvider.overrideWithValue(_Picker()),
          sessionProvider.overrideWith(() => FakeSession(session(kyc: KycStatus.notStarted))),
        ],
      ));
      await t.pumpAndSettle();
      await t.tap(find.text('Foto da CNH'));
      await t.pump();
      await t.tap(find.text('Selfie com prova de vida'));
      await t.pump();
      await t.tap(find.text('Enviar para análise'));
      await t.pump();

      expect(backend.uploadCalls, 0);
      expect(back, 1);
      expect(find.text('Informe seu nome completo.'), findsOneWidget);
    });
  });

  group('onboarding', () {
    testWidgets('recusado: "Enviar de novo" reinicia no passo 0', (t) async {
      tallScreen(t);
      final backend = _Backend()..status = KycStatus.rejected;
      await t.pumpWidget(testApp(const OnboardingScreen(), overrides: [
        backendProvider.overrideWithValue(backend),
        sessionProvider.overrideWith(() => FakeSession(session(kyc: KycStatus.rejected))),
      ]));
      await t.pumpAndSettle();
      expect(find.text('Verificação recusada'), findsOneWidget);
      await t.tap(find.text('Enviar de novo'));
      await t.pumpAndSettle();
      expect(find.text('Seus dados'), findsOneWidget);
    });

    testWidgets('aprovado: mostra o status sem "Enviar de novo"', (t) async {
      tallScreen(t);
      final backend = _Backend()..status = KycStatus.approved;
      await t.pumpWidget(testApp(const OnboardingScreen(), overrides: [
        backendProvider.overrideWithValue(backend),
        sessionProvider.overrideWith(() => FakeSession(session(kyc: KycStatus.approved))),
      ]));
      await t.pumpAndSettle();
      expect(find.text('Enviar de novo'), findsNothing);
      expect(find.text('Seus dados'), findsNothing);
    });

    testWidgets('passo 0 vem preenchido com nome e consentimentos da sessao', (t) async {
      tallScreen(t);
      await t.pumpWidget(testApp(const OnboardingScreen(), overrides: [
        backendProvider.overrideWithValue(_Backend()),
        sessionProvider.overrideWith(() => FakeSession(session(kyc: KycStatus.notStarted))),
      ]));
      await t.pumpAndSettle();
      expect(find.text('Ana Lima'), findsOneWidget);
      expect(t.widget<VoltiCheckbox>(find.byKey(const Key('consent-terms'))).value, isTrue);
      expect(t.widget<VoltiCheckbox>(find.byKey(const Key('consent-location'))).value, isTrue);
    });
  });
}
