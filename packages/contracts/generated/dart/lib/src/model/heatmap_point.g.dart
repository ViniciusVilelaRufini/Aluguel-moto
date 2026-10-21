// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'heatmap_point.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$HeatmapPoint extends HeatmapPoint {
  @override
  final double lat;
  @override
  final double lng;
  @override
  final int weight;

  factory _$HeatmapPoint([void Function(HeatmapPointBuilder)? updates]) =>
      (HeatmapPointBuilder()..update(updates))._build();

  _$HeatmapPoint._({required this.lat, required this.lng, required this.weight})
      : super._();
  @override
  HeatmapPoint rebuild(void Function(HeatmapPointBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  HeatmapPointBuilder toBuilder() => HeatmapPointBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is HeatmapPoint &&
        lat == other.lat &&
        lng == other.lng &&
        weight == other.weight;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, weight.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'HeatmapPoint')
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('weight', weight))
        .toString();
  }
}

class HeatmapPointBuilder
    implements Builder<HeatmapPoint, HeatmapPointBuilder> {
  _$HeatmapPoint? _$v;

  double? _lat;
  double? get lat => _$this._lat;
  set lat(double? lat) => _$this._lat = lat;

  double? _lng;
  double? get lng => _$this._lng;
  set lng(double? lng) => _$this._lng = lng;

  int? _weight;
  int? get weight => _$this._weight;
  set weight(int? weight) => _$this._weight = weight;

  HeatmapPointBuilder() {
    HeatmapPoint._defaults(this);
  }

  HeatmapPointBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _lat = $v.lat;
      _lng = $v.lng;
      _weight = $v.weight;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(HeatmapPoint other) {
    _$v = other as _$HeatmapPoint;
  }

  @override
  void update(void Function(HeatmapPointBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  HeatmapPoint build() => _build();

  _$HeatmapPoint _build() {
    final _$result = _$v ??
        _$HeatmapPoint._(
          lat: BuiltValueNullFieldError.checkNotNull(
              lat, r'HeatmapPoint', 'lat'),
          lng: BuiltValueNullFieldError.checkNotNull(
              lng, r'HeatmapPoint', 'lng'),
          weight: BuiltValueNullFieldError.checkNotNull(
              weight, r'HeatmapPoint', 'weight'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
