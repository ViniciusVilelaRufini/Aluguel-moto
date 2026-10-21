// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'geo_zone_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$GeoZoneInput extends GeoZoneInput {
  @override
  final String name;
  @override
  final ZoneType type;
  @override
  final int? speedLimitKmh;
  @override
  final GeoJsonPolygon geometry;
  @override
  final bool? active;

  factory _$GeoZoneInput([void Function(GeoZoneInputBuilder)? updates]) =>
      (GeoZoneInputBuilder()..update(updates))._build();

  _$GeoZoneInput._(
      {required this.name,
      required this.type,
      this.speedLimitKmh,
      required this.geometry,
      this.active})
      : super._();
  @override
  GeoZoneInput rebuild(void Function(GeoZoneInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  GeoZoneInputBuilder toBuilder() => GeoZoneInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is GeoZoneInput &&
        name == other.name &&
        type == other.type &&
        speedLimitKmh == other.speedLimitKmh &&
        geometry == other.geometry &&
        active == other.active;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, speedLimitKmh.hashCode);
    _$hash = $jc(_$hash, geometry.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'GeoZoneInput')
          ..add('name', name)
          ..add('type', type)
          ..add('speedLimitKmh', speedLimitKmh)
          ..add('geometry', geometry)
          ..add('active', active))
        .toString();
  }
}

class GeoZoneInputBuilder
    implements Builder<GeoZoneInput, GeoZoneInputBuilder> {
  _$GeoZoneInput? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  ZoneType? _type;
  ZoneType? get type => _$this._type;
  set type(ZoneType? type) => _$this._type = type;

  int? _speedLimitKmh;
  int? get speedLimitKmh => _$this._speedLimitKmh;
  set speedLimitKmh(int? speedLimitKmh) =>
      _$this._speedLimitKmh = speedLimitKmh;

  GeoJsonPolygonBuilder? _geometry;
  GeoJsonPolygonBuilder get geometry =>
      _$this._geometry ??= GeoJsonPolygonBuilder();
  set geometry(GeoJsonPolygonBuilder? geometry) => _$this._geometry = geometry;

  bool? _active;
  bool? get active => _$this._active;
  set active(bool? active) => _$this._active = active;

  GeoZoneInputBuilder() {
    GeoZoneInput._defaults(this);
  }

  GeoZoneInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _type = $v.type;
      _speedLimitKmh = $v.speedLimitKmh;
      _geometry = $v.geometry.toBuilder();
      _active = $v.active;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(GeoZoneInput other) {
    _$v = other as _$GeoZoneInput;
  }

  @override
  void update(void Function(GeoZoneInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  GeoZoneInput build() => _build();

  _$GeoZoneInput _build() {
    _$GeoZoneInput _$result;
    try {
      _$result = _$v ??
          _$GeoZoneInput._(
            name: BuiltValueNullFieldError.checkNotNull(
                name, r'GeoZoneInput', 'name'),
            type: BuiltValueNullFieldError.checkNotNull(
                type, r'GeoZoneInput', 'type'),
            speedLimitKmh: speedLimitKmh,
            geometry: geometry.build(),
            active: active,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'geometry';
        geometry.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'GeoZoneInput', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
