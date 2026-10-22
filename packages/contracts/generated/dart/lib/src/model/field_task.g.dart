// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'field_task.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$FieldTask extends FieldTask {
  @override
  final String id;
  @override
  final FieldTaskType type;
  @override
  final FieldTaskStatus status;
  @override
  final TaskPriority priority;
  @override
  final String vehicleId;
  @override
  final String vehicleCode;
  @override
  final double? vehicleLat;
  @override
  final double? vehicleLng;
  @override
  final int? vehicleBatteryPct;
  @override
  final VehicleStatus? vehicleStatus;
  @override
  final String? vehicleAddress;
  @override
  final String? vehicleBatterySerial;
  @override
  final int? vehicleBatteryCycleCount;
  @override
  final String? targetAddress;
  @override
  final double? targetLat;
  @override
  final double? targetLng;
  @override
  final String? assigneeId;
  @override
  final String? assigneeName;
  @override
  final String? notes;
  @override
  final DateTime? dueAt;
  @override
  final String? maintenanceTaskId;
  @override
  final String? createdById;
  @override
  final String? completionNotes;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;
  @override
  final DateTime? startedAt;
  @override
  final DateTime? completedAt;

  factory _$FieldTask([void Function(FieldTaskBuilder)? updates]) =>
      (FieldTaskBuilder()..update(updates))._build();

  _$FieldTask._(
      {required this.id,
      required this.type,
      required this.status,
      required this.priority,
      required this.vehicleId,
      required this.vehicleCode,
      this.vehicleLat,
      this.vehicleLng,
      this.vehicleBatteryPct,
      this.vehicleStatus,
      this.vehicleAddress,
      this.vehicleBatterySerial,
      this.vehicleBatteryCycleCount,
      this.targetAddress,
      this.targetLat,
      this.targetLng,
      this.assigneeId,
      this.assigneeName,
      this.notes,
      this.dueAt,
      this.maintenanceTaskId,
      this.createdById,
      this.completionNotes,
      required this.createdAt,
      required this.updatedAt,
      this.startedAt,
      this.completedAt})
      : super._();
  @override
  FieldTask rebuild(void Function(FieldTaskBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FieldTaskBuilder toBuilder() => FieldTaskBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is FieldTask &&
        id == other.id &&
        type == other.type &&
        status == other.status &&
        priority == other.priority &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        vehicleLat == other.vehicleLat &&
        vehicleLng == other.vehicleLng &&
        vehicleBatteryPct == other.vehicleBatteryPct &&
        vehicleStatus == other.vehicleStatus &&
        vehicleAddress == other.vehicleAddress &&
        vehicleBatterySerial == other.vehicleBatterySerial &&
        vehicleBatteryCycleCount == other.vehicleBatteryCycleCount &&
        targetAddress == other.targetAddress &&
        targetLat == other.targetLat &&
        targetLng == other.targetLng &&
        assigneeId == other.assigneeId &&
        assigneeName == other.assigneeName &&
        notes == other.notes &&
        dueAt == other.dueAt &&
        maintenanceTaskId == other.maintenanceTaskId &&
        createdById == other.createdById &&
        completionNotes == other.completionNotes &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt &&
        startedAt == other.startedAt &&
        completedAt == other.completedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, priority.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, vehicleLat.hashCode);
    _$hash = $jc(_$hash, vehicleLng.hashCode);
    _$hash = $jc(_$hash, vehicleBatteryPct.hashCode);
    _$hash = $jc(_$hash, vehicleStatus.hashCode);
    _$hash = $jc(_$hash, vehicleAddress.hashCode);
    _$hash = $jc(_$hash, vehicleBatterySerial.hashCode);
    _$hash = $jc(_$hash, vehicleBatteryCycleCount.hashCode);
    _$hash = $jc(_$hash, targetAddress.hashCode);
    _$hash = $jc(_$hash, targetLat.hashCode);
    _$hash = $jc(_$hash, targetLng.hashCode);
    _$hash = $jc(_$hash, assigneeId.hashCode);
    _$hash = $jc(_$hash, assigneeName.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jc(_$hash, dueAt.hashCode);
    _$hash = $jc(_$hash, maintenanceTaskId.hashCode);
    _$hash = $jc(_$hash, createdById.hashCode);
    _$hash = $jc(_$hash, completionNotes.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jc(_$hash, startedAt.hashCode);
    _$hash = $jc(_$hash, completedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'FieldTask')
          ..add('id', id)
          ..add('type', type)
          ..add('status', status)
          ..add('priority', priority)
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('vehicleLat', vehicleLat)
          ..add('vehicleLng', vehicleLng)
          ..add('vehicleBatteryPct', vehicleBatteryPct)
          ..add('vehicleStatus', vehicleStatus)
          ..add('vehicleAddress', vehicleAddress)
          ..add('vehicleBatterySerial', vehicleBatterySerial)
          ..add('vehicleBatteryCycleCount', vehicleBatteryCycleCount)
          ..add('targetAddress', targetAddress)
          ..add('targetLat', targetLat)
          ..add('targetLng', targetLng)
          ..add('assigneeId', assigneeId)
          ..add('assigneeName', assigneeName)
          ..add('notes', notes)
          ..add('dueAt', dueAt)
          ..add('maintenanceTaskId', maintenanceTaskId)
          ..add('createdById', createdById)
          ..add('completionNotes', completionNotes)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt)
          ..add('startedAt', startedAt)
          ..add('completedAt', completedAt))
        .toString();
  }
}

class FieldTaskBuilder implements Builder<FieldTask, FieldTaskBuilder> {
  _$FieldTask? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  FieldTaskType? _type;
  FieldTaskType? get type => _$this._type;
  set type(FieldTaskType? type) => _$this._type = type;

  FieldTaskStatus? _status;
  FieldTaskStatus? get status => _$this._status;
  set status(FieldTaskStatus? status) => _$this._status = status;

  TaskPriority? _priority;
  TaskPriority? get priority => _$this._priority;
  set priority(TaskPriority? priority) => _$this._priority = priority;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  double? _vehicleLat;
  double? get vehicleLat => _$this._vehicleLat;
  set vehicleLat(double? vehicleLat) => _$this._vehicleLat = vehicleLat;

  double? _vehicleLng;
  double? get vehicleLng => _$this._vehicleLng;
  set vehicleLng(double? vehicleLng) => _$this._vehicleLng = vehicleLng;

  int? _vehicleBatteryPct;
  int? get vehicleBatteryPct => _$this._vehicleBatteryPct;
  set vehicleBatteryPct(int? vehicleBatteryPct) =>
      _$this._vehicleBatteryPct = vehicleBatteryPct;

  VehicleStatus? _vehicleStatus;
  VehicleStatus? get vehicleStatus => _$this._vehicleStatus;
  set vehicleStatus(VehicleStatus? vehicleStatus) =>
      _$this._vehicleStatus = vehicleStatus;

  String? _vehicleAddress;
  String? get vehicleAddress => _$this._vehicleAddress;
  set vehicleAddress(String? vehicleAddress) =>
      _$this._vehicleAddress = vehicleAddress;

  String? _vehicleBatterySerial;
  String? get vehicleBatterySerial => _$this._vehicleBatterySerial;
  set vehicleBatterySerial(String? vehicleBatterySerial) =>
      _$this._vehicleBatterySerial = vehicleBatterySerial;

  int? _vehicleBatteryCycleCount;
  int? get vehicleBatteryCycleCount => _$this._vehicleBatteryCycleCount;
  set vehicleBatteryCycleCount(int? vehicleBatteryCycleCount) =>
      _$this._vehicleBatteryCycleCount = vehicleBatteryCycleCount;

  String? _targetAddress;
  String? get targetAddress => _$this._targetAddress;
  set targetAddress(String? targetAddress) =>
      _$this._targetAddress = targetAddress;

  double? _targetLat;
  double? get targetLat => _$this._targetLat;
  set targetLat(double? targetLat) => _$this._targetLat = targetLat;

  double? _targetLng;
  double? get targetLng => _$this._targetLng;
  set targetLng(double? targetLng) => _$this._targetLng = targetLng;

  String? _assigneeId;
  String? get assigneeId => _$this._assigneeId;
  set assigneeId(String? assigneeId) => _$this._assigneeId = assigneeId;

  String? _assigneeName;
  String? get assigneeName => _$this._assigneeName;
  set assigneeName(String? assigneeName) => _$this._assigneeName = assigneeName;

  String? _notes;
  String? get notes => _$this._notes;
  set notes(String? notes) => _$this._notes = notes;

  DateTime? _dueAt;
  DateTime? get dueAt => _$this._dueAt;
  set dueAt(DateTime? dueAt) => _$this._dueAt = dueAt;

  String? _maintenanceTaskId;
  String? get maintenanceTaskId => _$this._maintenanceTaskId;
  set maintenanceTaskId(String? maintenanceTaskId) =>
      _$this._maintenanceTaskId = maintenanceTaskId;

  String? _createdById;
  String? get createdById => _$this._createdById;
  set createdById(String? createdById) => _$this._createdById = createdById;

  String? _completionNotes;
  String? get completionNotes => _$this._completionNotes;
  set completionNotes(String? completionNotes) =>
      _$this._completionNotes = completionNotes;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  DateTime? _startedAt;
  DateTime? get startedAt => _$this._startedAt;
  set startedAt(DateTime? startedAt) => _$this._startedAt = startedAt;

  DateTime? _completedAt;
  DateTime? get completedAt => _$this._completedAt;
  set completedAt(DateTime? completedAt) => _$this._completedAt = completedAt;

  FieldTaskBuilder() {
    FieldTask._defaults(this);
  }

  FieldTaskBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _type = $v.type;
      _status = $v.status;
      _priority = $v.priority;
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _vehicleLat = $v.vehicleLat;
      _vehicleLng = $v.vehicleLng;
      _vehicleBatteryPct = $v.vehicleBatteryPct;
      _vehicleStatus = $v.vehicleStatus;
      _vehicleAddress = $v.vehicleAddress;
      _vehicleBatterySerial = $v.vehicleBatterySerial;
      _vehicleBatteryCycleCount = $v.vehicleBatteryCycleCount;
      _targetAddress = $v.targetAddress;
      _targetLat = $v.targetLat;
      _targetLng = $v.targetLng;
      _assigneeId = $v.assigneeId;
      _assigneeName = $v.assigneeName;
      _notes = $v.notes;
      _dueAt = $v.dueAt;
      _maintenanceTaskId = $v.maintenanceTaskId;
      _createdById = $v.createdById;
      _completionNotes = $v.completionNotes;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _startedAt = $v.startedAt;
      _completedAt = $v.completedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(FieldTask other) {
    _$v = other as _$FieldTask;
  }

  @override
  void update(void Function(FieldTaskBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  FieldTask build() => _build();

  _$FieldTask _build() {
    final _$result = _$v ??
        _$FieldTask._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'FieldTask', 'id'),
          type:
              BuiltValueNullFieldError.checkNotNull(type, r'FieldTask', 'type'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'FieldTask', 'status'),
          priority: BuiltValueNullFieldError.checkNotNull(
              priority, r'FieldTask', 'priority'),
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'FieldTask', 'vehicleId'),
          vehicleCode: BuiltValueNullFieldError.checkNotNull(
              vehicleCode, r'FieldTask', 'vehicleCode'),
          vehicleLat: vehicleLat,
          vehicleLng: vehicleLng,
          vehicleBatteryPct: vehicleBatteryPct,
          vehicleStatus: vehicleStatus,
          vehicleAddress: vehicleAddress,
          vehicleBatterySerial: vehicleBatterySerial,
          vehicleBatteryCycleCount: vehicleBatteryCycleCount,
          targetAddress: targetAddress,
          targetLat: targetLat,
          targetLng: targetLng,
          assigneeId: assigneeId,
          assigneeName: assigneeName,
          notes: notes,
          dueAt: dueAt,
          maintenanceTaskId: maintenanceTaskId,
          createdById: createdById,
          completionNotes: completionNotes,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'FieldTask', 'createdAt'),
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'FieldTask', 'updatedAt'),
          startedAt: startedAt,
          completedAt: completedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
