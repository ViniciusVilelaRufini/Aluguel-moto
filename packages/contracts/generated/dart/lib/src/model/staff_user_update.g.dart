// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'staff_user_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$StaffUserUpdate extends StaffUserUpdate {
  @override
  final String? name;
  @override
  final BuiltList<StaffGroup>? groups;
  @override
  final bool? active;

  factory _$StaffUserUpdate([void Function(StaffUserUpdateBuilder)? updates]) =>
      (StaffUserUpdateBuilder()..update(updates))._build();

  _$StaffUserUpdate._({this.name, this.groups, this.active}) : super._();
  @override
  StaffUserUpdate rebuild(void Function(StaffUserUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  StaffUserUpdateBuilder toBuilder() => StaffUserUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is StaffUserUpdate &&
        name == other.name &&
        groups == other.groups &&
        active == other.active;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, groups.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'StaffUserUpdate')
          ..add('name', name)
          ..add('groups', groups)
          ..add('active', active))
        .toString();
  }
}

class StaffUserUpdateBuilder
    implements Builder<StaffUserUpdate, StaffUserUpdateBuilder> {
  _$StaffUserUpdate? _$v;

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

  StaffUserUpdateBuilder() {
    StaffUserUpdate._defaults(this);
  }

  StaffUserUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _groups = $v.groups?.toBuilder();
      _active = $v.active;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(StaffUserUpdate other) {
    _$v = other as _$StaffUserUpdate;
  }

  @override
  void update(void Function(StaffUserUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  StaffUserUpdate build() => _build();

  _$StaffUserUpdate _build() {
    _$StaffUserUpdate _$result;
    try {
      _$result = _$v ??
          _$StaffUserUpdate._(
            name: name,
            groups: _groups?.build(),
            active: active,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'groups';
        _groups?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'StaffUserUpdate', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
