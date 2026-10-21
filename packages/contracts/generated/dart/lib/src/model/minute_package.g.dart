// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'minute_package.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$MinutePackage extends MinutePackage {
  @override
  final String id;
  @override
  final String name;
  @override
  final int minutes;
  @override
  final int priceCents;
  @override
  final bool active;

  factory _$MinutePackage([void Function(MinutePackageBuilder)? updates]) =>
      (MinutePackageBuilder()..update(updates))._build();

  _$MinutePackage._(
      {required this.id,
      required this.name,
      required this.minutes,
      required this.priceCents,
      required this.active})
      : super._();
  @override
  MinutePackage rebuild(void Function(MinutePackageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  MinutePackageBuilder toBuilder() => MinutePackageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is MinutePackage &&
        id == other.id &&
        name == other.name &&
        minutes == other.minutes &&
        priceCents == other.priceCents &&
        active == other.active;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, minutes.hashCode);
    _$hash = $jc(_$hash, priceCents.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'MinutePackage')
          ..add('id', id)
          ..add('name', name)
          ..add('minutes', minutes)
          ..add('priceCents', priceCents)
          ..add('active', active))
        .toString();
  }
}

class MinutePackageBuilder
    implements Builder<MinutePackage, MinutePackageBuilder> {
  _$MinutePackage? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  int? _minutes;
  int? get minutes => _$this._minutes;
  set minutes(int? minutes) => _$this._minutes = minutes;

  int? _priceCents;
  int? get priceCents => _$this._priceCents;
  set priceCents(int? priceCents) => _$this._priceCents = priceCents;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  MinutePackageBuilder() {
    MinutePackage._defaults(this);
  }

  MinutePackageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _minutes = $v.minutes;
      _priceCents = $v.priceCents;
      _active = $v.active;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(MinutePackage other) {
    _$v = other as _$MinutePackage;
  }

  @override
  void update(void Function(MinutePackageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  MinutePackage build() => _build();

  _$MinutePackage _build() {
    final _$result = _$v ??
        _$MinutePackage._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'MinutePackage', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'MinutePackage', 'name'),
          minutes: BuiltValueNullFieldError.checkNotNull(
              minutes, r'MinutePackage', 'minutes'),
          priceCents: BuiltValueNullFieldError.checkNotNull(
              priceCents, r'MinutePackage', 'priceCents'),
          active: BuiltValueNullFieldError.checkNotNull(
              active, r'MinutePackage', 'active'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
