// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'staff_user_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$StaffUserCreate extends StaffUserCreate {
  @override
  final String email;
  @override
  final String name;
  @override
  final BuiltList<StaffGroup> groups;

  factory _$StaffUserCreate([void Function(StaffUserCreateBuilder)? updates]) =>
      (StaffUserCreateBuilder()..update(updates))._build();

  _$StaffUserCreate._(
      {required this.email, required this.name, required this.groups})
      : super._();
  @override
  StaffUserCreate rebuild(void Function(StaffUserCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  StaffUserCreateBuilder toBuilder() => StaffUserCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is StaffUserCreate &&
        email == other.email &&
        name == other.name &&
        groups == other.groups;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, groups.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'StaffUserCreate')
          ..add('email', email)
          ..add('name', name)
          ..add('groups', groups))
        .toString();
  }
}

class StaffUserCreateBuilder
    implements Builder<StaffUserCreate, StaffUserCreateBuilder> {
  _$StaffUserCreate? _$v;

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

  StaffUserCreateBuilder() {
    StaffUserCreate._defaults(this);
  }

  StaffUserCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _email = $v.email;
      _name = $v.name;
      _groups = $v.groups.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(StaffUserCreate other) {
    _$v = other as _$StaffUserCreate;
  }

  @override
  void update(void Function(StaffUserCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  StaffUserCreate build() => _build();

  _$StaffUserCreate _build() {
    _$StaffUserCreate _$result;
    try {
      _$result = _$v ??
          _$StaffUserCreate._(
            email: BuiltValueNullFieldError.checkNotNull(
                email, r'StaffUserCreate', 'email'),
            name: BuiltValueNullFieldError.checkNotNull(
                name, r'StaffUserCreate', 'name'),
            groups: groups.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'groups';
        groups.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'StaffUserCreate', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
