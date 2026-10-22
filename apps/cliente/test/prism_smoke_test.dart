// Fumaça contra o mock Prism (ou a API de dev). So roda com PRISM_URL:
//   pnpm --filter @volti/contracts mock
//   flutter test test/prism_smoke_test.dart --dart-define=PRISM_URL=http://localhost:4010
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_flutter/volti_flutter.dart';

const _url = String.fromEnvironment('PRISM_URL');

class _Auth implements AuthRepository {
  @override
  AuthMode get mode => AuthMode.dev;
  @override
  AuthSession? get session => null;
  @override
  Future<String?> accessToken() async => 'qualquer-token';
  @override
  Future<void> signOut() async {}
}

void main() {
  final skip = _url.isEmpty ? 'defina --dart-define=PRISM_URL' : null;
  const id = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  test('endpoints do app desserializam as respostas do mock', skip: skip, () async {
    final b = ApiBackend(buildVoltiApi(baseUrl: _url, auth: _Auth(), maxAttempts: 1));
    final results = <String, Object?>{};
    Future<void> step(String name, Future<Object?> Function() f) async {
      try {
        results[name] = await f();
      } catch (e) {
        fail('$name falhou: $e');
      }
    }

    await step('me', b.me);
    await step('consents', b.consents);
    await step('kycStatus', b.kycStatus);
    await step('depots', () => b.depots(lat: -23.56, lng: -46.65));
    await step('depotVehicles', () => b.depotVehicles(id));
    await step('zones', b.zones);
    await step('vehicleByCode', () => b.vehicleByCode('VLT-001'));
    await step('currentReservation', b.currentReservation);
    await step('currentRental', b.currentRental);
    await step('plans', b.plans);
    await step('coverages', b.coverages);
    await step('quote', () => b.quote(PlanCode.minute, InsuranceCoverage.basic));
    await step('cards', b.cards);
    await step('wallet', b.wallet);
    await step('packages', b.minutePackages);
    await step('rentals', b.rentals);
    await step('receipt', () => b.receipt(id));
    await step('subscriptions', b.subscriptions);
    await step('conversations', b.conversations);
    await step('startRental', () => b.startRental(StartRentalRequest((r) => r
      ..vehicleId = id
      ..planCode = PlanCode.minute
      ..coverage = InsuranceCoverage.basic
      ..depositMethod = DepositMethod.card)));
    // ignore: avoid_print
    print('Prism OK: ${results.keys.join(', ')}');
  });
}
