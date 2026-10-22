// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'customer_maintenance_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CustomerMaintenanceRequest extends CustomerMaintenanceRequest {
  @override
  final String id;
  @override
  final String vehicleId;
  @override
  final String vehicleCode;
  @override
  final MaintenanceStatus status;
  @override
  final DateTime scheduledFor;
  @override
  final String? location;
  @override
  final String description;
  @override
  final DateTime createdAt;

  factory _$CustomerMaintenanceRequest(
          [void Function(CustomerMaintenanceRequestBuilder)? updates]) =>
      (CustomerMaintenanceRequestBuilder()..update(updates))._build();

  _$CustomerMaintenanceRequest._(
      {required this.id,
      required this.vehicleId,
      required this.vehicleCode,
      required this.status,
      required this.scheduledFor,
      this.location,
      required this.description,
      required this.createdAt})
      : super._();
  @override
  CustomerMaintenanceRequest rebuild(
          void Function(CustomerMaintenanceRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CustomerMaintenanceRequestBuilder toBuilder() =>
      CustomerMaintenanceRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CustomerMaintenanceRequest &&
        id == other.id &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        status == other.status &&
        scheduledFor == other.scheduledFor &&
        location == other.location &&
        description == other.description &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, scheduledFor.hashCode);
    _$hash = $jc(_$hash, location.hashCode);
    _$hash = $jc(_$hash, description.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CustomerMaintenanceRequest')
          ..add('id', id)
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('status', status)
          ..add('scheduledFor', scheduledFor)
          ..add('location', location)
          ..add('description', description)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class CustomerMaintenanceRequestBuilder
    implements
        Builder<CustomerMaintenanceRequest, CustomerMaintenanceRequestBuilder> {
  _$CustomerMaintenanceRequest? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  MaintenanceStatus? _status;
  MaintenanceStatus? get status => _$this._status;
  set status(MaintenanceStatus? status) => _$this._status = status;

  DateTime? _scheduledFor;
  DateTime? get scheduledFor => _$this._scheduledFor;
  set scheduledFor(DateTime? scheduledFor) =>
      _$this._scheduledFor = scheduledFor;

  String? _location;
  String? get location => _$this._location;
  set location(String? location) => _$this._location = location;

  String? _description;
  String? get description => _$this._description;
  set description(String? description) => _$this._description = description;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  CustomerMaintenanceRequestBuilder() {
    CustomerMaintenanceRequest._defaults(this);
  }

  CustomerMaintenanceRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _status = $v.status;
      _scheduledFor = $v.scheduledFor;
      _location = $v.location;
      _description = $v.description;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CustomerMaintenanceRequest other) {
    _$v = other as _$CustomerMaintenanceRequest;
  }

  @override
  void update(void Function(CustomerMaintenanceRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CustomerMaintenanceRequest build() => _build();

  _$CustomerMaintenanceRequest _build() {
    final _$result = _$v ??
        _$CustomerMaintenanceRequest._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'CustomerMaintenanceRequest', 'id'),
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'CustomerMaintenanceRequest', 'vehicleId'),
          vehicleCode: BuiltValueNullFieldError.checkNotNull(
              vehicleCode, r'CustomerMaintenanceRequest', 'vehicleCode'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'CustomerMaintenanceRequest', 'status'),
          scheduledFor: BuiltValueNullFieldError.checkNotNull(
              scheduledFor, r'CustomerMaintenanceRequest', 'scheduledFor'),
          location: location,
          description: BuiltValueNullFieldError.checkNotNull(
              description, r'CustomerMaintenanceRequest', 'description'),
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'CustomerMaintenanceRequest', 'createdAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
