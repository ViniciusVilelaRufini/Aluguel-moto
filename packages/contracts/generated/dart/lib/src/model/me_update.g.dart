// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'me_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$MeUpdate extends MeUpdate {
  @override
  final String? name;
  @override
  final String? phone;
  @override
  final String? emergencyContactName;
  @override
  final String? emergencyContactPhone;

  factory _$MeUpdate([void Function(MeUpdateBuilder)? updates]) =>
      (MeUpdateBuilder()..update(updates))._build();

  _$MeUpdate._(
      {this.name,
      this.phone,
      this.emergencyContactName,
      this.emergencyContactPhone})
      : super._();
  @override
  MeUpdate rebuild(void Function(MeUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MeUpdateBuilder toBuilder() => MeUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is MeUpdate &&
        name == other.name &&
        phone == other.phone &&
        emergencyContactName == other.emergencyContactName &&
        emergencyContactPhone == other.emergencyContactPhone;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, phone.hashCode);
    _$hash = $jc(_$hash, emergencyContactName.hashCode);
    _$hash = $jc(_$hash, emergencyContactPhone.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'MeUpdate')
          ..add('name', name)
          ..add('phone', phone)
          ..add('emergencyContactName', emergencyContactName)
          ..add('emergencyContactPhone', emergencyContactPhone))
        .toString();
  }
}

class MeUpdateBuilder implements Builder<MeUpdate, MeUpdateBuilder> {
  _$MeUpdate? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _phone;
  String? get phone => _$this._phone;
  set phone(String? phone) => _$this._phone = phone;

  String? _emergencyContactName;
  String? get emergencyContactName => _$this._emergencyContactName;
  set emergencyContactName(String? emergencyContactName) =>
      _$this._emergencyContactName = emergencyContactName;

  String? _emergencyContactPhone;
  String? get emergencyContactPhone => _$this._emergencyContactPhone;
  set emergencyContactPhone(String? emergencyContactPhone) =>
      _$this._emergencyContactPhone = emergencyContactPhone;

  MeUpdateBuilder() {
    MeUpdate._defaults(this);
  }

  MeUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _phone = $v.phone;
      _emergencyContactName = $v.emergencyContactName;
      _emergencyContactPhone = $v.emergencyContactPhone;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(MeUpdate other) {
    _$v = other as _$MeUpdate;
  }

  @override
  void update(void Function(MeUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  MeUpdate build() => _build();

  _$MeUpdate _build() {
    final _$result = _$v ??
        _$MeUpdate._(
          name: name,
          phone: phone,
          emergencyContactName: emergencyContactName,
          emergencyContactPhone: emergencyContactPhone,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
