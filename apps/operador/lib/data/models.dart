import 'dart:math';

/// Leitura maxima legal do limitador (km/h). Acima disso a moto vai para manutencao.
const int legalMaxKmh = 32;

const Object _unset = Object();

/// Rascunho do checklist de inspecao (cinco itens, fotos e observacoes).
class InspectionDraft {
  const InspectionDraft({
    this.brakes,
    this.tires,
    this.lights,
    this.bell,
    this.speedReading,
    this.speedOk,
    this.notes = '',
    this.photoPaths = const [],
  });

  /// `null` = ainda nao respondido; `true` = ok; `false` = com problema.
  final bool? brakes;
  final bool? tires;
  final bool? lights;
  final bool? bell;

  /// Velocidade maxima lida no controlador (0..100).
  final int? speedReading;
  final bool? speedOk;
  final String notes;
  final List<String> photoPaths;

  /// Leitura acima do limite legal: o item nao pode ser "ok".
  bool get speedNonCompliant => (speedReading ?? 0) > legalMaxKmh;

  /// Valor efetivo do item limitador (forcado a "nao ok" acima de 32).
  bool? get effectiveSpeedOk => speedNonCompliant ? false : speedOk;

  static const int totalItems = 5;

  int get answered =>
      [brakes, tires, lights, bell].where((e) => e != null).length +
      ((speedReading != null && effectiveSpeedOk != null) ? 1 : 0);

  bool get allAnswered => answered == totalItems;

  bool get readingValid =>
      speedReading != null && speedReading! >= 0 && speedReading! <= 100;

  bool get canSubmit => allAnswered && readingValid && photoPaths.isNotEmpty;

  InspectionDraft copyWith({
    Object? brakes = _unset,
    Object? tires = _unset,
    Object? lights = _unset,
    Object? bell = _unset,
    Object? speedReading = _unset,
    Object? speedOk = _unset,
    String? notes,
    List<String>? photoPaths,
  }) =>
      InspectionDraft(
        brakes: identical(brakes, _unset) ? this.brakes : brakes as bool?,
        tires: identical(tires, _unset) ? this.tires : tires as bool?,
        lights: identical(lights, _unset) ? this.lights : lights as bool?,
        bell: identical(bell, _unset) ? this.bell : bell as bool?,
        speedReading:
            identical(speedReading, _unset) ? this.speedReading : speedReading as int?,
        speedOk: identical(speedOk, _unset) ? this.speedOk : speedOk as bool?,
        notes: notes ?? this.notes,
        photoPaths: photoPaths ?? this.photoPaths,
      );

  Map<String, dynamic> toJson() => {
        'brakes': brakes,
        'tires': tires,
        'lights': lights,
        'bell': bell,
        'speedReading': speedReading,
        'speedOk': effectiveSpeedOk,
        'notes': notes,
        'photoPaths': photoPaths,
      };

  factory InspectionDraft.fromJson(Map<String, dynamic> j) => InspectionDraft(
        brakes: j['brakes'] as bool?,
        tires: j['tires'] as bool?,
        lights: j['lights'] as bool?,
        bell: j['bell'] as bool?,
        speedReading: j['speedReading'] as int?,
        speedOk: j['speedOk'] as bool?,
        notes: (j['notes'] as String?) ?? '',
        photoPaths: ((j['photoPaths'] as List?) ?? const []).cast<String>(),
      );
}

/// Troca de bateria: numeros de serie lidos (QR ou codigo de barras).
class BatterySwapDraft {
  const BatterySwapDraft({required this.removedSerial, required this.installedSerial});

  final String removedSerial;
  final String installedSerial;

  static const int minSerialLength = 3;

  static bool validSerial(String s) => s.trim().length >= minSerialLength;

  static bool differ(String a, String b) =>
      a.trim().toUpperCase() != b.trim().toUpperCase();

  Map<String, dynamic> toJson() => {'removed': removedSerial, 'installed': installedSerial};

  factory BatterySwapDraft.fromJson(Map<String, dynamic> j) => BatterySwapDraft(
        removedSerial: j['removed'] as String,
        installedSerial: j['installed'] as String,
      );
}

/// Dados de conclusao da tarefa.
class CompletionDraft {
  const CompletionDraft({this.notes, this.vehicleStatus});

  final String? notes;

  /// `free` ou `maintenance`; `null` mantem o status atual.
  final String? vehicleStatus;

  Map<String, dynamic> toJson() => {'notes': notes, 'vehicleStatus': vehicleStatus};

  factory CompletionDraft.fromJson(Map<String, dynamic> j) => CompletionDraft(
        notes: j['notes'] as String?,
        vehicleStatus: j['vehicleStatus'] as String?,
      );
}

enum JobKind { inspection, batterySwap, completeTask }

enum JobStatus { pending, failed }

/// Item da fila offline. `idempotencyKey` e fixa: toda nova tentativa reenvia a mesma.
class QueuedJob {
  const QueuedJob({
    required this.id,
    required this.kind,
    required this.taskId,
    required this.payload,
    required this.idempotencyKey,
    required this.createdAt,
    required this.recordedAt,
    this.status = JobStatus.pending,
    this.error,
    this.photoKeys = const [],
    this.ownerSub,
  });

  final String id;
  final JobKind kind;
  final String taskId;
  final Map<String, dynamic> payload;
  final String idempotencyKey;
  final DateTime createdAt;

  /// Instante real do preenchimento (UTC), enviado como `recordedAt`/`completedAt`.
  final DateTime recordedAt;
  final JobStatus status;
  final String? error;

  /// Chaves de objeto das fotos ja enviadas (evita reenvio em nova tentativa).
  final List<String> photoKeys;

  /// `sub` do operador que enfileirou. `null` = job antigo (migracao do Hive):
  /// dono desconhecido, nunca e enviado automaticamente.
  final String? ownerSub;

  QueuedJob copyWith({JobStatus? status, String? error, List<String>? photoKeys}) => QueuedJob(
        id: id,
        kind: kind,
        taskId: taskId,
        payload: payload,
        idempotencyKey: idempotencyKey,
        createdAt: createdAt,
        recordedAt: recordedAt,
        status: status ?? this.status,
        error: error ?? this.error,
        photoKeys: photoKeys ?? this.photoKeys,
        ownerSub: ownerSub,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'kind': kind.name,
        'taskId': taskId,
        'payload': payload,
        'idempotencyKey': idempotencyKey,
        'createdAt': createdAt.toIso8601String(),
        'recordedAt': recordedAt.toIso8601String(),
        'status': status.name,
        'error': error,
        'photoKeys': photoKeys,
        'ownerSub': ownerSub,
      };

  factory QueuedJob.fromJson(Map<String, dynamic> j) => QueuedJob(
        id: j['id'] as String,
        kind: JobKind.values.byName(j['kind'] as String),
        taskId: j['taskId'] as String,
        payload: Map<String, dynamic>.from(j['payload'] as Map),
        idempotencyKey: j['idempotencyKey'] as String,
        createdAt: DateTime.parse(j['createdAt'] as String),
        recordedAt: DateTime.parse(j['recordedAt'] as String),
        status: JobStatus.values.byName(j['status'] as String),
        error: j['error'] as String?,
        photoKeys: ((j['photoKeys'] as List?) ?? const []).cast<String>(),
        ownerSub: j['ownerSub'] as String?,
      );
}

final _rng = Random.secure();

/// UUID v4 para ids de job e `Idempotency-Key`.
String newUuid() {
  final b = List<int>.generate(16, (_) => _rng.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  final s = b.map((e) => e.toRadixString(16).padLeft(2, '0')).join();
  return '${s.substring(0, 8)}-${s.substring(8, 12)}-${s.substring(12, 16)}-'
      '${s.substring(16, 20)}-${s.substring(20)}';
}
