// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_task_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$MaintenanceTaskCreate extends MaintenanceTaskCreate {
  @override
  final String vehicleId;
  @override
  final MaintenanceKind kind;
  @override
  final String title;
  @override
  final String? description;
  @override
  final DateTime? scheduledFor;
  @override
  final bool? createFieldTask;

  factory _$MaintenanceTaskCreate(
          [void Function(MaintenanceTaskCreateBuilder)? updates]) =>
      (MaintenanceTaskCreateBuilder()..update(updates))._build();

  _$MaintenanceTaskCreate._(
      {required this.vehicleId,
      required this.kind,
      required this.title,
      this.description,
      this.scheduledFor,
      this.createFieldTask})
      : super._();
  @override
  MaintenanceTaskCreate rebuild(
          void Function(MaintenanceTaskCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MaintenanceTaskCreateBuilder toBuilder() =>
      MaintenanceTaskCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is MaintenanceTaskCreate &&
        vehicleId == other.vehicleId &&
        kind == other.kind &&
        title == other.title &&
        description == other.description &&
        scheduledFor == other.scheduledFor &&
        createFieldTask == other.createFieldTask;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, kind.hashCode);
    _$hash = $jc(_$hash, title.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, scheduledFor.hashCode);
    _$hash = $jc(_$hash, createFieldTask.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'MaintenanceTaskCreate')
          ..add('vehicleId', vehicleId)
          ..add('kind', kind)
          ..add('title', title)
          ..add('description', description)
          ..add('scheduledFor', scheduledFor)
          ..add('createFieldTask', createFieldTask))
        .toString();
  }
}

class MaintenanceTaskCreateBuilder
    implements Builder<MaintenanceTaskCreate, MaintenanceTaskCreateBuilder> {
  _$MaintenanceTaskCreate? _$v;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  MaintenanceKind? _kind;
  MaintenanceKind? get kind => _$this._kind;
  set kind(MaintenanceKind? kind) => _$this._kind = kind;

  String? _title;
  String? get title => _$this._title;
  set title(String? title) => _$this._title = title;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  DateTime? _scheduledFor;
  DateTime? get scheduledFor => _$this._scheduledFor;
  set scheduledFor(DateTime? scheduledFor) =>
      _$this._scheduledFor = scheduledFor;

  bool? _createFieldTask;
  bool? get createFieldTask => _$this._createFieldTask;
  set createFieldTask(bool? createFieldTask) =>
      _$this._createFieldTask = createFieldTask;

  MaintenanceTaskCreateBuilder() {
    MaintenanceTaskCreate._defaults(this);
  }

  MaintenanceTaskCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _vehicleId = $v.vehicleId;
      _kind = $v.kind;
      _title = $v.title;
      _description = $v.description;
      _scheduledFor = $v.scheduledFor;
      _createFieldTask = $v.createFieldTask;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(MaintenanceTaskCreate other) {
    _$v = other as _$MaintenanceTaskCreate;
  }

  @override
  void update(void Function(MaintenanceTaskCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  MaintenanceTaskCreate build() => _build();

  _$MaintenanceTaskCreate _build() {
    final _$result = _$v ??
        _$MaintenanceTaskCreate._(
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'MaintenanceTaskCreate', 'vehicleId'),
          kind: BuiltValueNullFieldError.checkNotNull(
              kind, r'MaintenanceTaskCreate', 'kind'),
          title: BuiltValueNullFieldError.checkNotNull(
              title, r'MaintenanceTaskCreate', 'title'),
          description: description,
          scheduledFor: scheduledFor,
          createFieldTask: createFieldTask,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
