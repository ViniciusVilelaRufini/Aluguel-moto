import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';

import 'field_repository.dart';
import 'sync.dart';

class TasksResult {
  const TasksResult(this.tasks, {this.fromCache = false});

  final List<FieldTask> tasks;

  /// `true` quando a lista veio do cache local (sem rede).
  final bool fromCache;

  FieldTask? byId(String id) {
    for (final t in tasks) {
      if (t.id == id) return t;
    }
    return null;
  }
}

/// Ordem: urgente > alta > media > baixa; depois por prazo.
int _prioRank(TaskPriority p) => switch (p) {
      TaskPriority.urgent => 0,
      TaskPriority.high => 1,
      TaskPriority.medium => 2,
      _ => 3,
    };

List<FieldTask> sortTasks(Iterable<FieldTask> tasks) {
  final list = tasks.toList();
  list.sort((a, b) {
    final c = _prioRank(a.priority).compareTo(_prioRank(b.priority));
    if (c != 0) return c;
    final da = a.dueAt, db = b.dueAt;
    if (da == null && db == null) return 0;
    if (da == null) return 1;
    if (db == null) return -1;
    return da.compareTo(db);
  });
  return list;
}

class TasksController extends AsyncNotifier<TasksResult> {
  @override
  Future<TasksResult> build() async {
    final queue = ref.read(offlineQueueProvider);
    try {
      final tasks = sortTasks(await ref.read(fieldRepositoryProvider).listTasks());
      await queue.saveTasks([
        for (final t in tasks)
          standardSerializers.serializeWith(FieldTask.serializer, t)!
              as Map<String, dynamic>,
      ]);
      return TasksResult(tasks);
    } on RepositoryException catch (e) {
      if (e.kind != FailureKind.network) rethrow;
      final cached = await queue.loadTasks();
      if (cached.isEmpty) rethrow;
      return TasksResult(
        sortTasks([
          for (final j in cached)
            standardSerializers.deserializeWith(FieldTask.serializer, j)!,
        ]),
        fromCache: true,
      );
    }
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  /// Marca a tarefa como iniciada localmente apos `POST /start`.
  Future<void> start(String id) async {
    final updated = await ref.read(fieldRepositoryProvider).startTask(id);
    final cur = state.value;
    if (cur == null) return;
    state = AsyncData(TasksResult([
      for (final t in cur.tasks) t.id == id ? updated : t,
    ], fromCache: cur.fromCache));
  }

  /// Tira a tarefa concluida da lista pendente (mantida como `done`).
  void markDone(String id) {
    final cur = state.value;
    if (cur == null) return;
    state = AsyncData(TasksResult([
      for (final t in cur.tasks)
        t.id == id ? t.rebuild((b) => b.status = FieldTaskStatus.done) : t,
    ], fromCache: cur.fromCache));
  }
}

final tasksProvider =
    AsyncNotifierProvider<TasksController, TasksResult>(TasksController.new);
