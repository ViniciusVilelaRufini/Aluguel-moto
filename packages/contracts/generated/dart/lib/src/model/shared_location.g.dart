// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'shared_location.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SharedLocation extends SharedLocation {
  @override
  final num lat;
  @override
  final num lng;
  @override
  final DateTime recordedAt;
  @override
  final DateTime expiresAt;

  factory _$SharedLocation([void Function(SharedLocationBuilder)? updates]) =>
      (SharedLocationBuilder()..update(updates))._build();

  _$SharedLocation._(
      {required this.lat,
      required this.lng,
      required this.recordedAt,
      required this.expiresAt})
      : super._();
  @override
  SharedLocation rebuild(void Function(SharedLocationBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SharedLocationBuilder toBuilder() => SharedLocationBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SharedLocation &&
        lat == other.lat &&
        lng == other.lng &&
        recordedAt == other.recordedAt &&
        expiresAt == other.expiresAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, recordedAt.hashCode);
    _$hash = $jc(_$hash, expiresAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SharedLocation')
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('recordedAt', recordedAt)
          ..add('expiresAt', expiresAt))
        .toString();
  }
}

class SharedLocationBuilder
    implements Builder<SharedLocation, SharedLocationBuilder> {
  _$SharedLocation? _$v;

  num? _lat;
  num? get lat => _$this._lat;
  set lat(num? lat) => _$this._lat = lat;

  num? _lng;
  num? get lng => _$this._lng;
  set lng(num? lng) => _$this._lng = lng;

  DateTime? _recordedAt;
  DateTime? get recordedAt => _$this._recordedAt;
  set recordedAt(DateTime? recordedAt) => _$this._recordedAt = recordedAt;

  DateTime? _expiresAt;
  DateTime? get expiresAt => _$this._expiresAt;
  set expiresAt(DateTime? expiresAt) => _$this._expiresAt = expiresAt;

  SharedLocationBuilder() {
    SharedLocation._defaults(this);
  }

  SharedLocationBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _lat = $v.lat;
      _lng = $v.lng;
      _recordedAt = $v.recordedAt;
      _expiresAt = $v.expiresAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SharedLocation other) {
    _$v = other as _$SharedLocation;
  }

  @override
  void update(void Function(SharedLocationBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SharedLocation build() => _build();

  _$SharedLocation _build() {
    final _$result = _$v ??
        _$SharedLocation._(
          lat: BuiltValueNullFieldError.checkNotNull(
              lat, r'SharedLocation', 'lat'),
          lng: BuiltValueNullFieldError.checkNotNull(
              lng, r'SharedLocation', 'lng'),
          recordedAt: BuiltValueNullFieldError.checkNotNull(
              recordedAt, r'SharedLocation', 'recordedAt'),
          expiresAt: BuiltValueNullFieldError.checkNotNull(
              expiresAt, r'SharedLocation', 'expiresAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
