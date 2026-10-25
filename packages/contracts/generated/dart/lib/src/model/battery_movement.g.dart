// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_movement.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BatteryMovement extends BatteryMovement {
  @override
  final String id;
  @override
  final String batteryId;
  @override
  final BatteryStatus? fromStatus;
  @override
  final BatteryStatus toStatus;
  @override
  final String? depotId;
  @override
  final String? stationId;
  @override
  final String? vehicleId;
  @override
  final String actorId;
  @override
  final String? reason;
  @override
  final DateTime at;

  factory _$BatteryMovement([void Function(BatteryMovementBuilder)? updates]) =>
      (BatteryMovementBuilder()..update(updates))._build();

  _$BatteryMovement._(
      {required this.id,
      required this.batteryId,
      this.fromStatus,
      required this.toStatus,
      this.depotId,
      this.stationId,
      this.vehicleId,
      required this.actorId,
      this.reason,
      required this.at})
      : super._();
  @override
  BatteryMovement rebuild(void Function(BatteryMovementBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatteryMovementBuilder toBuilder() => BatteryMovementBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BatteryMovement &&
        id == other.id &&
        batteryId == other.batteryId &&
        fromStatus == other.fromStatus &&
        toStatus == other.toStatus &&
        depotId == other.depotId &&
        stationId == other.stationId &&
        vehicleId == other.vehicleId &&
        actorId == other.actorId &&
        reason == other.reason &&
        at == other.at;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, batteryId.hashCode);
    _$hash = $jc(_$hash, fromStatus.hashCode);
    _$hash = $jc(_$hash, toStatus.hashCode);
    _$hash = $jc(_$hash, depotId.hashCode);
    _$hash = $jc(_$hash, stationId.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, actorId.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, at.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'BatteryMovement')
          ..add('id', id)
          ..add('batteryId', batteryId)
          ..add('fromStatus', fromStatus)
          ..add('toStatus', toStatus)
          ..add('depotId', depotId)
          ..add('stationId', stationId)
          ..add('vehicleId', vehicleId)
          ..add('actorId', actorId)
          ..add('reason', reason)
          ..add('at', at))
        .toString();
  }
}

class BatteryMovementBuilder
    implements Builder<BatteryMovement, BatteryMovementBuilder> {
  _$BatteryMovement? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _batteryId;
  String? get batteryId => _$this._batteryId;
  set batteryId(String? batteryId) => _$this._batteryId = batteryId;

  BatteryStatus? _fromStatus;
  BatteryStatus? get fromStatus => _$this._fromStatus;
  set fromStatus(BatteryStatus? fromStatus) => _$this._fromStatus = fromStatus;

  BatteryStatus? _toStatus;
  BatteryStatus? get toStatus => _$this._toStatus;
  set toStatus(BatteryStatus? toStatus) => _$this._toStatus = toStatus;

  String? _depotId;
  String? get depotId => _$this._depotId;
  set depotId(String? depotId) => _$this._depotId = depotId;

  String? _stationId;
  String? get stationId => _$this._stationId;
  set stationId(String? stationId) => _$this._stationId = stationId;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _actorId;
  String? get actorId => _$this._actorId;
  set actorId(String? actorId) => _$this._actorId = actorId;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  DateTime? _at;
  DateTime? get at => _$this._at;
  set at(DateTime? at) => _$this._at = at;

  BatteryMovementBuilder() {
    BatteryMovement._defaults(this);
  }

  BatteryMovementBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _batteryId = $v.batteryId;
      _fromStatus = $v.fromStatus;
      _toStatus = $v.toStatus;
      _depotId = $v.depotId;
      _stationId = $v.stationId;
      _vehicleId = $v.vehicleId;
      _actorId = $v.actorId;
      _reason = $v.reason;
      _at = $v.at;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BatteryMovement other) {
    _$v = other as _$BatteryMovement;
  }

  @override
  void update(void Function(BatteryMovementBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BatteryMovement build() => _build();

  _$BatteryMovement _build() {
    final _$result = _$v ??
        _$BatteryMovement._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'BatteryMovement', 'id'),
          batteryId: BuiltValueNullFieldError.checkNotNull(
              batteryId, r'BatteryMovement', 'batteryId'),
          fromStatus: fromStatus,
          toStatus: BuiltValueNullFieldError.checkNotNull(
              toStatus, r'BatteryMovement', 'toStatus'),
          depotId: depotId,
          stationId: stationId,
          vehicleId: vehicleId,
          actorId: BuiltValueNullFieldError.checkNotNull(
              actorId, r'BatteryMovement', 'actorId'),
          reason: reason,
          at: BuiltValueNullFieldError.checkNotNull(
              at, r'BatteryMovement', 'at'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
