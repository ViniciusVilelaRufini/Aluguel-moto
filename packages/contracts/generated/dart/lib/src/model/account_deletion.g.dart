// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'account_deletion.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AccountDeletion extends AccountDeletion {
  @override
  final AccountDeletionStatus status;
  @override
  final DateTime requestedAt;
  @override
  final DateTime? completedAt;

  factory _$AccountDeletion([void Function(AccountDeletionBuilder)? updates]) =>
      (AccountDeletionBuilder()..update(updates))._build();

  _$AccountDeletion._(
      {required this.status, required this.requestedAt, this.completedAt})
      : super._();
  @override
  AccountDeletion rebuild(void Function(AccountDeletionBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AccountDeletionBuilder toBuilder() => AccountDeletionBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AccountDeletion &&
        status == other.status &&
        requestedAt == other.requestedAt &&
        completedAt == other.completedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, requestedAt.hashCode);
    _$hash = $jc(_$hash, completedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AccountDeletion')
          ..add('status', status)
          ..add('requestedAt', requestedAt)
          ..add('completedAt', completedAt))
        .toString();
  }
}

class AccountDeletionBuilder
    implements Builder<AccountDeletion, AccountDeletionBuilder> {
  _$AccountDeletion? _$v;

  AccountDeletionStatus? _status;
  AccountDeletionStatus? get status => _$this._status;
  set status(AccountDeletionStatus? status) => _$this._status = status;

  DateTime? _requestedAt;
  DateTime? get requestedAt => _$this._requestedAt;
  set requestedAt(DateTime? requestedAt) => _$this._requestedAt = requestedAt;

  DateTime? _completedAt;
  DateTime? get completedAt => _$this._completedAt;
  set completedAt(DateTime? completedAt) => _$this._completedAt = completedAt;

  AccountDeletionBuilder() {
    AccountDeletion._defaults(this);
  }

  AccountDeletionBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _status = $v.status;
      _requestedAt = $v.requestedAt;
      _completedAt = $v.completedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AccountDeletion other) {
    _$v = other as _$AccountDeletion;
  }

  @override
  void update(void Function(AccountDeletionBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AccountDeletion build() => _build();

  _$AccountDeletion _build() {
    final _$result = _$v ??
        _$AccountDeletion._(
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'AccountDeletion', 'status'),
          requestedAt: BuiltValueNullFieldError.checkNotNull(
              requestedAt, r'AccountDeletion', 'requestedAt'),
          completedAt: completedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
