// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'field_task_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$FieldTaskCreate extends FieldTaskCreate {
  @override
  final FieldTaskType type;
  @override
  final String vehicleId;
  @override
  final TaskPriority priority;
  @override
  final String? assigneeId;
  @override
  final String? notes;
  @override
  final DateTime? dueAt;
  @override
  final double? targetLat;
  @override
  final double? targetLng;
  @override
  final String? maintenanceTaskId;

  factory _$FieldTaskCreate([void Function(FieldTaskCreateBuilder)? updates]) =>
      (FieldTaskCreateBuilder()..update(updates))._build();

  _$FieldTaskCreate._(
      {required this.type,
      required this.vehicleId,
      required this.priority,
      this.assigneeId,
      this.notes,
      this.dueAt,
      this.targetLat,
      this.targetLng,
      this.maintenanceTaskId})
      : super._();
  @override
  FieldTaskCreate rebuild(void Function(FieldTaskCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FieldTaskCreateBuilder toBuilder() => FieldTaskCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is FieldTaskCreate &&
        type == other.type &&
        vehicleId == other.vehicleId &&
        priority == other.priority &&
        assigneeId == other.assigneeId &&
        notes == other.notes &&
        dueAt == other.dueAt &&
        targetLat == other.targetLat &&
        targetLng == other.targetLng &&
        maintenanceTaskId == other.maintenanceTaskId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, priority.hashCode);
    _$hash = $jc(_$hash, assigneeId.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jc(_$hash, dueAt.hashCode);
    _$hash = $jc(_$hash, targetLat.hashCode);
    _$hash = $jc(_$hash, targetLng.hashCode);
    _$hash = $jc(_$hash, maintenanceTaskId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'FieldTaskCreate')
          ..add('type', type)
          ..add('vehicleId', vehicleId)
          ..add('priority', priority)
          ..add('assigneeId', assigneeId)
          ..add('notes', notes)
          ..add('dueAt', dueAt)
          ..add('targetLat', targetLat)
          ..add('targetLng', targetLng)
          ..add('maintenanceTaskId', maintenanceTaskId))
        .toString();
  }
}

class FieldTaskCreateBuilder
    implements Builder<FieldTaskCreate, FieldTaskCreateBuilder> {
  _$FieldTaskCreate? _$v;

  FieldTaskType? _type;
  FieldTaskType? get type => _$this._type;
  set type(FieldTaskType? type) => _$this._type = type;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  TaskPriority? _priority;
  TaskPriority? get priority => _$this._priority;
  set priority(TaskPriority? priority) => _$this._priority = priority;

  String? _assigneeId;
  String? get assigneeId => _$this._assigneeId;
  set assigneeId(String? assigneeId) => _$this._assigneeId = assigneeId;

  String? _notes;
  String? get notes => _$this._notes;
  set notes(String? notes) => _$this._notes = notes;

  DateTime? _dueAt;
  DateTime? get dueAt => _$this._dueAt;
  set dueAt(DateTime? dueAt) => _$this._dueAt = dueAt;

  double? _targetLat;
  double? get targetLat => _$this._targetLat;
  set targetLat(double? targetLat) => _$this._targetLat = targetLat;

  double? _targetLng;
  double? get targetLng => _$this._targetLng;
  set targetLng(double? targetLng) => _$this._targetLng = targetLng;

  String? _maintenanceTaskId;
  String? get maintenanceTaskId => _$this._maintenanceTaskId;
  set maintenanceTaskId(String? maintenanceTaskId) =>
      _$this._maintenanceTaskId = maintenanceTaskId;

  FieldTaskCreateBuilder() {
    FieldTaskCreate._defaults(this);
  }

  FieldTaskCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _type = $v.type;
      _vehicleId = $v.vehicleId;
      _priority = $v.priority;
      _assigneeId = $v.assigneeId;
      _notes = $v.notes;
      _dueAt = $v.dueAt;
      _targetLat = $v.targetLat;
      _targetLng = $v.targetLng;
      _maintenanceTaskId = $v.maintenanceTaskId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(FieldTaskCreate other) {
    _$v = other as _$FieldTaskCreate;
  }

  @override
  void update(void Function(FieldTaskCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  FieldTaskCreate build() => _build();

  _$FieldTaskCreate _build() {
    final _$result = _$v ??
        _$FieldTaskCreate._(
          type: BuiltValueNullFieldError.checkNotNull(
              type, r'FieldTaskCreate', 'type'),
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'FieldTaskCreate', 'vehicleId'),
          priority: BuiltValueNullFieldError.checkNotNull(
              priority, r'FieldTaskCreate', 'priority'),
          assigneeId: assigneeId,
          notes: notes,
          dueAt: dueAt,
          targetLat: targetLat,
          targetLng: targetLng,
          maintenanceTaskId: maintenanceTaskId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
