import 'dart:io';

import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:volti_flutter/volti_flutter.dart' show DevAuthRepository, authRepositoryProvider;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_operador/data/sync.dart';
import 'package:hive_ce/hive.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_operador/data/field_repository.dart';
import 'package:volti_operador/data/models.dart';
import 'package:volti_operador/data/offline_queue.dart';
import 'package:volti_operador/data/tasks_provider.dart';
import 'package:volti_operador/features/tasks/task_list_page.dart';

import 'helpers.dart';

class _TasksRepo extends FakeFieldRepository {
  @override
  Future<List<FieldTask>> listTasks() async {
    if (!online) throw const RepositoryException(FailureKind.network, 'offline');
    return [
      fakeTask(id: 'a', priority: TaskPriority.low, code: 'VT-0001', type: FieldTaskType.reposition),
      fakeTask(id: 'b', priority: TaskPriority.urgent, code: 'VT-0002', type: FieldTaskType.batterySwap),
    ];
  }
}

void main() {
  test('fila Hive persiste e devolve jobs e tarefas', () async {
    final dir = await Directory.systemTemp.createTemp('hive_test');
    addTearDown(() => dir.delete(recursive: true));
    Hive.init(dir.path);
    final q = await HiveOfflineQueue.open();
    final now = DateTime.utc(2026, 10, 21, 12);
    await q.put(QueuedJob(
      id: 'j1',
      kind: JobKind.inspection,
      taskId: 't1',
      payload: {
        'draft': const InspectionDraft(brakes: true, speedReading: 40, photoPaths: ['/a.jpg'])
            .toJson()
      },
      idempotencyKey: 'key-1',
      createdAt: now,
      recordedAt: now,
    ));
    await q.saveTasks([
      {'id': 'x'}
    ]);
    final jobs = await q.all();
    expect(jobs.single.idempotencyKey, 'key-1');
    final draft = InspectionDraft.fromJson(jobs.single.payload['draft'] as Map<String, dynamic>);
    expect(draft.speedReading, 40);
    expect(draft.effectiveSpeedOk, isFalse);
    expect(draft.photoPaths, ['/a.jpg']);
    expect((await q.loadTasks()).single['id'], 'x');
    await q.remove('j1');
    expect(await q.all(), isEmpty);
    await Hive.close();
  });

  testWidgets('lista ordena por prioridade e mostra urgencia', (tester) async {
    final h = Harness(repo: _TasksRepo());
    await h.pump(tester, const TaskListPage());
    await tester.pump(const Duration(milliseconds: 50));
    await tester.pump();
    final texts = find.textContaining('VT-').evaluate().map((e) => (e.widget as Text).data).toList();
    expect(texts.first, contains('VT-0002')); // urgente primeiro
    expect(find.text('Urgente'), findsOneWidget);
    expect(find.text('Baixa'), findsOneWidget);
  });

  syncRobustnessTests();

  test('sortTasks: urgente antes de baixa', () {
    final s = sortTasks([
      fakeTask(id: '1', priority: TaskPriority.low),
      fakeTask(id: '2', priority: TaskPriority.urgent),
      fakeTask(id: '3', priority: TaskPriority.medium),
    ]);
    expect(s.map((e) => e.id), ['2', '3', '1']);
  });
}

class _CountingAuth extends DevAuthRepository {
  _CountingAuth() : super(baseUrl: 'http://127.0.0.1:1');
  int signOuts = 0;

  @override
  Future<void> signOut() async => signOuts++;
}

class _FlakyQueue extends MemoryOfflineQueue {
  bool failNext = false;

  @override
  Future<List<QueuedJob>> all() async {
    if (failNext) {
      failNext = false;
      throw StateError('hive');
    }
    return super.all();
  }
}

void syncRobustnessTests() {
  QueuedJob swapJob(String id) {
    final now = DateTime.utc(2026, 10, 21, 12);
    return QueuedJob(
      id: id,
      kind: JobKind.batterySwap,
      taskId: 't1',
      payload: {
        'swap': const BatterySwapDraft(removedSerial: 'AAA', installedSerial: 'BBB').toJson()
      },
      idempotencyKey: 'key-$id',
      createdAt: now,
      recordedAt: now,
    );
  }

  test('partida a frio online: item persistido no Hive e sincronizado ao criar o controller',
      () async {
    final dir = await Directory.systemTemp.createTemp('hive_cold');
    addTearDown(() => dir.delete(recursive: true));
    Hive.init(dir.path);
    final queue = await HiveOfflineQueue.open();
    await queue.put(swapJob('j1'));
    final h = Harness(queue: queue);
    final container = ProviderContainer(overrides: h.overrides);
    addTearDown(container.dispose);
    container.read(syncControllerProvider);
    await Future<void>.delayed(const Duration(milliseconds: 100));
    expect(h.repo.swaps.single.$3, 'key-j1');
    expect(await queue.all(), isEmpty);
    await Hive.close();
  });

  test('401 mantem o item pendente (nao vira Recusado)', () async {
    final h = Harness();
    final auth = _CountingAuth();
    await h.queue.put(swapJob('j2'));
    h.repo.rejectWith =
        const RepositoryException(FailureKind.auth, 'expirou', status: 401);
    final container = ProviderContainer(
        overrides: [...h.overrides, authRepositoryProvider.overrideWithValue(auth)]);
    addTearDown(container.dispose);
    container.read(syncControllerProvider);
    await Future<void>.delayed(const Duration(milliseconds: 100));
    final jobs = await h.queue.all();
    expect(jobs.single.status, JobStatus.pending);
    expect(auth.signOuts, 1); // pede novo login
  });

  test('erro na fila nao mata o sync: proxima chamada roda', () async {
    final q = _FlakyQueue();
    final h = Harness(queue: q);
    final container = ProviderContainer(overrides: h.overrides);
    addTearDown(container.dispose);
    final c = container.read(syncControllerProvider.notifier);
    await Future<void>.delayed(const Duration(milliseconds: 50));
    await q.put(swapJob('j5'));
    q.failNext = true;
    await expectLater(c.sync(), throwsStateError);
    await c.sync();
    expect(await q.all(), isEmpty);
  });

  test('409 que nao e idempotencia em andamento e recusa', () {
    final e = mapDioError(DioException(
        requestOptions: RequestOptions(),
        response: Response(requestOptions: RequestOptions(), statusCode: 409, data: {
          'type': 'https://api.volti.com.br/problems/conflict',
          'detail': 'Moto com aluguel ativo.'
        })));
    expect(e.kind, FailureKind.rejected);
    final p = mapDioError(DioException(
        requestOptions: RequestOptions(),
        response: Response(requestOptions: RequestOptions(), statusCode: 409, data: {
          'type': 'https://api.volti.com.br/problems/conflict',
          'detail': 'Requisição com esta Idempotency-Key ainda em processamento.'
        })));
    expect(p.kind, FailureKind.network);
  });

  test('sync pedido durante a rodada roda de novo', () async {
    final h = Harness();
    final container = ProviderContainer(overrides: h.overrides);
    addTearDown(container.dispose);
    final c = container.read(syncControllerProvider.notifier);
    await Future<void>.delayed(const Duration(milliseconds: 50));
    await h.queue.put(swapJob('j3'));
    final first = c.sync();
    await h.queue.put(swapJob('j4'));
    final second = c.sync(); // durante a rodada: agenda outra
    await Future.wait([first, second]);
    expect(await h.queue.all(), isEmpty);
  });
}
