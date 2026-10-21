// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'battery_swap.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$BatterySwap extends BatterySwap {
  @override
  final String id;
  @override
  final String fieldTaskId;
  @override
  final String vehicleId;
  @override
  final String operatorId;
  @override
  final String removedBatterySerial;
  @override
  final String installedBatterySerial;
  @override
  final int? installedBatteryPct;
  @override
  final DateTime recordedAt;
  @override
  final DateTime createdAt;

  factory _$BatterySwap([void Function(BatterySwapBuilder)? updates]) =>
      (BatterySwapBuilder()..update(updates))._build();

  _$BatterySwap._(
      {required this.id,
      required this.fieldTaskId,
      required this.vehicleId,
      required this.operatorId,
      required this.removedBatterySerial,
      required this.installedBatterySerial,
      this.installedBatteryPct,
      required this.recordedAt,
      required this.createdAt})
      : super._();
  @override
  BatterySwap rebuild(void Function(BatterySwapBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  BatterySwapBuilder toBuilder() => BatterySwapBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is BatterySwap &&
        id == other.id &&
        fieldTaskId == other.fieldTaskId &&
        vehicleId == other.vehicleId &&
        operatorId == other.operatorId &&
        removedBatterySerial == other.removedBatterySerial &&
        installedBatterySerial == other.installedBatterySerial &&
        installedBatteryPct == other.installedBatteryPct &&
        recordedAt == other.recordedAt &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, fieldTaskId.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, operatorId.hashCode);
    _$hash = $jc(_$hash, removedBatterySerial.hashCode);
    _$hash = $jc(_$hash, installedBatterySerial.hashCode);
    _$hash = $jc(_$hash, installedBatteryPct.hashCode);
    _$hash = $jc(_$hash, recordedAt.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'BatterySwap')
          ..add('id', id)
          ..add('fieldTaskId', fieldTaskId)
          ..add('vehicleId', vehicleId)
          ..add('operatorId', operatorId)
          ..add('removedBatterySerial', removedBatterySerial)
          ..add('installedBatterySerial', installedBatterySerial)
          ..add('installedBatteryPct', installedBatteryPct)
          ..add('recordedAt', recordedAt)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class BatterySwapBuilder implements Builder<BatterySwap, BatterySwapBuilder> {
  _$BatterySwap? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _fieldTaskId;
  String? get fieldTaskId => _$this._fieldTaskId;
  set fieldTaskId(String? fieldTaskId) => _$this._fieldTaskId = fieldTaskId;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _operatorId;
  String? get operatorId => _$this._operatorId;
  set operatorId(String? operatorId) => _$this._operatorId = operatorId;

  String? _removedBatterySerial;
  String? get removedBatterySerial => _$this._removedBatterySerial;
  set removedBatterySerial(String? removedBatterySerial) =>
      _$this._removedBatterySerial = removedBatterySerial;

  String? _installedBatterySerial;
  String? get installedBatterySerial => _$this._installedBatterySerial;
  set installedBatterySerial(String? installedBatterySerial) =>
      _$this._installedBatterySerial = installedBatterySerial;

  int? _installedBatteryPct;
  int? get installedBatteryPct => _$this._installedBatteryPct;
  set installedBatteryPct(int? installedBatteryPct) =>
      _$this._installedBatteryPct = installedBatteryPct;

  DateTime? _recordedAt;
  DateTime? get recordedAt => _$this._recordedAt;
  set recordedAt(DateTime? recordedAt) => _$this._recordedAt = recordedAt;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  BatterySwapBuilder() {
    BatterySwap._defaults(this);
  }

  BatterySwapBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _fieldTaskId = $v.fieldTaskId;
      _vehicleId = $v.vehicleId;
      _operatorId = $v.operatorId;
      _removedBatterySerial = $v.removedBatterySerial;
      _installedBatterySerial = $v.installedBatterySerial;
      _installedBatteryPct = $v.installedBatteryPct;
      _recordedAt = $v.recordedAt;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(BatterySwap other) {
    _$v = other as _$BatterySwap;
  }

  @override
  void update(void Function(BatterySwapBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  BatterySwap build() => _build();

  _$BatterySwap _build() {
    final _$result = _$v ??
        _$BatterySwap._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'BatterySwap', 'id'),
          fieldTaskId: BuiltValueNullFieldError.checkNotNull(
              fieldTaskId, r'BatterySwap', 'fieldTaskId'),
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'BatterySwap', 'vehicleId'),
          operatorId: BuiltValueNullFieldError.checkNotNull(
              operatorId, r'BatterySwap', 'operatorId'),
          removedBatterySerial: BuiltValueNullFieldError.checkNotNull(
              removedBatterySerial, r'BatterySwap', 'removedBatterySerial'),
          installedBatterySerial: BuiltValueNullFieldError.checkNotNull(
              installedBatterySerial, r'BatterySwap', 'installedBatterySerial'),
          installedBatteryPct: installedBatteryPct,
          recordedAt: BuiltValueNullFieldError.checkNotNull(
              recordedAt, r'BatterySwap', 'recordedAt'),
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'BatterySwap', 'createdAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
