import 'dart:typed_data';

import 'package:built_collection/built_collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/app_channel.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/widgets.dart';
import 'package:volti_cliente/features/return_flow/return_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'helpers.dart';
import 'swap_fixtures.dart' show apiError;
import 'zone_fixtures.dart';

/// "Encerrar aqui (teste)": no app de teste (canal beta), fora dos pontos verdes,
/// o cliente encerra pela rota de teste (`POST /rentals/{id}/test-end`).
class _TestEndB extends FakeBackend {
  _TestEndB(this._zones, {this.realOutside = false, this.testStatus = RentalStatus.ended});
  final List<GeoZone> _zones;

  /// A rota normal recusa com 422 `rental-outside-return-zone` (posicao do app velha).
  final bool realOutside;

  /// Resposta da rota de teste: `ended` (200) ou `ending` (202).
  final RentalStatus testStatus;
  final realCalls = <String?>[];
  final testCalls = <(String, String, String?)>[];
  RentalStatus polled = RentalStatus.ending;
  int uploads = 0;

  @override
  Future<List<GeoZone>> zones() async => _zones;
  @override
  Future<Rental> rental(String id) async => sampleRental(status: polled);
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<PresignedUpload> returnPhotoUpload(String rentalId) async => PresignedUpload((b) => b
    ..objectKey = 'k1'
    ..uploadUrl = 'http://x'
    ..method = PresignedUploadMethodEnum.PUT
    ..headers = MapBuilder<String, String>()
    ..expiresAt = DateTime.utc(2030));
  @override
  Future<void> upload(PresignedUpload target, Uint8List bytes, String contentType) async => uploads++;
  @override
  Future<Rental> endRental(String rentalId, String photoKey, {String? idempotencyKey}) async {
    realCalls.add(idempotencyKey);
    if (realOutside) throw apiError(422, 'rental-outside-return-zone');
    return sampleRental(status: RentalStatus.ended);
  }

  @override
  Future<Rental> endRentalTest(String rentalId, String photoKey, {String? idempotencyKey}) async {
    testCalls.add((rentalId, photoKey, idempotencyKey));
    return sampleRental(status: testStatus);
  }
}

final _outsideZones = [zoneAround(-23.60, -46.70)];
final _insideZones = [zoneAround(-23.56, -46.65)];
const _button = Key('return-test-end');

Future<GoRouter> _pump(WidgetTester t, _TestEndB b, AppChannel channel) async {
  tallScreen(t);
  final router = GoRouter(initialLocation: '/return/r1', routes: [
    GoRoute(path: '/return/:id', builder: (_, s) => ReturnScreen(rentalId: s.pathParameters['id']!, pollInterval: const Duration(milliseconds: 200))),
    GoRoute(path: '/summary/:id', builder: (_, s) => Text('resumo ${s.pathParameters['id']}')),
  ]);
  addTearDown(router.dispose);
  await t.pumpWidget(testRouterApp(router, overrides: [
    backendProvider.overrideWithValue(b),
    photoPickerProvider.overrideWithValue(FakePhotoPicker()),
    appChannelProvider.overrideWithValue(channel),
  ]));
  await _settle(t);
  return router;
}

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 4; i++) {
    await t.pump(const Duration(milliseconds: 100));
  }
}

Future<void> _photo(WidgetTester t) async {
  await t.tap(find.byType(PhotoCapture));
  await _settle(t);
}

VoltiButton _testEnd(WidgetTester t) => t.widget<VoltiButton>(find.byKey(_button));

void main() {
  testWidgets('loja: fora dos pontos verdes nao mostra "Encerrar aqui (teste)"', (t) async {
    await _pump(t, _TestEndB(_outsideZones), AppChannel.store);
    await _photo(t);
    expect(find.text('Fora dos pontos verdes'), findsWidgets);
    expect(find.byKey(_button), findsNothing);
    expect(find.text('Encerrar aqui (teste)'), findsNothing);
    expect(find.text('Ignora o ponto verde · só na versão de teste'), findsNothing);
    await t.pumpWidget(const SizedBox());
  });

  testWidgets('beta dentro de um ponto verde: sem o botao de teste', (t) async {
    await _pump(t, _TestEndB(_insideZones), AppChannel.beta);
    await _photo(t);
    expect(find.byKey(_button), findsNothing);
    await t.pumpWidget(const SizedBox());
  });

  testWidgets('beta fora dos pontos verdes: botao abaixo do aviso, desabilitado sem foto; o botao normal segue bloqueado', (t) async {
    await _pump(t, _TestEndB(_outsideZones), AppChannel.beta);
    expect(find.byKey(_button), findsOneWidget);
    expect(find.text('Encerrar aqui (teste)'), findsOneWidget);
    expect(find.text('Ignora o ponto verde · só na versão de teste'), findsOneWidget);
    expect(_testEnd(t).icon, LucideIcons.flaskConical);
    expect(_testEnd(t).onPressed, isNull, reason: 'sem foto');
    // Abaixo do aviso vermelho.
    final banner = t.getTopLeft(find.widgetWithText(NoticeBanner, 'Fora dos pontos verdes'));
    expect(t.getTopLeft(find.byKey(_button)).dy, greaterThan(banner.dy));
    await _photo(t);
    expect(_testEnd(t).onPressed, isNotNull);
    expect(t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Travar e encerrar')).onPressed, isNull);
    await t.pumpWidget(const SizedBox());
  });

  testWidgets('aba Galpão: sem o botao de teste', (t) async {
    await _pump(t, _TestEndB(_outsideZones), AppChannel.beta);
    expect(find.byKey(_button), findsOneWidget);
    await t.tap(find.text('Galpão'));
    await _settle(t);
    expect(find.byKey(_button), findsNothing);
    await t.pumpWidget(const SizedBox());
  });

  testWidgets('toque chama a rota de teste (nao a normal), com foto e Idempotency-Key, e abre o resumo no 200', (t) async {
    final b = _TestEndB(_outsideZones);
    await _pump(t, b, AppChannel.beta);
    await _photo(t);
    await t.tap(find.byKey(_button));
    await _settle(t);
    expect(b.realCalls, isEmpty);
    expect(b.uploads, 1);
    expect(b.testCalls, hasLength(1));
    expect(b.testCalls.single.$1, 'r1');
    expect(b.testCalls.single.$2, 'k1');
    expect(b.testCalls.single.$3, isNotEmpty);
    expect(find.text('resumo r1'), findsOneWidget);
    await t.pumpWidget(const SizedBox());
  });

  testWidgets('202 ending: espera a trava como no encerramento normal e abre o resumo quando encerra', (t) async {
    final b = _TestEndB(_outsideZones, testStatus: RentalStatus.ending);
    await _pump(t, b, AppChannel.beta);
    await _photo(t);
    await t.tap(find.byKey(_button));
    await _settle(t);
    expect(b.testCalls, hasLength(1));
    expect(find.byKey(const Key('lock-pulse')), findsOneWidget);
    b.polled = RentalStatus.ended;
    await t.pump(const Duration(milliseconds: 250));
    await _settle(t);
    expect(find.text('resumo r1'), findsOneWidget);
    await t.pumpWidget(const SizedBox());
  });

  testWidgets('beta: app achava que estava dentro, a API recusou com 422 → aparece o botao de teste, que usa a rota de teste', (t) async {
    final b = _TestEndB(_insideZones, realOutside: true);
    await _pump(t, b, AppChannel.beta);
    await _photo(t);
    expect(find.byKey(_button), findsNothing);
    await t.tap(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
    await _settle(t);
    expect(b.realCalls, hasLength(1));
    expect(find.byKey(_button), findsOneWidget);
    expect(_testEnd(t).onPressed, isNotNull);
    await t.ensureVisible(find.byKey(_button));
    await t.tap(find.byKey(_button));
    await _settle(t);
    expect(b.realCalls, hasLength(1));
    expect(b.testCalls, hasLength(1));
    expect(find.text('resumo r1'), findsOneWidget);
    await t.pumpWidget(const SizedBox());
  });

  testWidgets('loja: 422 da API nao mostra o botao de teste', (t) async {
    final b = _TestEndB(_insideZones, realOutside: true);
    await _pump(t, b, AppChannel.store);
    await _photo(t);
    await t.tap(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
    await _settle(t);
    expect(find.byKey(const Key('return-go-depot')), findsOneWidget);
    expect(find.byKey(_button), findsNothing);
    await t.pumpWidget(const SizedBox());
  });
}
