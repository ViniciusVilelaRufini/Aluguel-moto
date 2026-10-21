import 'dart:typed_data';
import 'package:built_collection/built_collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/geo.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/features/return_flow/return_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';

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
