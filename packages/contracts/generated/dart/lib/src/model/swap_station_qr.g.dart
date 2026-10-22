// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'swap_station_qr.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SwapStationQr extends SwapStationQr {
  @override
  final String stationId;
  @override
  final String stationCode;

  factory _$SwapStationQr([void Function(SwapStationQrBuilder)? updates]) =>
      (SwapStationQrBuilder()..update(updates))._build();

  _$SwapStationQr._({required this.stationId, required this.stationCode})
      : super._();
  @override
  SwapStationQr rebuild(void Function(SwapStationQrBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SwapStationQrBuilder toBuilder() => SwapStationQrBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SwapStationQr &&
        stationId == other.stationId &&
        stationCode == other.stationCode;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, stationId.hashCode);
    _$hash = $jc(_$hash, stationCode.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SwapStationQr')
          ..add('stationId', stationId)
          ..add('stationCode', stationCode))
        .toString();
  }
}

class SwapStationQrBuilder
    implements Builder<SwapStationQr, SwapStationQrBuilder> {
  _$SwapStationQr? _$v;

  String? _stationId;
  String? get stationId => _$this._stationId;
  set stationId(String? stationId) => _$this._stationId = stationId;

  String? _stationCode;
  String? get stationCode => _$this._stationCode;
  set stationCode(String? stationCode) => _$this._stationCode = stationCode;

  SwapStationQrBuilder() {
    SwapStationQr._defaults(this);
  }

  SwapStationQrBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _stationId = $v.stationId;
      _stationCode = $v.stationCode;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SwapStationQr other) {
    _$v = other as _$SwapStationQr;
  }

  @override
  void update(void Function(SwapStationQrBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SwapStationQr build() => _build();

  _$SwapStationQr _build() {
    final _$result = _$v ??
        _$SwapStationQr._(
          stationId: BuiltValueNullFieldError.checkNotNull(
              stationId, r'SwapStationQr', 'stationId'),
          stationCode: BuiltValueNullFieldError.checkNotNull(
              stationCode, r'SwapStationQr', 'stationCode'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
