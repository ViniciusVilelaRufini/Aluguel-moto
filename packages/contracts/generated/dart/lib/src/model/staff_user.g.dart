// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'staff_user.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$StaffUser extends StaffUser {
  @override
  final String id;
  @override
  final String email;
  @override
  final String name;
  @override
  final BuiltList<StaffGroup> groups;
  @override
  final bool active;
  @override
  final bool? mfaEnabled;
  @override
  final DateTime? lastLoginAt;
  @override
  final DateTime createdAt;

  factory _$StaffUser([void Function(StaffUserBuilder)? updates]) =>
      (StaffUserBuilder()..update(updates))._build();

  _$StaffUser._(
      {required this.id,
      required this.email,
      required this.name,
      required this.groups,
      required this.active,
      this.mfaEnabled,
      this.lastLoginAt,
      required this.createdAt})
      : super._();
  @override
  StaffUser rebuild(void Function(StaffUserBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  StaffUserBuilder toBuilder() => StaffUserBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is StaffUser &&
        id == other.id &&
        email == other.email &&
        name == other.name &&
        groups == other.groups &&
        active == other.active &&
        mfaEnabled == other.mfaEnabled &&
        lastLoginAt == other.lastLoginAt &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, groups.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jc(_$hash, mfaEnabled.hashCode);
    _$hash = $jc(_$hash, lastLoginAt.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'StaffUser')
          ..add('id', id)
          ..add('email', email)
          ..add('name', name)
          ..add('groups', groups)
          ..add('active', active)
          ..add('mfaEnabled', mfaEnabled)
          ..add('lastLoginAt', lastLoginAt)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class StaffUserBuilder implements Builder<StaffUser, StaffUserBuilder> {
  _$StaffUser? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _email;
  String? get email => _$this._email;
  set email(String? email) => _$this._email = email;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  ListBuilder<StaffGroup>? _groups;
  ListBuilder<StaffGroup> get groups =>
      _$this._groups ??= ListBuilder<StaffGroup>();
  set groups(ListBuilder<StaffGroup>? groups) => _$this._groups = groups;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  bool? _mfaEnabled;
  bool? get mfaEnabled => _$this._mfaEnabled;
  set mfaEnabled(bool? mfaEnabled) => _$this._mfaEnabled = mfaEnabled;

  DateTime? _lastLoginAt;
  DateTime? get lastLoginAt => _$this._lastLoginAt;
  set lastLoginAt(DateTime? lastLoginAt) => _$this._lastLoginAt = lastLoginAt;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  StaffUserBuilder() {
    StaffUser._defaults(this);
  }

  StaffUserBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _email = $v.email;
      _name = $v.name;
      _groups = $v.groups.toBuilder();
      _active = $v.active;
      _mfaEnabled = $v.mfaEnabled;
      _lastLoginAt = $v.lastLoginAt;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(StaffUser other) {
    _$v = other as _$StaffUser;
  }

  @override
  void update(void Function(StaffUserBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  StaffUser build() => _build();

  _$StaffUser _build() {
    _$StaffUser _$result;
    try {
      _$result = _$v ??
          _$StaffUser._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'StaffUser', 'id'),
            email: BuiltValueNullFieldError.checkNotNull(
                email, r'StaffUser', 'email'),
            name: BuiltValueNullFieldError.checkNotNull(
                name, r'StaffUser', 'name'),
            groups: groups.build(),
            active: BuiltValueNullFieldError.checkNotNull(
                active, r'StaffUser', 'active'),
            mfaEnabled: mfaEnabled,
            lastLoginAt: lastLoginAt,
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'StaffUser', 'createdAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'groups';
        groups.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'StaffUser', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
