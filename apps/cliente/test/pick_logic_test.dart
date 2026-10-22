import 'package:built_collection/built_collection.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/pick/pick_logic.dart';

import 'helpers.dart';

VehicleSummary v(String id, String model, {double lat = -23.5614, double lng = -46.6559, double range = 20, int battery = 80}) =>
    VehicleSummary((b) => b
      ..id = id
      ..code = 'VLT-$id'
      ..model = model
      ..status = VehicleStatus.free
      ..lat = lat
      ..lng = lng
      ..batteryPct = battery
      ..estimatedRangeKm = range);

void main() {
  group('distancia a pe', () {
    test('haversine em metros', () {
      // ~111 m por 0,001 grau de latitude.
      expect(haversineMeters(const LatLng(-23.5614, -46.6559), const LatLng(-23.5624, -46.6559)), inInclusiveRange(110, 112));
      expect(haversineMeters(const LatLng(0, 0), const LatLng(0, 0)), 0);
    });

    test('rotulo "120 m · 2 min" (80 m/min, minimo 1 min)', () {
      expect(walkLabel(120), '120 m · 2 min');
      expect(walkLabel(310), '310 m · 4 min');
      expect(walkLabel(20), '20 m · 1 min');
      expect(walkLabel(1250), '1,3 km · 16 min');
    });

    test('sem localizacao do cliente nao ha distancia', () {
      expect(walkMetersTo(v('1', 'Volti Flash'), null), isNull);
      expect(walkMetersTo(v('1', 'Volti Flash', lat: -23.5624), const LatLng(-23.5614, -46.6559)), inInclusiveRange(110, 112));
    });
  });

  test('preco por minuto "R\$ 0,79/min"', () {
    expect(perMinuteLabel(79), r'R$ 0,79/min');
    expect(perMinuteLabel(125), r'R$ 1,25/min');
  });

  test('categoria pelo nome do modelo', () {
    expect(categoryFor('Volti Flash'), ModelCategory.urban);
    expect(categoryFor('volti urban'), ModelCategory.doubleSeat);
    expect(categoryFor('Volti Cargo'), ModelCategory.cargo);
    expect(categoryFor('Volti S1'), isNull);
  });

  test('nome curto do modelo para a foto', () {
    expect(shortModel('Volti Flash'), 'Flash');
    expect(shortModel('Volti'), 'Volti');
  });

  group('filtros', () {
    final list = [v('1', 'Volti Urban'), v('2', 'Volti Flash'), v('3', 'Volti Flash'), v('4', 'Volti Cargo')];

    test('modelos presentes, na ordem do design e depois alfabetica', () {
      expect(modelsIn(list), ['Volti Flash', 'Volti Urban', 'Volti Cargo']);
      expect(modelsIn([v('1', 'Volti S1'), v('2', 'Alfa')]), ['Alfa', 'Volti S1']);
    });

    test('filtrar por modelo (null = todas)', () {
      expect(filterByModel(list, null).length, 4);
      expect(filterByModel(list, 'Volti Flash').map((e) => e.id), ['2', '3']);
    });

    test('ordena pela distancia a pe quando ha localizacao', () {
      final user = const LatLng(-23.5614, -46.6559);
      final far = v('far', 'Volti Flash', lat: -23.5700);
      final near = v('near', 'Volti Flash', lat: -23.5620);
      expect(sortByWalk([far, near], user).map((e) => e.id), ['near', 'far']);
      expect(sortByWalk([far, near], null).map((e) => e.id), ['far', 'near']);
    });

    test('filtro do mapa: autonomia 10+ km', () {
      final l = [v('a', 'X', range: 9.9), v('b', 'X', range: 10), v('c', 'X', range: 18)];
      expect(applyHomeFilter(l, HomeFilter.all, const []).length, 3);
      expect(applyHomeFilter(l, HomeFilter.range10, const []).map((e) => e.id), ['b', 'c']);
    });

    test('filtro do mapa: pontos de retirada (dentro de zona de devolucao ativa)', () {
      final zone = GeoZone((b) => b
        ..id = 'z'
        ..name = 'Ponto Paulista'
        ..type = ZoneType.return_
        ..active = true
        ..geometry = GeoJsonPolygon((g) => g
          ..type = GeoJsonPolygonType.polygon
          ..coordinates = ListBuilder<BuiltList<BuiltList<double>>>([
            BuiltList<BuiltList<double>>([
              for (final p in const [
                [-46.66, -23.56],
                [-46.65, -23.56],
                [-46.65, -23.57],
                [-46.66, -23.57],
                [-46.66, -23.56],
              ])
                BuiltList<double>(p),
            ]),
          ])).toBuilder()
        ..createdAt = DateTime.utc(2026)
        ..updatedAt = DateTime.utc(2026));
      final inside = v('in', 'X', lat: -23.565, lng: -46.655);
      final outside = v('out', 'X', lat: -23.58, lng: -46.70);
      expect(applyHomeFilter([inside, outside], HomeFilter.pickupPoints, [zone]).map((e) => e.id), ['in']);
      expect(nearestPlaceName(const LatLng(-23.565, -46.655), [zone]), 'Ponto Paulista');
      expect(nearestPlaceName(const LatLng(-23.60, -46.70), [zone]), isNull);
      expect(nearestPlaceName(null, [zone]), isNull);
    });
  });

  group('pode reservar', () {
    test('sem moto selecionada', () {
      expect(reserveBlock(session: session(), selected: false), ReserveBlock.noSelection);
    });
    test('KYC em analise ou recusado bloqueia', () {
      expect(reserveBlock(session: session(kyc: KycStatus.pending), selected: true), ReserveBlock.kycPending);
      expect(reserveBlock(session: session(kyc: KycStatus.rejected), selected: true), ReserveBlock.kycRejected);
      expect(reserveBlock(session: session(kyc: KycStatus.notStarted), selected: true), ReserveBlock.kycPending);
    });
    test('inadimplente bloqueia', () {
      final s = SessionState(signedIn: true, customer: customer().rebuild((b) => b..delinquent = true));
      expect(reserveBlock(session: s, selected: true), ReserveBlock.delinquent);
    });
    test('reserva ou corrida em andamento bloqueia', () {
      expect(reserveBlock(session: session(), selected: true, hasReservation: true), ReserveBlock.activeReservation);
      expect(reserveBlock(session: session(), selected: true, hasRental: true), ReserveBlock.activeRental);
    });
    test('sessao carregando: desligado sem motivo (nao e KYC pendente)', () {
      expect(reserveBlock(session: null, selected: true), ReserveBlock.sessionLoading);
      expect(reserveBlock(session: null, selected: true, hasReservation: true), ReserveBlock.sessionLoading);
    });
    test('liberado', () {
      expect(reserveBlock(session: session(), selected: true), ReserveBlock.none);
    });
  });

  group('1a gratis', () {
    test('so com a promocao ativa e nenhum aluguel anterior', () {
      final none = customer().rebuild((b) => b.stats.replace(CustomerStats((s) => s
        ..rentalsCount = 0
        ..totalSpentCents = 0
        ..openDisputes = 0)));
      final some = none.rebuild((b) => b.stats.rentalsCount = 2);
      expect(firstRideFree(none, promoActive: true), isTrue);
      expect(firstRideFree(none, promoActive: false), isFalse);
      expect(firstRideFree(some, promoActive: true), isFalse);
      // Sem estatisticas nao da para saber: esconde.
      expect(firstRideFree(customer(), promoActive: true), isFalse);
      expect(firstRideFree(null, promoActive: true), isFalse);
    });
  });

  test('iniciais do avatar', () {
    expect(initialsOf('Ana Lima'), 'AL');
    expect(initialsOf('ana'), 'A');
    expect(initialsOf('Ana Maria de Souza'), 'AS');
    expect(initialsOf(null), isNull);
    expect(initialsOf('  '), isNull);
  });
}
