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

  factory _$VehicleUpdate([void Function(VehicleUpdateBuilder)? updates]) =>
      (VehicleUpdateBuilder()..update(updates))._build();

  _$VehicleUpdate._({this.model, this.thingName, this.qrCode}) : super._();
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
        qrCode == other.qrCode;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, model.hashCode);
    _$hash = $jc(_$hash, thingName.hashCode);
    _$hash = $jc(_$hash, qrCode.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleUpdate')
          ..add('model', model)
          ..add('thingName', thingName)
          ..add('qrCode', qrCode))
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

  VehicleUpdateBuilder() {
    VehicleUpdate._defaults(this);
  }

  VehicleUpdateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _model = $v.model;
      _thingName = $v.thingName;
      _qrCode = $v.qrCode;
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
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
