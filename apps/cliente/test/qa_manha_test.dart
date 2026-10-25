// Achados da verificacao no emulador (manha de 2026-10-25): E-01 a E-08.

import 'dart:async';
import 'dart:typed_data';

import 'package:built_collection/built_collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/core/geo.dart';
import 'package:volti_cliente/core/launcher.dart';
import 'package:volti_cliente/core/map_tiles.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/pick/depot_selection.dart';
import 'package:volti_cliente/features/pick/pick_screen.dart';
import 'package:volti_cliente/features/pickup/pickup_screen.dart';
import 'package:volti_cliente/features/plan/insurance_screen.dart';
import 'package:volti_cliente/features/plan/plan_screen.dart';
import 'package:volti_cliente/features/return_flow/return_screen.dart';
import 'package:volti_cliente/l10n/app_localizations_pt.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';
import 'qa_cliente_test.dart' show phone, settle;
import 'swap_fixtures.dart' show apiError;
import 'zone_fixtures.dart';

DepotSelection _selection() => DepotSelection(depot: depotFixture(), vehicle: bike('v1', 'VLT-001', 'Volti Urbana'));

/// Opacidade efetiva: o esqueleto so conta como visivel sem nenhum fade pela metade por cima.
double _opacityOf(WidgetTester t, Finder f) {
  var o = 1.0;
  for (final w in t.widgetList<Opacity>(find.ancestor(of: f, matching: find.byType(Opacity)))) {
    o *= w.opacity;
  }
  return o;
}

class _Slow extends GalpaoBackend {
  final plansGate = Completer<List<PricingPlan>>();
  final coveragesGate = Completer<List<InsuranceCoverageOption>>();
  final vehiclesGate = Completer<List<Vehicle>>();
  @override
  Future<List<PricingPlan>> plans() => plansGate.future;
  @override
  Future<List<InsuranceCoverageOption>> coverages() => coveragesGate.future;
  @override
  Future<List<Vehicle>> depotVehicles(String depotId) => vehiclesGate.future;
}

class _DepotCalls extends GalpaoBackend {
  int calls = 0;
  @override
  Future<List<Depot>> depots({double? lat, double? lng}) {
    calls++;
    return super.depots(lat: lat, lng: lng);
  }
}

class _ReturnOutside extends FakeBackend {
  _ReturnOutside(this.zoneList);
  final List<GeoZone> zoneList;
  int ended = 0;
  @override
  Future<List<GeoZone>> zones() async => zoneList;
  @override
  Future<Rental> rental(String id) async => sampleRental();
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<Depot> depot(String id) async => depotFixture();
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
    ended++;
    throw apiError(422, 'rental-outside-return-zone');
  }
}

void main() {
  for (final scale in [1.0, 2.0]) {
    final pct = (scale * 100).round();

    testWidgets('E-01 plano e seguro: esqueleto opaco no 1o quadro e conteudo sem fade em branco a $pct%', (t) async {
      phone(t, scale: scale);
      final b = _Slow();
      await t.pumpWidget(testApp(PlanScreen(selection: _selection()), overrides: [backendProvider.overrideWithValue(b)]));
      await t.pump();
      expect(find.byType(VoltiSkeleton), findsOneWidget);
      expect(_opacityOf(t, find.byType(VoltiSkeleton)), 1.0, reason: 'sem Opacity < 1 por cima do esqueleto');
      b.plansGate.complete(await GalpaoBackend().plans());
      await t.pump();
      await t.pump();
      expect(find.byType(VoltiSkeleton), findsNothing);
      expect(_opacityOf(t, find.byKey(const Key('plan-minute'))), 1.0, reason: 'o plano aparece direto, sem fade em branco');
      await t.pumpWidget(const SizedBox());

      await t.pumpWidget(testApp(InsuranceScreen(selection: _selection()), overrides: [backendProvider.overrideWithValue(b)]));
      await t.pump();
      expect(find.byType(VoltiSkeleton), findsOneWidget);
      expect(_opacityOf(t, find.byType(VoltiSkeleton)), 1.0);
      b.coveragesGate.complete(await GalpaoBackend().coverages());
      await t.pump();
      await t.pump();
      expect(_opacityOf(t, find.byKey(const Key('coverage-basic'))), 1.0);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('E-01 escolher moto: esqueleto opaco no 1o quadro e cartoes sem fade em branco a $pct%', (t) async {
      phone(t, scale: scale);
      final b = _Slow();
      await t.pumpWidget(testApp(const PickScreen(), overrides: [backendProvider.overrideWithValue(b)]));
      await t.pump();
      expect(find.byKey(const Key('pick-skeleton')), findsOneWidget);
      expect(_opacityOf(t, find.byType(VoltiSkeleton)), 1.0);
      await t.pump(const Duration(milliseconds: 50));
      b.vehiclesGate.complete(await GalpaoBackend().depotVehicles('dep1'));
      await t.pump();
      await t.pump();
      expect(_opacityOf(t, find.byKey(const Key('pick-card-v1'))), 1.0);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('E-02 retirada recarrega o galpao ao entrar e ao voltar do 2o plano a $pct%', (t) async {
      phone(t, scale: scale, size: const Size(412, 2200));
      // O galpao que veio da lista estava fechado (sem horario); a API ja o devolve aberto.
      final stale = depotFixture().rebuild((b) => b.openingHours = ListBuilder<DepotOpeningHours>());
      final b = _DepotCalls();
      final sel = DepotSelection(
        depot: stale,
        vehicle: bike('v1', 'VLT-001', 'Volti Urbana'),
        plan: plan(PlanCode.day, 'Diário', PlanUnit.day, 8900),
      );
      await t.pumpWidget(testApp(PickupScreen(selection: sel), overrides: [
        backendProvider.overrideWithValue(b),
        sessionProvider.overrideWith(() => FakeSession(session())),
        clockProvider.overrideWithValue(() => thu10),
        locationServiceProvider.overrideWithValue(FakeLocation()),
      ]));
      await t.pump();
      expect(find.text('O galpão está fechado agora'), findsOneWidget, reason: 'antes da busca vale o horario antigo');
      await settle(t);
      expect(b.calls, greaterThan(0), reason: 'buscou o galpao ao entrar');
      expect(find.text('O galpão está fechado agora'), findsNothing, reason: 'o horario novo (aberto) vale');

      final before = b.calls;
      t.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await settle(t);
      expect(b.calls, greaterThan(before), reason: 'buscou de novo ao voltar do 2o plano');
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('E-03 devolucao recusada pela API: a MOTO precisa estar na area; galpao e suporte a $pct%', (t) async {
      phone(t, scale: scale, size: const Size(412, 2600));
      final b = _ReturnOutside([zoneAround(-23.56, -46.65)]);
      await t.pumpWidget(testApp(const ReturnScreen(rentalId: 'r1'), overrides: [
        backendProvider.overrideWithValue(b),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
      ]));
      await settle(t);
      // O texto de antes da tentativa e condicional, nao uma afirmacao.
      expect(find.textContaining('Parece que a moto está num ponto verde'), findsOneWidget);
      await t.tap(find.byType(PhotoCapture));
      await settle(t);
      await t.tap(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
      await settle(t);
      expect(b.ended, 1);
      expect(find.textContaining('A moto precisa estar dentro da área verde'), findsOneWidget);
      expect(find.textContaining('não a do seu celular'), findsOneWidget);
      expect(find.byKey(const Key('return-go-depot')), findsOneWidget);
      expect(find.byKey(const Key('return-outside-support')), findsOneWidget);
      // "Devolver no galpao" troca para o modo galpao e limpa o aviso.
      await t.ensureVisible(find.byKey(const Key('return-go-depot')));
      await t.tap(find.byKey(const Key('return-go-depot')));
      await settle(t);
      expect(find.byKey(const Key('return-go-depot')), findsNothing);
      expect(find.textContaining('A moto precisa estar dentro'), findsNothing);
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });
  }

  test('E-03 mensagens: condicional antes e clara depois da recusa', () {
    final l = AppLocalizationsPt();
    expect(l.returnInsideRule, startsWith('Parece que'));
    expect(l.returnInsideRule, isNot(contains('Você está')));
    expect(l.returnOutsideRejected, contains('A moto precisa estar dentro'));
    expect(l.returnOutsideRejected, contains('galpão'));
    expect(l.returnOutsideRejected, contains('suporte'));
    expect(l.returnOutsideRejected, contains('taxa'));
  });

  test('E-04 caucao cobre o valor da corrida; o que sobrar volta', () {
    final l = AppLocalizationsPt();
    final texts = [l.pixText('R\$ 200,00'), l.helpFaq2Text, l.depositHint, l.payPixExplain];
    for (final s in texts) {
      expect(s, contains('cobre o valor da corrida'), reason: s);
      expect(s, contains('o que sobrar volta para você'), reason: s);
      expect(s, isNot(contains('volta quando você encerra')), reason: s);
    }
  });

  test('E-05 moto sem conexao em "Confira sua moto" nao manda escolher outra', () {
    final l = AppLocalizationsPt();
    expect(l.handoverVehicleOffline, 'Tente de novo em instantes ou fale com o operador. Nada foi cobrado.');
    expect(l.handoverVehicleOffline, isNot(contains('outra moto')));
  });

  test('E-07 zoom maximo dos mapas respeita o provedor de tiles; trajeto enquadra com zoom limitado', () {
    expect(kMapMaxNativeZoom, 16);
    expect(kMapMaxZoom, kMapMaxNativeZoom + 1);
    final parked = trackCamera([const LatLng(-23.56, -46.65), const LatLng(-23.56001, -46.65001)]);
    expect(parked.zoom, lessThanOrEqualTo(kMapMaxZoom));
    final tiny = trackCamera([const LatLng(-23.56, -46.65), const LatLng(-23.5599, -46.6499)], degenerateMeters: 1);
    expect(tiny.zoom, lessThanOrEqualTo(kMapMaxZoom));
    final ride = trackCamera([const LatLng(-23.56, -46.65), const LatLng(-23.55, -46.64)]);
    expect(ride.zoom, inInclusiveRange(12, kMapMaxZoom));
  });

  testWidgets('E-07 a camada de tiles pede no maximo o zoom nativo do provedor', (t) async {
    late BuildContext c;
    await t.pumpWidget(MaterialApp(home: Builder(builder: (ctx) {
      c = ctx;
      return const SizedBox();
    })));
    expect(voltiTileLayer(c).maxNativeZoom, kMapMaxNativeZoom);
  });

  test('E-08 recibo abre na aba personalizada do app; so cai no app externo se ela falhar', () async {
    final modes = <LaunchMode>[];
    final ok = await openDocumentInApp(Uri.parse('https://x/r.pdf'), (u, m) async {
      modes.add(m);
      return true;
    });
    expect(ok, isTrue);
    expect(modes, [LaunchMode.inAppBrowserView]);

    modes.clear();
    final fallback = await openDocumentInApp(Uri.parse('https://x/r.pdf'), (u, m) async {
      modes.add(m);
      if (m == LaunchMode.inAppBrowserView) throw Exception('sem abas personalizadas');
      return true;
    });
    expect(fallback, isTrue);
    expect(modes, [LaunchMode.inAppBrowserView, LaunchMode.externalApplication]);
  });
}
