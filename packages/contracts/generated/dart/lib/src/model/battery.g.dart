// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Battery extends Battery {
  @override
  final String id;
  @override
  final String serial;
  @override
  final int chargePct;
  @override
  final int cycleCount;
  @override
  final BatteryStatus status;
  @override
  final String? vehicleId;
  @override
  final String? vehicleCode;
  @override
  final String? holderId;
  @override
  final String? stationId;
  @override
  final String? depotId;
  @override
  final DateTime updatedAt;

  factory _$Battery([void Function(BatteryBuilder)? updates]) =>
      (BatteryBuilder()..update(updates))._build();

  _$Battery._(
      {required this.id,
      required this.serial,
      required this.chargePct,
      required this.cycleCount,
      required this.status,
      this.vehicleId,
      this.vehicleCode,
      this.holderId,
      this.stationId,
      this.depotId,
      required this.updatedAt})
      : super._();
  @override
  Battery rebuild(void Function(BatteryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatteryBuilder toBuilder() => BatteryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Battery &&
        id == other.id &&
        serial == other.serial &&
        chargePct == other.chargePct &&
        cycleCount == other.cycleCount &&
        status == other.status &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        holderId == other.holderId &&
        stationId == other.stationId &&
        depotId == other.depotId &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, serial.hashCode);
    _$hash = $jc(_$hash, chargePct.hashCode);
    _$hash = $jc(_$hash, cycleCount.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, holderId.hashCode);
    _$hash = $jc(_$hash, stationId.hashCode);
    _$hash = $jc(_$hash, depotId.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Battery')
          ..add('id', id)
          ..add('serial', serial)
          ..add('chargePct', chargePct)
          ..add('cycleCount', cycleCount)
          ..add('status', status)
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('holderId', holderId)
          ..add('stationId', stationId)
          ..add('depotId', depotId)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class BatteryBuilder implements Builder<Battery, BatteryBuilder> {
  _$Battery? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _serial;
  String? get serial => _$this._serial;
  set serial(String? serial) => _$this._serial = serial;

  int? _chargePct;
  int? get chargePct => _$this._chargePct;
  set chargePct(int? chargePct) => _$this._chargePct = chargePct;

  int? _cycleCount;
  int? get cycleCount => _$this._cycleCount;
  set cycleCount(int? cycleCount) => _$this._cycleCount = cycleCount;

  BatteryStatus? _status;
  BatteryStatus? get status => _$this._status;
  set status(BatteryStatus? status) => _$this._status = status;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  String? _holderId;
  String? get holderId => _$this._holderId;
  set holderId(String? holderId) => _$this._holderId = holderId;

  String? _stationId;
  String? get stationId => _$this._stationId;
  set stationId(String? stationId) => _$this._stationId = stationId;

  String? _depotId;
  String? get depotId => _$this._depotId;
  set depotId(String? depotId) => _$this._depotId = depotId;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  BatteryBuilder() {
    Battery._defaults(this);
  }

  BatteryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _serial = $v.serial;
      _chargePct = $v.chargePct;
      _cycleCount = $v.cycleCount;
      _status = $v.status;
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _holderId = $v.holderId;
      _stationId = $v.stationId;
      _depotId = $v.depotId;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Battery other) {
    _$v = other as _$Battery;
  }

  @override
  void update(void Function(BatteryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Battery build() => _build();

  _$Battery _build() {
    final _$result = _$v ??
        _$Battery._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'Battery', 'id'),
          serial: BuiltValueNullFieldError.checkNotNull(
              serial, r'Battery', 'serial'),
          chargePct: BuiltValueNullFieldError.checkNotNull(
              chargePct, r'Battery', 'chargePct'),
          cycleCount: BuiltValueNullFieldError.checkNotNull(
              cycleCount, r'Battery', 'cycleCount'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'Battery', 'status'),
          vehicleId: vehicleId,
          vehicleCode: vehicleCode,
          holderId: holderId,
          stationId: stationId,
          depotId: depotId,
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'Battery', 'updatedAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
