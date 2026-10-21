import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
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

  test('sortTasks: urgente antes de baixa', () {
    final s = sortTasks([
      fakeTask(id: '1', priority: TaskPriority.low),
      fakeTask(id: '2', priority: TaskPriority.urgent),
      fakeTask(id: '3', priority: TaskPriority.medium),
    ]);
    expect(s.map((e) => e.id), ['2', '3', '1']);
  });
}
