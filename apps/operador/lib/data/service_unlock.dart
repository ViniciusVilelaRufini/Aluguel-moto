import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

/// Tarefas com a moto destravada em modo servico. Persistido para sobreviver
/// a reinicios do app (a API ainda nao expoe esse estado no `FieldTask`).
abstract class ServiceUnlockStore {
  /// Leitura sincrona (a caixa ja esta aberta).
  Set<String> all();
  Future<void> add(String taskId, DateTime at);
  Future<void> remove(String taskId);
}

class MemoryServiceUnlockStore implements ServiceUnlockStore {
  MemoryServiceUnlockStore([Iterable<String> initial = const []]) : _ids = {...initial};

  final Set<String> _ids;

  @override
  Set<String> all() => {..._ids};

  @override
  Future<void> add(String taskId, DateTime at) async => _ids.add(taskId);

  @override
  Future<void> remove(String taskId) async => _ids.remove(taskId);
}

/// Caixa Hive `operator_service_unlock`: id da tarefa -> instante (ISO 8601).
class HiveServiceUnlockStore implements ServiceUnlockStore {
  HiveServiceUnlockStore(this._box);

  final Box<String> _box;

  static Future<HiveServiceUnlockStore> open() async =>
      HiveServiceUnlockStore(await Hive.openBox<String>('operator_service_unlock'));

  @override
  Set<String> all() => _box.keys.cast<String>().toSet();

  @override
  Future<void> add(String taskId, DateTime at) =>
      _box.put(taskId, at.toUtc().toIso8601String());

  @override
  Future<void> remove(String taskId) => _box.delete(taskId);
}

/// Sobrescrito em `main` com a caixa Hive.
final serviceUnlockStoreProvider =
    Provider<ServiceUnlockStore>((ref) => MemoryServiceUnlockStore());

class ServiceUnlockController extends Notifier<Set<String>> {
  ServiceUnlockStore get _store => ref.read(serviceUnlockStoreProvider);

  @override
  Set<String> build() => ref.watch(serviceUnlockStoreProvider).all();

  bool isUnlocked(String taskId) => state.contains(taskId);

  Future<void> markUnlocked(String taskId) async {
    await _store.add(taskId, DateTime.now());
    state = {...state, taskId};
  }

  /// Tarefa concluida: o modo servico deixa de valer.
  Future<void> clear(String taskId) async {
    await _store.remove(taskId);
    state = {...state}..remove(taskId);
  }
}

final serviceUnlockProvider =
    NotifierProvider<ServiceUnlockController, Set<String>>(ServiceUnlockController.new);
