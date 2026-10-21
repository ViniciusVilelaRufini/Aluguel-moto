import 'package:built_collection/built_collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/geo.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/features/return_flow/return_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/home/providers.dart';
import 'package:volti_cliente/features/onboarding/onboarding_screen.dart';

import 'helpers.dart';

class _CountingLocation extends FakeLocation {
  int calls = 0;
  @override
  Future<LatLng?> currentPosition({bool requestPermission = false}) async {
    calls++;
    return null;
  }
}

class _EndBackend extends FakeBackend {
  final keys = <String?>[];
  final bool ending;
  _EndBackend({this.ending = false});
  @override
  Future<Rental> rental(String id) async => throw AppFailure(kind: FailureKind.network);
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<List<GeoZone>> zones() async => [];
  @override
  Future<PresignedUpload> returnPhotoUpload(String rentalId) async => PresignedUpload((b) => b
    ..objectKey = 'k1'
    ..uploadUrl = 'http://x'
    ..method = PresignedUploadMethodEnum.PUT
    ..headers = MapBuilder<String, String>()
    ..expiresAt = DateTime.utc(2030));
  @override
  Future<void> upload(PresignedUpload target, Uint8List bytes, String contentType) async {}
  @override
  Future<Rental> endRental(String rentalId, String photoKey, {String? idempotencyKey}) async {
    keys.add(idempotencyKey);
    if (ending) return sampleRental(status: RentalStatus.ending);
    throw AppFailure(kind: FailureKind.network);
  }
}

Future<void> _endFlow(WidgetTester t) async {
  await t.tap(find.byType(PhotoCapture));
  await t.pumpAndSettle();
  await t.tap(find.widgetWithText(VoltiButton, 'Encerrar corrida'));
  await t.pumpAndSettle();
  await t.tap(find.descendant(of: find.byType(Dialog), matching: find.widgetWithText(VoltiButton, 'Encerrar corrida')));
  await t.pump();
  await t.pump(const Duration(milliseconds: 50));
}

void main() {
  test('mascara dd/mm/aaaa insere as barras e valida data e idade', () {
    final f = MaskFormatter('##/##/####');
    final v = f.formatEditUpdate(TextEditingValue.empty, const TextEditingValue(text: '15031990'));
    expect(v.text, '15/03/1990');
    expect(validateBirth('15/03/1990', now: DateTime(2026, 10, 21)), isNull);
    expect(validateBirth('31/02/1990'), BirthError.invalid);
    expect(validateBirth('15/03/2015', now: DateTime(2026, 10, 21)), BirthError.underage);
    expect(validateBirth('15/03'), BirthError.incomplete);
  });

  test('localizacao nao e consultada sem consentimento', () async {
    final loc = _CountingLocation();
    final c = ProviderContainer(overrides: [
      locationServiceProvider.overrideWithValue(loc),
      sessionProvider.overrideWith(() => FakeSession(session(location: false))),
    ]);
    addTearDown(c.dispose);
    await c.read(sessionProvider.future);
    expect(await c.read(userLocationProvider.future), isNull);
    expect(loc.calls, 0);
  });

  test('datas no fuso de Sao Paulo (UTC-3), independente do aparelho', () {
    expect(formatDateTimeSp(DateTime.utc(2026, 10, 21, 2, 5)), '20/10/2026 23:05');
    expect(formatDateTimeSp(DateTime.utc(2026, 1, 5, 15, 0)), '05/01/2026 12:00');
  });

  testWidgets('encerrar reutiliza a mesma Idempotency-Key nas repeticoes', (t) async {
    tallScreen(t);
    final b = _EndBackend();
    await t.pumpWidget(testApp(const ReturnScreen(rentalId: 'r1'), overrides: [
      backendProvider.overrideWithValue(b),
      photoPickerProvider.overrideWithValue(FakePhotoPicker()),
    ]));
    await t.pumpAndSettle();
    await _endFlow(t);
    await t.pumpAndSettle();
    await _endFlow2(t);
    expect(b.keys.length, 2);
    expect(b.keys.first, isNotNull);
    expect(b.keys[0], b.keys[1]);
  });

  testWidgets('espera da trava expira e oferece "Tentar de novo" e suporte', (t) async {
    tallScreen(t);
    final b = _EndBackend(ending: true);
    await t.pumpWidget(testApp(
        const ReturnScreen(
            rentalId: 'r1', pollInterval: Duration(milliseconds: 100), lockTimeout: Duration(milliseconds: 350)),
        overrides: [
          backendProvider.overrideWithValue(b),
          photoPickerProvider.overrideWithValue(FakePhotoPicker()),
        ]));
    await t.pumpAndSettle();
    await _endFlow(t);
    expect(find.text('Aguardando a moto travar'), findsOneWidget);
    for (var i = 0; i < 6; i++) {
      await t.pump(const Duration(milliseconds: 100));
    }
    expect(find.text('Não conseguimos confirmar a trava'), findsOneWidget);
    expect(find.text('Tentar de novo'), findsOneWidget);
    expect(find.text('Falar com o suporte'), findsOneWidget);
    await t.pumpWidget(const SizedBox());
  });
}

Future<void> _endFlow2(WidgetTester t) async {
  await t.tap(find.widgetWithText(VoltiButton, 'Encerrar corrida'));
  await t.pumpAndSettle();
  await t.tap(find.descendant(of: find.byType(Dialog), matching: find.widgetWithText(VoltiButton, 'Encerrar corrida')));
  await t.pumpAndSettle();
}
