// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_create_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BatteryCreateRequest extends BatteryCreateRequest {
  @override
  final String serial;
  @override
  final BatteryInitialStatus status;
  @override
  final String depotId;
  @override
  final int? chargePct;

  factory _$BatteryCreateRequest(
          [void Function(BatteryCreateRequestBuilder)? updates]) =>
      (BatteryCreateRequestBuilder()..update(updates))._build();

  _$BatteryCreateRequest._(
      {required this.serial,
      required this.status,
      required this.depotId,
      this.chargePct})
      : super._();
  @override
  BatteryCreateRequest rebuild(
          void Function(BatteryCreateRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatteryCreateRequestBuilder toBuilder() =>
      BatteryCreateRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BatteryCreateRequest &&
        serial == other.serial &&
        status == other.status &&
        depotId == other.depotId &&
        chargePct == other.chargePct;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, serial.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, depotId.hashCode);
    _$hash = $jc(_$hash, chargePct.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'BatteryCreateRequest')
          ..add('serial', serial)
          ..add('status', status)
          ..add('depotId', depotId)
          ..add('chargePct', chargePct))
        .toString();
  }
}

class BatteryCreateRequestBuilder
    implements Builder<BatteryCreateRequest, BatteryCreateRequestBuilder> {
  _$BatteryCreateRequest? _$v;

  String? _serial;
  String? get serial => _$this._serial;
  set serial(String? serial) => _$this._serial = serial;

  BatteryInitialStatus? _status;
  BatteryInitialStatus? get status => _$this._status;
  set status(BatteryInitialStatus? status) => _$this._status = status;

  String? _depotId;
  String? get depotId => _$this._depotId;
  set depotId(String? depotId) => _$this._depotId = depotId;

  int? _chargePct;
  int? get chargePct => _$this._chargePct;
  set chargePct(int? chargePct) => _$this._chargePct = chargePct;

  BatteryCreateRequestBuilder() {
    BatteryCreateRequest._defaults(this);
  }

  BatteryCreateRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _serial = $v.serial;
      _status = $v.status;
      _depotId = $v.depotId;
      _chargePct = $v.chargePct;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BatteryCreateRequest other) {
    _$v = other as _$BatteryCreateRequest;
  }

  @override
  void update(void Function(BatteryCreateRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BatteryCreateRequest build() => _build();

  _$BatteryCreateRequest _build() {
    final _$result = _$v ??
        _$BatteryCreateRequest._(
          serial: BuiltValueNullFieldError.checkNotNull(
              serial, r'BatteryCreateRequest', 'serial'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'BatteryCreateRequest', 'status'),
          depotId: BuiltValueNullFieldError.checkNotNull(
              depotId, r'BatteryCreateRequest', 'depotId'),
          chargePct: chargePct,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
