// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'field_task_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$FieldTaskUpdate extends FieldTaskUpdate {
  @override
  final TaskPriority? priority;
  @override
  final String? assigneeId;
  @override
  final String? notes;
  @override
  final DateTime? dueAt;
  @override
  final FieldTaskStatus? status;

  factory _$FieldTaskUpdate([void Function(FieldTaskUpdateBuilder)? updates]) =>
      (FieldTaskUpdateBuilder()..update(updates))._build();

  _$FieldTaskUpdate._(
      {this.priority, this.assigneeId, this.notes, this.dueAt, this.status})
      : super._();
  @override
  FieldTaskUpdate rebuild(void Function(FieldTaskUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FieldTaskUpdateBuilder toBuilder() => FieldTaskUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is FieldTaskUpdate &&
        priority == other.priority &&
        assigneeId == other.assigneeId &&
        notes == other.notes &&
        dueAt == other.dueAt &&
        status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, priority.hashCode);
    _$hash = $jc(_$hash, assigneeId.hashCode);
    _$hash = $jc(_$hash, notes.hashCode);
    _$hash = $jc(_$hash, dueAt.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'FieldTaskUpdate')
          ..add('priority', priority)
          ..add('assigneeId', assigneeId)
          ..add('notes', notes)
          ..add('dueAt', dueAt)
          ..add('status', status))
        .toString();
  }
}

class FieldTaskUpdateBuilder
    implements Builder<FieldTaskUpdate, FieldTaskUpdateBuilder> {
  _$FieldTaskUpdate? _$v;

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

  FieldTaskStatus? _status;
  FieldTaskStatus? get status => _$this._status;
  set status(FieldTaskStatus? status) => _$this._status = status;

  FieldTaskUpdateBuilder() {
    FieldTaskUpdate._defaults(this);
  }

  FieldTaskUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _priority = $v.priority;
      _assigneeId = $v.assigneeId;
      _notes = $v.notes;
      _dueAt = $v.dueAt;
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(FieldTaskUpdate other) {
    _$v = other as _$FieldTaskUpdate;
  }

  @override
  void update(void Function(FieldTaskUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  FieldTaskUpdate build() => _build();

  _$FieldTaskUpdate _build() {
    final _$result = _$v ??
        _$FieldTaskUpdate._(
          priority: priority,
          assigneeId: assigneeId,
          notes: notes,
          dueAt: dueAt,
          status: status,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
