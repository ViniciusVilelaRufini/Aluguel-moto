import 'dart:async';

import 'package:flutter/foundation.dart';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/auth.dart';
import 'field_repository.dart';
import 'models.dart';
import 'offline_queue.dart';

/// Avisa quando a rede volta.
abstract class ConnectivityMonitor {
  /// Emite `true` quando ha conexao.
  Stream<bool> get onlineChanges;
}

class PlatformConnectivityMonitor implements ConnectivityMonitor {
  @override
  Stream<bool> get onlineChanges => Connectivity()
      .onConnectivityChanged
      .map((r) => r.any((e) => e != ConnectivityResult.none));
}

/// Fila persistente (sobrescrita em `main` com Hive).
final offlineQueueProvider = Provider<OfflineQueue>((ref) => MemoryOfflineQueue());

final connectivityMonitorProvider =
    Provider<ConnectivityMonitor>((ref) => PlatformConnectivityMonitor());

class SyncState {
  const SyncState({this.jobs = const [], this.syncing = false, this.results = const {}});

  final List<QueuedJob> jobs;
  final bool syncing;

  /// Resultado da API por id de job ja sincronizado nesta sessao
  /// (`Inspection`, `BatterySwap` ou `FieldTask`).
  final Map<String, Object> results;

  List<QueuedJob> get pending => jobs.where((j) => j.status == JobStatus.pending).toList();
  List<QueuedJob> get failed => jobs.where((j) => j.status == JobStatus.failed).toList();

  bool hasPending(String taskId, [JobKind? kind]) => pending
      .any((j) => j.taskId == taskId && (kind == null || j.kind == kind));

  SyncState copyWith({List<QueuedJob>? jobs, bool? syncing, Map<String, Object>? results}) =>
      SyncState(
        jobs: jobs ?? this.jobs,
        syncing: syncing ?? this.syncing,
        results: results ?? this.results,
      );
}

/// Resultado de um envio: enviado na hora ou guardado na fila.
class SubmitOutcome {
  const SubmitOutcome(this.job, this.result);

  final QueuedJob job;

  /// `null` quando o job segue na fila (aguardando sincronizacao ou falhou).
  final Object? result;

  bool get synced => result != null;
}

class SyncController extends Notifier<SyncState> {
  StreamSubscription<bool>? _sub;
  bool _running = false;
  bool _again = false;
  Future<void>? _chain;

  OfflineQueue get _queue => ref.read(offlineQueueProvider);
  FieldRepository get _repo => ref.read(fieldRepositoryProvider);

  @override
  SyncState build() {
    ref.onDispose(() => _sub?.cancel());
    _sub = ref.read(connectivityMonitorProvider).onlineChanges.listen((online) {
      if (online) unawaited(_safeSync());
    });
    // Entrar de novo (token expirado) drena a fila.
    ref.listen(sessionProvider, (prev, next) {
      if (next != null) unawaited(_safeSync());
    });
    // Partida a frio ja online: nao ha evento de conectividade, entao sincroniza agora.
    unawaited(load().then((_) => _safeSync()));
    return const SyncState();
  }

  Future<void> load() async {
    final all = await _queue.all();
    state = state.copyWith(jobs: all);
  }

  Future<SubmitOutcome> submitInspection(String taskId, InspectionDraft draft) =>
      _enqueue(JobKind.inspection, taskId, {'draft': draft.toJson()});

  Future<SubmitOutcome> submitBatterySwap(String taskId, BatterySwapDraft draft) =>
      _enqueue(JobKind.batterySwap, taskId, {'swap': draft.toJson()});

  Future<SubmitOutcome> completeTask(String taskId, CompletionDraft draft) =>
      _enqueue(JobKind.completeTask, taskId, {'completion': draft.toJson()});

  Future<SubmitOutcome> _enqueue(
      JobKind kind, String taskId, Map<String, dynamic> payload) async {
    final now = DateTime.now().toUtc();
    final job = QueuedJob(
      id: newUuid(),
      kind: kind,
      taskId: taskId,
      payload: payload,
      idempotencyKey: newUuid(),
      createdAt: now,
      recordedAt: now,
    );
    await _queue.put(job);
    final all = await _queue.all();
    state = state.copyWith(jobs: all);
    await sync();
    final result = state.results[job.id];
    final current = state.jobs.where((j) => j.id == job.id);
    return SubmitOutcome(current.isEmpty ? job : current.first, result);
  }

  /// Descarta um job que a API recusou (visivel na tela de pendencias).
  Future<void> discard(String jobId) async {
    await _queue.remove(jobId);
    await load();
  }

  /// Reenfileira um job que falhou para nova tentativa (mesma `Idempotency-Key`).
  Future<void> retry(String jobId) async {
    final job = state.jobs.firstWhere((j) => j.id == jobId);
    await _queue.put(QueuedJob(
      id: job.id,
      kind: job.kind,
      taskId: job.taskId,
      payload: job.payload,
      idempotencyKey: job.idempotencyKey,
      createdAt: job.createdAt,
      recordedAt: job.recordedAt,
      photoKeys: job.photoKeys,
    ));
    await sync();
  }

  /// Envia a fila em ordem. Para na primeira falha de rede; jobs recusados pela
  /// API ficam como `failed` e bloqueiam os seguintes da mesma tarefa.
  /// Para chamadas sem espera: nunca deixa erro escapar sem tratamento.
  Future<void> _safeSync() async {
    try {
      await sync();
    } catch (e, st) {
      debugPrint('sync falhou: $e\n$st');
    }
  }

  Future<void> sync() {
    if (_running) {
      _again = true; // itens enfileirados durante a rodada atual
      return _chain!; // quem espera so volta quando a fila drenou
    }
    _running = true;
    return _chain = _syncLoop();
  }

  Future<void> _syncLoop() async {
    try {
      do {
        _again = false;
        await _syncOnce();
      } while (_again);
    } finally {
      _running = false;
    }
  }

  Future<void> _syncOnce() async {
    state = state.copyWith(syncing: true);
    try {
      var authExpired = false;
      final blockedTasks = <String>{};
      final results = Map<String, Object>.of(state.results);
      for (final job in await _queue.all()) {
        if (job.status == JobStatus.failed) {
          blockedTasks.add(job.taskId);
          continue;
        }
        if (blockedTasks.contains(job.taskId)) continue;
        try {
          final result = await _run(job);
          await _queue.remove(job.id);
          results[job.id] = result;
        } on RepositoryException catch (e) {
          if (e.kind == FailureKind.network) break;
          if (e.kind == FailureKind.auth) {
            // Token expirado: mantem pendente e pede novo login.
            authExpired = true;
            break;
          }
          await _queue.put((await _latest(job)).copyWith(
              status: JobStatus.failed, error: e.message));
          blockedTasks.add(job.taskId);
        } on Exception {
          // Falha local (ex.: leitura de arquivo): tenta de novo depois.
          blockedTasks.add(job.taskId);
        }
      }
      final latest = await _queue.all();
      state = state.copyWith(jobs: latest, results: results);
      if (authExpired) await ref.read(sessionProvider.notifier).signOut();
    } finally {
      state = state.copyWith(syncing: false);
    }
  }

  /// Versao mais recente do job na fila (preserva fotos ja enviadas).
  Future<QueuedJob> _latest(QueuedJob job) async {
    final all = await _queue.all();
    return all.firstWhere((j) => j.id == job.id, orElse: () => job);
  }

  Future<Object> _run(QueuedJob job) async {
    switch (job.kind) {
      case JobKind.inspection:
        final draft =
            InspectionDraft.fromJson(job.payload['draft'] as Map<String, dynamic>);
        var keys = job.photoKeys;
        if (keys.length < draft.photoPaths.length) {
          keys = [...keys];
          for (var i = keys.length; i < draft.photoPaths.length; i++) {
            keys.add(await _repo.uploadPhoto(draft.photoPaths[i]));
            // Guarda o progresso: nova tentativa nao reenvia o que ja subiu.
            await _queue.put(job.copyWith(photoKeys: keys));
          }
        }
        return _repo.submitInspection(job.taskId, draft,
            photoKeys: keys,
            recordedAt: job.recordedAt,
            idempotencyKey: job.idempotencyKey);
      case JobKind.batterySwap:
        return _repo.submitBatterySwap(
            job.taskId,
            BatterySwapDraft.fromJson(job.payload['swap'] as Map<String, dynamic>),
            recordedAt: job.recordedAt,
            idempotencyKey: job.idempotencyKey);
      case JobKind.completeTask:
        return _repo.completeTask(
            job.taskId,
            CompletionDraft.fromJson(job.payload['completion'] as Map<String, dynamic>),
            completedAt: job.recordedAt,
            idempotencyKey: job.idempotencyKey);
    }
  }
}

final syncControllerProvider =
    NotifierProvider<SyncController, SyncState>(SyncController.new);
