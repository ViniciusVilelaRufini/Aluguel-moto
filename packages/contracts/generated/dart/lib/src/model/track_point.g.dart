// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'track_point.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$TrackPoint extends TrackPoint {
  @override
  final double lat;
  @override
  final double lng;
  @override
  final double speedKmh;
  @override
  final DateTime recordedAt;

  factory _$TrackPoint([void Function(TrackPointBuilder)? updates]) =>
      (TrackPointBuilder()..update(updates))._build();

  _$TrackPoint._(
      {required this.lat,
      required this.lng,
      required this.speedKmh,
      required this.recordedAt})
      : super._();
  @override
  TrackPoint rebuild(void Function(TrackPointBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  TrackPointBuilder toBuilder() => TrackPointBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is TrackPoint &&
        lat == other.lat &&
        lng == other.lng &&
        speedKmh == other.speedKmh &&
        recordedAt == other.recordedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, speedKmh.hashCode);
    _$hash = $jc(_$hash, recordedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'TrackPoint')
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('speedKmh', speedKmh)
          ..add('recordedAt', recordedAt))
        .toString();
  }
}

class TrackPointBuilder implements Builder<TrackPoint, TrackPointBuilder> {
  _$TrackPoint? _$v;

  double? _lat;
  double? get lat => _$this._lat;
  set lat(double? lat) => _$this._lat = lat;

  double? _lng;
  double? get lng => _$this._lng;
  set lng(double? lng) => _$this._lng = lng;

  double? _speedKmh;
  double? get speedKmh => _$this._speedKmh;
  set speedKmh(double? speedKmh) => _$this._speedKmh = speedKmh;

  DateTime? _recordedAt;
  DateTime? get recordedAt => _$this._recordedAt;
  set recordedAt(DateTime? recordedAt) => _$this._recordedAt = recordedAt;

  TrackPointBuilder() {
    TrackPoint._defaults(this);
  }

  TrackPointBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _lat = $v.lat;
      _lng = $v.lng;
      _speedKmh = $v.speedKmh;
      _recordedAt = $v.recordedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(TrackPoint other) {
    _$v = other as _$TrackPoint;
  }

  @override
  void update(void Function(TrackPointBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  TrackPoint build() => _build();

  _$TrackPoint _build() {
    final _$result = _$v ??
        _$TrackPoint._(
          lat: BuiltValueNullFieldError.checkNotNull(lat, r'TrackPoint', 'lat'),
          lng: BuiltValueNullFieldError.checkNotNull(lng, r'TrackPoint', 'lng'),
          speedKmh: BuiltValueNullFieldError.checkNotNull(
              speedKmh, r'TrackPoint', 'speedKmh'),
          recordedAt: BuiltValueNullFieldError.checkNotNull(
              recordedAt, r'TrackPoint', 'recordedAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
