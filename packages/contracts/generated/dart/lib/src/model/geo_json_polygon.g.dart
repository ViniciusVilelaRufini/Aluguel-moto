// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'geo_json_polygon.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$GeoJsonPolygon extends GeoJsonPolygon {
  @override
  final GeoJsonPolygonType type;
  @override
  final BuiltList<BuiltList<BuiltList<double>>> coordinates;

  factory _$GeoJsonPolygon([void Function(GeoJsonPolygonBuilder)? updates]) =>
      (GeoJsonPolygonBuilder()..update(updates))._build();

  _$GeoJsonPolygon._({required this.type, required this.coordinates})
      : super._();
  @override
  GeoJsonPolygon rebuild(void Function(GeoJsonPolygonBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  GeoJsonPolygonBuilder toBuilder() => GeoJsonPolygonBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is GeoJsonPolygon &&
        type == other.type &&
        coordinates == other.coordinates;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, coordinates.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'GeoJsonPolygon')
          ..add('type', type)
          ..add('coordinates', coordinates))
        .toString();
  }
}

class GeoJsonPolygonBuilder
    implements Builder<GeoJsonPolygon, GeoJsonPolygonBuilder> {
  _$GeoJsonPolygon? _$v;

  GeoJsonPolygonType? _type;
  GeoJsonPolygonType? get type => _$this._type;
  set type(GeoJsonPolygonType? type) => _$this._type = type;

  ListBuilder<BuiltList<BuiltList<double>>>? _coordinates;
  ListBuilder<BuiltList<BuiltList<double>>> get coordinates =>
      _$this._coordinates ??= ListBuilder<BuiltList<BuiltList<double>>>();
  set coordinates(ListBuilder<BuiltList<BuiltList<double>>>? coordinates) =>
      _$this._coordinates = coordinates;

  GeoJsonPolygonBuilder() {
    GeoJsonPolygon._defaults(this);
  }

  GeoJsonPolygonBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _type = $v.type;
      _coordinates = $v.coordinates.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(GeoJsonPolygon other) {
    _$v = other as _$GeoJsonPolygon;
  }

  @override
  void update(void Function(GeoJsonPolygonBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  GeoJsonPolygon build() => _build();

  _$GeoJsonPolygon _build() {
    _$GeoJsonPolygon _$result;
    try {
      _$result = _$v ??
          _$GeoJsonPolygon._(
            type: BuiltValueNullFieldError.checkNotNull(
                type, r'GeoJsonPolygon', 'type'),
            coordinates: coordinates.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'coordinates';
        coordinates.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'GeoJsonPolygon', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
