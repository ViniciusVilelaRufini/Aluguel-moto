import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/features/fleet/battery_stock_page.dart';
import 'package:volti_operador/features/fleet/fleet_labels.dart';
import 'package:volti_operador/features/fleet/van_stock_page.dart';
import 'package:volti_operador/l10n/app_localizations_pt.dart';

import 'helpers.dart';

/// Ciclo de vida das baterias no operador: contagem real por galpao e status,
/// marcar carregada, apontar defeito (motivo), historico e descarga com `depotId`.

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 50));
  }
}

Future<void> _tap(WidgetTester t, String key) async {
  final f = find.byKey(Key(key));
  // A lista e lazy: a 200% o item pode estar abaixo da area construida.
  if (f.evaluate().isEmpty) await t.scrollUntilVisible(f, 200);
  // Rola a lista da tela (nao a da folha) ate o botao entrar na area visivel.
  for (var i = 0; i < 10 && f.hitTestable().evaluate().isEmpty; i++) {
    await t.drag(find.byType(Scrollable).first, const Offset(0, -200));
    await t.pump(const Duration(milliseconds: 50));
  }
  await t.tap(f);
  await _settle(t);
}

BatteryMovement _movement(
  String id,
  BatteryStatus? from,
  BatteryStatus to, {
  String? reason,
  String? depotId = 'depot-1',
  DateTime? at,
}) => BatteryMovement(
  (b) => b
    ..id = id
    ..batteryId = 'bat-BT-1'
    ..fromStatus = from
    ..toStatus = to
    ..depotId = depotId
    ..actorId = 'op-1'
    ..reason = reason
    ..at = at ?? DateTime.utc(2026, 10, 22, 13, 30),
);

void main() {
  final t = AppLocalizationsPt();

  group('regras e rotulos', () {
    test('marcar carregada so para carregando', () {
      expect(canMarkCharged(BatteryStatus.charging), isTrue);
      expect(canMarkCharged(BatteryStatus.charged), isFalse);
      expect(canMarkCharged(BatteryStatus.inVehicle), isFalse);
    });
    test('defeito nao vale para moto, defeituosa nem baixada', () {
      for (final s in [
        BatteryStatus.charging,
        BatteryStatus.charged,
        BatteryStatus.inVan,
        BatteryStatus.inStation,
      ]) {
        expect(canReportDefect(s), isTrue, reason: s.name);
      }
      for (final s in [
        BatteryStatus.inVehicle,
        BatteryStatus.defective,
        BatteryStatus.retired,
      ]) {
        expect(canReportDefect(s), isFalse, reason: s.name);
      }
    });
    test('motivo de 3 a 500 caracteres, sem contar espacos nas pontas', () {
      expect(validDefectReason('  ab  '), isFalse);
      expect(validDefectReason(' abc '), isTrue);
      expect(validDefectReason('x' * 500), isTrue);
      expect(validDefectReason('x' * 501), isFalse);
    });
    test('rotulos dos status novos', () {
      expect(batteryStatusLabel(t, BatteryStatus.charged), 'Carregada');
      expect(batteryStatusLabel(t, BatteryStatus.defective), 'Com defeito');
      expect(batteryStatusLabel(t, BatteryStatus.charging), 'Carregando');
    });
  });

  group('estoque por galpao e status', () {
    List<Battery> sample() => [
      fakeBattery(
        'BT-1',
        status: BatteryStatus.charging,
        depotId: 'depot-1',
        pct: 40,
      ),
      fakeBattery('BT-2', status: BatteryStatus.charged, depotId: 'depot-1'),
      fakeBattery('BT-3', status: BatteryStatus.charged, depotId: 'depot-2'),
      fakeBattery(
        'BT-4',
        status: BatteryStatus.defective,
        depotId: 'depot-2',
        pct: 10,
      ),
      fakeBattery('BT-5', status: BatteryStatus.inVan),
    ];

    testWidgets('contagem real do servidor (statusCounts), nao a da lista', (
      tester,
    ) async {
      final repo = FakeFieldRepository()
        ..batteries = sample()
        ..countsOverride = BatteryStatusCounts(
          (c) => c
            ..inVehicle = 2
            ..inVan = 1
            ..charging = 1
            ..charged = 30
            ..inStation = 0
            ..defective = 1
            ..retired = 0,
        );
      final h = Harness(repo: repo);
      await h.pump(tester, const BatteryStockPage());
      await _settle(tester);
      expect(find.bySemanticsLabel('Carregada: 30'), findsOneWidget);
      expect(find.bySemanticsLabel('Carregando: 1'), findsOneWidget);
      expect(find.bySemanticsLabel('Com defeito: 1'), findsOneWidget);
      expect(find.bySemanticsLabel('Na moto: 2'), findsOneWidget);
    });

    testWidgets('filtro por galpao consulta depotId e conta so o galpao', (
      tester,
    ) async {
      final repo = FakeFieldRepository()
        ..depots = [fakeDepot(), fakeDepot(id: 'depot-2', name: 'Galpão Mooca')]
        ..batteries = sample();
      final h = Harness(repo: repo);
      await h.pump(tester, const BatteryStockPage());
      await _settle(tester);
      expect(find.bySemanticsLabel('Carregada: 2'), findsOneWidget);
      expect(find.text('BT-5'), findsOneWidget);

      await _tap(tester, 'stock-depot-depot-2');
      expect(repo.batteryDepotQueries.last, 'depot-2');
      expect(repo.batteryCountQueries.last, 'depot-2');
      expect(find.bySemanticsLabel('Carregada: 1'), findsOneWidget);
      expect(find.bySemanticsLabel('Com defeito: 1'), findsOneWidget);
      expect(find.text('BT-4'), findsOneWidget);
      expect(find.text('BT-5'), findsNothing);
      expect(find.text('BT-1'), findsNothing);
    });

    testWidgets('com um galpao so, nao mostra o filtro', (tester) async {
      final repo = FakeFieldRepository()..batteries = sample();
      final h = Harness(repo: repo);
      await h.pump(tester, const BatteryStockPage());
      await _settle(tester);
      expect(find.byKey(const Key('stock-depot-all')), findsNothing);
    });
  });

  group('marcar carregada e apontar defeito', () {
    testWidgets(
      'so carregando tem "Marcar carregada"; envia e atualiza a contagem',
      (tester) async {
        final repo = FakeFieldRepository()
          ..batteries = [
            fakeBattery(
              'BT-1',
              status: BatteryStatus.charging,
              depotId: 'depot-1',
              pct: 40,
            ),
            fakeBattery(
              'BT-2',
              status: BatteryStatus.charged,
              depotId: 'depot-1',
            ),
            fakeBattery('BT-3', status: BatteryStatus.inVehicle),
          ];
        final h = Harness(repo: repo);
        await h.pump(tester, const BatteryStockPage());
        await _settle(tester);
        expect(find.byKey(const Key('stock-charged-BT-2')), findsNothing);
        expect(find.byKey(const Key('stock-charged-BT-3')), findsNothing);
        expect(find.byKey(const Key('stock-defect-BT-3')), findsNothing);
        expect(find.bySemanticsLabel('Carregando: 1'), findsOneWidget);

        await _tap(tester, 'stock-charged-BT-1');
        expect(repo.markedCharged, ['bat-BT-1']);
        expect(
          find.text('Bateria BT-1 marcada como carregada.'),
          findsOneWidget,
        );
        expect(find.bySemanticsLabel('Carregada: 2'), findsOneWidget);
        expect(find.bySemanticsLabel('Carregando: 0'), findsOneWidget);
      },
    );

    testWidgets('rejeicao da API aparece no aviso', (tester) async {
      final repo = FakeFieldRepository()
        ..batteries = [
          fakeBattery(
            'BT-1',
            status: BatteryStatus.charging,
            depotId: 'depot-1',
          ),
        ]
        ..lifecycleRejectWith = const RepositoryException(
          FailureKind.rejected,
          'Bateria já carregada',
          status: 409,
        );
      final h = Harness(repo: repo);
      await h.pump(tester, const BatteryStockPage());
      await _settle(tester);
      await _tap(tester, 'stock-charged-BT-1');
      expect(find.text('Bateria já carregada'), findsOneWidget);
      expect(repo.markedCharged, isEmpty);
    });

    testWidgets(
      'defeito exige motivo de 3+ caracteres e envia sem espacos nas pontas',
      (tester) async {
        final repo = FakeFieldRepository()
          ..batteries = [
            fakeBattery(
              'BT-2',
              status: BatteryStatus.charged,
              depotId: 'depot-1',
            ),
          ];
        final h = Harness(repo: repo);
        await h.pump(tester, const BatteryStockPage());
        await _settle(tester);
        await _tap(tester, 'stock-defect-BT-2');
        expect(find.text('Defeito na bateria BT-2'), findsOneWidget);

        final confirm = find.byKey(const Key('defect-confirm'));
        await tester.tap(confirm);
        await _settle(tester);
        expect(repo.defects, isEmpty);

        await tester.enterText(find.byKey(const Key('defect-reason')), 'ab');
        await _settle(tester);
        expect(find.text('Escreva entre 3 e 500 caracteres.'), findsOneWidget);
        await tester.tap(confirm);
        await _settle(tester);
        expect(repo.defects, isEmpty);

        await tester.enterText(
          find.byKey(const Key('defect-reason')),
          '  Carcaça trincada ',
        );
        await _settle(tester);
        await _tap(tester, 'defect-confirm');
        expect(repo.defects, [('bat-BT-2', 'Carcaça trincada')]);
        expect(
          find.text('Defeito registrado na bateria BT-2.'),
          findsOneWidget,
        );
        expect(find.bySemanticsLabel('Com defeito: 1'), findsOneWidget);
        // Com defeito: sem as acoes de marcar carregada e apontar defeito.
        expect(find.byKey(const Key('stock-defect-BT-2')), findsNothing);
      },
    );

    testWidgets('sem rede nas acoes: aviso, sem estourar a tela a 200%', (
      tester,
    ) async {
      final repo = FakeFieldRepository()
        ..batteries = [
          fakeBattery(
            'BT-1',
            status: BatteryStatus.charging,
            depotId: 'depot-1',
          ),
        ];
      final h = Harness(repo: repo);
      await h.pump(
        tester,
        const BatteryStockPage(),
        textScale: 2,
        surface: const Size(360, 740),
      );
      await _settle(tester);
      repo.online = false;
      await _tap(tester, 'stock-charged-BT-1');
      expect(repo.markedCharged, isEmpty);
      expect(tester.takeException(), isNull);
    });
  });

  group('historico de movimentacoes', () {
    testWidgets('mais recente primeiro, paginado, no fuso do galpao', (
      tester,
    ) async {
      final repo = FakeFieldRepository()
        ..depots = [fakeDepot(timezone: 'America/Manaus')]
        ..batteries = [
          fakeBattery(
            'BT-1',
            status: BatteryStatus.charged,
            depotId: 'depot-1',
          ),
        ]
        ..movements = [
          _movement('m3', BatteryStatus.charging, BatteryStatus.charged),
          _movement(
            'm2',
            BatteryStatus.inVan,
            BatteryStatus.charging,
            at: DateTime.utc(2026, 10, 21, 9),
          ),
          _movement(
            'm1',
            null,
            BatteryStatus.inVan,
            reason: 'Carga inicial',
            depotId: null,
            at: DateTime.utc(2026, 10, 20, 12),
          ),
        ];
      final h = Harness(repo: repo);
      await h.pump(tester, const BatteryStockPage());
      await _settle(tester);
      await _tap(tester, 'stock-history-BT-1');
      expect(find.text('Movimentações de BT-1'), findsOneWidget);
      expect(find.text('Carregando → Carregada'), findsOneWidget);
      // 13:30 UTC = 09:30 em Manaus (UTC-4).
      expect(find.text('22/10 09:30'), findsOneWidget);
      expect(find.byKey(const Key('movement-m1')), findsNothing);

      await _tap(tester, 'history-more');
      expect(repo.movementCursors, [null, '2']);
      expect(find.text('Cadastrada · Na van'), findsOneWidget);
      // Sem galpao na movimentacao: fuso de Sao Paulo (UTC-3).
      expect(find.text('20/10 09:00'), findsOneWidget);
      expect(find.text('Carga inicial'), findsOneWidget);
      expect(find.byKey(const Key('history-more')), findsNothing);
    });

    testWidgets('sem movimentacoes e sem rede', (tester) async {
      final repo = FakeFieldRepository()
        ..batteries = [
          fakeBattery(
            'BT-1',
            status: BatteryStatus.charged,
            depotId: 'depot-1',
          ),
        ];
      final h = Harness(repo: repo);
      await h.pump(tester, const BatteryStockPage());
      await _settle(tester);
      await _tap(tester, 'stock-history-BT-1');
      expect(find.byKey(const Key('history-empty')), findsOneWidget);
    });
  });

  group('200% e leitor de tela', () {
    testWidgets(
      'folhas de defeito e historico sem estouro; botoes com serie no rotulo',
      (tester) async {
        final repo = FakeFieldRepository()
          ..batteries = [
            fakeBattery(
              'BT-1',
              status: BatteryStatus.charging,
              depotId: 'depot-1',
            ),
          ]
          ..movements = [
            _movement(
              'm2',
              BatteryStatus.charging,
              BatteryStatus.charged,
              reason: 'Motivo bem longo para quebrar linha a 200 por cento',
            ),
            _movement('m1', null, BatteryStatus.charging),
          ];
        final h = Harness(repo: repo);
        await h.pump(
          tester,
          const BatteryStockPage(),
          textScale: 2,
          surface: const Size(360, 740),
        );
        await _settle(tester);
        await tester.scrollUntilVisible(
          find.byKey(const Key('stock-history-BT-1')),
          200,
        );
        String label(String key) =>
            tester.widget<VoltiButton>(find.byKey(Key(key))).semanticLabel!;
        expect(label('stock-charged-BT-1'), 'Marcar a bateria BT-1 como carregada');
        expect(label('stock-defect-BT-1'), 'Apontar defeito na bateria BT-1');
        expect(
          label('stock-history-BT-1'),
          'Histórico de movimentações da bateria BT-1',
        );
        await _tap(tester, 'stock-history-BT-1');
        await _settle(tester);
        await _settle(tester);
        expect(find.text('Movimentações de BT-1'), findsOneWidget);
        expect(find.byKey(const Key('movement-m2')), findsOneWidget);
        expect(tester.takeException(), isNull);
        Navigator.of(tester.element(find.byKey(const Key('movement-m2')))).pop();
        await _settle(tester);

        await _tap(tester, 'stock-defect-BT-1');
        expect(find.byKey(const Key('defect-reason')), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  });

  group('descarregar a van no galpao', () {
    testWidgets('envia o depotId do galpao escolhido', (tester) async {
      final repo = FakeFieldRepository()
        ..depots = [fakeDepot(), fakeDepot(id: 'depot-2', name: 'Galpão Mooca')]
        ..van = fakeVan([fakeBattery('BT-2', pct: 40)])
        ..stations = [fakeStation('st-1', 'Largo da Batata')];
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage());
      await _settle(tester);
      await _tap(tester, 'van-unload-BT-2');
      expect(find.text('Galpão Pinheiros'), findsOneWidget);
      expect(find.text('Galpão Mooca'), findsOneWidget);
      await _tap(tester, 'unload-depot-depot-2');
      expect(repo.unloads.single, ['BT-2']);
      expect(repo.unloadDepotIds.single, 'depot-2');
      expect(repo.unloadStationIds.single, isNull);
      expect(
        find.text('Bateria descarregada no galpão Galpão Mooca.'),
        findsOneWidget,
      );
    });

    testWidgets('estacao nao envia depotId', (tester) async {
      final repo = FakeFieldRepository()
        ..van = fakeVan([fakeBattery('BT-2', pct: 40)])
        ..stations = [fakeStation('st-1', 'Largo da Batata')];
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage());
      await _settle(tester);
      await _tap(tester, 'van-unload-BT-2');
      await _tap(tester, 'unload-station-st-1');
      expect(repo.unloadStationIds.single, 'st-1');
      expect(repo.unloadDepotIds.single, isNull);
    });
  });
}
