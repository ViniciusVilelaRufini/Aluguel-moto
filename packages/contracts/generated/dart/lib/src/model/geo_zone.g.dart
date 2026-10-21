// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'geo_zone.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$GeoZone extends GeoZone {
  @override
  final String id;
  @override
  final String name;
  @override
  final ZoneType type;
  @override
  final int? speedLimitKmh;
  @override
  final GeoJsonPolygon geometry;
  @override
  final bool active;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$GeoZone([void Function(GeoZoneBuilder)? updates]) =>
      (GeoZoneBuilder()..update(updates))._build();

  _$GeoZone._(
      {required this.id,
      required this.name,
      required this.type,
      this.speedLimitKmh,
      required this.geometry,
      required this.active,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  GeoZone rebuild(void Function(GeoZoneBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  GeoZoneBuilder toBuilder() => GeoZoneBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is GeoZone &&
        id == other.id &&
        name == other.name &&
        type == other.type &&
        speedLimitKmh == other.speedLimitKmh &&
        geometry == other.geometry &&
        active == other.active &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, speedLimitKmh.hashCode);
    _$hash = $jc(_$hash, geometry.hashCode);
    _$hash = $jc(_$hash, active.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'GeoZone')
          ..add('id', id)
          ..add('name', name)
          ..add('type', type)
          ..add('speedLimitKmh', speedLimitKmh)
          ..add('geometry', geometry)
          ..add('active', active)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class GeoZoneBuilder implements Builder<GeoZone, GeoZoneBuilder> {
  _$GeoZone? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

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

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  GeoZoneBuilder() {
    GeoZone._defaults(this);
  }

  GeoZoneBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _type = $v.type;
      _speedLimitKmh = $v.speedLimitKmh;
      _geometry = $v.geometry.toBuilder();
      _active = $v.active;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(GeoZone other) {
    _$v = other as _$GeoZone;
  }

  @override
  void update(void Function(GeoZoneBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  GeoZone build() => _build();

  _$GeoZone _build() {
    _$GeoZone _$result;
    try {
      _$result = _$v ??
          _$GeoZone._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'GeoZone', 'id'),
            name:
                BuiltValueNullFieldError.checkNotNull(name, r'GeoZone', 'name'),
            type:
                BuiltValueNullFieldError.checkNotNull(type, r'GeoZone', 'type'),
            speedLimitKmh: speedLimitKmh,
            geometry: geometry.build(),
            active: BuiltValueNullFieldError.checkNotNull(
                active, r'GeoZone', 'active'),
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'GeoZone', 'createdAt'),
            updatedAt: BuiltValueNullFieldError.checkNotNull(
                updatedAt, r'GeoZone', 'updatedAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'geometry';
        geometry.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'GeoZone', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
