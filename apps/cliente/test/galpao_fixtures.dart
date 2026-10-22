import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/errors.dart';
import 'package:volti_cliente/features/pick/depot_selection.dart';

import 'helpers.dart';

/// Fixtures do fluxo do galpao: um galpao em Pinheiros (seg-sex 07-20h, sab 08-18h,
/// domingo fechado), 3 motos e o backend falso usado pelos testes de widget.
// 2026-10-22 e quinta-feira. 13:00Z = 10:00 em Sao Paulo.
final thu10 = DateTime.utc(2026, 10, 22, 13);

Depot depotFixture({String id = 'dep1', String name = 'Galpão Volti — Pinheiros', String district = 'Pinheiros', int count = 3, int? distanceM}) =>
    Depot((b) => b
      ..id = id
      ..name = name
      ..address = 'R. dos Pinheiros, 1000'
      ..district = district
      ..lat = -23.566
      ..lng = -46.684
      ..timezone = 'America/Sao_Paulo'
      ..openingHours = ListBuilder<DepotOpeningHours>([
        for (final d in [1, 2, 3, 4, 5])
          DepotOpeningHours((h) => h
            ..weekday = d
            ..opensAt = '07:00'
            ..closesAt = '20:00'),
        DepotOpeningHours((h) => h
          ..weekday = 6
          ..opensAt = '08:00'
          ..closesAt = '18:00'),
      ])
      ..pickupNowWindowMinutes = 120
      ..maxScheduleDays = 7
      ..scheduledGraceMinutes = 30
      ..active = true
      ..availableVehicleCount = count
      ..distanceM = distanceM);

Vehicle bike(String id, String code, String model, {String depotId = 'dep1', int price = 79, String category = 'Urbana'}) => Vehicle((b) => b
  ..id = id
  ..code = code
  ..model = model
  ..status = VehicleStatus.free
  ..lat = -23.566
  ..lng = -46.684
  ..batteryPct = 90
  ..estimatedRangeKm = 40
  ..speedLimitKmh = 32
  ..depotId = depotId
  ..categoryLabel = category
  ..pricePerMinuteCents = price);

PricingPlan plan(PlanCode code, String name, PlanUnit unit, int cents, {bool recurring = false}) => PricingPlan((b) => b
  ..id = 'p-${code.name}'
  ..code = code
  ..name = name
  ..unit = unit
  ..unlockFeeCents = 0
  ..unitPriceCents = cents
  ..pausePerMinuteCents = 0
  ..recurring = recurring
  ..active = true
  ..createdAt = DateTime.utc(2026)
  ..updatedAt = DateTime.utc(2026));

InsuranceCoverageOption coverage(InsuranceCoverage c, String name, int premium, List<String> items) => InsuranceCoverageOption((b) => b
  ..coverage = c
  ..name = name
  ..description = 'Cobertura $name'
  ..premiumCents = premium
  ..mandatory = c == InsuranceCoverage.basic
  ..active = true
  ..items = ListBuilder<CoverageItem>([
    for (final i in items)
      CoverageItem((x) => x
        ..code = i
        ..description = i),
  ]));

DioException conflict(String slug) => DioException(
      requestOptions: RequestOptions(path: '/reservations'),
      response: Response(
        requestOptions: RequestOptions(path: '/reservations'),
        statusCode: 409,
        data: {'type': 'https://api.volti.com.br/problems/$slug', 'title': 'Conflito', 'status': 409},
      ),
    );

class GalpaoBackend extends FakeBackend {
  GalpaoBackend({List<Depot>? depots, Map<String, List<Vehicle>>? vehicles, this.withCard = true})
      : depotList = depots ?? [depotFixture()],
        vehiclesByDepot = vehicles ??
            {
              'dep1': [
                bike('v1', 'VLT-001', 'Volti Flash'),
                bike('v2', 'VLT-002', 'Volti Urban', price: 99, category: 'Dois lugares'),
                bike('v3', 'VLT-003', 'Volti Flash'),
              ],
            };

  final List<Depot> depotList;
  final Map<String, List<Vehicle>> vehiclesByDepot;
  final bool withCard;
  Reservation? current;
  ReservationCreate? sent;
  Object? createError;
  Object? cancelError;
  int cancels = 0;
  int vehicleCalls = 0;
  int creates = 0;

  @override
  Future<List<Depot>> depots({double? lat, double? lng}) async => depotList;
  @override
  Future<Depot> depot(String id) async => depotList.firstWhere((d) => d.id == id);
  @override
  Future<List<Vehicle>> depotVehicles(String depotId) async {
    vehicleCalls++;
    return vehiclesByDepot[depotId] ?? const [];
  }

  @override
  Future<List<VehicleModel>> vehicleModels() async => const [];
  @override
  Future<List<SwapStation>> swapStations({double? lat, double? lng}) async => const [];
  @override
  Future<List<GeoZone>> zones() async => const [];
  @override
  Future<Reservation?> currentReservation() async => current;
  @override
  Future<Rental?> currentRental() async => null;
  @override
  Future<List<SupportConversation>> conversations() async => const [];
  @override
  Future<List<PricingPlan>> plans() async => [
        plan(PlanCode.minute, 'Por minuto', PlanUnit.minute, 79),
        plan(PlanCode.hour, 'Por hora', PlanUnit.hour, 2900),
        plan(PlanCode.day, 'Diário', PlanUnit.day, 8900),
        plan(PlanCode.weekly, 'Semanal', PlanUnit.week, 34900, recurring: true),
        plan(PlanCode.monthly, 'Mensal', PlanUnit.month, 99900, recurring: true),
      ];
  @override
  Future<List<InsuranceCoverageOption>> coverages() async => [
        coverage(InsuranceCoverage.basic, 'Básico', 0, ['Danos a terceiros']),
        coverage(InsuranceCoverage.full, 'Completo', 1500, ['Danos a terceiros', 'Roubo e furto']),
      ];
  @override
  Future<Quote> quote(PlanCode plan, InsuranceCoverage coverage, {String? coupon}) async => Quote((b) => b
    ..planCode = plan
    ..coverage = coverage
    ..depositCents = 20000
    ..couponApplied = false
    ..breakdown.totalCents = 8900 + (coverage == InsuranceCoverage.full ? 1500 : 0)
    ..breakdown.subtotalCents = 8900
    ..breakdown.insuranceCents = coverage == InsuranceCoverage.full ? 1500 : 0
    ..breakdown.feesCents = 0
    ..breakdown.discountCents = 0);
  @override
  Future<List<PaymentCard>> cards() async => withCard
      ? [
          PaymentCard((b) => b
            ..id = 'card1'
            ..brand = 'visa'
            ..last4 = '4242'
            ..expMonth = 12
            ..expYear = 2030
            ..isDefault = true
            ..createdAt = DateTime.utc(2026)),
        ]
      : const [];
  @override
  Future<Reservation> createDepotReservation(ReservationCreate request, {String? idempotencyKey}) async {
    sent = request;
    creates++;
    if (createError != null) throw toFailure(createError!);
    final r = Reservation((b) => b
      ..id = 'res1'
      ..vehicleId = request.vehicleId
      ..vehicle.replace(VehicleSummary((v) => v
        ..id = request.vehicleId
        ..code = 'VLT-001'
        ..model = 'Volti Flash'
        ..status = VehicleStatus.reserved
        ..lat = -23.566
        ..lng = -46.684
        ..batteryPct = 90
        ..estimatedRangeKm = 40))
      ..status = ReservationStatus.active
      ..createdAt = thu10
      ..expiresAt = request.pickupMode == PickupMode.now ? thu10.add(const Duration(hours: 2)) : request.pickupAt!.add(const Duration(minutes: 30))
      ..depotId = request.depotId
      ..pickupMode = request.pickupMode
      ..pickupAt = request.pickupAt
      ..planCode = request.planCode
      ..coverage = request.coverage
      ..depositMethod = request.depositMethod
      ..pickupCode = 'VOLTI-RES1-SIG');
    current = r;
    return r;
  }

  @override
  Future<void> cancelReservation(String id) async {
    if (cancelError != null) throw toFailure(cancelError!);
    cancels++;
    current = null;
  }
}

DepotSelection selection({PricingPlan? p, InsuranceCoverage c = InsuranceCoverage.basic}) => DepotSelection(
      depot: depotFixture(),
      vehicle: bike('v1', 'VLT-001', 'Volti Flash'),
      plan: p,
      coverage: c,
      coverageName: c == InsuranceCoverage.basic ? 'Básico' : 'Completo',
    );
