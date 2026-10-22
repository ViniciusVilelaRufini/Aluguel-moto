// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'station_swap_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$StationSwapRequest extends StationSwapRequest {
  @override
  final String stationCode;
  @override
  final String rentalId;
  @override
  final double lat;
  @override
  final double lng;

  factory _$StationSwapRequest(
          [void Function(StationSwapRequestBuilder)? updates]) =>
      (StationSwapRequestBuilder()..update(updates))._build();

  _$StationSwapRequest._(
      {required this.stationCode,
      required this.rentalId,
      required this.lat,
      required this.lng})
      : super._();
  @override
  StationSwapRequest rebuild(
          void Function(StationSwapRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  StationSwapRequestBuilder toBuilder() =>
      StationSwapRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is StationSwapRequest &&
        stationCode == other.stationCode &&
        rentalId == other.rentalId &&
        lat == other.lat &&
        lng == other.lng;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, stationCode.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'StationSwapRequest')
          ..add('stationCode', stationCode)
          ..add('rentalId', rentalId)
          ..add('lat', lat)
          ..add('lng', lng))
        .toString();
  }
}

class StationSwapRequestBuilder
    implements Builder<StationSwapRequest, StationSwapRequestBuilder> {
  _$StationSwapRequest? _$v;

  String? _stationCode;
  String? get stationCode => _$this._stationCode;
  set stationCode(String? stationCode) => _$this._stationCode = stationCode;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  double? _lat;
  double? get lat => _$this._lat;
  set lat(double? lat) => _$this._lat = lat;

  double? _lng;
  double? get lng => _$this._lng;
  set lng(double? lng) => _$this._lng = lng;

  StationSwapRequestBuilder() {
    StationSwapRequest._defaults(this);
  }

  StationSwapRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _stationCode = $v.stationCode;
      _rentalId = $v.rentalId;
      _lat = $v.lat;
      _lng = $v.lng;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(StationSwapRequest other) {
    _$v = other as _$StationSwapRequest;
  }

  @override
  void update(void Function(StationSwapRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  StationSwapRequest build() => _build();

  _$StationSwapRequest _build() {
    final _$result = _$v ??
        _$StationSwapRequest._(
          stationCode: BuiltValueNullFieldError.checkNotNull(
              stationCode, r'StationSwapRequest', 'stationCode'),
          rentalId: BuiltValueNullFieldError.checkNotNull(
              rentalId, r'StationSwapRequest', 'rentalId'),
          lat: BuiltValueNullFieldError.checkNotNull(
              lat, r'StationSwapRequest', 'lat'),
          lng: BuiltValueNullFieldError.checkNotNull(
              lng, r'StationSwapRequest', 'lng'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
