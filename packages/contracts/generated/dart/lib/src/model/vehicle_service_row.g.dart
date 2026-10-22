// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_service_row.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleServiceRow extends VehicleServiceRow {
  @override
  final String vehicleId;
  @override
  final String vehicleCode;
  @override
  final String model;
  @override
  final VehicleStatus vehicleStatus;
  @override
  final VehicleServiceInfo service;
  @override
  final String? openMaintenanceTaskId;
  @override
  final DateTime? scheduledFor;

  factory _$VehicleServiceRow(
          [void Function(VehicleServiceRowBuilder)? updates]) =>
      (VehicleServiceRowBuilder()..update(updates))._build();

  _$VehicleServiceRow._(
      {required this.vehicleId,
      required this.vehicleCode,
      required this.model,
      required this.vehicleStatus,
      required this.service,
      this.openMaintenanceTaskId,
      this.scheduledFor})
      : super._();
  @override
  VehicleServiceRow rebuild(void Function(VehicleServiceRowBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleServiceRowBuilder toBuilder() =>
      VehicleServiceRowBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleServiceRow &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        model == other.model &&
        vehicleStatus == other.vehicleStatus &&
        service == other.service &&
        openMaintenanceTaskId == other.openMaintenanceTaskId &&
        scheduledFor == other.scheduledFor;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, model.hashCode);
    _$hash = $jc(_$hash, vehicleStatus.hashCode);
    _$hash = $jc(_$hash, service.hashCode);
    _$hash = $jc(_$hash, openMaintenanceTaskId.hashCode);
    _$hash = $jc(_$hash, scheduledFor.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleServiceRow')
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('model', model)
          ..add('vehicleStatus', vehicleStatus)
          ..add('service', service)
          ..add('openMaintenanceTaskId', openMaintenanceTaskId)
          ..add('scheduledFor', scheduledFor))
        .toString();
  }
}

class VehicleServiceRowBuilder
    implements Builder<VehicleServiceRow, VehicleServiceRowBuilder> {
  _$VehicleServiceRow? _$v;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  String? _model;
  String? get model => _$this._model;
  set model(String? model) => _$this._model = model;

  VehicleStatus? _vehicleStatus;
  VehicleStatus? get vehicleStatus => _$this._vehicleStatus;
  set vehicleStatus(VehicleStatus? vehicleStatus) =>
      _$this._vehicleStatus = vehicleStatus;

  VehicleServiceInfoBuilder? _service;
  VehicleServiceInfoBuilder get service =>
      _$this._service ??= VehicleServiceInfoBuilder();
  set service(VehicleServiceInfoBuilder? service) => _$this._service = service;

  String? _openMaintenanceTaskId;
  String? get openMaintenanceTaskId => _$this._openMaintenanceTaskId;
  set openMaintenanceTaskId(String? openMaintenanceTaskId) =>
      _$this._openMaintenanceTaskId = openMaintenanceTaskId;

  DateTime? _scheduledFor;
  DateTime? get scheduledFor => _$this._scheduledFor;
  set scheduledFor(DateTime? scheduledFor) =>
      _$this._scheduledFor = scheduledFor;

  VehicleServiceRowBuilder() {
    VehicleServiceRow._defaults(this);
  }

  VehicleServiceRowBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _model = $v.model;
      _vehicleStatus = $v.vehicleStatus;
      _service = $v.service.toBuilder();
      _openMaintenanceTaskId = $v.openMaintenanceTaskId;
      _scheduledFor = $v.scheduledFor;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleServiceRow other) {
    _$v = other as _$VehicleServiceRow;
  }

  @override
  void update(void Function(VehicleServiceRowBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleServiceRow build() => _build();

  _$VehicleServiceRow _build() {
    _$VehicleServiceRow _$result;
    try {
      _$result = _$v ??
          _$VehicleServiceRow._(
            vehicleId: BuiltValueNullFieldError.checkNotNull(
                vehicleId, r'VehicleServiceRow', 'vehicleId'),
            vehicleCode: BuiltValueNullFieldError.checkNotNull(
                vehicleCode, r'VehicleServiceRow', 'vehicleCode'),
            model: BuiltValueNullFieldError.checkNotNull(
                model, r'VehicleServiceRow', 'model'),
            vehicleStatus: BuiltValueNullFieldError.checkNotNull(
                vehicleStatus, r'VehicleServiceRow', 'vehicleStatus'),
            service: service.build(),
            openMaintenanceTaskId: openMaintenanceTaskId,
            scheduledFor: scheduledFor,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'service';
        service.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'VehicleServiceRow', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
