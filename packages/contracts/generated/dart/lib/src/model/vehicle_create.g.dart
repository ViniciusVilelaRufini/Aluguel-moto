// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleCreate extends VehicleCreate {
  @override
  final String code;
  @override
  final String model;
  @override
  final String thingName;
  @override
  final String? qrCode;
  @override
  final String? batterySerial;
  @override
  final String? vehicleModelId;
  @override
  final String? depotId;

  factory _$VehicleCreate([void Function(VehicleCreateBuilder)? updates]) =>
      (VehicleCreateBuilder()..update(updates))._build();

  _$VehicleCreate._(
      {required this.code,
      required this.model,
      required this.thingName,
      this.qrCode,
      this.batterySerial,
      this.vehicleModelId,
      this.depotId})
      : super._();
  @override
  VehicleCreate rebuild(void Function(VehicleCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleCreateBuilder toBuilder() => VehicleCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleCreate &&
        code == other.code &&
        model == other.model &&
        thingName == other.thingName &&
        qrCode == other.qrCode &&
        batterySerial == other.batterySerial &&
        vehicleModelId == other.vehicleModelId &&
        depotId == other.depotId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, code.hashCode);
    _$hash = $jc(_$hash, model.hashCode);
    _$hash = $jc(_$hash, thingName.hashCode);
    _$hash = $jc(_$hash, qrCode.hashCode);
    _$hash = $jc(_$hash, batterySerial.hashCode);
    _$hash = $jc(_$hash, vehicleModelId.hashCode);
    _$hash = $jc(_$hash, depotId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleCreate')
          ..add('code', code)
          ..add('model', model)
          ..add('thingName', thingName)
          ..add('qrCode', qrCode)
          ..add('batterySerial', batterySerial)
          ..add('vehicleModelId', vehicleModelId)
          ..add('depotId', depotId))
        .toString();
  }
}

class VehicleCreateBuilder
    implements Builder<VehicleCreate, VehicleCreateBuilder> {
  _$VehicleCreate? _$v;

  String? _code;
  String? get code => _$this._code;
  set code(String? code) => _$this._code = code;

  String? _model;
  String? get model => _$this._model;
  set model(String? model) => _$this._model = model;

  String? _thingName;
  String? get thingName => _$this._thingName;
  set thingName(String? thingName) => _$this._thingName = thingName;

  String? _qrCode;
  String? get qrCode => _$this._qrCode;
  set qrCode(String? qrCode) => _$this._qrCode = qrCode;

  String? _batterySerial;
  String? get batterySerial => _$this._batterySerial;
  set batterySerial(String? batterySerial) =>
      _$this._batterySerial = batterySerial;

  String? _vehicleModelId;
  String? get vehicleModelId => _$this._vehicleModelId;
  set vehicleModelId(String? vehicleModelId) =>
      _$this._vehicleModelId = vehicleModelId;

  String? _depotId;
  String? get depotId => _$this._depotId;
  set depotId(String? depotId) => _$this._depotId = depotId;

  VehicleCreateBuilder() {
    VehicleCreate._defaults(this);
  }

  VehicleCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _code = $v.code;
      _model = $v.model;
      _thingName = $v.thingName;
      _qrCode = $v.qrCode;
      _batterySerial = $v.batterySerial;
      _vehicleModelId = $v.vehicleModelId;
      _depotId = $v.depotId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleCreate other) {
    _$v = other as _$VehicleCreate;
  }

  @override
  void update(void Function(VehicleCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleCreate build() => _build();

  _$VehicleCreate _build() {
    final _$result = _$v ??
        _$VehicleCreate._(
          code: BuiltValueNullFieldError.checkNotNull(
              code, r'VehicleCreate', 'code'),
          model: BuiltValueNullFieldError.checkNotNull(
              model, r'VehicleCreate', 'model'),
          thingName: BuiltValueNullFieldError.checkNotNull(
              thingName, r'VehicleCreate', 'thingName'),
          qrCode: qrCode,
          batterySerial: batterySerial,
          vehicleModelId: vehicleModelId,
          depotId: depotId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
