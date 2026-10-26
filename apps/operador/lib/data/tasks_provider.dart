import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:volti_api/volti_api.dart';

import '../features/auth/auth.dart';
import 'field_repository.dart';
import 'local_state.dart';
import 'service_unlock.dart';
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
    // Cache por operador; trocar de conta recarrega a lista.
    final owner = ref.watch(ownerSubProvider);
    // Conclusao que sincronizou depois (fila offline): a tarefa vira concluida so agora.
    ref.listen(syncControllerProvider, (prev, next) {
      for (final e in next.results.entries) {
        if (prev?.results.containsKey(e.key) ?? false) continue;
        final r = e.value;
        if (r is FieldTask && r.status == FieldTaskStatus.done) _completedOnServer(r.id);
      }
    });
    try {
      final tasks = sortTasks(await ref.read(fieldRepositoryProvider).listTasks());
      // Lista da API (atribuidas a mim): solta o modo servico de tarefas
      // reatribuidas, canceladas, concluidas ou com a moto em status incompativel.
      // Status da moto: o do servidor (FieldTask.vehicleStatus, contrato v2) vale
      // mais que o conhecido localmente, que e anterior a esta leitura.
      final server = {
        for (final t in tasks)
          if (t.vehicleStatus != null && t.vehicleStatus != VehicleStatus.unknownDefaultOpenApi)
            t.vehicleId: t.vehicleStatus!,
      };
      ref.read(knownVehicleStatusProvider.notifier).forget(server.keys);
      await ref.read(serviceUnlockProvider.notifier).reconcile(tasks,
          vehicleStatuses: {...ref.read(knownVehicleStatusProvider), ...server});
      if (owner != null) {
        await queue.saveTasks(owner, [
          for (final t in tasks)
            standardSerializers.serializeWith(FieldTask.serializer, t)!
                as Map<String, dynamic>,
        ]);
      }
      return TasksResult(tasks);
    } on RepositoryException catch (e) {
      if (e.kind != FailureKind.network) rethrow;
      final cached = owner == null ? <Map<String, dynamic>>[] : await queue.loadTasks(owner);
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

  /// A API confirmou a conclusao: marca como concluida e limpa o estado local
  /// (modo servico e rascunho do checklist).
  void _completedOnServer(String id) {
    markDone(id);
    unawaited(ref.read(serviceUnlockProvider.notifier).clear(id));
    ref.read(inspectionDraftsProvider.notifier).clear(id);
  }

  /// Tira a tarefa concluida da lista pendente (mantida como `done`).
  void markDone(String id) {
    final cur = state.value;
    if (cur == null || cur.byId(id)?.status == FieldTaskStatus.done) return;
    state = AsyncData(TasksResult([
      for (final t in cur.tasks)
        t.id == id
            ? t.rebuild((b) => b
              ..status = FieldTaskStatus.done
              ..completedAt = DateTime.now().toUtc())
            : t,
    ], fromCache: cur.fromCache));
  }
}

final tasksProvider =
    AsyncNotifierProvider<TasksController, TasksResult>(TasksController.new);
