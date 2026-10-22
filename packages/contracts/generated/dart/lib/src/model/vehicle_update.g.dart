// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_update.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleUpdate extends VehicleUpdate {
  @override
  final String? model;
  @override
  final String? thingName;
  @override
  final String? qrCode;
  @override
  final String? vehicleModelId;
  @override
  final double? odometerKm;
  @override
  final double? usageHours;

  factory _$VehicleUpdate([void Function(VehicleUpdateBuilder)? updates]) =>
      (VehicleUpdateBuilder()..update(updates))._build();

  _$VehicleUpdate._(
      {this.model,
      this.thingName,
      this.qrCode,
      this.vehicleModelId,
      this.odometerKm,
      this.usageHours})
      : super._();
  @override
  VehicleUpdate rebuild(void Function(VehicleUpdateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleUpdateBuilder toBuilder() => VehicleUpdateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleUpdate &&
        model == other.model &&
        thingName == other.thingName &&
        qrCode == other.qrCode &&
        vehicleModelId == other.vehicleModelId &&
        odometerKm == other.odometerKm &&
        usageHours == other.usageHours;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, model.hashCode);
    _$hash = $jc(_$hash, thingName.hashCode);
    _$hash = $jc(_$hash, qrCode.hashCode);
    _$hash = $jc(_$hash, vehicleModelId.hashCode);
    _$hash = $jc(_$hash, odometerKm.hashCode);
    _$hash = $jc(_$hash, usageHours.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleUpdate')
          ..add('model', model)
          ..add('thingName', thingName)
          ..add('qrCode', qrCode)
          ..add('vehicleModelId', vehicleModelId)
          ..add('odometerKm', odometerKm)
          ..add('usageHours', usageHours))
        .toString();
  }
}

class VehicleUpdateBuilder
    implements Builder<VehicleUpdate, VehicleUpdateBuilder> {
  _$VehicleUpdate? _$v;

  String? _model;
  String? get model => _$this._model;
  set model(String? model) => _$this._model = model;

  String? _thingName;
  String? get thingName => _$this._thingName;
  set thingName(String? thingName) => _$this._thingName = thingName;

  String? _qrCode;
  String? get qrCode => _$this._qrCode;
  set qrCode(String? qrCode) => _$this._qrCode = qrCode;

  String? _vehicleModelId;
  String? get vehicleModelId => _$this._vehicleModelId;
  set vehicleModelId(String? vehicleModelId) =>
      _$this._vehicleModelId = vehicleModelId;

  double? _odometerKm;
  double? get odometerKm => _$this._odometerKm;
  set odometerKm(double? odometerKm) => _$this._odometerKm = odometerKm;

  double? _usageHours;
  double? get usageHours => _$this._usageHours;
  set usageHours(double? usageHours) => _$this._usageHours = usageHours;

  VehicleUpdateBuilder() {
    VehicleUpdate._defaults(this);
  }

  VehicleUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _model = $v.model;
      _thingName = $v.thingName;
      _qrCode = $v.qrCode;
      _vehicleModelId = $v.vehicleModelId;
      _odometerKm = $v.odometerKm;
      _usageHours = $v.usageHours;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleUpdate other) {
    _$v = other as _$VehicleUpdate;
  }

  @override
  void update(void Function(VehicleUpdateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleUpdate build() => _build();

  _$VehicleUpdate _build() {
    final _$result = _$v ??
        _$VehicleUpdate._(
          model: model,
          thingName: thingName,
          qrCode: qrCode,
          vehicleModelId: vehicleModelId,
          odometerKm: odometerKm,
          usageHours: usageHours,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
