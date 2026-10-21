// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dev_token_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DevTokenRequest extends DevTokenRequest {
  @override
  final String sub;
  @override
  final String email;
  @override
  final BuiltList<StaffGroup> groups;
  @override
  final AuthPool pool;

  factory _$DevTokenRequest([void Function(DevTokenRequestBuilder)? updates]) =>
      (DevTokenRequestBuilder()..update(updates))._build();

  _$DevTokenRequest._(
      {required this.sub,
      required this.email,
      required this.groups,
      required this.pool})
      : super._();
  @override
  DevTokenRequest rebuild(void Function(DevTokenRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DevTokenRequestBuilder toBuilder() => DevTokenRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DevTokenRequest &&
        sub == other.sub &&
        email == other.email &&
        groups == other.groups &&
        pool == other.pool;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, sub.hashCode);
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, groups.hashCode);
    _$hash = $jc(_$hash, pool.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DevTokenRequest')
          ..add('sub', sub)
          ..add('email', email)
          ..add('groups', groups)
          ..add('pool', pool))
        .toString();
  }
}

class DevTokenRequestBuilder
    implements Builder<DevTokenRequest, DevTokenRequestBuilder> {
  _$DevTokenRequest? _$v;

  String? _sub;
  String? get sub => _$this._sub;
  set sub(String? sub) => _$this._sub = sub;

  String? _email;
  String? get email => _$this._email;
  set email(String? email) => _$this._email = email;

  ListBuilder<StaffGroup>? _groups;
  ListBuilder<StaffGroup> get groups =>
      _$this._groups ??= ListBuilder<StaffGroup>();
  set groups(ListBuilder<StaffGroup>? groups) => _$this._groups = groups;

  AuthPool? _pool;
  AuthPool? get pool => _$this._pool;
  set pool(AuthPool? pool) => _$this._pool = pool;

  DevTokenRequestBuilder() {
    DevTokenRequest._defaults(this);
  }

  DevTokenRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _sub = $v.sub;
      _email = $v.email;
      _groups = $v.groups.toBuilder();
      _pool = $v.pool;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DevTokenRequest other) {
    _$v = other as _$DevTokenRequest;
  }

  @override
  void update(void Function(DevTokenRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DevTokenRequest build() => _build();

  _$DevTokenRequest _build() {
    _$DevTokenRequest _$result;
    try {
      _$result = _$v ??
          _$DevTokenRequest._(
            sub: BuiltValueNullFieldError.checkNotNull(
                sub, r'DevTokenRequest', 'sub'),
            email: BuiltValueNullFieldError.checkNotNull(
                email, r'DevTokenRequest', 'email'),
            groups: groups.build(),
            pool: BuiltValueNullFieldError.checkNotNull(
                pool, r'DevTokenRequest', 'pool'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'groups';
        groups.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'DevTokenRequest', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
