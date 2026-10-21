// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'restriction_entry.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RestrictionEntry extends RestrictionEntry {
  @override
  final String id;
  @override
  final String cpf;
  @override
  final String reason;
  @override
  final String? createdById;
  @override
  final DateTime createdAt;

  factory _$RestrictionEntry(
          [void Function(RestrictionEntryBuilder)? updates]) =>
      (RestrictionEntryBuilder()..update(updates))._build();

  _$RestrictionEntry._(
      {required this.id,
      required this.cpf,
      required this.reason,
      this.createdById,
      required this.createdAt})
      : super._();
  @override
  RestrictionEntry rebuild(void Function(RestrictionEntryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RestrictionEntryBuilder toBuilder() =>
      RestrictionEntryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RestrictionEntry &&
        id == other.id &&
        cpf == other.cpf &&
        reason == other.reason &&
        createdById == other.createdById &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, cpf.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, createdById.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RestrictionEntry')
          ..add('id', id)
          ..add('cpf', cpf)
          ..add('reason', reason)
          ..add('createdById', createdById)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class RestrictionEntryBuilder
    implements Builder<RestrictionEntry, RestrictionEntryBuilder> {
  _$RestrictionEntry? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _cpf;
  String? get cpf => _$this._cpf;
  set cpf(String? cpf) => _$this._cpf = cpf;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  String? _createdById;
  String? get createdById => _$this._createdById;
  set createdById(String? createdById) => _$this._createdById = createdById;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  RestrictionEntryBuilder() {
    RestrictionEntry._defaults(this);
  }

  RestrictionEntryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _cpf = $v.cpf;
      _reason = $v.reason;
      _createdById = $v.createdById;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RestrictionEntry other) {
    _$v = other as _$RestrictionEntry;
  }

  @override
  void update(void Function(RestrictionEntryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RestrictionEntry build() => _build();

  _$RestrictionEntry _build() {
    final _$result = _$v ??
        _$RestrictionEntry._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'RestrictionEntry', 'id'),
          cpf: BuiltValueNullFieldError.checkNotNull(
              cpf, r'RestrictionEntry', 'cpf'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'RestrictionEntry', 'reason'),
          createdById: createdById,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'RestrictionEntry', 'createdAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
