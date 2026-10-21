// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'restriction_entry_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RestrictionEntryCreate extends RestrictionEntryCreate {
  @override
  final String cpf;
  @override
  final String reason;

  factory _$RestrictionEntryCreate(
          [void Function(RestrictionEntryCreateBuilder)? updates]) =>
      (RestrictionEntryCreateBuilder()..update(updates))._build();

  _$RestrictionEntryCreate._({required this.cpf, required this.reason})
      : super._();
  @override
  RestrictionEntryCreate rebuild(
          void Function(RestrictionEntryCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RestrictionEntryCreateBuilder toBuilder() =>
      RestrictionEntryCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RestrictionEntryCreate &&
        cpf == other.cpf &&
        reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, cpf.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RestrictionEntryCreate')
          ..add('cpf', cpf)
          ..add('reason', reason))
        .toString();
  }
}

class RestrictionEntryCreateBuilder
    implements Builder<RestrictionEntryCreate, RestrictionEntryCreateBuilder> {
  _$RestrictionEntryCreate? _$v;

  String? _cpf;
  String? get cpf => _$this._cpf;
  set cpf(String? cpf) => _$this._cpf = cpf;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  RestrictionEntryCreateBuilder() {
    RestrictionEntryCreate._defaults(this);
  }

  RestrictionEntryCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _cpf = $v.cpf;
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RestrictionEntryCreate other) {
    _$v = other as _$RestrictionEntryCreate;
  }

  @override
  void update(void Function(RestrictionEntryCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RestrictionEntryCreate build() => _build();

  _$RestrictionEntryCreate _build() {
    final _$result = _$v ??
        _$RestrictionEntryCreate._(
          cpf: BuiltValueNullFieldError.checkNotNull(
              cpf, r'RestrictionEntryCreate', 'cpf'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'RestrictionEntryCreate', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
