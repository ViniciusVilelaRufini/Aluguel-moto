import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/fleet.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/service_unlock.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/features/battery/battery_swap_page.dart';
import 'package:volti_operador/features/fleet/fleet_service_page.dart';
import 'package:volti_operador/features/fleet/van_stock_page.dart';
import 'package:volti_operador/features/tasks/task_detail_page.dart';
import 'package:volti_operador/features/tasks/task_list_page.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';

import 'helpers.dart';

class _Repo extends FakeFieldRepository {
  _Repo(this.tasks);
  final List<FieldTask> tasks;

  @override
  Future<List<FieldTask>> listTasks() async => tasks;
}

Future<void> _settle(WidgetTester t) async {
  for (var i = 0; i < 4; i++) {
    await t.pump(const Duration(milliseconds: 20));
  }
}

/// O texto cabe sem reticencias.
void _notCut(WidgetTester t, Finder f) {
  final p = t.renderObject<RenderParagraph>(f);
  expect(p.didExceedMaxLines, isFalse, reason: 'texto cortado: ${p.text.toPlainText()}');
}

/// Toque pela acao de semantica (como o leitor de tela), achando o no pelo rotulo.
Future<void> _semanticsTap(WidgetTester t, String label) async {
  t.semantics.tap(find.semantics.byLabel(label));
  await t.pump();
}

FieldTask _swapTask() => fakeTask(
      type: FieldTaskType.batterySwap,
      vehicleAddress: 'Avenida Brigadeiro Faria Lima, 3477 - Itaim Bibi',
      vehicleStatus: VehicleStatus.maintenance,
      batterySerial: 'BT-190577',
      batteryCycles: 412,
      maintenanceTaskId: 'maint-1',
    );

_Repo _fullRepo() => _Repo([_swapTask()])
  ..van = fakeVan([
    fakeBattery('BT-208431', pct: 98, cycles: 37),
    fakeBattery('BT-300100', pct: 100, cycles: 1234),
    fakeBattery('BT-2', pct: 40, cycles: 120),
  ])
  ..models = [fakeModel(category: 'Urbana de longo alcance')]
  ..vehicles['veh-1'] = fakeVehicle(
      modelId: 'model-1',
      service: fakeService(kmSince: 1120, status: VehicleServiceStatus.overdue))
  ..maintenance['maint-1'] =
      fakeMaintenance(source: MaintenanceSource.customer, customerName: 'Maria Silva')
  ..serviceRows = [
    fakeServiceRow('VT-0001',
        model: 'Volti Cargo Longo Alcance',
        service: fakeService(kmSince: 1120, status: VehicleServiceStatus.overdue),
        scheduledFor: DateTime.utc(2026, 10, 24, 12)),
  ];

void main() {
  group('texto a 200% em 360x740', () {
    testWidgets('lista e header: "Baterias na van" inteiro', (tester) async {
      final h = Harness(repo: _fullRepo());
      await h.pump(tester, TaskListPage(onOpen: (_) {}), textScale: 2, surface: phone);
      await _settle(tester);
      expect(tester.takeException(), isNull);
      _notCut(tester, find.text('Baterias na van'));
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -600));
      await _settle(tester);
      expect(tester.takeException(), isNull);
    });

    testWidgets('detalhe com cartoes da moto, manutencao e bateria', (tester) async {
      final h = Harness(repo: _fullRepo());
      await h.pump(tester, const TaskDetailPage(taskId: 'task-1'),
          textScale: 2, surface: phone);
      await _settle(tester);
      expect(tester.takeException(), isNull);
      final sheet = find.descendant(
          of: find.byKey(const Key('detail-sheet')), matching: find.byType(Scrollable));
      for (final k in ['maintenance-card', 'battery-card', 'vehicle-card']) {
        await tester.scrollUntilVisible(find.byKey(Key(k)), 150, scrollable: sheet.first);
        await tester.pump();
        expect(tester.takeException(), isNull, reason: k);
      }
    });

    testWidgets('van: lista e botao "Descarregar" cabem', (tester) async {
      final h = Harness(repo: _fullRepo());
      await h.pump(tester, const VanStockPage(), textScale: 2, surface: phone);
      await _settle(tester);
      expect(tester.takeException(), isNull);
      final btn = find.descendant(
          of: find.byKey(const Key('van-unload-BT-2')), matching: find.byType(RichText));
      await tester.scrollUntilVisible(find.byKey(const Key('van-unload-BT-2')), 150,
          scrollable: find.byType(Scrollable).first);
      await tester.pump();
      _notCut(tester, btn.first);
      expect(tester.takeException(), isNull);
    });

    testWidgets('folha de carregar na van com series', (tester) async {
      final h = Harness(repo: _fullRepo());
      await h.pump(tester, const VanStockPage(), textScale: 2, surface: phone);
      await _settle(tester);
      await tester.tap(find.byKey(const Key('van-load')));
      await tester.pumpAndSettle();
      for (final s in ['BT-1234567890123456', 'BT-555']) {
        await tester.enterText(find.byKey(const Key('van-load-serial')), s);
        await tester.pump();
        await tester.ensureVisible(find.byKey(const Key('van-load-add')));
        await tester.tap(find.byKey(const Key('van-load-add')));
        await tester.pump();
      }
      expect(tester.takeException(), isNull);
      expect(find.byKey(const Key('van-load-item-BT-555')), findsOneWidget);
    });

    testWidgets('revisoes da frota', (tester) async {
      final h = Harness(repo: _fullRepo());
      await h.pump(tester, const FleetServicePage(), textScale: 2, surface: phone);
      await _settle(tester);
      expect(tester.takeException(), isNull);
    });

    testWidgets('troca com sugestoes da van e "Retirada:"', (tester) async {
      final h = Harness(repo: _fullRepo());
      await h.pump(tester, const BatterySwapPage(taskId: 'task-1'),
          textScale: 2, surface: phone);
      await _settle(tester);
      expect(find.byKey(const Key('van-pick-BT-300100')), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('van-pick-BT-300100')));
      await tester.pump();
      expect(tester.takeException(), isNull);
      await tester.scrollUntilVisible(
          find.text('Retirada: BT-190577 · 12% · 412 ciclos'), 100,
          scrollable: find.byType(Scrollable).first);
      await tester.pump();
      expect(tester.takeException(), isNull);
    });
  });

  group('semantica', () {
    testWidgets('stat da van: um no com rotulo e acao de toque', (tester) async {
      final h = Harness(repo: _fullRepo());
      await h.pump(tester, TaskListPage(onOpen: (_) {}));
      await _settle(tester);
      expect(find.bySemanticsLabel('Baterias na van: 2'), findsOneWidget);
      expect(tester.getSemantics(find.byKey(const Key('stat-van'))),
          isSemantics(label: 'Baterias na van: 2', isButton: true, hasTapAction: true));
    });

    testWidgets('sugestao da van tem acao de toque e preenche a instalada', (tester) async {
      final h = Harness(repo: _fullRepo());
      await h.pump(tester, const BatterySwapPage(taskId: 'task-1'));
      await _settle(tester);
      final pick = find.byKey(const Key('van-pick-BT-208431'));
      expect(tester.getSemantics(pick),
          isSemantics(label: 'Usar a bateria BT-208431', hasTapAction: true));
      await _semanticsTap(tester, 'Usar a bateria BT-208431');
      final installed = tester.widget<TextField>(find.byKey(const Key('installed-serial')));
      expect(installed.controller!.text, 'BT-208431');
    });

    testWidgets('"Descarregar" tem rotulo com a serie e acao de toque', (tester) async {
      final repo = FakeFieldRepository()..van = fakeVan([fakeBattery('BT-2', pct: 40)]);
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage());
      await _settle(tester);
      final btn = find.byKey(const Key('van-unload-BT-2'));
      expect(tester.getSemantics(btn),
          isSemantics(label: 'Descarregar BT-2', hasTapAction: true));
      await _semanticsTap(tester, 'Descarregar BT-2');
      await _settle(tester);
      // Abre a folha de destino; o galpao descarrega para recarga.
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('unload-warehouse')));
      await tester.pumpAndSettle();
      expect(repo.unloads.single, ['BT-2']);
    });
  });

  test('data e hora no fuso de Sao Paulo (UTC-3), nao no do aparelho', () {
    expect(formatDayTime(DateTime.utc(2026, 10, 23, 13)), '23/10 10:00');
    expect(formatDayTime(DateTime.utc(2026, 1, 1, 2, 5)), '31/12 23:05');
  });

  test('modo servico: compativel livre/manutencao/bloqueada/offline; nao alugada/reservada/pausada',
      () {
    for (final s in [
      null,
      VehicleStatus.free,
      VehicleStatus.maintenance,
      VehicleStatus.blocked,
      VehicleStatus.offline,
    ]) {
      expect(serviceUnlockCompatible(s), isTrue, reason: '$s');
    }
    for (final s in [VehicleStatus.rented, VehicleStatus.reserved, VehicleStatus.paused]) {
      expect(serviceUnlockCompatible(s), isFalse, reason: '$s');
    }
  });

  testWidgets('lista nova mantem o modo servico com a moto bloqueada', (tester) async {
    final h = Harness(repo: _Repo([fakeTask(vehicleStatus: VehicleStatus.blocked)]));
    await h.pump(tester, TaskListPage(onOpen: (_) {}), extraOverrides: [
      serviceUnlockStoreProvider.overrideWithValue(MemoryServiceUnlockStore(['task-1'])),
    ]);
    await _settle(tester);
    final c = ProviderScope.containerOf(tester.element(find.byType(TaskListPage)));
    expect(c.read(serviceUnlockProvider.notifier).isUnlocked('task-1'), isTrue);
  });

  test('catalogo de modelos e relido depois de sair da tela (URL da foto assinada)', () async {
    final repo = FakeFieldRepository()..models = [fakeModel()];
    final c = ProviderContainer(overrides: [fieldRepositoryProvider.overrideWithValue(repo)]);
    addTearDown(c.dispose);
    final sub = c.listen(vehicleModelsProvider, (_, _) {});
    await c.read(vehicleModelsProvider.future);
    sub.close();
    await Future<void>.delayed(Duration.zero);
    final sub2 = c.listen(vehicleModelsProvider, (_, _) {});
    await c.read(vehicleModelsProvider.future);
    sub2.close();
    expect(repo.modelReads, 2);
  });

  testWidgets('bateria ja usada numa troca na fila some das sugestoes', (tester) async {
    final repo = _fullRepo();
    final h = Harness(repo: repo);
    await h.pump(tester, const BatterySwapPage(taskId: 'task-1'));
    await _settle(tester);
    expect(find.byKey(const Key('van-pick-BT-208431')), findsOneWidget);
    repo.online = false;
    final c = ProviderScope.containerOf(tester.element(find.byType(BatterySwapPage)));
    await c.read(syncControllerProvider.notifier).submitBatterySwap(
        'task-2', const BatterySwapDraft(removedSerial: 'BT-1', installedSerial: 'bt-208431'));
    await _settle(tester);
    expect(find.byKey(const Key('van-pick-BT-208431')), findsNothing);
    expect(find.byKey(const Key('van-pick-BT-300100')), findsOneWidget);
  });
}
