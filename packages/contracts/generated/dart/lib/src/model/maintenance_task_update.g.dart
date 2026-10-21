// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_task_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$MaintenanceTaskUpdate extends MaintenanceTaskUpdate {
  @override
  final String? title;
  @override
  final String? description;
  @override
  final MaintenanceStatus? status;
  @override
  final DateTime? scheduledFor;
  @override
  final String? notes;

  factory _$MaintenanceTaskUpdate(
          [void Function(MaintenanceTaskUpdateBuilder)? updates]) =>
      (MaintenanceTaskUpdateBuilder()..update(updates))._build();

  _$MaintenanceTaskUpdate._(
      {this.title,
      this.description,
      this.status,
      this.scheduledFor,
      this.notes})
      : super._();
  @override
  MaintenanceTaskUpdate rebuild(
          void Function(MaintenanceTaskUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MaintenanceTaskUpdateBuilder toBuilder() =>
      MaintenanceTaskUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is MaintenanceTaskUpdate &&
        title == other.title &&
        description == other.description &&
        status == other.status &&
        scheduledFor == other.scheduledFor &&
        notes == other.notes;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, title.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, scheduledFor.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'MaintenanceTaskUpdate')
          ..add('title', title)
          ..add('description', description)
          ..add('status', status)
          ..add('scheduledFor', scheduledFor)
          ..add('notes', notes))
        .toString();
  }
}

class MaintenanceTaskUpdateBuilder
    implements Builder<MaintenanceTaskUpdate, MaintenanceTaskUpdateBuilder> {
  _$MaintenanceTaskUpdate? _$v;

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

  String? _notes;
  String? get notes => _$this._notes;
  set notes(String? notes) => _$this._notes = notes;

  MaintenanceTaskUpdateBuilder() {
    MaintenanceTaskUpdate._defaults(this);
  }

  MaintenanceTaskUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _title = $v.title;
      _description = $v.description;
      _status = $v.status;
      _scheduledFor = $v.scheduledFor;
      _notes = $v.notes;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(MaintenanceTaskUpdate other) {
    _$v = other as _$MaintenanceTaskUpdate;
  }

  @override
  void update(void Function(MaintenanceTaskUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  MaintenanceTaskUpdate build() => _build();

  _$MaintenanceTaskUpdate _build() {
    final _$result = _$v ??
        _$MaintenanceTaskUpdate._(
          title: title,
          description: description,
          status: status,
          scheduledFor: scheduledFor,
          notes: notes,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
