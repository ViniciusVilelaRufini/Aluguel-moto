import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/features/onboarding/onboarding_screen.dart';

void main() {
  test('KYC nao iniciado volta ao passo 0 mesmo com termos aceitos (dados pessoais so vivem em memoria)', () {
    expect(initialOnboardingStep(termsAccepted: true, locationConsent: true, kyc: KycStatus.notStarted), 0);
  });

  test('sem consentimentos fica no passo 0', () {
    expect(initialOnboardingStep(termsAccepted: false, locationConsent: true, kyc: KycStatus.pending), 0);
  });

  test('KYC ja enviado vai ao status', () {
    expect(initialOnboardingStep(termsAccepted: true, locationConsent: true, kyc: KycStatus.pending), 2);
  });
}
