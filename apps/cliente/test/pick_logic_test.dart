import 'package:built_collection/built_collection.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_cliente/core/session.dart';
import 'package:volti_cliente/features/pick/pick_logic.dart';

import 'helpers.dart';

Vehicle v(String id, String model, {double lat = -23.5614, double lng = -46.6559, double range = 20, int battery = 80, String? modelId, String? category}) =>
    Vehicle((b) => b
      ..vehicleModelId = modelId
      ..categoryLabel = category
      ..id = id
      ..code = 'VLT-$id'
      ..model = model
      ..status = VehicleStatus.free
      ..lat = lat
      ..lng = lng
      ..batteryPct = battery
      ..estimatedRangeKm = range
      ..speedLimitKmh = 32);

VehicleModel catalogModel(String id, String name, int sortOrder, {String category = 'Urbana'}) => VehicleModel((b) => b
  ..id = id
  ..name = name
  ..slug = id
  ..categoryLabel = category
  ..pricePerMinuteCents = 79
  ..serviceIntervalKm = 1000
  ..serviceIntervalHours = 100
  ..active = true
  ..sortOrder = sortOrder
  ..createdAt = DateTime.utc(2026, 10, 22)
  ..updatedAt = DateTime.utc(2026, 10, 22));

void main() {
  test('preco por minuto "R\$ 0,79/min"', () {
    expect(perMinuteLabel(79), r'R$ 0,79/min');
    expect(perMinuteLabel(125), r'R$ 1,25/min');
  });

  test('categoria: a da moto; sem ela, a do modelo no catalogo', () {
    final catalog = {'m1': catalogModel('m1', 'Volti Urbana', 1, category: 'Urbana com cesto')};
    expect(categoryOf(v('1', 'Volti Urbana', modelId: 'm1', category: 'Rotulo da moto'), catalog), 'Rotulo da moto');
    expect(categoryOf(v('1', 'Volti Urbana', modelId: 'm1'), catalog), 'Urbana com cesto');
    expect(categoryOf(v('1', 'Volti S1'), catalog), isNull);
  });

  test('nome curto do modelo para a foto', () {
    expect(shortModel('Volti Urbana'), 'Urbana');
    expect(shortModel('Volti'), 'Volti');
  });

  group('filtros', () {
    final list = [v('1', 'Volti Sport'), v('2', 'Volti Urbana'), v('3', 'Volti Urbana'), v('4', 'Volti Touring')];
    final catalog = {
      'm-t': catalogModel('m-t', 'Volti Touring', 3),
      'm-u': catalogModel('m-u', 'Volti Urbana', 1),
      'm-s': catalogModel('m-s', 'Volti Sport', 2),
    };

    test('modelos presentes na ordem do catalogo (sortOrder), pelo id ou pelo nome', () {
      expect(modelsIn(list, catalog), ['Volti Urbana', 'Volti Sport', 'Volti Touring']);
      final byId = [v('1', 'Outro nome', modelId: 'm-t'), v('2', 'Volti Urbana', modelId: 'm-u')];
      expect(modelsIn(byId, catalog), ['Volti Urbana', 'Outro nome']);
    });

    test('fora do catalogo (ou sem catalogo): depois, em ordem alfabetica', () {
      expect(modelsIn([v('1', 'Volti S1'), v('2', 'Volti Sport'), v('3', 'Alfa')], catalog), ['Volti Sport', 'Alfa', 'Volti S1']);
      expect(modelsIn(list), ['Volti Sport', 'Volti Touring', 'Volti Urbana']);
    });

    test('filtrar por modelo (null = todas)', () {
      expect(filterByModel(list, null).length, 4);
      expect(filterByModel(list, 'Volti Urbana').map((e) => e.id), ['2', '3']);
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
