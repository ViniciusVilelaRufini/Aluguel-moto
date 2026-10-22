import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_ce/hive.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/local_state.dart';
import 'package:volti_operador/data/location.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/service_unlock.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/features/inspection/inspection_page.dart';
import 'package:volti_operador/features/tasks/task_detail_page.dart';
import 'package:volti_operador/features/tasks/task_list_page.dart';

import 'helpers.dart';

class _Repo extends FakeFieldRepository {
  _Repo(this.tasks);
  final List<FieldTask> tasks;

  @override
  Future<List<FieldTask>> listTasks() async => tasks;
}

const _fullChecklist = InspectionDraft(
  brakes: true,
  tires: true,
  lights: true,
  bell: true,
  speedReading: 30,
  speedOk: true,
);

VoltiButton _button(WidgetTester t, String key) => t.widget<VoltiButton>(find.byKey(Key(key)));

Future<void> _tap(WidgetTester t, String key) async {
  final f = find.byKey(Key(key));
  await t.ensureVisible(f);
  await t.tap(f);
  await t.pump();
}

Future<void> _settle(WidgetTester t) async {
  await t.pump(const Duration(milliseconds: 50));
  await t.pump();
}

ProviderContainer _container(WidgetTester t, Type page) =>
    ProviderScope.containerOf(t.element(find.byType(page)));

String _hint(WidgetTester t) => t.widget<Text>(find.byKey(const Key('complete-hint'))).data!;

void main() {
  group('regra de conclusao (detalhe)', () {
    testWidgets('Concluir fica desabilitado com o motivo ate modo servico + checklist + foto',
        (tester) async {
      final h = Harness(repo: _Repo([fakeTask(type: FieldTaskType.collect)]));
      await h.pump(tester, TaskDetailPage(taskId: 'task-1', onOpenInspection: () {}));
      await _settle(tester);

      expect(_button(tester, 'complete').onPressed, isNull);
      expect(_hint(tester),
          'Para concluir: destrave em modo serviço, complete o checklist e tire a foto da moto.');
      expect(find.byKey(const Key('detail-items-counter')), findsOneWidget);
      expect(find.text('0/5'), findsOneWidget);

      // Destrava em modo servico.
      await _tap(tester, 'service-unlock');
      await _settle(tester);
      expect(h.repo.unlocks.single, ('veh-1', 'task-1'));
      expect(find.byKey(const Key('service-unlock-active')), findsOneWidget);
      expect(find.text('Modo serviço ativo'), findsOneWidget);
      expect(_hint(tester), 'Para concluir: complete o checklist e tire a foto da moto.');

      // Foto pelo detalhe ("Foto da moto após o serviço").
      expect(find.text('Foto da moto após o serviço'), findsOneWidget);
      await _tap(tester, 'detail-photo');
      await _settle(tester);
      expect(find.byKey(const Key('photo-thumb-0')), findsOneWidget);
      expect(_hint(tester), 'Para concluir: complete o checklist.');
      expect(_button(tester, 'complete').onPressed, isNull);

      // Checklist completo (5/5) no rascunho: libera.
      _container(tester, TaskDetailPage)
          .read(inspectionDraftsProvider.notifier)
          .put('task-1', _fullChecklist.copyWith(photoPaths: ['/tmp/photo-1.jpg']));
      await tester.pump();
      expect(find.text('5/5'), findsOneWidget);
      expect(find.byKey(const Key('complete-hint')), findsNothing);
      expect(_button(tester, 'complete').onPressed, isNotNull);

      // Conclui: envia o checklist pendente e depois a conclusao; limpa o modo servico.
      await _tap(tester, 'complete');
      await tester.pump(const Duration(seconds: 1));
      await tester.tap(find.byKey(const Key('complete-confirm')));
      await tester.pump(const Duration(seconds: 1));
      await _settle(tester);
      expect(h.repo.inspections.single.taskId, 'task-1');
      expect(h.repo.inspections.single.photoKeys, hasLength(1));
      expect(h.repo.completions.single.$1, 'task-1');
      expect(_container(tester, TaskDetailPage).read(serviceUnlockProvider), isEmpty);
    });

    testWidgets('tarefa de bateria tambem exige a troca registrada', (tester) async {
      final h = Harness(repo: _Repo([fakeTask(type: FieldTaskType.batterySwap)]));
      await h.pump(tester, const TaskDetailPage(taskId: 'task-1'), extraOverrides: [
        serviceUnlockStoreProvider.overrideWithValue(MemoryServiceUnlockStore(['task-1'])),
      ]);
      await _settle(tester);
      _container(tester, TaskDetailPage)
          .read(inspectionDraftsProvider.notifier)
          .put('task-1', _fullChecklist.copyWith(photoPaths: ['/a.jpg']));
      await tester.pump();
      expect(find.byKey(const Key('battery-card')), findsOneWidget);
      expect(_hint(tester), 'Para concluir: registre a troca de bateria.');
      expect(_button(tester, 'complete').onPressed, isNull);

      await _container(tester, TaskDetailPage).read(syncControllerProvider.notifier).submitBatterySwap(
          'task-1', const BatterySwapDraft(removedSerial: 'BT-1', installedSerial: 'BT-208431'));
      await _settle(tester);
      expect(find.text('Instalada: BT-208431'), findsOneWidget);
      expect(_button(tester, 'complete').onPressed, isNotNull);
    });
  });

  group('modo servico persistido', () {
    testWidgets('estado salvo aparece ao reabrir o app (sem novo destravamento)', (tester) async {
      final h = Harness(repo: _Repo([fakeTask()]));
      await h.pump(tester, const TaskDetailPage(taskId: 'task-1'), extraOverrides: [
        serviceUnlockStoreProvider.overrideWithValue(MemoryServiceUnlockStore(['task-1'])),
      ]);
      await _settle(tester);
      expect(find.byKey(const Key('service-unlock-active')), findsOneWidget);
      expect(find.byKey(const Key('service-unlock')), findsNothing);
      expect(h.repo.unlocks, isEmpty);
      expect(_hint(tester), isNot(contains('destrave')));
    });

    test('caixa Hive guarda e devolve o destravamento entre aberturas', () async {
      final dir = await Directory.systemTemp.createTemp('unlock_test');
      addTearDown(() => dir.delete(recursive: true));
      Hive.init(dir.path);
      final first = await HiveServiceUnlockStore.open();
      await first.add('task-7', DateTime.utc(2026, 10, 21, 9));
      await Hive.close();

      Hive.init(dir.path);
      final reopened = await HiveServiceUnlockStore.open();
      expect(reopened.entries(), {'task-7': DateTime.utc(2026, 10, 21, 9)});
      await reopened.remove('task-7');
      expect(reopened.entries(), isEmpty);
      await Hive.close();
    });
  });

  group('distancia e GPS na lista', () {
    testWidgets('com GPS mostra o badge de distancia formatado', (tester) async {
      final h = Harness(
        repo: _Repo([fakeTask(priority: TaskPriority.medium)]),
        location: FakeLocationService(
            access: LocationAccess.granted, position: const GeoPoint(-23.55, -46.6534)),
      );
      await h.pump(tester, const TaskListPage());
      await _settle(tester);
      expect(find.byKey(const Key('badge-distance')), findsOneWidget);
      expect(find.text('350 m'), findsOneWidget);
      expect(find.byKey(const Key('location-rationale')), findsNothing);

      // Prioridade Média com tom warning (design).
      final badge = tester.widget<VoltiBadge>(find.byKey(const Key('badge-priority')));
      expect(badge.label, 'Média');
      expect(badge.tone, VoltiBadgeTone.warning);
    });

    testWidgets('sem permissao: explica antes de pedir e nao mostra distancia', (tester) async {
      final location = FakeLocationService(onRequest: LocationAccess.granted)
        ..position = const GeoPoint(-23.55, -46.662);
      final h = Harness(repo: _Repo([fakeTask()]), location: location);
      await h.pump(tester, const TaskListPage());
      await _settle(tester);
      expect(find.byKey(const Key('badge-distance')), findsNothing);
      expect(find.byKey(const Key('location-rationale')), findsOneWidget);
      expect(find.text('Ative a localização'), findsOneWidget);
      expect(location.requests, 0);

      await _tap(tester, 'location-allow');
      await _settle(tester);
      expect(location.requests, 1);
      expect(find.byKey(const Key('location-rationale')), findsNothing);
      expect(find.text('1,2 km'), findsOneWidget);
    });
  });

  testWidgets('controle segmentado Hoje / Concluídas filtra a lista', (tester) async {
    final h = Harness(repo: _Repo([
      fakeTask(id: 'a', code: 'VT-0001'),
      fakeTask(id: 'b', code: 'VT-0002', status: FieldTaskStatus.done)
          .rebuild((b) => b.completedAt = DateTime.now().toUtc()),
      // Concluida em outro dia: fora da aba.
      fakeTask(id: 'c', code: 'VT-0003', status: FieldTaskStatus.done)
          .rebuild((b) => b.completedAt = DateTime.now().toUtc().subtract(const Duration(days: 2))),
    ]));
    await h.pump(tester, const TaskListPage());
    await _settle(tester);
    expect(find.byType(SegmentedButton<bool>), findsNothing);
    expect(find.byType(VoltiSegmentedControl<bool>), findsOneWidget);
    expect(find.textContaining('VT-0001'), findsOneWidget);
    expect(find.textContaining('VT-0002'), findsNothing);

    await tester.tap(find.descendant(
        of: find.byType(VoltiSegmentedControl<bool>), matching: find.text('Concluídas')));
    await tester.pumpAndSettle();
    expect(find.textContaining('VT-0001'), findsNothing);
    expect(find.textContaining('VT-0002'), findsOneWidget);
    expect(find.textContaining('VT-0003'), findsNothing);
    expect(find.textContaining('Concluída às'), findsOneWidget);
  });

  testWidgets('checklist: miniaturas das fotos com remover', (tester) async {
    final h = Harness();
    await h.pump(tester, const InspectionPage(taskId: 't1'));
    expect(find.text('Foto da moto após o serviço'), findsOneWidget);
    await _tap(tester, 'photo-capture');
    await _tap(tester, 'photo-capture');
    expect(find.byKey(const Key('photo-thumb-0')), findsOneWidget);
    expect(find.byKey(const Key('photo-thumb-1')), findsOneWidget);
    expect(find.bySemanticsLabel('Remover foto 2'), findsOneWidget);
    expect(tester.getSize(find.byKey(const Key('photo-remove-0'))), const Size(44, 44));

    await _tap(tester, 'photo-remove-0');
    expect(find.byKey(const Key('photo-thumb-1')), findsNothing);
    final draft = _container(tester, InspectionPage).read(inspectionDraftsProvider)['t1']!;
    expect(draft.photoPaths, ['/tmp/photo-2.jpg']);

    // Sem foto o envio volta a ficar bloqueado.
    await _tap(tester, 'photo-remove-0');
    expect(find.byKey(const Key('photo-thumbnails')), findsNothing);
  });
}
