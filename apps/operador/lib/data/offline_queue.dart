import 'dart:convert';

import 'package:hive_ce/hive.dart';

import 'models.dart';

/// Armazenamento persistente da fila offline e do cache de tarefas.
abstract class OfflineQueue {
  Future<List<QueuedJob>> all();
  Future<void> put(QueuedJob job);
  Future<void> remove(String id);

  /// Ultima lista de tarefas (JSON) para consulta sem rede.
  Future<List<Map<String, dynamic>>> loadTasks();
  Future<void> saveTasks(List<Map<String, dynamic>> tasks);

  /// Ultima lista de galpoes (JSON): a chegada funciona sem rede.
  Future<List<Map<String, dynamic>>> loadDepots();
  Future<void> saveDepots(List<Map<String, dynamic>> depots);
}

/// Fila em memoria (testes).
class MemoryOfflineQueue implements OfflineQueue {
  final Map<String, QueuedJob> _jobs = {};
  List<Map<String, dynamic>> _tasks = [];

  @override
  Future<List<QueuedJob>> all() async =>
      _jobs.values.toList()..sort((a, b) => a.createdAt.compareTo(b.createdAt));

  @override
  Future<void> put(QueuedJob job) async => _jobs[job.id] = job;

  @override
  Future<void> remove(String id) async => _jobs.remove(id);

  @override
  Future<List<Map<String, dynamic>>> loadTasks() async => _tasks;

  @override
  Future<void> saveTasks(List<Map<String, dynamic>> tasks) async => _tasks = tasks;

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

  static const _tasksKey = 'tasks';
  static const _depotsKey = 'depots';

  static Future<HiveOfflineQueue> open() async {
    final jobs = await Hive.openBox<String>('operator_jobs');
    final meta = await Hive.openBox<String>('operator_meta');
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
  Future<List<Map<String, dynamic>>> loadTasks() async {
    final raw = _meta.get(_tasksKey);
    if (raw == null) return [];
    return (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
  }

  @override
  Future<void> saveTasks(List<Map<String, dynamic>> tasks) =>
      _meta.put(_tasksKey, jsonEncode(tasks));

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
