import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_operador/data/service_unlock.dart';
import 'package:volti_operador/features/battery/battery_swap_page.dart';
import 'package:volti_operador/features/fleet/fleet_service_page.dart';
import 'package:volti_operador/features/fleet/van_stock_page.dart';
import 'package:volti_operador/features/tasks/task_detail_page.dart';
import 'package:volti_operador/features/tasks/task_list_page.dart';
import 'package:volti_operador/features/tasks/task_ui.dart';
import 'package:volti_operador/l10n/app_localizations_pt.dart';

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

Future<void> _tap(WidgetTester t, Finder f) async {
  await t.ensureVisible(f);
  await t.tap(f);
  await t.pump();
}

final _t = AppLocalizationsPt();

void main() {
  group('formatacao v2', () {
    test('km com separador de milhar, preco por minuto e linha da bateria retirada', () {
      expect(formatKm(812.4), '812 km');
      expect(formatKm(1000), '1.000 km');
      expect(formatKm(12345.6), '12.346 km');
      expect(formatCentsPerMinute(59), r'R$ 0,59/min');
      expect(formatCentsPerMinute(1250), r'R$ 12,50/min');
      final task = fakeTask(batterySerial: 'BT-190577', batteryCycles: 412);
      expect(removedBatteryLine(_t, task), 'Retirada: BT-190577 · 12% · 412 ciclos');
      expect(removedBatteryLine(_t, fakeTask()), isNull);
      expect(removedBatteryLine(_t, fakeTask(batterySerial: 'BT-1', batteryCycles: 1)),
          'Retirada: BT-1 · 12% · 1 ciclo');
    });

    test('primeiro nome do cliente (nunca o sobrenome)', () {
      expect(firstName('Maria Silva'), 'Maria');
      expect(firstName('  Ana  '), 'Ana');
      expect(firstName(''), isNull);
      expect(firstName(null), isNull);
    });

    test('subtitulo do cartao: endereco, destino do reposicionamento ou observacoes', () {
      expect(taskSubtitle(_t, fakeTask(vehicleAddress: 'R. Augusta, 1020', notes: 'x')),
          'R. Augusta, 1020');
      expect(
          taskSubtitle(
              _t,
              fakeTask(
                  type: FieldTaskType.reposition,
                  vehicleAddress: 'R. Augusta, 1020',
                  targetAddress: 'Pç. Oswaldo Cruz')),
          'Para: Pç. Oswaldo Cruz');
      expect(taskSubtitle(_t, fakeTask(notes: 'Freio reportado')), 'Freio reportado');
      expect(taskSubtitle(_t, fakeTask()), isNull);
    });
  });

  group('lista', () {
    testWidgets('cartao mostra o endereco e o header mostra as baterias carregadas da van',
        (tester) async {
      final repo = _Repo([fakeTask(vehicleAddress: 'R. Augusta, 1020', notes: 'obs')])
        ..van = fakeVan([
          fakeBattery('BT-1', pct: 100),
          fakeBattery('BT-2', pct: 95),
          fakeBattery('BT-3', pct: 30),
        ]);
      final h = Harness(repo: repo);
      await h.pump(tester, TaskListPage(onOpen: (_) {}));
      await _settle(tester);
      expect(find.text('R. Augusta, 1020'), findsOneWidget);
      expect(find.text('Baterias na van'), findsOneWidget);
      expect(find.bySemanticsLabel('Baterias na van: 2'), findsOneWidget);
    });

    testWidgets('sem rede o stat da van fica indisponivel', (tester) async {
      final repo = _Repo([fakeTask()])..van = null;
      final h = Harness(repo: repo);
      await h.pump(tester, TaskListPage(onOpen: (_) {}));
      await _settle(tester);
      expect(find.bySemanticsLabel('Baterias na van: indisponível'), findsOneWidget);
    });

    testWidgets('lista nova solta o modo servico quando a moto ja esta alugada', (tester) async {
      final repo = _Repo([fakeTask(vehicleStatus: VehicleStatus.rented)]);
      final h = Harness(repo: repo);
      await h.pump(tester, TaskListPage(onOpen: (_) {}), extraOverrides: [
        serviceUnlockStoreProvider.overrideWithValue(MemoryServiceUnlockStore(['task-1'])),
      ]);
      await _settle(tester);
      final c = ProviderScope.containerOf(tester.element(find.byType(TaskListPage)));
      expect(c.read(serviceUnlockProvider.notifier).isUnlocked('task-1'), isFalse);
    });

    testWidgets('texto a 200% sem estouro no cartao e no header', (tester) async {
      final repo = _Repo([
        fakeTask(
            type: FieldTaskType.reposition,
            vehicleAddress: 'Avenida Brigadeiro Faria Lima, 3477',
            targetAddress: 'Praça Oswaldo Cruz, esquina com a Avenida Paulista')
      ]);
      final h = Harness(repo: repo);
      await h.pump(tester, TaskListPage(onOpen: (_) {}), textScale: 2);
      await _settle(tester);
      expect(tester.takeException(), isNull);
      expect(find.textContaining('Para: Praça Oswaldo Cruz'), findsOneWidget);
    });
  });

  group('detalhe', () {
    testWidgets('endereco, status da moto e bateria retirada com serie, % e ciclos',
        (tester) async {
      final repo = _Repo([
        fakeTask(
          type: FieldTaskType.batterySwap,
          vehicleAddress: 'R. Augusta, 1020',
          vehicleStatus: VehicleStatus.blocked,
          batterySerial: 'BT-190577',
          batteryCycles: 412,
        )
      ]);
      final h = Harness(repo: repo);
      await h.pump(tester, const TaskDetailPage(taskId: 'task-1'));
      await _settle(tester);
      expect(find.text('R. Augusta, 1020'), findsOneWidget);
      expect(find.byKey(const Key('fleet-status')), findsOneWidget);
      expect(find.text('Retirada: BT-190577 · 12% · 412 ciclos'), findsOneWidget);
    });

    testWidgets('cartao da moto: modelo (foto, categoria, preco) e revisao por km/horas',
        (tester) async {
      final repo = _Repo([fakeTask()])
        ..models = [fakeModel(name: 'Volti City', category: 'Urbana', priceCents: 59)]
        ..vehicles['veh-1'] = fakeVehicle(
          modelId: 'model-1',
          service: fakeService(kmSince: 950, status: VehicleServiceStatus.dueSoon),
        );
      final h = Harness(repo: repo);
      await h.pump(tester, const TaskDetailPage(taskId: 'task-1'));
      await _settle(tester);
      final card = find.byKey(const Key('vehicle-card'));
      await tester.ensureVisible(card);
      expect(find.descendant(of: card, matching: find.text('Volti City')), findsOneWidget);
      expect(find.descendant(of: card, matching: find.textContaining('Urbana')), findsOneWidget);
      expect(find.descendant(of: card, matching: find.textContaining(r'R$ 0,59/min')),
          findsOneWidget);
      expect(find.descendant(of: card, matching: find.text('Próxima')), findsOneWidget);
      expect(find.descendant(of: card, matching: find.textContaining('950 km desde a revisão')),
          findsOneWidget);
      expect(find.byKey(const Key('model-photo')), findsOneWidget);
    });

    testWidgets('sem rede o cartao da moto some e o resto da tarefa continua', (tester) async {
      final repo = _Repo([fakeTask()]);
      final h = Harness(repo: repo);
      await h.pump(tester, const TaskDetailPage(taskId: 'task-1'));
      await _settle(tester);
      repo.online = false; // tarefas ja carregadas; a ficha da moto falha
      await _settle(tester);
      expect(find.byKey(const Key('complete')), findsOneWidget);
    });

    testWidgets('manutencao agendada pelo cliente mostra so o primeiro nome', (tester) async {
      final repo = _Repo([
        fakeTask(type: FieldTaskType.maintenance, maintenanceTaskId: 'maint-1'),
      ])
        ..maintenance['maint-1'] = fakeMaintenance(
            source: MaintenanceSource.customer,
            customerName: 'Maria Silva',
            scheduledFor: DateTime.utc(2026, 10, 23, 13));
      final h = Harness(repo: repo);
      await h.pump(tester, const TaskDetailPage(taskId: 'task-1'));
      await _settle(tester);
      final card = find.byKey(const Key('maintenance-card'));
      await tester.ensureVisible(card);
      expect(find.descendant(of: card, matching: find.text('Revisão preventiva')), findsOneWidget);
      expect(find.descendant(of: card, matching: find.text('Agendada pelo cliente Maria')),
          findsOneWidget);
      expect(find.textContaining('Silva'), findsNothing);
      expect(find.descendant(of: card, matching: find.textContaining('23/10')), findsOneWidget);
    });
  });

  testWidgets('detalhe a 200%: endereco, cartoes da moto e da manutencao sem estouro',
      (tester) async {
    final repo = _Repo([
      fakeTask(
        type: FieldTaskType.batterySwap,
        vehicleAddress: 'Avenida Brigadeiro Faria Lima, 3477 - Itaim Bibi',
        vehicleStatus: VehicleStatus.maintenance,
        batterySerial: 'BT-190577',
        batteryCycles: 412,
        maintenanceTaskId: 'maint-1',
      )
    ])
      ..models = [fakeModel(category: 'Urbana de longo alcance')]
      ..vehicles['veh-1'] = fakeVehicle(
          modelId: 'model-1',
          service: fakeService(kmSince: 1120, status: VehicleServiceStatus.overdue))
      ..maintenance['maint-1'] = fakeMaintenance(
          source: MaintenanceSource.customer, customerName: 'Maria Silva');
    final h = Harness(repo: repo);
    await h.pump(tester, const TaskDetailPage(taskId: 'task-1'), textScale: 2);
    await _settle(tester);
    await tester.ensureVisible(find.byKey(const Key('vehicle-card')));
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.bySemanticsLabel(RegExp('Revisão: Vencida')), findsOneWidget);
  });

  group('troca de bateria v2', () {
    testWidgets('pre-preenche a retirada e sugere baterias carregadas da van', (tester) async {
      final repo = _Repo([
        fakeTask(type: FieldTaskType.batterySwap, batterySerial: 'BT-190577', batteryCycles: 412)
      ])
        ..van = fakeVan([fakeBattery('BT-208431', pct: 98, cycles: 37), fakeBattery('BT-9', pct: 20)]);
      final h = Harness(repo: repo);
      // A lista precisa estar carregada (a pagina le a tarefa do provider).
      await h.pump(tester, const BatterySwapPage(taskId: 'task-1'));
      await _settle(tester);
      final removed = tester.widget<TextField>(find.byKey(const Key('removed-serial')));
      expect(removed.controller!.text, 'BT-190577');
      expect(find.text('Retirada: BT-190577 · 12% · 412 ciclos'), findsOneWidget);
      // So as carregadas (>= 90%) viram sugestao.
      expect(find.byKey(const Key('van-pick-BT-208431')), findsOneWidget);
      expect(find.byKey(const Key('van-pick-BT-9')), findsNothing);
      await _tap(tester, find.byKey(const Key('van-pick-BT-208431')));
      final installed = tester.widget<TextField>(find.byKey(const Key('installed-serial')));
      expect(installed.controller!.text, 'BT-208431');

      final reads = repo.vanReads;
      await _tap(tester, find.byKey(const Key('submit-swap')));
      await _settle(tester);
      expect(repo.swaps.single.$2.removedSerial, 'BT-190577');
      expect(repo.swaps.single.$2.installedSerial, 'BT-208431');
      expect(find.byKey(const Key('swap-sent')), findsOneWidget);
      // A troca sincronizada atualiza o estoque da van.
      expect(repo.vanReads, greaterThan(reads));
    });
  });

  group('van', () {
    testWidgets('lista as baterias com serie, carga e ciclos', (tester) async {
      final repo = FakeFieldRepository()
        ..van = fakeVan([fakeBattery('BT-1', pct: 100, cycles: 3), fakeBattery('BT-2', pct: 40, cycles: 120)]);
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage());
      await _settle(tester);
      expect(find.text('BT-1'), findsOneWidget);
      expect(find.text('BT-2'), findsOneWidget);
      expect(find.textContaining('120 ciclos'), findsOneWidget);
      expect(find.bySemanticsLabel('Carregadas: 1'), findsOneWidget);
      expect(find.bySemanticsLabel('Descarregadas: 1'), findsOneWidget);
    });

    testWidgets('carregar na van: le series, envia e atualiza', (tester) async {
      final repo = FakeFieldRepository();
      final h = Harness(repo: repo);
      await h.pump(tester, VanStockPage(scan: (_) async => 'BT-777'));
      await _settle(tester);
      expect(find.text('Nenhuma bateria na van.'), findsOneWidget);
      await _tap(tester, find.byKey(const Key('van-load')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('van-load-serial')), 'BT-555');
      await tester.pump();
      await _tap(tester, find.byKey(const Key('van-load-add')));
      expect(find.byKey(const Key('van-load-item-BT-555')), findsOneWidget);
      await _tap(tester, find.byKey(const Key('van-load-serial-scan')));
      await tester.pump();
      await _tap(tester, find.byKey(const Key('van-load-add')));
      await _tap(tester, find.byKey(const Key('van-load-confirm')));
      await tester.pumpAndSettle();
      expect(repo.loads.single.$1, ['BT-555', 'BT-777']);
      expect(find.text('BT-555'), findsOneWidget);
      expect(find.text('BT-777'), findsOneWidget);
    });

    testWidgets('descarregar para recarga tira a bateria da van', (tester) async {
      final repo = FakeFieldRepository()..van = fakeVan([fakeBattery('BT-2', pct: 40)]);
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage());
      await _settle(tester);
      await _tap(tester, find.byKey(const Key('van-unload-BT-2')));
      await tester.pumpAndSettle();
      await _tap(tester, find.byKey(const Key('unload-depot-depot-1')));
      await tester.pumpAndSettle();
      expect(repo.unloads.single, ['BT-2']);
      expect(repo.unloadStationIds.single, isNull);
      expect(find.text('BT-2'), findsNothing);
    });

    testWidgets('sem rede: erro com tentar de novo, nada entra na fila', (tester) async {
      final repo = FakeFieldRepository()..online = false;
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage());
      await _settle(tester);
      expect(find.text('Não foi possível carregar o estoque da van.'), findsOneWidget);
      expect(await h.queue.all(), isEmpty);
      repo.online = true;
      await _tap(tester, find.text('Tentar de novo'));
      await _settle(tester);
      expect(find.text('Nenhuma bateria na van.'), findsOneWidget);
    });

    testWidgets('texto a 200% sem estouro', (tester) async {
      final repo = FakeFieldRepository()
        ..van = fakeVan([fakeBattery('BT-1234567890', pct: 100, cycles: 1234)]);
      final h = Harness(repo: repo);
      await h.pump(tester, const VanStockPage(), textScale: 2);
      await _settle(tester);
      expect(tester.takeException(), isNull);
    });
  });

  group('revisoes da frota', () {
    testWidgets('mostra situacao, km desde a revisao e quanto falta; filtra vencidas',
        (tester) async {
      final repo = FakeFieldRepository()
        ..serviceRows = [
          fakeServiceRow('VT-0001',
              service: fakeService(kmSince: 1120, status: VehicleServiceStatus.overdue)),
          fakeServiceRow('VT-0002',
              service: fakeService(kmSince: 950, status: VehicleServiceStatus.dueSoon),
              scheduledFor: DateTime.utc(2026, 10, 24, 12)),
          fakeServiceRow('VT-0003', service: fakeService(kmSince: 100)),
        ];
      final h = Harness(repo: repo);
      await h.pump(tester, const FleetServicePage());
      await _settle(tester);
      expect(find.text('Vencida'), findsOneWidget);
      expect(find.text('Próxima'), findsOneWidget);
      expect(find.text('Em dia'), findsOneWidget);
      expect(find.textContaining('1.120 km desde a revisão'), findsOneWidget);
      expect(find.textContaining('120 km além do previsto'), findsOneWidget);
      expect(find.textContaining('faltam 50 km'), findsOneWidget);
      expect(find.textContaining('24/10'), findsOneWidget);

      await _tap(tester, find.text('Vencidas'));
      await _settle(tester);
      expect(repo.serviceQueries.last, VehicleServiceStatus.overdue);
      expect(find.text('VT-0002'), findsNothing);
      expect(find.text('VT-0001'), findsOneWidget);
    });

    testWidgets('texto a 200% sem estouro', (tester) async {
      final repo = FakeFieldRepository()
        ..serviceRows = [
          fakeServiceRow('VT-0001',
              model: 'Volti Cargo Longo Alcance',
              service: fakeService(kmSince: 1120, status: VehicleServiceStatus.overdue)),
        ];
      final h = Harness(repo: repo);
      await h.pump(tester, const FleetServicePage(), textScale: 2);
      await _settle(tester);
      expect(tester.takeException(), isNull);
    });
  });
}
