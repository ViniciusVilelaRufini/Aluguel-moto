// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_task.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$MaintenanceTask extends MaintenanceTask {
  @override
  final String id;
  @override
  final String vehicleId;
  @override
  final String? vehicleCode;
  @override
  final MaintenanceKind kind;
  @override
  final String title;
  @override
  final String? description;
  @override
  final MaintenanceStatus status;
  @override
  final DateTime? scheduledFor;
  @override
  final DateTime? completedAt;
  @override
  final String? notes;
  @override
  final String? createdById;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$MaintenanceTask([void Function(MaintenanceTaskBuilder)? updates]) =>
      (MaintenanceTaskBuilder()..update(updates))._build();

  _$MaintenanceTask._(
      {required this.id,
      required this.vehicleId,
      this.vehicleCode,
      required this.kind,
      required this.title,
      this.description,
      required this.status,
      this.scheduledFor,
      this.completedAt,
      this.notes,
      this.createdById,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  MaintenanceTask rebuild(void Function(MaintenanceTaskBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MaintenanceTaskBuilder toBuilder() => MaintenanceTaskBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is MaintenanceTask &&
        id == other.id &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        kind == other.kind &&
        title == other.title &&
        description == other.description &&
        status == other.status &&
        scheduledFor == other.scheduledFor &&
        completedAt == other.completedAt &&
        notes == other.notes &&
        createdById == other.createdById &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, kind.hashCode);
    _$hash = $jc(_$hash, title.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, scheduledFor.hashCode);
    _$hash = $jc(_$hash, completedAt.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jc(_$hash, createdById.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'MaintenanceTask')
          ..add('id', id)
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('kind', kind)
          ..add('title', title)
          ..add('description', description)
          ..add('status', status)
          ..add('scheduledFor', scheduledFor)
          ..add('completedAt', completedAt)
          ..add('notes', notes)
          ..add('createdById', createdById)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class MaintenanceTaskBuilder
    implements Builder<MaintenanceTask, MaintenanceTaskBuilder> {
  _$MaintenanceTask? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  MaintenanceKind? _kind;
  MaintenanceKind? get kind => _$this._kind;
  set kind(MaintenanceKind? kind) => _$this._kind = kind;

  String? _title;
  String? get title => _$this._title;
  set title(String? title) => _$this._title = title;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  MaintenanceStatus? _status;
  MaintenanceStatus? get status => _$this._status;
  set status(MaintenanceStatus? status) => _$this._status = status;

  DateTime? _scheduledFor;
  DateTime? get scheduledFor => _$this._scheduledFor;
  set scheduledFor(DateTime? scheduledFor) =>
      _$this._scheduledFor = scheduledFor;

  DateTime? _completedAt;
  DateTime? get completedAt => _$this._completedAt;
  set completedAt(DateTime? completedAt) => _$this._completedAt = completedAt;

  String? _notes;
  String? get notes => _$this._notes;
  set notes(String? notes) => _$this._notes = notes;

  String? _createdById;
  String? get createdById => _$this._createdById;
  set createdById(String? createdById) => _$this._createdById = createdById;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  MaintenanceTaskBuilder() {
    MaintenanceTask._defaults(this);
  }

  MaintenanceTaskBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _kind = $v.kind;
      _title = $v.title;
      _description = $v.description;
      _status = $v.status;
      _scheduledFor = $v.scheduledFor;
      _completedAt = $v.completedAt;
      _notes = $v.notes;
      _createdById = $v.createdById;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(MaintenanceTask other) {
    _$v = other as _$MaintenanceTask;
  }

  @override
  void update(void Function(MaintenanceTaskBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  MaintenanceTask build() => _build();

  _$MaintenanceTask _build() {
    final _$result = _$v ??
        _$MaintenanceTask._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'MaintenanceTask', 'id'),
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'MaintenanceTask', 'vehicleId'),
          vehicleCode: vehicleCode,
          kind: BuiltValueNullFieldError.checkNotNull(
              kind, r'MaintenanceTask', 'kind'),
          title: BuiltValueNullFieldError.checkNotNull(
              title, r'MaintenanceTask', 'title'),
          description: description,
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'MaintenanceTask', 'status'),
          scheduledFor: scheduledFor,
          completedAt: completedAt,
          notes: notes,
          createdById: createdById,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'MaintenanceTask', 'createdAt'),
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'MaintenanceTask', 'updatedAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
