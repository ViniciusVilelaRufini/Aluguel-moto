import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/backend.dart';
import 'package:volti_cliente/core/services.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/ride/ride_screen.dart';
import 'package:volti_cliente/l10n/app_localizations.dart';
import 'package:volti_flutter/volti_flutter.dart';

/// Backend de teste: cada teste sobrescreve so o que usa.
class FakeBackend implements Backend {
  /// Troca na estacao em andamento devolvida por [currentRentalState].
  StationSwap? currentStationSwap;

  /// Padrao dos testes: o aluguel de [currentRental] e [currentStationSwap].
  @override
  Future<CurrentRentalState> currentRentalState() async =>
      (rental: await currentRental(), stationSwap: currentStationSwap, batterySwapFeeCents: batterySwapFeeCents);

  /// `CurrentRental.batterySwapFeeCents` devolvido por [currentRentalState].
  int? batterySwapFeeCents;

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnimplementedError('FakeBackend.${invocation.memberName} nao configurado no teste');
}

class FakeRealtime implements RealtimeService {
  final _c = StreamController<RealtimeEvent>.broadcast();
  void emit(RealtimeEvent e) => _c.add(e);
  final conn = StreamController<bool>.broadcast();
  @override
  Stream<bool> get connected => conn.stream;
  @override
  Stream<RealtimeEvent> get events => _c.stream;
  @override
  Future<void> connect() async {}
  @override
  void dispose() {
    _c.close();
    conn.close();
  }
}

class FakeLocation implements LocationService {
  @override
  Future<bool> ensurePermission() async => false;
  @override
  Future<bool> hasPermission() async => false;
  @override
  Future<LatLng?> currentPosition({bool requestPermission = false}) async => null;
  @override
  Stream<LatLng> trackDuringRental({required String notificationTitle, required String notificationText}) => const Stream.empty();
}

class FakePhotoPicker implements PhotoPicker {
  @override
  Future<Uint8List?> take({bool front = false}) async => Uint8List.fromList([1, 2, 3]);
}

class FakeSession extends SessionNotifier {
  FakeSession(this.initial);
  final SessionState initial;
  bool saved = false;
  @override
  Future<SessionState> build() async => initial;
  @override
  Future<void> saveConsents({required bool terms, required bool location, bool marketing = false}) async {
    saved = true;
    state = AsyncData(SessionState(
      signedIn: true,
      customer: initial.customer,
      consents: Consents((b) => b
        ..termsAccepted = terms
        ..locationTracking = location
        ..marketing = marketing),
    ));
  }
}

Customer customer({KycStatus kyc = KycStatus.approved}) => Customer((b) => b
  ..id = 'c1'
  ..email = 'a@b.c'
  ..name = 'Ana Lima'
  ..kycStatus = kyc
  ..status = CustomerStatus.active
  ..delinquent = false
  ..restricted = false
  ..createdAt = DateTime.utc(2026, 1, 1));

SessionState session({bool location = true, bool terms = true, KycStatus kyc = KycStatus.approved}) => SessionState(
      signedIn: true,
      customer: customer(kyc: kyc),
      consents: Consents((b) => b
        ..termsAccepted = terms
        ..locationTracking = location
        ..marketing = false),
    );

Vehicle sampleVehicle({int battery = 80}) => Vehicle((b) => b
  ..id = 'v1'
  ..code = 'VLT-001'
  ..model = 'Volti One'
  ..status = VehicleStatus.free
  ..lat = -23.56
  ..lng = -46.65
  ..batteryPct = battery
  ..estimatedRangeKm = 20
  ..speedLimitKmh = 32);

Rental sampleRental({RentalStatus status = RentalStatus.active}) => Rental((b) => b
  ..id = 'r1'
  ..customerId = 'c1'
  ..vehicleId = 'v1'
  ..vehicleCode = 'VLT-001'
  ..planCode = PlanCode.minute
  ..coverage = InsuranceCoverage.basic
  ..status = status
  ..startedAt = DateTime.utc(2026, 10, 21)
  ..elapsedSeconds = 120
  ..pausedSeconds = 0
  ..costCents = 250
  ..depositId = 'd1'
  ..createdAt = DateTime.utc(2026, 10, 21)
  ..updatedAt = DateTime.utc(2026, 10, 21));

Widget testApp(Widget child, {List<Override> overrides = const []}) => ProviderScope(
      retry: (_, _) => null,
      overrides: [mapEnabledProvider.overrideWithValue(false), ...overrides],
      child: MaterialApp(
        theme: VoltiTheme.light(),
        locale: const Locale('pt', 'BR'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: child,
      ),
    );

/// Como [testApp], mas com rotas (telas que navegam com go_router).
Widget testRouterApp(GoRouter router, {List<Override> overrides = const []}) => ProviderScope(
      retry: (_, _) => null,
      overrides: [mapEnabledProvider.overrideWithValue(false), ...overrides],
      child: MaterialApp.router(
        theme: VoltiTheme.light(),
        locale: const Locale('pt', 'BR'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        routerConfig: router,
        builder: (context, child) => VoltiButtonLabels(
          loading: AppLocalizations.of(context).buttonBusy,
          success: AppLocalizations.of(context).buttonDone,
          child: child!,
        ),
      ),
    );

/// Tela alta para que tudo caiba sem rolagem.
void tallScreen(WidgetTester t) {
  t.view.physicalSize = const Size(800, 3200);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}
