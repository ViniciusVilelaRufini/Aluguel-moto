import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/account/account_screens.dart';
import 'package:volti_cliente/features/onboarding/onboarding_screen.dart';
import 'package:volti_cliente/core/clock.dart';
import 'package:volti_cliente/features/pickup/pickup_screen.dart';
import 'package:volti_cliente/features/plan/insurance_screen.dart';
import 'package:volti_cliente/features/return_flow/return_screen.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart';
import 'helpers.dart';
import 'zone_fixtures.dart';

/// Backend do galpao que conta as reservas pedidas (consentimento de localizacao, decisao #8).
class PlanBackend extends GalpaoBackend {
  int get startCalls => creates;
}

Finder coverageCard(String c) => find.byKey(Key('coverage-$c'));
bool isSelected(WidgetTester t, String c) => t.widget<OptionCard>(coverageCard(c)).selected;

void main() {
  group('onboarding', () {
    testWidgets('so os termos e um CPF valido liberam; localizacao e opcional (desmarcada)', (t) async {
      tallScreen(t);
      final fake = FakeBackend();
      await t.pumpWidget(testApp(const OnboardingScreen(), overrides: [
        backendProvider.overrideWithValue(fake),
        sessionProvider.overrideWith(() => FakeSession(session(location: false, terms: false, kyc: KycStatus.notStarted))),
      ]));
      await t.pumpAndSettle();

      final fields = find.byType(TextField);
      await t.enterText(fields.at(0), 'Ana Lima');
      await t.enterText(fields.at(1), '12345678900');
      await t.enterText(fields.at(2), '14/03/1998');
      await t.pump();

      VoltiButton cta() => t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Continuar'));
      expect(t.widget<VoltiCheckbox>(find.byKey(const Key('consent-location'))).value, isFalse,
          reason: 'LGPD: consentimento so por acao do cliente');
      expect(cta().onPressed, isNull, reason: 'sem termos');

      await t.tap(find.byKey(const Key('consent-terms')));
      await t.pump();
      expect(find.text('CPF inválido'), findsOneWidget);
      expect(cta().onPressed, isNull, reason: 'CPF com digito verificador errado');

      await t.enterText(fields.at(1), '52998224725');
      await t.pump();
      expect(find.text('CPF inválido'), findsNothing);
      expect(cta().onPressed, isNotNull);

      await t.tap(find.byKey(const Key('consent-location')));
      await t.pump();
      expect(cta().onPressed, isNotNull, reason: 'marcar a localizacao nao muda a regra');
      await t.tap(find.byKey(const Key('consent-location')));
      await t.pump();
      expect(cta().onPressed, isNotNull, reason: 'localizacao desmarcada nao bloqueia (o Plano pede antes do aluguel)');
    });
  });

  group('seguro e retirada', () {
    testWidgets('exige seguro: basico pre-selecionado e nao removivel', (t) async {
      tallScreen(t);
      await t.pumpWidget(testApp(InsuranceScreen(selection: selection(p: plan(PlanCode.day, 'Diário', PlanUnit.day, 8900))), overrides: [
        backendProvider.overrideWithValue(PlanBackend()),
        sessionProvider.overrideWith(() => FakeSession(session())),
      ]));
      await t.pumpAndSettle();
      expect(isSelected(t, 'basic'), isTrue, reason: 'basico vem pre-selecionado');
      expect(isSelected(t, 'full'), isFalse);
      expect(find.text('Obrigatório'), findsOneWidget);

      await t.tap(coverageCard('basic'));
      await t.pump();
      expect(isSelected(t, 'basic'), isTrue, reason: 'tocar no basico nao o remove');

      await t.tap(coverageCard('full'));
      await t.pumpAndSettle();
      expect(isSelected(t, 'full'), isTrue);
      expect(isSelected(t, 'basic'), isFalse);

      // voltar: sempre existe uma cobertura selecionada
      await t.tap(coverageCard('full'));
      await t.pumpAndSettle();
      expect(isSelected(t, 'basic'), isTrue);
      expect(t.widget<VoltiButton>(find.byKey(const Key('insurance-continue'))).onPressed, isNotNull);
    });

    testWidgets('sem consentimento de localizacao a reserva e bloqueada (decisao #8)', (t) async {
      tallScreen(t);
      final backend = PlanBackend();
      await t.pumpWidget(testApp(PickupScreen(selection: selection(p: plan(PlanCode.day, 'Diário', PlanUnit.day, 8900))), overrides: [
        backendProvider.overrideWithValue(backend),
        sessionProvider.overrideWith(() => FakeSession(session(location: false))),
        clockProvider.overrideWithValue(() => thu10),
      ]));
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(VoltiButton, 'Confirmar reserva'));
      await t.pumpAndSettle();
      expect(find.text('Permitir localização?'), findsOneWidget);
      expect(backend.startCalls, 0);

      await t.tap(find.text('Agora não'));
      await t.pumpAndSettle();
      expect(backend.startCalls, 0, reason: 'recusou o consentimento: nao reserva');

      await t.tap(find.widgetWithText(VoltiButton, 'Confirmar reserva'));
      await t.pumpAndSettle();
      await t.tap(find.text('Permitir e continuar'));
      await t.pumpAndSettle();
      expect(backend.startCalls, 1, reason: 'depois do consentimento a reserva e pedida');
    });
  });

  group('aluguel', () {
    late FakeRealtime rt;
    late _RideBackend backend;

    Future<void> pumpRide(WidgetTester t) async {
      tallScreen(t);
      rt = FakeRealtime();
      backend = _RideBackend();
      await t.pumpWidget(testApp(const RideScreen(), overrides: [
        backendProvider.overrideWithValue(backend),
        realtimeFactoryProvider.overrideWithValue(() => rt),
        locationServiceProvider.overrideWithValue(FakeLocation()),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
    }

    testWidgets('zone.notice mostra o novo limite de velocidade', (t) async {
      await pumpRide(t);
      expect(find.textContaining('limite 32'), findsOneWidget);

      rt.emit(const ZoneNotice(
        zoneType: 'reduced_speed',
        transition: 'ENTER',
        message: 'Você entrou numa área de pedestres. Velocidade máxima: 6 km/h.',
        speedLimitKmh: 6,
      ));
      await t.pump();
      await t.pump();

      expect(find.text('Velocidade reduzida · limite 6 km/h'), findsOneWidget);
      expect(find.text('km/h · limite 6'), findsOneWidget);
      expect(find.textContaining('limite 32'), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('device.event queda abre "Voce esta bem?" e responde ao backend', (t) async {
      await pumpRide(t);
      rt.emit(const DeviceEventReceived(type: 'queda'));
      await t.pump();
      await t.pump(const Duration(seconds: 1)); // ponto ao vivo pisca sem parar: sem pumpAndSettle

      expect(find.text('Você está bem?'), findsOneWidget);
      await t.tap(find.text('Estou bem'));
      await t.pump(const Duration(milliseconds: 300));
      expect(backend.wellbeingOk, isTrue);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('encerrar', () {
    testWidgets('fica desabilitado sem foto e habilita com a foto', (t) async {
      tallScreen(t);
      await t.pumpWidget(testApp(const ReturnScreen(rentalId: 'r1'), overrides: [
        backendProvider.overrideWithValue(_RideBackend()),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
      ]));
      await t.pumpAndSettle();

      VoltiButton end() => t.widget<VoltiButton>(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
      expect(end().onPressed, isNull);

      await t.tap(find.byType(PhotoCapture));
      await t.pumpAndSettle();
      expect(end().onPressed, isNotNull);
    });
  });

  group('rede', () {
    testWidgets('erro de rede mostra "Tentar de novo" e recarrega', (t) async {
      tallScreen(t);
      final backend = _FlakyHistory();
      await t.pumpWidget(testApp(const HistoryScreen(), overrides: [backendProvider.overrideWithValue(backend)]));
      await t.pumpAndSettle();

      expect(find.text('Sem conexão com a internet. Confira sua rede e tente de novo.'), findsOneWidget);
      expect(find.text('Tentar de novo'), findsOneWidget);

      await t.tap(find.text('Tentar de novo'));
      await t.pumpAndSettle();
      expect(find.text('Você ainda não fez nenhuma corrida.'), findsOneWidget);
      expect(backend.calls, 2);
    });
  });
}

class _RideBackend extends FakeBackend {
  bool? wellbeingOk;
  @override
  Future<Rental?> currentRental() async => sampleRental();
  @override
  Future<Rental> rental(String id) async => sampleRental();
  @override
  Future<Vehicle> vehicleByCode(String code) async => sampleVehicle();
  @override
  Future<List<GeoZone>> zones() async => [zoneAround(-23.56, -46.65)]; // a moto esta num ponto de devolucao
  @override
  Future<void> wellbeing(String id, {required bool ok, String? note}) async => wellbeingOk = ok;
}

class _FlakyHistory extends FakeBackend {
  int calls = 0;
  @override
  Future<List<Rental>> rentals() async {
    calls++;
    if (calls == 1) throw AppFailure(kind: FailureKind.network);
    return [];
  }
}
