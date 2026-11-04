// Moto de bancada (VLT-0059, Concox J16 GT06 relay_only): posicoes a cada
// 10 s, GPS muitas vezes invalido, bateria desconhecida (`batteryKnown: false`,
// `batteryPct` 0) e sem controle de velocidade. Correcoes da auditoria do app.
import 'dart:async';
import 'dart:typed_data';

import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/features/return_flow/return_screen.dart';
import 'package:volti_cliente/features/ride/ride_data.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';
import 'package:volti_cliente/l10n/app_localizations.dart';
import 'package:volti_flutter/volti_flutter.dart';

import 'galpao_fixtures.dart' show bike, GalpaoBackend;
import 'galpao_flow_test.dart' as galpao show phone, pumpApp, settle;
import 'handover_test.dart' show problem;
import 'helpers.dart';

PricingPlan _plan({int pause = 20}) => PricingPlan((b) => b
  ..id = 'p1'
  ..code = PlanCode.minute
  ..name = 'Por minuto'
  ..unit = PlanUnit.minute
  ..unlockFeeCents = 300
  ..unitPriceCents = 79
  ..pausePerMinuteCents = pause
  ..recurring = false
  ..active = true
  ..createdAt = DateTime.utc(2026)
  ..updatedAt = DateTime.utc(2026));

Vehicle _benchBike() => sampleVehicle(battery: 0).rebuild((b) => b
  ..estimatedRangeKm = 0
  ..batteryKnown = false);

RentalEvent _sysEvent(String message, {RentalEventType type = RentalEventType.resumed, int minute = 5}) => RentalEvent((b) => b
  ..id = 'e$minute'
  ..rentalId = 'r1'
  ..type = type
  ..at = DateTime.utc(2026, 10, 21, 0, minute)
  ..actorType = ActorType.system
  ..message = message);

class _BenchRide extends FakeBackend {
  _BenchRide({this.vehicle, this.pausePrice = 20, this.status = RentalStatus.active});
  Vehicle? vehicle;
  final int pausePrice;
  RentalStatus status;
  List<RentalEvent> events = [];
  int eventCalls = 0;
  Completer<void>? pauseGate;

  @override
  Future<Rental?> currentRental() async => sampleRental(status: status);
  @override
  Future<Rental> rental(String id) async => sampleRental(status: status);
  @override
  Future<Vehicle> vehicleByCode(String code) async {
    final v = vehicle;
    if (v == null) throw AppFailure(kind: FailureKind.network);
    return v;
  }

  @override
  Future<List<GeoZone>> zones() async => [];
  @override
  Future<List<PricingPlan>> plans() async => [_plan(pause: pausePrice)];
  @override
  Future<Me> me() async => Me((b) => b
    ..id = 'c1'
    ..pool = AuthPool.customer
    ..email = 'a@b.c'
    ..customer = customer().toBuilder());
  @override
  Future<Rental> pause(String id) async {
    if (pauseGate != null) await pauseGate!.future;
    status = pauseResult;
    return sampleRental(status: pauseResult);
  }

  /// Status que o `POST /pause` devolve (`active` = did_not_stop chegou antes).
  RentalStatus pauseResult = RentalStatus.paused;

  @override
  Future<Rental> resume(String id) async {
    status = RentalStatus.active;
    return sampleRental();
  }

  @override
  Future<List<RentalEvent>> rentalEvents(String id) async {
    eventCalls++;
    return events;
  }
}

void main() {
  group('corrida na moto de bancada', () {
    late FakeRealtime rt;

    Future<void> pumpRide(WidgetTester t, _BenchRide b) async {
      tallScreen(t);
      rt = FakeRealtime();
      await t.pumpWidget(testApp(const RideScreen(), overrides: [
        backendProvider.overrideWithValue(b),
        realtimeFactoryProvider.overrideWithValue(() => rt),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        rentalTrackProvider.overrideWith((ref, id) async => const []),
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
      await t.pump(const Duration(milliseconds: 50));
    }

    testWidgets('bateria desconhecida: "—", nunca 0% nem ~0 km', (t) async {
      await pumpRide(t, _BenchRide(vehicle: _benchBike()));
      expect(find.textContaining('0%'), findsNothing);
      expect(find.text('~0 km'), findsNothing);
      expect(find.text('—'), findsWidgets);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('sem dados ainda: bateria e velocidade "—" (sem piscar 0%)', (t) async {
      await pumpRide(t, _BenchRide(vehicle: null));
      expect(find.text('0%'), findsNothing);
      expect(find.descendant(of: find.byKey(const Key('ride-gauge')), matching: find.text('—')), findsOneWidget);
      expect(find.text('km/h · limite 32'), findsNothing, reason: 'sem limite conhecido ate o primeiro dado');
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('posicao com batteryKnown false mantem "—"; leitura real mostra o nivel', (t) async {
      await pumpRide(t, _BenchRide(vehicle: sampleVehicle(battery: 80)));
      expect(find.text('80%'), findsWidgets);
      rt.emit(const VehiclePositionEvent(lat: -23.56, lng: -46.65, speedKmh: 4, batteryPct: 0, batteryKnown: false, speedLimitKmh: 32));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('80%'), findsNothing);
      expect(find.text('0%'), findsNothing);
      rt.emit(const VehiclePositionEvent(lat: -23.56, lng: -46.65, speedKmh: 4, batteryPct: 70, speedLimitKmh: 32));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('70%'), findsWidgets);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('sem posicao da moto por 30 s: velocidade "—" e aviso de GPS', (t) async {
      await pumpRide(t, _BenchRide(vehicle: _benchBike()));
      rt.emit(const VehiclePositionEvent(lat: -23.56, lng: -46.65, speedKmh: 12, batteryPct: 0, batteryKnown: false, speedLimitKmh: 32));
      await t.pump();
      await t.pump(const Duration(milliseconds: 500));
      expect(find.descendant(of: find.byKey(const Key('ride-gauge')), matching: find.text('12')), findsOneWidget);
      expect(find.text('Sem sinal de GPS da moto'), findsNothing);
      await t.pump(const Duration(seconds: 31));
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Sem sinal de GPS da moto'), findsOneWidget);
      expect(find.descendant(of: find.byKey(const Key('ride-gauge')), matching: find.text('—')), findsOneWidget);
      rt.emit(const VehiclePositionEvent(lat: -23.56, lng: -46.65, speedKmh: 3, batteryPct: 0, batteryKnown: false, speedLimitKmh: 32));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(find.descendant(of: find.byKey(const Key('ride-gauge')), matching: find.text('3')), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('pausa: estado neutro "Pausando…" e depois "Corrida pausada"', (t) async {
      await pumpRide(t, _BenchRide(vehicle: _benchBike()));
      await t.tap(find.widgetWithText(VoltiButton, 'Pausar'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      expect(find.textContaining('Pausando… mantenha a moto parada'), findsOneWidget);
      expect(find.textContaining('Moto travada'), findsNothing);
      await t.pump(const Duration(seconds: 31));
      await t.pump(const Duration(milliseconds: 400));
      expect(find.textContaining('Pausando'), findsNothing);
      expect(find.textContaining('Corrida pausada'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('botao Pausar mostra o carregando enquanto a API responde', (t) async {
      final b = _BenchRide(vehicle: _benchBike())..pauseGate = Completer<void>();
      await pumpRide(t, b);
      await t.tap(find.widgetWithText(VoltiButton, 'Pausar'));
      await t.pump();
      final btn = t.widget<VoltiButton>(find.byKey(const Key('ride-pause')));
      expect(btn.loading, isTrue);
      b.pauseGate!.complete();
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      expect(t.widget<VoltiButton>(find.byKey(const Key('ride-pause'))).loading, isFalse);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('pausa que volta a ativa sozinha (did_not_stop) mostra a mensagem do sistema', (t) async {
      final b = _BenchRide(vehicle: _benchBike());
      b.events = [_sysEvent('A moto não parou; pare e peça a pausa de novo.')];
      await pumpRide(t, b);
      await t.tap(find.widgetWithText(VoltiButton, 'Pausar'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      rt.emit(const RentalUpdated(rentalId: 'r1', status: 'paused', elapsedSeconds: 130, costCents: 260));
      await t.pump();
      expect(b.eventCalls, 0, reason: 'a pausa pedida pelo cliente nao e surpresa');
      rt.emit(const RentalUpdated(rentalId: 'r1', status: 'active', elapsedSeconds: 140, costCents: 270));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(b.eventCalls, 1);
      expect(find.text('A moto não parou; pare e peça a pausa de novo.'), findsOneWidget);
      expect(find.textContaining('Pausando'), findsNothing);
      expect(find.textContaining('Em corrida'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('trava tardia: ativa -> pausada sem o cliente pedir mostra o aviso', (t) async {
      final b = _BenchRide(vehicle: _benchBike());
      b.events = [_sysEvent('A moto foi travada; retome pelo app para seguir.', type: RentalEventType.paused)];
      await pumpRide(t, b);
      rt.emit(const RentalUpdated(rentalId: 'r1', status: 'paused', elapsedSeconds: 140, costCents: 270));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(find.text('A moto foi travada; retome pelo app para seguir.'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('encerrando: estado proprio, sem Pausar, e reabre a espera da trava', (t) async {
      await pumpRide(t, _BenchRide(vehicle: _benchBike()));
      rt.emit(const RentalUpdated(rentalId: 'r1', status: 'ending', elapsedSeconds: 140, costCents: 270));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(find.textContaining('Encerrando… aguardando a trava'), findsOneWidget);
      expect(find.textContaining('Ao vivo'), findsNothing);
      expect(find.widgetWithText(VoltiButton, 'Pausar'), findsNothing);
      expect(find.byKey(const Key('ride-open-ending')), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('encerramento que volta a ativo mostra a mensagem do sistema', (t) async {
      final b = _BenchRide(vehicle: _benchBike());
      b.events = [_sysEvent('A moto não parou; pare e peça o encerramento de novo.')];
      await pumpRide(t, b);
      rt.emit(const RentalUpdated(rentalId: 'r1', status: 'ending', elapsedSeconds: 140, costCents: 270));
      await t.pump();
      rt.emit(const RentalUpdated(rentalId: 'r1', status: 'active', elapsedSeconds: 150, costCents: 280));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(find.text('A moto não parou; pare e peça o encerramento de novo.'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('zona com aviso (advisory): "Limite recomendado", limite do medidor nao muda nem pisca', (t) async {
      await pumpRide(t, _BenchRide(vehicle: _benchBike()));
      rt.emit(const VehiclePositionEvent(lat: -23.56, lng: -46.65, speedKmh: 10, batteryPct: 0, batteryKnown: false, speedLimitKmh: 32));
      await t.pump();
      rt.emit(const ZoneNotice(zoneType: 'reduced_speed', transition: 'ENTER', message: 'Área com limite de 20 km/h.', speedLimitKmh: 20, advisory: true));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(find.text('Limite recomendado: 20 km/h'), findsOneWidget);
      expect(find.textContaining('limite 20'), findsNothing);
      // A moto nao aplica limite: o medidor nao mostra "limite".
      expect(find.textContaining('· limite'), findsNothing);
      rt.emit(const VehiclePositionEvent(lat: -23.56, lng: -46.65, speedKmh: 10, batteryPct: 0, batteryKnown: false, speedLimitKmh: 32));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(find.textContaining('· limite'), findsNothing);
      expect(find.text('Limite recomendado: 20 km/h'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('zona imposta segue mostrando o limite', (t) async {
      await pumpRide(t, _BenchRide(vehicle: sampleVehicle()));
      rt.emit(const ZoneNotice(zoneType: 'reduced_speed', transition: 'ENTER', message: 'Velocidade máxima: 20 km/h.', speedLimitKmh: 20));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(find.text('km/h · limite 20'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('pausa sem custo: "Pausa sem custo" em vez de R\$ 0,00/min', (t) async {
      await pumpRide(t, _BenchRide(vehicle: _benchBike(), pausePrice: 0, status: RentalStatus.paused));
      await t.pump(const Duration(milliseconds: 300));
      expect(find.text('R\$ 0,00/min'), findsNothing);
      expect(find.text('Pausa sem custo'), findsWidgets);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('devolucao na moto de bancada', () {
    Future<void> takeAndEnd(WidgetTester t) async {
      await t.tap(find.byType(PhotoCapture));
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
      await t.pumpAndSettle();
      await t.tap(find.descendant(of: find.byType(Dialog), matching: find.widgetWithText(VoltiButton, 'Travar e encerrar')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
    }

    Future<_EndB> pumpReturn(WidgetTester t, _EndB b, {Duration lockTimeout = const Duration(seconds: 150)}) async {
      tallScreen(t);
      await t.pumpWidget(testApp(ReturnScreen(rentalId: 'r1', pollInterval: const Duration(seconds: 2), lockTimeout: lockTimeout), overrides: [
        backendProvider.overrideWithValue(b),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
      ]));
      await t.pumpAndSettle();
      return b;
    }

    testWidgets('espera: texto, contador e dica de GPS apos 45 s', (t) async {
      await pumpReturn(t, _EndB());
      await takeAndEnd(t);
      expect(find.text('Aguardando a moto travar'), findsOneWidget);
      expect(find.text('Deixe a moto parada. Costuma levar menos de 1 minuto.'), findsOneWidget);
      await t.pump(const Duration(seconds: 12));
      expect(find.byKey(const Key('lock-elapsed')), findsOneWidget);
      expect(find.textContaining('12 s'), findsOneWidget);
      expect(find.byKey(const Key('lock-gps-hint')), findsNothing);
      await t.pump(const Duration(seconds: 34));
      expect(find.byKey(const Key('lock-gps-hint')), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('servidor devolve o aluguel a ativo: volta ao formulario com a foto e a mensagem', (t) async {
      final b = await pumpReturn(t, _EndB());
      b.events = [_sysEvent('A moto não parou; pare e peça o encerramento de novo.')];
      await takeAndEnd(t);
      expect(find.text('Aguardando a moto travar'), findsOneWidget);
      b.status = RentalStatus.active;
      await t.pump(const Duration(seconds: 2));
      await t.pump(const Duration(milliseconds: 100));
      await t.pump(const Duration(milliseconds: 100));
      expect(find.text('Aguardando a moto travar'), findsNothing);
      expect(find.text('A moto não parou; pare e peça o encerramento de novo.'), findsOneWidget);
      expect(t.widget<PhotoCapture>(find.byType(PhotoCapture)).done, isTrue, reason: 'mantem a foto');
      // Nova tentativa: chave nova (a antiga repetiria o 202 do encerramento desfeito).
      b.status = RentalStatus.ending;
      await t.tap(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
      await t.pumpAndSettle();
      await t.tap(find.descendant(of: find.byType(Dialog), matching: find.widgetWithText(VoltiButton, 'Travar e encerrar')));
      await t.pump();
      expect(b.keys, hasLength(2));
      expect(b.keys[0], isNot(b.keys[1]));
      expect(b.uploads, 1, reason: 'a foto ja enviada e reaproveitada');
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('rental.updated active durante a espera tambem volta ao formulario', (t) async {
      tallScreen(t);
      final b = _EndB();
      b.events = [_sysEvent('A moto não parou; pare e peça o encerramento de novo.')];
      late StreamController<RealtimeEvent> bus;
      await t.pumpWidget(testApp(const ReturnScreen(rentalId: 'r1', pollInterval: Duration(seconds: 20)), overrides: [
        backendProvider.overrideWithValue(b),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
        rideEventBusProvider.overrideWith((ref) {
          bus = StreamController<RealtimeEvent>.broadcast();
          ref.onDispose(bus.close);
          return bus;
        }),
      ]));
      await t.pumpAndSettle();
      await takeAndEnd(t);
      expect(find.text('Aguardando a moto travar'), findsOneWidget);
      bus.add(const RentalUpdated(rentalId: 'r1', status: 'active', elapsedSeconds: 10, costCents: 100));
      await t.pump();
      await t.pump(const Duration(milliseconds: 100));
      expect(find.text('Aguardando a moto travar'), findsNothing);
      expect(find.text('A moto não parou; pare e peça o encerramento de novo.'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('prazo de 150 s: "Tentar encerrar de novo" refaz o POST com a mesma chave; "Voltar"', (t) async {
      final b = await pumpReturn(t, _EndB());
      await takeAndEnd(t);
      await t.pump(const Duration(seconds: 120));
      expect(find.text('Aguardando a moto travar'), findsOneWidget, reason: 'o servidor ainda pode estar esperando (did_not_stop em 120 s)');
      await t.pump(const Duration(seconds: 32));
      expect(find.text('Não conseguimos confirmar a trava'), findsOneWidget);
      expect(find.text('Voltar à corrida'), findsOneWidget);
      await t.tap(find.text('Tentar encerrar de novo'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
      expect(b.keys, hasLength(2));
      expect(b.keys[0], b.keys[1]);
      expect(find.text('Aguardando a moto travar'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('voltar do sistema bloqueado enquanto espera a trava', (t) async {
      await pumpReturn(t, _EndB());
      await takeAndEnd(t);
      final pop = t.widget<PopScope>(find.byType(PopScope).first);
      expect(pop.canPop, isFalse);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('409 "Idempotency-Key ainda em processamento" vira espera, nao erro', (t) async {
      final b = _EndB()..endError = problem(409, 'conflict', detail: 'Requisição com esta Idempotency-Key ainda em processamento.');
      await pumpReturn(t, b);
      await takeAndEnd(t);
      expect(find.text('Aguardando a moto travar'), findsOneWidget);
      expect(find.textContaining('Idempotency-Key'), findsNothing);
      await t.pumpWidget(const SizedBox());
    });
  });

  group('prazos e espera do servidor', () {
    test('prazo de resposta no aceite, inicio e fim do aluguel', () {
      expect(kLongReceiveTimeout, const Duration(seconds: 45));
    });

    test('tempo esgotado na resposta nao vira "Sem conexão com a internet"', () {
      final f = toFailure(DioException.receiveTimeout(timeout: const Duration(seconds: 45), requestOptions: RequestOptions(path: '/x')));
      expect(f.timedOut, isTrue);
      final inProgress = toFailure(problem(409, 'conflict', detail: 'Requisição com esta Idempotency-Key ainda em processamento.'));
      expect(inProgress.stillProcessing, isTrue);
      expect(toFailure(problem(409, 'conflict', detail: 'Outro conflito.')).stillProcessing, isFalse);
    });
  });

  group('bateria desconhecida fora da corrida', () {
    testWidgets('escolher moto: "—" e "Desconhecida" no lugar de 0% · ~0 km', (t) async {
      galpao.phone(t);
      final unknown = bike('v1', 'VLT-0059', 'Volti Urbana').rebuild((b) => b
        ..batteryPct = 0
        ..estimatedRangeKm = 0
        ..batteryKnown = false);
      await galpao.pumpApp(t, GalpaoBackend(vehicles: {'dep1': [unknown]}), initial: '/pick');
      await galpao.settle(t);
      expect(find.text('0%'), findsNothing);
      expect(find.text('~0 km'), findsNothing);
      expect(find.text('—'), findsWidgets);
    });
  });

  group('rodada 1 de correcoes', () {
    late FakeRealtime rt;

    Future<void> pumpRide(WidgetTester t, _BenchRide b, {List<Override> extra = const []}) async {
      tallScreen(t);
      rt = FakeRealtime();
      await t.pumpWidget(testApp(const RideScreen(), overrides: [
        backendProvider.overrideWithValue(b),
        realtimeFactoryProvider.overrideWithValue(() => rt),
        locationServiceProvider.overrideWithValue(FakeLocation()),
        rentalTrackProvider.overrideWith((ref, id) async => const []),
        ...extra,
      ]));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
      await t.pump(const Duration(milliseconds: 50));
    }

    testWidgets('pausa devolvida ja ativa (did_not_stop na corrida) mostra "pausa desfeita"', (t) async {
      final b = _BenchRide(vehicle: _benchBike())
        ..pauseResult = RentalStatus.active
        ..events = [_sysEvent('A moto não parou; pare e peça a pausa de novo.')];
      await pumpRide(t, b);
      await t.tap(find.widgetWithText(VoltiButton, 'Pausar'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(b.eventCalls, 1);
      expect(find.text('A moto não parou; pare e peça a pausa de novo.'), findsOneWidget);
      expect(find.textContaining('Pausando'), findsNothing);
      // _userTarget limpo: uma pausa tardia depois e surpresa (avisa de novo).
      b.events = [_sysEvent('A moto foi travada; retome pelo app para seguir.', type: RentalEventType.paused, minute: 6)];
      rt.emit(const RentalUpdated(rentalId: 'r1', status: 'paused', elapsedSeconds: 140, costCents: 270));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(b.eventCalls, 2);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('moto que confirma rapido: "Pausando…" some com a primeira posicao parada (< 3 km/h)', (t) async {
      await pumpRide(t, _BenchRide(vehicle: sampleVehicle()));
      await t.tap(find.widgetWithText(VoltiButton, 'Pausar'));
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      expect(find.textContaining('Pausando… mantenha a moto parada'), findsOneWidget);
      // Ainda andando: continua pendente.
      rt.emit(const VehiclePositionEvent(lat: -23.56, lng: -46.65, speedKmh: 8, batteryPct: 70, speedLimitKmh: 32));
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      expect(find.textContaining('Pausando… mantenha a moto parada'), findsOneWidget);
      rt.emit(const VehiclePositionEvent(lat: -23.56, lng: -46.65, speedKmh: 0, batteryPct: 70, speedLimitKmh: 32));
      await t.pump();
      await t.pump(const Duration(milliseconds: 400));
      await t.pump(const Duration(milliseconds: 400)); // fim do cross-fade do selo
      expect(find.textContaining('Pausando'), findsNothing);
      expect(find.textContaining('Corrida pausada'), findsOneWidget);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('devolucao aberta por cima: a corrida nao repete o aviso do sistema', (t) async {
      final b = _BenchRide(vehicle: _benchBike())..events = [_sysEvent('A moto não parou; pare e peça o encerramento de novo.')];
      final open = ReturnScreensOpen()..count = 1;
      await pumpRide(t, b, extra: [returnScreensOpenProvider.overrideWithValue(open)]);
      rt.emit(const RentalUpdated(rentalId: 'r1', status: 'ending', elapsedSeconds: 140, costCents: 270));
      await t.pump();
      rt.emit(const RentalUpdated(rentalId: 'r1', status: 'active', elapsedSeconds: 150, costCents: 280));
      await t.pump();
      await t.pump(const Duration(milliseconds: 600));
      expect(b.eventCalls, 0, reason: 'a devolucao aberta e quem avisa');
      expect(find.text('A moto não parou; pare e peça o encerramento de novo.'), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('sem tempo real: sem a faixa de GPS (a faixa de conexao ja explica)', (t) async {
      await pumpRide(t, _BenchRide(vehicle: _benchBike()));
      rt.conn.add(false);
      await t.pump();
      await t.pump(const Duration(seconds: 31));
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Sem conexão em tempo real'), findsOneWidget);
      expect(find.text('Sem sinal de GPS da moto'), findsNothing);
      await t.pumpWidget(const SizedBox());
    });

    testWidgets('devolucao: sair durante a espera da trava nao quebra; espera tem "Falar com o suporte"', (t) async {
      tallScreen(t);
      final b = _EndB();
      await t.pumpWidget(testApp(const ReturnScreen(rentalId: 'r1'), overrides: [
        backendProvider.overrideWithValue(b),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
      ]));
      await t.pumpAndSettle();
      await t.tap(find.byType(PhotoCapture));
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
      await t.pumpAndSettle();
      await t.tap(find.descendant(of: find.byType(Dialog), matching: find.widgetWithText(VoltiButton, 'Travar e encerrar')));
      await t.pump();
      await t.pump(const Duration(milliseconds: 50));
      expect(find.text('Aguardando a moto travar'), findsOneWidget);
      expect(find.byKey(const Key('lock-wait-support')), findsOneWidget);
      await t.pumpWidget(const SizedBox());
      await t.pump(const Duration(seconds: 10));
      expect(t.takeException(), isNull);
    });

    testWidgets('devolucao: uma consulta por vez enquanto espera', (t) async {
      tallScreen(t);
      final b = _EndB();
      await t.pumpWidget(testApp(const ReturnScreen(rentalId: 'r1', pollInterval: Duration(seconds: 1)), overrides: [
        backendProvider.overrideWithValue(b),
        photoPickerProvider.overrideWithValue(FakePhotoPicker()),
      ]));
      await t.pumpAndSettle();
      await t.tap(find.byType(PhotoCapture));
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(VoltiButton, 'Travar e encerrar'));
      await t.pumpAndSettle();
      // Daqui em diante o GET do aluguel fica "em voo" ate o teste soltar.
      b.rentalGate = Completer<void>();
      await t.tap(find.descendant(of: find.byType(Dialog), matching: find.widgetWithText(VoltiButton, 'Travar e encerrar')));
      await t.pump();
      final before = b.rentalCalls;
      await t.pump(const Duration(seconds: 5));
      expect(b.rentalCalls - before, 1, reason: 'a primeira consulta ainda nao respondeu');
      b.rentalGate!.complete();
      await t.pumpWidget(const SizedBox());
    });

    test('texto da espera nao promete 30 s (a espera vai ate 150 s)', () {
      final l = lookupAppLocalizations(const Locale('pt'));
      expect(l.waitingLockText, isNot(contains('30 s')));
    });
  });

  group('prazo de 45 s enviado de verdade (Dio)', () {
    late _CaptureAdapter adapter;
    late ApiBackend backend;
    setUp(() {
      adapter = _CaptureAdapter();
      backend = ApiBackend(buildVoltiApi(baseUrl: 'http://x', auth: _StubAuth(), httpClientAdapter: adapter, maxAttempts: 1));
    });

    test('endRental', () async {
      await _ignore(() => backend.endRental('r1', 'k1', idempotencyKey: 'key-12345678'));
      expect(adapter.calls.single.receiveTimeout, kLongReceiveTimeout);
    });

    test('startRental (sem tela que chame hoje; o Backend ja manda)', () async {
      await _ignore(() => backend.startRental(
          StartRentalRequest((b) => b
            ..vehicleId = 'v1'
            ..planCode = PlanCode.minute
            ..coverage = InsuranceCoverage.basic
            ..depositMethod = DepositMethod.card),
          idempotencyKey: 'key-12345678'));
      expect(adapter.calls.single.receiveTimeout, kLongReceiveTimeout);
    });

    test('outras chamadas ficam no prazo padrao', () async {
      await _ignore(() => backend.rental('r1'));
      expect(adapter.calls.single.receiveTimeout, const Duration(seconds: 15));
    });
  });

  test('ajuda: limites de zona sem prometer reducao automatica', () {
    final l = lookupAppLocalizations(const Locale('pt'));
    expect(l.helpRule1Text, isNot(contains('sozinha')));
    expect(l.helpRule1Text, contains('respeite 6 km/h'));
    expect(l.helpRule2Text, contains('20 km/h'));
  });
}

/// O corpo `{}` nao desserializa: so interessa a requisicao enviada.
Future<void> _ignore(Future<Object?> Function() call) async {
  try {
    await call();
  } catch (_) {}
}

class _CaptureAdapter implements HttpClientAdapter {
  final calls = <RequestOptions>[];
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async {
    calls.add(o);
    return ResponseBody.fromString('{}', 200, headers: {
      Headers.contentTypeHeader: ['application/json'],
    });
  }

  @override
  void close({bool force = false}) {}
}

class _StubAuth implements AuthRepository {
  @override
  AuthMode get mode => AuthMode.dev;
  @override
  AuthSession? get session => null;
  @override
  Future<String?> accessToken() async => 'tok';
  @override
  Future<void> signOut() async {}
}

class _EndB extends FakeBackend {
  final keys = <String?>[];
  int rentalCalls = 0;

  /// Segura o `GET /rentals/{id}` ate o teste soltar (consulta em voo).
  Completer<void>? rentalGate;
  int uploads = 0;
  RentalStatus status = RentalStatus.ending;
  Object? endError;
  List<RentalEvent> events = [];

  @override
  Future<Rental> rental(String id) async {
    rentalCalls++;
    if (rentalGate != null) await rentalGate!.future;
    return sampleRental(status: status);
  }

  // Sem posicao da moto: a tela pede confirmacao e o servidor decide o ponto verde.
  @override
  Future<Vehicle> vehicleByCode(String code) async => throw AppFailure(kind: FailureKind.network);
  @override
  Future<List<GeoZone>> zones() async => [];
  @override
  Future<PresignedUpload> returnPhotoUpload(String rentalId) async {
    uploads++;
    return PresignedUpload((b) => b
      ..objectKey = 'k1'
      ..uploadUrl = 'http://x'
      ..method = PresignedUploadMethodEnum.PUT
      ..headers = MapBuilder<String, String>()
      ..expiresAt = DateTime.utc(2030));
  }

  @override
  Future<void> upload(PresignedUpload target, Uint8List bytes, String contentType) async {}
  @override
  Future<Rental> endRental(String rentalId, String photoKey, {String? idempotencyKey}) async {
    keys.add(idempotencyKey);
    final e = endError;
    if (e != null) {
      endError = null;
      throw toFailure(e);
    }
    return sampleRental(status: RentalStatus.ending);
  }

  @override
  Future<List<RentalEvent>> rentalEvents(String id) async => events;
}
