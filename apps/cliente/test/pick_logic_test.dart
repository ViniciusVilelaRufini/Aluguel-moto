import 'package:built_collection/built_collection.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/pick/pick_logic.dart';

import 'helpers.dart';

Vehicle v(String id, String model, {double lat = -23.5614, double lng = -46.6559, double range = 20, int battery = 80}) =>
    Vehicle((b) => b
      ..id = id
      ..code = 'VLT-$id'
      ..model = model
      ..status = VehicleStatus.free
      ..lat = lat
      ..lng = lng
      ..batteryPct = battery
      ..estimatedRangeKm = range
      ..speedLimitKmh = 32);

void main() {
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

    test('lugar conhecido: o ponto verde em que o cliente esta', () {
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
      expect(pickupZones([zone]), hasLength(1));
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
