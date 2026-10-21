// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_command.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$VehicleCommand extends VehicleCommand {
  @override
  final String id;
  @override
  final String vehicleId;
  @override
  final CommandType type;
  @override
  final CommandStatus status;
  @override
  final CommandStatusReason? statusReason;
  @override
  final String reason;
  @override
  final int? speedLimitKmh;
  @override
  final bool? on_;
  @override
  final String? requestedById;
  @override
  final String? requestedByName;
  @override
  final ActorType? requestedByType;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;
  @override
  final DateTime? confirmedAt;

  factory _$VehicleCommand([void Function(VehicleCommandBuilder)? updates]) =>
      (VehicleCommandBuilder()..update(updates))._build();

  _$VehicleCommand._(
      {required this.id,
      required this.vehicleId,
      required this.type,
      required this.status,
      this.statusReason,
      required this.reason,
      this.speedLimitKmh,
      this.on_,
      this.requestedById,
      this.requestedByName,
      this.requestedByType,
      required this.createdAt,
      required this.updatedAt,
      this.confirmedAt})
      : super._();
  @override
  VehicleCommand rebuild(void Function(VehicleCommandBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  VehicleCommandBuilder toBuilder() => VehicleCommandBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is VehicleCommand &&
        id == other.id &&
        vehicleId == other.vehicleId &&
        type == other.type &&
        status == other.status &&
        statusReason == other.statusReason &&
        reason == other.reason &&
        speedLimitKmh == other.speedLimitKmh &&
        on_ == other.on_ &&
        requestedById == other.requestedById &&
        requestedByName == other.requestedByName &&
        requestedByType == other.requestedByType &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt &&
        confirmedAt == other.confirmedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, statusReason.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, speedLimitKmh.hashCode);
    _$hash = $jc(_$hash, on_.hashCode);
    _$hash = $jc(_$hash, requestedById.hashCode);
    _$hash = $jc(_$hash, requestedByName.hashCode);
    _$hash = $jc(_$hash, requestedByType.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jc(_$hash, confirmedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'VehicleCommand')
          ..add('id', id)
          ..add('vehicleId', vehicleId)
          ..add('type', type)
          ..add('status', status)
          ..add('statusReason', statusReason)
          ..add('reason', reason)
          ..add('speedLimitKmh', speedLimitKmh)
          ..add('on_', on_)
          ..add('requestedById', requestedById)
          ..add('requestedByName', requestedByName)
          ..add('requestedByType', requestedByType)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt)
          ..add('confirmedAt', confirmedAt))
        .toString();
  }
}

class VehicleCommandBuilder
    implements Builder<VehicleCommand, VehicleCommandBuilder> {
  _$VehicleCommand? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  CommandType? _type;
  CommandType? get type => _$this._type;
  set type(CommandType? type) => _$this._type = type;

  CommandStatus? _status;
  CommandStatus? get status => _$this._status;
  set status(CommandStatus? status) => _$this._status = status;

  CommandStatusReason? _statusReason;
  CommandStatusReason? get statusReason => _$this._statusReason;
  set statusReason(CommandStatusReason? statusReason) =>
      _$this._statusReason = statusReason;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  int? _speedLimitKmh;
  int? get speedLimitKmh => _$this._speedLimitKmh;
  set speedLimitKmh(int? speedLimitKmh) =>
      _$this._speedLimitKmh = speedLimitKmh;

  bool? _on_;
  bool? get on_ => _$this._on_;
  set on_(bool? on_) => _$this._on_ = on_;

  String? _requestedById;
  String? get requestedById => _$this._requestedById;
  set requestedById(String? requestedById) =>
      _$this._requestedById = requestedById;

  String? _requestedByName;
  String? get requestedByName => _$this._requestedByName;
  set requestedByName(String? requestedByName) =>
      _$this._requestedByName = requestedByName;

  ActorType? _requestedByType;
  ActorType? get requestedByType => _$this._requestedByType;
  set requestedByType(ActorType? requestedByType) =>
      _$this._requestedByType = requestedByType;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  DateTime? _confirmedAt;
  DateTime? get confirmedAt => _$this._confirmedAt;
  set confirmedAt(DateTime? confirmedAt) => _$this._confirmedAt = confirmedAt;

  VehicleCommandBuilder() {
    VehicleCommand._defaults(this);
  }

  VehicleCommandBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _vehicleId = $v.vehicleId;
      _type = $v.type;
      _status = $v.status;
      _statusReason = $v.statusReason;
      _reason = $v.reason;
      _speedLimitKmh = $v.speedLimitKmh;
      _on_ = $v.on_;
      _requestedById = $v.requestedById;
      _requestedByName = $v.requestedByName;
      _requestedByType = $v.requestedByType;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _confirmedAt = $v.confirmedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(VehicleCommand other) {
    _$v = other as _$VehicleCommand;
  }

  @override
  void update(void Function(VehicleCommandBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  VehicleCommand build() => _build();

  _$VehicleCommand _build() {
    final _$result = _$v ??
        _$VehicleCommand._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'VehicleCommand', 'id'),
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'VehicleCommand', 'vehicleId'),
          type: BuiltValueNullFieldError.checkNotNull(
              type, r'VehicleCommand', 'type'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'VehicleCommand', 'status'),
          statusReason: statusReason,
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'VehicleCommand', 'reason'),
          speedLimitKmh: speedLimitKmh,
          on_: on_,
          requestedById: requestedById,
          requestedByName: requestedByName,
          requestedByType: requestedByType,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'VehicleCommand', 'createdAt'),
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'VehicleCommand', 'updatedAt'),
          confirmedAt: confirmedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
