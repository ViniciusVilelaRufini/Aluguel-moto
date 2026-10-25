import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/features/fleet/battery_stock_page.dart';
import 'package:volti_operador/features/fleet/depot_fleet_page.dart';
import 'package:volti_operador/features/fleet/fleet_labels.dart';
import 'package:volti_operador/features/fleet/van_stock_page.dart';
import 'package:volti_operador/features/pickups/handover_status_page.dart';
import 'package:volti_operador/l10n/app_localizations_pt.dart';

import 'helpers.dart';

/// Rotas do contrato que ja existiam: cancelar entrega, motos do galpao,
/// descarga da van numa estacao e estoque de baterias.

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 50));
  }
}

Future<void> _tap(WidgetTester t, String key) async {
  final f = find.byKey(Key(key));
  await t.ensureVisible(f);
  await t.tap(f);
  await _settle(t);
}

Handover _handover({HandoverStatus status = HandoverStatus.pendingCustomer,
        HandoverType type = HandoverType.pickup}) =>
    Handover((b) => b
      ..id = 'ho-1'
      ..type = type
      ..depotId = 'depot-1'
      ..vehicleId = 'veh-7'
      ..vehicleCode = 'VLT-0007'
      ..operatorId = 'op-1'
      ..batteryPct = 98
      ..status = status
      ..createdAt = DateTime.utc(2026, 10, 22, 13));

void main() {
  final t = AppLocalizationsPt();

  group('cancelar entrega', () {
    testWidgets('motivo obrigatorio, confirmacao e POST com o motivo', (tester) async {
      final h = Harness();
      h.repo.handovers['ho-1'] = _handover();
      await h.pump(tester, const HandoverStatusPage(handoverId: 'ho-1'));
      await _settle(tester);

      await _tap(tester, 'handover-cancel');
      // Sem motivo (ou com menos de 3 letras) nao avanca.
      expect(tester.widget<VoltiButton>(find.byKey(const Key('handover-cancel-continue'))).onPressed,
          isNull);
      await tester.enterText(find.byKey(const Key('handover-cancel-reason')), 'ab');
      await tester.pump();
      expect(find.text('Escreva pelo menos 3 caracteres.'), findsOneWidget);
      expect(tester.widget<VoltiButton>(find.byKey(const Key('handover-cancel-continue'))).onPressed,
          isNull);

      await tester.enterText(
          find.byKey(const Key('handover-cancel-reason')), '  Retrovisor quebrado  ');
      await tester.pump();
      await _tap(tester, 'handover-cancel-continue');
      // Confirmacao: nada foi enviado ainda.
      expect(h.repo.cancelledHandovers, isEmpty);
      expect(find.textContaining('Retrovisor quebrado'), findsOneWidget);
      expect(find.textContaining('VLT-0007'), findsWidgets);

      await _tap(tester, 'handover-cancel-confirm');
      expect(h.repo.cancelledHandovers.single, ('ho-1', 'Retrovisor quebrado'));
      expect(find.text('Entrega cancelada'), findsOneWidget);
      expect(find.byKey(const Key('handover-cancel')), findsNothing);
    });

    testWidgets('voltar na confirmacao nao cancela', (tester) async {
      final h = Harness();
      h.repo.handovers['ho-1'] = _handover();
      await h.pump(tester, const HandoverStatusPage(handoverId: 'ho-1'));
      await _settle(tester);
      await _tap(tester, 'handover-cancel');
      await tester.enterText(find.byKey(const Key('handover-cancel-reason')), 'Moto trocada');
      await tester.pump();
      await _tap(tester, 'handover-cancel-continue');
      await _tap(tester, 'handover-cancel-back');
      expect(h.repo.cancelledHandovers, isEmpty);
      expect(find.byKey(const Key('handover-cancel-reason')), findsOneWidget);
    });

    for (final c in [
      ('disputada pode cancelar', HandoverStatus.disputed, HandoverType.pickup, true),
      ('aceita nao pode cancelar', HandoverStatus.accepted, HandoverType.pickup, false),
      ('ja cancelada nao pode cancelar', HandoverStatus.canceled, HandoverType.pickup, false),
      ('chegada (return_depot) nao pode cancelar', HandoverStatus.pendingCustomer,
          HandoverType.returnDepot, false),
    ]) {
      testWidgets(c.$1, (tester) async {
        final h = Harness();
        h.repo.handovers['ho-1'] = _handover(status: c.$2, type: c.$3);
        await h.pump(tester, const HandoverStatusPage(handoverId: 'ho-1'));
        await _settle(tester);
        expect(find.byKey(const Key('handover-cancel')), c.$4 ? findsOneWidget : findsNothing);
      });
    }

    testWidgets('API recusa (409): mostra o motivo e continua na tela', (tester) async {
      final h = Harness();
      h.repo.handovers['ho-1'] = _handover();
      h.repo.cancelRejectWith = const RepositoryException(
          FailureKind.rejected, 'Entrega já aceita.',
          status: 409, slug: 'handover-already-accepted');
      await h.pump(tester, const HandoverStatusPage(handoverId: 'ho-1'));
      await _settle(tester);
      await _tap(tester, 'handover-cancel');
      await tester.enterText(find.byKey(const Key('handover-cancel-reason')), 'Moto trocada');
      await tester.pump();
      await _tap(tester, 'handover-cancel-continue');
      await _tap(tester, 'handover-cancel-confirm');
      expect(find.text('Entrega já aceita.'), findsOneWidget);
      expect(h.repo.cancelledHandovers, isEmpty);
    });
  });

  group('motos do galpao', () {
    testWidgets('lista codigo, modelo, bateria e status; filtra por status no servidor',
        (tester) async {
      final repo = FakeFieldRepository()
        ..depotVehicles = [
          fakeDepotVehicle('VLT-0001', pct: 91),
          fakeDepotVehicle('VLT-0002', status: VehicleStatus.maintenance, pct: 12),
          fakeDepotVehicle('VLT-0003', status: VehicleStatus.awaitingPickup),
        ];
      final h = Harness(repo: repo);
      await h.pump(tester, const DepotFleetPage());
      await _settle(tester);
      expect(find.text('VLT-0001'), findsOneWidget);
      expect(find.text('VLT-0002'), findsOneWidget);
      expect(find.text('91%'), findsOneWidget);
      expect(
          find.descendant(
              of: find.byKey(const Key('depot-vehicle-VLT-0003')),
              matching: find.text('Para recolher')),
          findsOneWidget);
      expect(find.bySemanticsLabel('VLT-0002, Volti S, Manutenção, bateria 12%'), findsOneWidget);

      await _tap(tester, 'fleet-filter-maintenance');
      expect(repo.depotVehicleQueries.last, ('depot-1', VehicleStatus.maintenance));
      expect(find.text('VLT-0002'), findsOneWidget);
      expect(find.text('VLT-0001'), findsNothing);

      await _tap(tester, 'fleet-filter-all');
      expect(repo.depotVehicleQueries.last, ('depot-1', null));
      expect(find.text('VLT-0001'), findsOneWidget);
    });

    testWidgets('ultimo sinal no fuso do galpao, nao no do aparelho', (tester) async {
      final repo = FakeFieldRepository()
        ..depots = [fakeDepot(timezone: 'America/Manaus')]
        ..depotVehicles = [
          fakeDepotVehicle('VLT-0001', lastSeenAt: DateTime.utc(2026, 10, 24, 15, 30)),
          fakeDepotVehicle('VLT-0002'),
        ];
      final h = Harness(repo: repo);
      await h.pump(tester, const DepotFleetPage());
      await _settle(tester);
      // Manaus = UTC-4.
      expect(find.text('Último sinal 11:30'), findsOneWidget);
      expect(find.text('Sem sinal registrado'), findsOneWidget);
    });

    testWidgets('com varios galpoes pede para escolher', (tester) async {
      final repo = FakeFieldRepository()
        ..depots = [fakeDepot(), fakeDepot(id: 'depot-2', name: 'Galpão Lapa')]
        ..depotVehicles = [fakeDepotVehicle('VLT-0001')];
      final h = Harness(repo: repo);
      await h.pump(tester, const DepotFleetPage());
      await _settle(tester);
      expect(find.text('Escolha o galpão'), findsOneWidget);
      await _tap(tester, 'depot-pick-depot-2');
      expect(repo.depotVehicleQueries.last.$1, 'depot-2');
      expect(find.text('VLT-0001'), findsOneWidget);
    });

    testWidgets('sem rede: erro com tentar de novo; 200% sem estouro', (tester) async {
      final repo = FakeFieldRepository()
        ..depotVehicles = [fakeDepotVehicle('VLT-0001-LONGO-1234567890')];
      final h = Harness(repo: repo);
      await h.pump(tester, const DepotFleetPage(), textScale: 2, surface: const Size(360, 740));
      await _settle(tester);
      repo.online = false;
      // Outro filtro = outra consulta, que falha sem rede.
      await _tap(tester, 'fleet-filter-free');
      expect(find.text('Não foi possível carregar as motos.'), findsOneWidget);
      repo.online = true;
      await tester.ensureVisible(find.text('Tentar de novo'));
      await tester.tap(find.text('Tentar de novo'));
      await _settle(tester);
      expect(find.text('VLT-0001-LONGO-1234567890'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    test('status desconhecido nao quebra', () {
      expect(vehicleStatusBadge(t, VehicleStatus.unknownDefaultOpenApi).$1, 'Outro status');
      expect(vehicleStatusBadge(t, VehicleStatus.awaitingPickup).$1, 'Para recolher');
      expect(batteryStatusLabel(t, BatteryStatus.unknownDefaultOpenApi), 'Outro status');
      expect(batteryStatusLabel(t, BatteryStatus.charging), 'Carregando');
    });
  });

  group('descarregar a van numa estacao', () {
    testWidgets('escolhe a estacao e envia stationId', (tester) async {
      final repo = FakeFieldRepository()
        ..van = fakeVan([fakeBattery('BT-2', pct: 40)])
        ..stations = [fakeStation('st-1', 'Largo da Batata'), fakeStation('st-2', 'Faria Lima')];
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage());
      await _settle(tester);
      await _tap(tester, 'van-unload-BT-2');
      expect(find.text('Carregar no galpão'), findsOneWidget);
      expect(find.text('Galpão Pinheiros'), findsOneWidget);
      expect(find.text('Largo da Batata'), findsOneWidget);
      await _tap(tester, 'unload-station-st-2');
      expect(repo.unloads.single, ['BT-2']);
      expect(repo.unloadStationIds.single, 'st-2');
      expect(find.text('BT-2'), findsNothing);
    });

    testWidgets('galpao nao envia stationId', (tester) async {
      final repo = FakeFieldRepository()
        ..van = fakeVan([fakeBattery('BT-2', pct: 40)])
        ..stations = [fakeStation('st-1', 'Largo da Batata')];
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage());
      await _settle(tester);
      await _tap(tester, 'van-unload-BT-2');
      await _tap(tester, 'unload-depot-depot-1');
      expect(repo.unloadStationIds.single, isNull);
    });

    testWidgets('falha ao carregar estacoes: aviso, e o galpao ainda funciona', (tester) async {
      final repo = FakeFieldRepository()
        ..van = fakeVan([fakeBattery('BT-2', pct: 40)])
        ..stationsFail = true;
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage());
      await _settle(tester);
      await _tap(tester, 'van-unload-BT-2');
      expect(find.byKey(const Key('unload-stations-error')), findsOneWidget);
      await _tap(tester, 'unload-depot-depot-1');
      expect(repo.unloads.single, ['BT-2']);
    });

    testWidgets('fechar a folha nao descarrega', (tester) async {
      final repo = FakeFieldRepository()..van = fakeVan([fakeBattery('BT-2', pct: 40)]);
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage());
      await _settle(tester);
      await _tap(tester, 'van-unload-BT-2');
      await tester.tapAt(const Offset(10, 10));
      await _settle(tester);
      expect(repo.unloads, isEmpty);
    });
  });

  group('estoque de baterias', () {
    List<Battery> sample() => [
          fakeBattery('BT-1', pct: 100, cycles: 3, status: BatteryStatus.charging),
          fakeBattery('BT-2', pct: 55, cycles: 80, status: BatteryStatus.charging),
          fakeBattery('BT-3', pct: 95, cycles: 12, status: BatteryStatus.inStation),
          fakeBattery('BT-4', pct: 20, cycles: 400, status: BatteryStatus.inVan),
        ];

    testWidgets('conta por status e lista serie, carga e ciclos', (tester) async {
      final repo = FakeFieldRepository()..batteries = sample();
      final h = Harness(repo: repo);
      await h.pump(tester, const BatteryStockPage());
      await _settle(tester);
      expect(find.bySemanticsLabel('Carregando: 2'), findsOneWidget);
      expect(find.bySemanticsLabel('Na estação: 1'), findsOneWidget);
      expect(find.bySemanticsLabel('Na van: 1'), findsOneWidget);
      expect(find.bySemanticsLabel('Na moto: 0'), findsOneWidget);
      expect(find.text('BT-2'), findsOneWidget);
      expect(find.textContaining('80 ciclos'), findsOneWidget);
      expect(find.text('55%'), findsOneWidget);

      await _tap(tester, 'stock-count-inStation');
      expect(find.text('BT-3'), findsOneWidget);
      expect(find.text('BT-1'), findsNothing);
      // Tocar de novo limpa o filtro.
      await _tap(tester, 'stock-count-inStation');
      expect(find.text('BT-1'), findsOneWidget);
    });

    testWidgets('status que o app nao conhece aparece como "Outro status"', (tester) async {
      final repo = FakeFieldRepository()
        ..batteries = [
          fakeBattery('BT-9', status: BatteryStatus.unknownDefaultOpenApi),
          fakeBattery('BT-1', status: BatteryStatus.charging),
        ];
      final h = Harness(repo: repo);
      await h.pump(tester, const BatteryStockPage());
      await _settle(tester);
      expect(find.bySemanticsLabel('Outro status: 1'), findsOneWidget);
      expect(find.text('BT-9'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('sem rede: erro com tentar de novo; 200% sem estouro', (tester) async {
      final repo = FakeFieldRepository()
        ..online = false
        ..batteries = sample();
      final h = Harness(repo: repo);
      await h.pump(tester, const BatteryStockPage(), textScale: 2, surface: const Size(360, 740));
      await _settle(tester);
      expect(find.text('Não foi possível carregar as baterias.'), findsOneWidget);
      repo.online = true;
      await tester.tap(find.text('Tentar de novo'));
      await _settle(tester);
      await tester.scrollUntilVisible(find.text('BT-1'), 200);
      expect(find.text('BT-1'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
