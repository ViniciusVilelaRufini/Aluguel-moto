import 'dart:async';

import 'package:flutter/foundation.dart';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/auth.dart';
import 'field_repository.dart';
import 'handover_models.dart';
import 'models.dart';
import 'offline_queue.dart';

/// Avisa quando a rede volta.
abstract class ConnectivityMonitor {
  /// Emite `true` quando ha conexao.
  Stream<bool> get onlineChanges;

  /// Estado atual (a abertura do app nao gera evento de conectividade).
  Future<bool> isOnline();
}

class PlatformConnectivityMonitor implements ConnectivityMonitor {
  static bool _online(List<ConnectivityResult> r) => r.any((e) => e != ConnectivityResult.none);

  @override
  Stream<bool> get onlineChanges => Connectivity().onConnectivityChanged.map(_online);

  @override
  Future<bool> isOnline() async => _online(await Connectivity().checkConnectivity());
}

/// Fila persistente (sobrescrita em `main` com Hive).
final offlineQueueProvider = Provider<OfflineQueue>((ref) => MemoryOfflineQueue());

final connectivityMonitorProvider =
    Provider<ConnectivityMonitor>((ref) => PlatformConnectivityMonitor());

/// Ha rede? Comeca pelo estado atual e segue os eventos (banner global).
final onlineProvider = StreamProvider<bool>((ref) async* {
  final monitor = ref.watch(connectivityMonitorProvider);
  try {
    yield await monitor.isOnline();
  } catch (_) {
    yield true;
  }
  yield* monitor.onlineChanges;
});

class SyncState {
  const SyncState({
    this.allJobs = const [],
    this.owner,
    this.syncing = false,
    this.results = const {},
  });

  /// Tudo o que ha na fila do aparelho (de qualquer operador).
  final List<QueuedJob> allJobs;

  /// `sub` do operador logado.
  final String? owner;

  /// Pendencias do operador atual e jobs antigos sem dono (so descartaveis).
  /// Jobs de outros operadores ficam retidos e invisiveis.
  List<QueuedJob> get jobs =>
      allJobs.where((j) => j.ownerSub == null || j.ownerSub == owner).toList();

  /// Jobs antigos de dono desconhecido: "pendente de outro operador".
  List<QueuedJob> get orphans => allJobs.where((j) => j.ownerSub == null).toList();

  List<QueuedJob> get _mine =>
      owner == null ? const [] : allJobs.where((j) => j.ownerSub == owner).toList();
  final bool syncing;

  /// Resultado da API por id de job ja sincronizado nesta sessao
  /// (`Inspection`, `BatterySwap` ou `FieldTask`).
  final Map<String, Object> results;

  List<QueuedJob> get pending => _mine.where((j) => j.status == JobStatus.pending).toList();
  List<QueuedJob> get failed => _mine.where((j) => j.status == JobStatus.failed).toList();

  bool hasPending(String taskId, [JobKind? kind]) => pending
      .any((j) => j.taskId == taskId && (kind == null || j.kind == kind));

  SyncState copyWith({
    List<QueuedJob>? allJobs,
    String? owner,
    bool clearOwner = false,
    bool? syncing,
    Map<String, Object>? results,
  }) =>
      SyncState(
        allJobs: allJobs ?? this.allJobs,
        owner: clearOwner ? null : (owner ?? this.owner),
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
    ref.listen(ownerSubProvider, (prev, next) {
      // Troca de conta: a lista mostrada passa a ser a do novo operador.
      state = next == null ? state.copyWith(clearOwner: true) : state.copyWith(owner: next);
      if (next != null) unawaited(_safeSync());
    });
    // Partida a frio ja online: nao ha evento de conectividade, entao sincroniza agora.
    unawaited(load().then((_) => _safeSync()));
    return SyncState(owner: ref.read(ownerSubProvider));
  }

  Future<void> load() async {
    final all = await _queue.all();
    state = _withOwner(all);
  }

  /// Fila nova com o dono da sessao de agora.
  SyncState _withOwner(List<QueuedJob> all) {
    final owner = ref.read(ownerSubProvider);
    return owner == null
        ? state.copyWith(allJobs: all, clearOwner: true)
        : state.copyWith(allJobs: all, owner: owner);
  }

  Future<SubmitOutcome> submitInspection(String taskId, InspectionDraft draft) =>
      _enqueue(JobKind.inspection, taskId, {'draft': draft.toJson()});

  Future<SubmitOutcome> submitBatterySwap(String taskId, BatterySwapDraft draft) =>
      _enqueue(JobKind.batterySwap, taskId, {'swap': draft.toJson()});

  Future<SubmitOutcome> completeTask(String taskId, CompletionDraft draft) =>
      _enqueue(JobKind.completeTask, taskId, {'completion': draft.toJson()});

  /// Chegada de aluguel no galpao: entra na fila como os outros checklists.
  /// O `taskId` do job agrupa por moto (`arrival:<codigo>`).
  Future<SubmitOutcome> submitReturnHandover(ReturnArrival arrival) => _enqueue(
      JobKind.returnHandover,
      'arrival:${arrival.vehicleCode.trim().toUpperCase()}',
      {'arrival': arrival.toJson()});

  Future<SubmitOutcome> _enqueue(
      JobKind kind, String taskId, Map<String, dynamic> payload) async {
    final owner = ref.read(ownerSubProvider);
    if (owner == null) throw StateError('sem sessao: nada a enfileirar');
    final now = DateTime.now().toUtc();
    final job = QueuedJob(
      ownerSub: owner,
      id: newUuid(),
      kind: kind,
      taskId: taskId,
      payload: payload,
      idempotencyKey: newUuid(),
      createdAt: now,
      recordedAt: now,
    );
    await _queue.put(job);
    state = _withOwner(await _queue.all());
    await sync();
    final result = state.results[job.id];
    final current = state.allJobs.where((j) => j.id == job.id);
    return SubmitOutcome(current.isEmpty ? job : current.first, result);
  }

  /// Descarta um job que a API recusou (visivel na tela de pendencias).
  Future<void> discard(String jobId) async {
    // So o proprio operador (ou um job sem dono) pode descartar.
    final job = state.jobs.where((j) => j.id == jobId);
    if (job.isEmpty) return;
    await _queue.remove(jobId);
    await load();
  }

  /// Reenfileira um job que falhou para nova tentativa (mesma `Idempotency-Key`).
  Future<void> retry(String jobId) async {
    final mine = state.jobs.where((j) => j.id == jobId && j.ownerSub == state.owner);
    if (mine.isEmpty) return; // job de outro operador ou sem dono: so descarta
    final job = mine.first;
    await _queue.put(QueuedJob(
      ownerSub: job.ownerSub,
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
      final owner = ref.read(ownerSubProvider);
      for (final job in await _queue.all()) {
        // Troca de conta (ou logout) durante a rodada: para antes do proximo
        // job, para nada do dono anterior sair com o token de outro operador.
        if (ref.read(ownerSubProvider) != owner) break;
        // Fila de aparelho compartilhado: so envia o que e do operador atual.
        // Os demais ficam retidos ate o dono voltar (sem dono: so descarte).
        if (owner == null || job.ownerSub != owner) continue;
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
      state = _withOwner(latest).copyWith(results: results);
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
      case JobKind.returnHandover:
        return _runReturn(job);
    }
  }

  Future<Object> _runReturn(QueuedJob job) async {
    var arrival =
        ReturnArrival.fromJson(Map<String, dynamic>.from(job.payload['arrival'] as Map));
    var current = job;
    // Guardado sem rede so com o codigo da moto: descobre o aluguel aberto agora.
    if (arrival.rentalId == null) {
      final vehicle = await _repo.vehicleByCode(arrival.vehicleCode);
      final rentalId = vehicle.currentRentalId;
      if (rentalId == null) {
        throw RepositoryException(FailureKind.rejected, noOpenRentalMessage,
            slug: 'no-open-rental');
      }
      arrival = ReturnArrival(
          vehicleCode: arrival.vehicleCode,
          depotId: arrival.depotId,
          rentalId: rentalId,
          draft: arrival.draft);
      current = _withPayload(current, {'arrival': arrival.toJson()});
      await _queue.put(current);
    }
    final paths = arrival.draft.photoPaths;
    var keys = current.photoKeys;
    if (keys.length < paths.length) {
      keys = [...keys];
      for (var i = keys.length; i < paths.length; i++) {
        keys.add(await _repo.uploadHandoverPhoto(paths[i]));
        current = current.copyWith(photoKeys: keys);
        await _queue.put(current);
      }
    }
    try {
      return await _repo.createReturnHandover(
        rentalId: arrival.rentalId!,
        depotId: arrival.depotId,
        draft: arrival.draft,
        photoKeys: keys,
      );
    } on RepositoryException catch (e) {
      // Run-2: a API so encerra com a moto (posicao ao vivo) no galpao; fora
      // disso o caminho e o encerramento forcado pelo suporte.
      if (e.slug == 'vehicle-not-at-depot') {
        throw RepositoryException(FailureKind.rejected, vehicleNotAtDepotMessage,
            slug: e.slug, status: e.status);
      }
      // Resposta perdida e reenvio: a chegada ja foi registrada se o aluguel
      // guardado nao esta mais aberto na moto.
      if (e.status != 409) rethrow;
      final vehicle = await _repo.vehicleByCode(arrival.vehicleCode);
      if (vehicle.currentRentalId == arrival.rentalId) rethrow;
      return ReturnAlreadyRegistered(arrival.rentalId!);
    }
  }

  QueuedJob _withPayload(QueuedJob j, Map<String, dynamic> payload) => QueuedJob(
        id: j.id,
        kind: j.kind,
        taskId: j.taskId,
        payload: payload,
        idempotencyKey: j.idempotencyKey,
        createdAt: j.createdAt,
        recordedAt: j.recordedAt,
        status: j.status,
        error: j.error,
        photoKeys: j.photoKeys,
        // O job regravado continua do mesmo operador (sem dono ele so poderia ser descartado).
        ownerSub: j.ownerSub,
      );
}

/// Resultado de um `return_depot` reenviado que a API ja tinha registrado
/// (409 e o aluguel nao esta mais aberto na moto).
class ReturnAlreadyRegistered {
  const ReturnAlreadyRegistered(this.rentalId);
  final String rentalId;
}

/// Motivo exibido quando a moto que chegou nao tem aluguel aberto.
const noOpenRentalMessage = 'Esta moto não tem aluguel aberto.';

/// Chegada recusada (`422 vehicle-not-at-depot`): a moto nao esta no galpao.
const vehicleNotAtDepotMessage =
    'A moto não está no galpão. Use o encerramento forçado pelo suporte.';

final syncControllerProvider =
    NotifierProvider<SyncController, SyncState>(SyncController.new);
