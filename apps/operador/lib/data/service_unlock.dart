import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';
import 'package:volti_api/volti_api.dart';

/// Tarefas com a moto destravada em modo servico (id da tarefa -> instante do
/// destravamento). Persistido para sobreviver a reinicios do app (a API ainda
/// nao expoe esse estado no `FieldTask`; proposta em docs/decisoes.md).
abstract class ServiceUnlockStore {
  /// Leitura sincrona (a caixa ja esta aberta).
  Map<String, DateTime> entries();
  Future<void> add(String taskId, DateTime at);
  Future<void> remove(String taskId);
  Future<void> clear();
}

class MemoryServiceUnlockStore implements ServiceUnlockStore {
  /// [ids] destravados agora.
  MemoryServiceUnlockStore([Iterable<String> ids = const []])
      : _entries = {for (final id in ids) id: DateTime.now().toUtc()};

  MemoryServiceUnlockStore.at(Map<String, DateTime> entries) : _entries = {...entries};

  final Map<String, DateTime> _entries;

  @override
  Map<String, DateTime> entries() => {..._entries};

  @override
  Future<void> add(String taskId, DateTime at) async => _entries[taskId] = at.toUtc();

  @override
  Future<void> remove(String taskId) async => _entries.remove(taskId);

  @override
  Future<void> clear() async => _entries.clear();
}

/// Caixa Hive `operator_service_unlock`: id da tarefa -> instante (ISO 8601).
class HiveServiceUnlockStore implements ServiceUnlockStore {
  HiveServiceUnlockStore(this._box);

  final Box<String> _box;

  static Future<HiveServiceUnlockStore> open() async =>
      HiveServiceUnlockStore(await Hive.openBox<String>('operator_service_unlock'));

  @override
  Map<String, DateTime> entries() => {
        for (final k in _box.keys.cast<String>())
          // Valor ilegivel conta como muito antigo (expira).
          k: DateTime.tryParse(_box.get(k) ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      };

  @override
  Future<void> add(String taskId, DateTime at) =>
      _box.put(taskId, at.toUtc().toIso8601String());

  @override
  Future<void> remove(String taskId) => _box.delete(taskId);

  @override
  Future<void> clear() => _box.clear().then((_) {});
}

/// Sobrescrito em `main` com a caixa Hive.
final serviceUnlockStoreProvider =
    Provider<ServiceUnlockStore>((ref) => MemoryServiceUnlockStore());

/// Validade do modo servico guardado (padrao 2 h). Passado disso, o operador
/// destrava de novo (a moto pode ter sido travada pelo sistema nesse meio-tempo).
final serviceUnlockTtlProvider = Provider<Duration>((ref) => const Duration(hours: 2));

/// Relogio (sobrescrito nos testes).
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

/// Status da moto em que o modo servico ainda faz sentido.
bool serviceUnlockCompatible(VehicleStatus? status) =>
    status == null || status == VehicleStatus.free || status == VehicleStatus.maintenance;

/// Estado: id da tarefa -> instante do destravamento (so entradas validas).
class ServiceUnlockController extends Notifier<Map<String, DateTime>> {
  ServiceUnlockStore get _store => ref.read(serviceUnlockStoreProvider);

  @override
  Map<String, DateTime> build() {
    final store = ref.watch(serviceUnlockStoreProvider);
    final valid = <String, DateTime>{};
    for (final e in store.entries().entries) {
      if (_fresh(e.value)) {
        valid[e.key] = e.value;
      } else {
        unawaited(store.remove(e.key)); // expirada: some do armazenamento
      }
    }
    return valid;
  }

  bool _fresh(DateTime at) =>
      ref.read(clockProvider)().toUtc().difference(at.toUtc()) < ref.read(serviceUnlockTtlProvider);

  /// Destravada e dentro da validade (reavalia o relogio a cada chamada).
  bool isUnlocked(String taskId) {
    final at = state[taskId];
    return at != null && _fresh(at);
  }

  Future<void> markUnlocked(String taskId) async {
    final at = ref.read(clockProvider)().toUtc();
    await _store.add(taskId, at);
    state = {...state, taskId: at};
  }

  /// Tarefa concluida: o modo servico deixa de valer.
  Future<void> clear(String taskId) async {
    if (!state.containsKey(taskId)) return;
    await _store.remove(taskId);
    state = {...state}..remove(taskId);
  }

  /// Saida da conta: nada do operador anterior fica destravado.
  Future<void> clearAll() async {
    await _store.clear();
    state = const {};
  }

  /// Lista nova da API: mantem so as tarefas ainda atribuidas a este operador,
  /// abertas (nem concluidas nem canceladas) e com a moto num status compativel.
  /// [vehicleStatuses] = status conhecidos por id da moto.
  Future<void> reconcile(Iterable<FieldTask> assigned,
      {Map<String, VehicleStatus> vehicleStatuses = const {}}) async {
    final open = {
      for (final t in assigned)
        if (t.status != FieldTaskStatus.done &&
            t.status != FieldTaskStatus.canceled &&
            serviceUnlockCompatible(vehicleStatuses[t.vehicleId]))
          t.id,
    };
    final stale = state.keys.where((id) => !open.contains(id) || !isUnlocked(id)).toList();
    if (stale.isEmpty) return;
    for (final id in stale) {
      await _store.remove(id);
    }
    state = {...state}..removeWhere((k, _) => stale.contains(k));
  }
}

final serviceUnlockProvider =
    NotifierProvider<ServiceUnlockController, Map<String, DateTime>>(ServiceUnlockController.new);
