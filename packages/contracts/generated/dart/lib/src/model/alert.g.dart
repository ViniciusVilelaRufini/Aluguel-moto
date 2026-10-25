// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'alert.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Alert extends Alert {
  @override
  final String id;
  @override
  final AlertType type;
  @override
  final AlertPriority priority;
  @override
  final AlertStatus status;
  @override
  final String? vehicleId;
  @override
  final String? vehicleCode;
  @override
  final String? rentalId;
  @override
  final String? depotId;
  @override
  final String? paymentId;
  @override
  final String message;
  @override
  final double? lat;
  @override
  final double? lng;
  @override
  final String? assigneeId;
  @override
  final String? assigneeName;
  @override
  final String? resolution;
  @override
  final DateTime createdAt;
  @override
  final DateTime? assignedAt;
  @override
  final DateTime? resolvedAt;

  factory _$Alert([void Function(AlertBuilder)? updates]) =>
      (AlertBuilder()..update(updates))._build();

  _$Alert._(
      {required this.id,
      required this.type,
      required this.priority,
      required this.status,
      this.vehicleId,
      this.vehicleCode,
      this.rentalId,
      this.depotId,
      this.paymentId,
      required this.message,
      this.lat,
      this.lng,
      this.assigneeId,
      this.assigneeName,
      this.resolution,
      required this.createdAt,
      this.assignedAt,
      this.resolvedAt})
      : super._();
  @override
  Alert rebuild(void Function(AlertBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AlertBuilder toBuilder() => AlertBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Alert &&
        id == other.id &&
        type == other.type &&
        priority == other.priority &&
        status == other.status &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        rentalId == other.rentalId &&
        depotId == other.depotId &&
        paymentId == other.paymentId &&
        message == other.message &&
        lat == other.lat &&
        lng == other.lng &&
        assigneeId == other.assigneeId &&
        assigneeName == other.assigneeName &&
        resolution == other.resolution &&
        createdAt == other.createdAt &&
        assignedAt == other.assignedAt &&
        resolvedAt == other.resolvedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, priority.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, depotId.hashCode);
    _$hash = $jc(_$hash, paymentId.hashCode);
    _$hash = $jc(_$hash, message.hashCode);
    _$hash = $jc(_$hash, lat.hashCode);
    _$hash = $jc(_$hash, lng.hashCode);
    _$hash = $jc(_$hash, assigneeId.hashCode);
    _$hash = $jc(_$hash, assigneeName.hashCode);
    _$hash = $jc(_$hash, resolution.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, assignedAt.hashCode);
    _$hash = $jc(_$hash, resolvedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Alert')
          ..add('id', id)
          ..add('type', type)
          ..add('priority', priority)
          ..add('status', status)
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('rentalId', rentalId)
          ..add('depotId', depotId)
          ..add('paymentId', paymentId)
          ..add('message', message)
          ..add('lat', lat)
          ..add('lng', lng)
          ..add('assigneeId', assigneeId)
          ..add('assigneeName', assigneeName)
          ..add('resolution', resolution)
          ..add('createdAt', createdAt)
          ..add('assignedAt', assignedAt)
          ..add('resolvedAt', resolvedAt))
        .toString();
  }
}

class AlertBuilder implements Builder<Alert, AlertBuilder> {
  _$Alert? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  AlertType? _type;
  AlertType? get type => _$this._type;
  set type(AlertType? type) => _$this._type = type;

  AlertPriority? _priority;
  AlertPriority? get priority => _$this._priority;
  set priority(AlertPriority? priority) => _$this._priority = priority;

  AlertStatus? _status;
  AlertStatus? get status => _$this._status;
  set status(AlertStatus? status) => _$this._status = status;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _depotId;
  String? get depotId => _$this._depotId;
  set depotId(String? depotId) => _$this._depotId = depotId;

  String? _paymentId;
  String? get paymentId => _$this._paymentId;
  set paymentId(String? paymentId) => _$this._paymentId = paymentId;

  String? _message;
  String? get message => _$this._message;
  set message(String? message) => _$this._message = message;

  double? _lat;
  double? get lat => _$this._lat;
  set lat(double? lat) => _$this._lat = lat;

  double? _lng;
  double? get lng => _$this._lng;
  set lng(double? lng) => _$this._lng = lng;

  String? _assigneeId;
  String? get assigneeId => _$this._assigneeId;
  set assigneeId(String? assigneeId) => _$this._assigneeId = assigneeId;

  String? _assigneeName;
  String? get assigneeName => _$this._assigneeName;
  set assigneeName(String? assigneeName) => _$this._assigneeName = assigneeName;

  String? _resolution;
  String? get resolution => _$this._resolution;
  set resolution(String? resolution) => _$this._resolution = resolution;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _assignedAt;
  DateTime? get assignedAt => _$this._assignedAt;
  set assignedAt(DateTime? assignedAt) => _$this._assignedAt = assignedAt;

  DateTime? _resolvedAt;
  DateTime? get resolvedAt => _$this._resolvedAt;
  set resolvedAt(DateTime? resolvedAt) => _$this._resolvedAt = resolvedAt;

  AlertBuilder() {
    Alert._defaults(this);
  }

  AlertBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _type = $v.type;
      _priority = $v.priority;
      _status = $v.status;
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _rentalId = $v.rentalId;
      _depotId = $v.depotId;
      _paymentId = $v.paymentId;
      _message = $v.message;
      _lat = $v.lat;
      _lng = $v.lng;
      _assigneeId = $v.assigneeId;
      _assigneeName = $v.assigneeName;
      _resolution = $v.resolution;
      _createdAt = $v.createdAt;
      _assignedAt = $v.assignedAt;
      _resolvedAt = $v.resolvedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Alert other) {
    _$v = other as _$Alert;
  }

  @override
  void update(void Function(AlertBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Alert build() => _build();

  _$Alert _build() {
    final _$result = _$v ??
        _$Alert._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'Alert', 'id'),
          type: BuiltValueNullFieldError.checkNotNull(type, r'Alert', 'type'),
          priority: BuiltValueNullFieldError.checkNotNull(
              priority, r'Alert', 'priority'),
          status:
              BuiltValueNullFieldError.checkNotNull(status, r'Alert', 'status'),
          vehicleId: vehicleId,
          vehicleCode: vehicleCode,
          rentalId: rentalId,
          depotId: depotId,
          paymentId: paymentId,
          message: BuiltValueNullFieldError.checkNotNull(
              message, r'Alert', 'message'),
          lat: lat,
          lng: lng,
          assigneeId: assigneeId,
          assigneeName: assigneeName,
          resolution: resolution,
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'Alert', 'createdAt'),
          assignedAt: assignedAt,
          resolvedAt: resolvedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
