import 'dart:convert';

import 'package:hive_ce/hive.dart';

import 'models.dart';

/// Armazenamento persistente da fila offline e do cache de tarefas.
abstract class OfflineQueue {
  Future<List<QueuedJob>> all();
  Future<void> put(QueuedJob job);
  Future<void> remove(String id);

  /// Ultima lista de tarefas (JSON) do operador [ownerSub], para consulta sem rede.
  /// O cache e separado por operador: aparelho compartilhado nao mistura listas.
  Future<List<Map<String, dynamic>>> loadTasks(String ownerSub);
  Future<void> saveTasks(String ownerSub, List<Map<String, dynamic>> tasks);

  /// Apaga o cache de tarefas do operador que saiu.
  Future<void> clearTasks(String ownerSub);

  /// Ultima lista de galpoes (JSON): a chegada funciona sem rede. Nao e dado
  /// do operador (galpoes sao da operacao), entao o cache e compartilhado.
  Future<List<Map<String, dynamic>>> loadDepots();
  Future<void> saveDepots(List<Map<String, dynamic>> depots);
}

/// Fila em memoria (testes).
class MemoryOfflineQueue implements OfflineQueue {
  final Map<String, QueuedJob> _jobs = {};
  final Map<String, List<Map<String, dynamic>>> _tasks = {};

  @override
  Future<List<QueuedJob>> all() async =>
      _jobs.values.toList()..sort((a, b) => a.createdAt.compareTo(b.createdAt));

  @override
  Future<void> put(QueuedJob job) async => _jobs[job.id] = job;

  @override
  Future<void> remove(String id) async => _jobs.remove(id);

  @override
  Future<List<Map<String, dynamic>>> loadTasks(String ownerSub) async =>
      _tasks[ownerSub] ?? [];

  @override
  Future<void> saveTasks(String ownerSub, List<Map<String, dynamic>> tasks) async =>
      _tasks[ownerSub] = tasks;

  @override
  Future<void> clearTasks(String ownerSub) async => _tasks.remove(ownerSub);

  List<Map<String, dynamic>> _depots = [];

  @override
  Future<List<Map<String, dynamic>>> loadDepots() async => _depots;

  @override
  Future<void> saveDepots(List<Map<String, dynamic>> depots) async => _depots = depots;
}

/// Fila persistente em Hive (caixas de strings JSON, sem geracao de codigo).
class HiveOfflineQueue implements OfflineQueue {
  HiveOfflineQueue(this._jobs, this._meta);

  final Box<String> _jobs;
  final Box<String> _meta;

  static const _legacyTasksKey = 'tasks';
  static String _tasksKey(String ownerSub) => 'tasks:$ownerSub';
  static const _depotsKey = 'depots';

  static Future<HiveOfflineQueue> open() async {
    final jobs = await Hive.openBox<String>('operator_jobs');
    final meta = await Hive.openBox<String>('operator_meta');
    // Cache antigo sem dono: nao da para saber de quem e, entao some.
    await meta.delete(_legacyTasksKey);
    return HiveOfflineQueue(jobs, meta);
  }

  @override
  Future<List<QueuedJob>> all() async {
    return _jobs.values
        .map((s) => QueuedJob.fromJson(jsonDecode(s) as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  @override
  Future<void> put(QueuedJob job) => _jobs.put(job.id, jsonEncode(job.toJson()));

  @override
  Future<void> remove(String id) => _jobs.delete(id);

  @override
  Future<List<Map<String, dynamic>>> loadTasks(String ownerSub) async {
    final raw = _meta.get(_tasksKey(ownerSub));
    if (raw == null) return [];
    return (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
  }

  @override
  Future<void> saveTasks(String ownerSub, List<Map<String, dynamic>> tasks) =>
      _meta.put(_tasksKey(ownerSub), jsonEncode(tasks));

  @override
  Future<void> clearTasks(String ownerSub) => _meta.delete(_tasksKey(ownerSub));

  @override
  Future<List<Map<String, dynamic>>> loadDepots() async {
    final raw = _meta.get(_depotsKey);
    if (raw == null) return [];
    return (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
  }

  @override
  Future<void> saveDepots(List<Map<String, dynamic>> depots) =>
      _meta.put(_depotsKey, jsonEncode(depots));
}
