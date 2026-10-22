import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/local_state.dart';
import 'package:volti_operador/data/location.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/service_unlock.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:volti_operador/data/tasks_provider.dart';
import 'package:volti_operador/features/auth/auth.dart';
import 'package:volti_operador/features/tasks/task_detail_page.dart';
import 'package:volti_operador/features/tasks/task_list_page.dart';

import 'helpers.dart';

class _Repo extends FakeFieldRepository {
  _Repo(this.tasks);
  List<FieldTask> tasks;

  @override
  Future<List<FieldTask>> listTasks() async {
    if (!online) throw const RepositoryException(FailureKind.network, 'offline');
    return tasks;
  }
}

/// GPS fake que registra quando o stream e assinado e cancelado.
class _TrackingLocation extends FakeLocationService {
  _TrackingLocation() : super(access: LocationAccess.granted);

  int listens = 0;
  int cancels = 0;

  @override
  Stream<GeoPoint> watch() {
    late StreamController<GeoPoint> c;
    c = StreamController<GeoPoint>(
      onListen: () {
        listens++;
        c.add(const GeoPoint(-23.55, -46.65));
      },
      onCancel: () => cancels++,
    );
    return c.stream;
  }
}

/// GPS fake com check() preso ate o teste liberar.
class _GatedLocation extends _TrackingLocation {
  _GatedLocation(this.gate);
  final Future<LocationAccess> gate;

  @override
  Future<LocationAccess> check() => gate;
}

const _full = InspectionDraft(
  brakes: true,
  tires: true,
  lights: true,
  bell: true,
  speedReading: 30,
  speedOk: true,
  photoPaths: ['/tmp/a.jpg'],
);

Future<void> _settle(WidgetTester t) async {
  await t.pump(const Duration(milliseconds: 50));
  await t.pump();
}

ProviderContainer _c(WidgetTester t) =>
    ProviderScope.containerOf(t.element(find.byType(TaskDetailPage)));

Future<void> _openDetailReady(WidgetTester tester, Harness h) async {
  await h.pump(tester, const TaskDetailPage(taskId: 'task-1'), extraOverrides: [
    serviceUnlockStoreProvider.overrideWithValue(MemoryServiceUnlockStore(['task-1'])),
  ]);
  await _settle(tester);
  _c(tester).read(inspectionDraftsProvider.notifier).put('task-1', _full);
  await tester.pump();
}

Future<void> _confirmComplete(WidgetTester tester) async {
  final complete = find.byKey(const Key('complete'));
  await tester.ensureVisible(complete);
  await tester.tap(complete);
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
  await tester.tap(find.byKey(const Key('complete-confirm')));
  await tester.pump(const Duration(seconds: 1));
  await _settle(tester);
}

VoidCallback? _completePressed(WidgetTester t) =>
    t.widget<VoltiButton>(find.byKey(const Key('complete'))).onPressed;

void main() {
  group('modo servico: reconciliacao e saida', () {
    test('lista nova solta tarefas reatribuidas, canceladas e com moto incompativel', () async {
      final repo = _Repo([
        fakeTask(id: 'aberta'),
        fakeTask(id: 'cancelada', status: FieldTaskStatus.canceled),
        fakeTask(id: 'moto-alugada').rebuild((b) => b.vehicleId = 'veh-9'),
      ]);
      final h = Harness(repo: repo);
      final store = MemoryServiceUnlockStore(['aberta', 'cancelada', 'reatribuida', 'moto-alugada']);
      final c = ProviderContainer(
          overrides: [...h.overrides, serviceUnlockStoreProvider.overrideWithValue(store)]);
      addTearDown(c.dispose);
      c.read(knownVehicleStatusProvider.notifier).set('veh-9', VehicleStatus.rented);
      expect(c.read(serviceUnlockProvider).keys, hasLength(4));

      await c.read(tasksProvider.future);
      expect(c.read(serviceUnlockProvider).keys, {'aberta'});
      expect(store.entries().keys, ['aberta']);
    });

    test('lista do cache (sem rede) nao solta nada', () async {
      final repo = _Repo([fakeTask(id: 'x')])..online = false;
      final h = Harness(repo: repo);
      await h.queue.saveTasks([
        standardSerializers.serializeWith(FieldTask.serializer, fakeTask(id: 'x'))!
            as Map<String, dynamic>,
      ]);
      final store = MemoryServiceUnlockStore(['x', 'outra']);
      final c = ProviderContainer(
          overrides: [...h.overrides, serviceUnlockStoreProvider.overrideWithValue(store)]);
      addTearDown(c.dispose);
      final r = await c.read(tasksProvider.future);
      expect(r.fromCache, isTrue);
      expect(c.read(serviceUnlockProvider).keys.toSet(), {'x', 'outra'});
    });

    test('sair da conta limpa o modo servico e os rascunhos', () async {
      final h = Harness();
      final store = MemoryServiceUnlockStore(['task-1']);
      final c = ProviderContainer(
          overrides: [...h.overrides, serviceUnlockStoreProvider.overrideWithValue(store)]);
      addTearDown(c.dispose);
      c.read(inspectionDraftsProvider.notifier).put('task-1', _full);
      await c.read(sessionProvider.notifier).signOut();
      expect(c.read(serviceUnlockProvider), isEmpty);
      expect(store.entries(), isEmpty);
      expect(c.read(inspectionDraftsProvider), isEmpty);
    });
  });

  group('conclusao: recusada e na fila', () {
    testWidgets('checklist recusado (4xx): mostra o motivo e mantem a tarefa aberta',
        (tester) async {
      final h = Harness(repo: _Repo([fakeTask()]));
      await _openDetailReady(tester, h);
      h.repo.rejectWith = const RepositoryException(FailureKind.rejected, 'leitura inválida',
          slug: 'validation-error', status: 422);

      await _confirmComplete(tester);
      expect(find.text('Recusado: leitura inválida'), findsWidgets);
      expect(h.repo.completions, isEmpty);
      final c = _c(tester);
      expect(c.read(tasksProvider).value!.byId('task-1')!.status, FieldTaskStatus.assigned);
      expect(c.read(serviceUnlockProvider.notifier).isUnlocked('task-1'), isTrue);
      expect(c.read(inspectionDraftsProvider)['task-1'], isNotNull);
      // A conclusao nao foi enfileirada atras do checklist recusado.
      expect((await h.queue.all()).map((j) => j.kind), [JobKind.inspection]);
      expect(find.byKey(const Key('rejected-inspection')), findsOneWidget);
      expect(_completePressed(tester), isNull);
      await tester.pump(const Duration(seconds: 5));
    });

    testWidgets('conclusao recusada: tarefa segue aberta e destravada', (tester) async {
      final h = Harness(repo: _Repo([fakeTask()]));
      await _openDetailReady(tester, h);
      // Checklist ja enviado; so a conclusao e recusada.
      await _c(tester).read(syncControllerProvider.notifier).submitInspection('task-1', _full);
      await _settle(tester);
      h.repo.rejectWith = const RepositoryException(FailureKind.rejected, 'tarefa cancelada',
          slug: 'conflict', status: 409);

      await _confirmComplete(tester);
      expect(find.text('Recusado: tarefa cancelada'), findsWidgets);
      final c = _c(tester);
      expect(c.read(tasksProvider).value!.byId('task-1')!.status, FieldTaskStatus.assigned);
      expect(c.read(serviceUnlockProvider.notifier).isUnlocked('task-1'), isTrue);
      expect(find.byKey(const Key('rejected-completeTask')), findsOneWidget);
      await tester.pump(const Duration(seconds: 5));
    });

    testWidgets('offline: fica "aguardando sincronização" e conclui quando a fila envia',
        (tester) async {
      final h = Harness(repo: _Repo([fakeTask()]));
      await _openDetailReady(tester, h);
      h.repo.online = false;

      await _confirmComplete(tester);
      final c = _c(tester);
      expect(c.read(tasksProvider).value!.byId('task-1')!.status, FieldTaskStatus.assigned);
      expect(find.byKey(const Key('completion-queued')), findsOneWidget);
      expect(_completePressed(tester), isNull);
      expect(c.read(serviceUnlockProvider.notifier).isUnlocked('task-1'), isTrue);

      // A rede volta: a fila envia checklist e conclusao, e a tarefa vira concluida.
      h.repo.online = true;
      h.connectivity.controller.add(true);
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
      await _settle(tester);
      expect(h.repo.completions.single.$1, 'task-1');
      expect(c.read(tasksProvider).value!.byId('task-1')!.status, FieldTaskStatus.done);
      expect(c.read(serviceUnlockProvider), isEmpty);
      expect(c.read(inspectionDraftsProvider)['task-1'], isNull);
      expect(find.byKey(const Key('task-done')), findsOneWidget);
      await tester.pump(const Duration(seconds: 5));
    });
  });

  group('localizacao', () {
    testWidgets('o stream para quando o app sai de cena e volta ao retomar', (tester) async {
      final location = _TrackingLocation();
      final c = ProviderContainer(overrides: [locationServiceProvider.overrideWithValue(location)]);
      addTearDown(c.dispose);
      final sub = c.listen(locationProvider, (_, _) {});
      addTearDown(sub.close);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(location.listens, 1);
      expect(c.read(locationProvider).position, isNotNull);

      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      await tester.pump();
      expect(location.cancels, 1);

      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(location.listens, 2);
    });

    testWidgets('sem tela observando (lista coberta por outra rota), o GPS para', (tester) async {
      final location = _TrackingLocation();
      final h = Harness(repo: _Repo([fakeTask()]), location: location);
      await h.pump(tester, const TaskListPage());
      await _settle(tester);
      expect(location.listens, 1);

      // Abre uma tela que nao usa distancia por cima da lista.
      final nav = tester.state<NavigatorState>(find.byType(Navigator));
      unawaited(nav.push(MaterialPageRoute<void>(builder: (_) => const Scaffold(body: Text('outra')))));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      await tester.pump();
      expect(location.cancels, 1);

      nav.pop();
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      expect(location.listens, 2);
    });

    test('descartado com check() pendente: nenhuma assinatura do GPS fica aberta', () async {
      final gate = Completer<LocationAccess>();
      final location = _GatedLocation(gate.future);
      final errors = <Object>[];
      await runZonedGuarded(() async {
        final c =
            ProviderContainer(overrides: [locationServiceProvider.overrideWithValue(location)]);
        final sub = c.listen(locationProvider, (_, _) {});
        await Future<void>.delayed(Duration.zero);
        sub.close();
        c.dispose(); // onDispose roda com o check() ainda pendente
        gate.complete(LocationAccess.granted);
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }, (e, _) => errors.add(e));
      // Sem assinatura orfa e sem escrever estado/ler ref depois do descarte.
      expect(location.listens, 0);
      expect(errors, isEmpty);
    });

    testWidgets('ultima posicao fica ao cobrir e descobrir a lista (sem piscar)', (tester) async {
      final location = _TrackingLocation();
      final c = ProviderContainer(overrides: [locationServiceProvider.overrideWithValue(location)]);
      addTearDown(c.dispose);
      var sub = c.listen(locationProvider, (_, _) {});
      await tester.pump();
      expect(c.read(locationProvider).position, isNotNull);
      sub.close();
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      expect(location.cancels, 1);
      // Recriado: comeca ja com a ultima posicao, antes do GPS responder.
      sub = c.listen(locationProvider, (_, _) {});
      addTearDown(sub.close);
      expect(c.read(locationProvider).position, isNotNull);
    });

    for (final (access, label) in [
      (LocationAccess.deniedForever, 'A localização está bloqueada'),
      (LocationAccess.serviceDisabled, 'O GPS está desligado'),
    ]) {
      testWidgets('${access.name}: explica e abre os ajustes, sem pedir de novo', (tester) async {
        final location = FakeLocationService(access: access);
        final h = Harness(repo: _Repo([fakeTask()]), location: location);
        await h.pump(tester, const TaskListPage());
        await _settle(tester);
        expect(find.textContaining(label), findsOneWidget);
        expect(find.text('Abrir ajustes'), findsOneWidget);
        await tester.tap(find.byKey(const Key('location-allow')));
        await _settle(tester);
        expect(location.settingsOpened, 1);
        expect(location.requests, 0);
        expect(find.byKey(const Key('badge-distance')), findsNothing);
      });
    }
  });
}
