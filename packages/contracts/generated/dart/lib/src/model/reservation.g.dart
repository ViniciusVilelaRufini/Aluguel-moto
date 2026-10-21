// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reservation.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Reservation extends Reservation {
  @override
  final String id;
  @override
  final String vehicleId;
  @override
  final VehicleSummary? vehicle;
  @override
  final ReservationStatus status;
  @override
  final DateTime createdAt;
  @override
  final DateTime expiresAt;

  factory _$Reservation([void Function(ReservationBuilder)? updates]) =>
      (ReservationBuilder()..update(updates))._build();

  _$Reservation._(
      {required this.id,
      required this.vehicleId,
      this.vehicle,
      required this.status,
      required this.createdAt,
      required this.expiresAt})
      : super._();
  @override
  Reservation rebuild(void Function(ReservationBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReservationBuilder toBuilder() => ReservationBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Reservation &&
        id == other.id &&
        vehicleId == other.vehicleId &&
        vehicle == other.vehicle &&
        status == other.status &&
        createdAt == other.createdAt &&
        expiresAt == other.expiresAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicle.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, expiresAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Reservation')
          ..add('id', id)
          ..add('vehicleId', vehicleId)
          ..add('vehicle', vehicle)
          ..add('status', status)
          ..add('createdAt', createdAt)
          ..add('expiresAt', expiresAt))
        .toString();
  }
}

class ReservationBuilder implements Builder<Reservation, ReservationBuilder> {
  _$Reservation? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  VehicleSummaryBuilder? _vehicle;
  VehicleSummaryBuilder get vehicle =>
      _$this._vehicle ??= VehicleSummaryBuilder();
  set vehicle(VehicleSummaryBuilder? vehicle) => _$this._vehicle = vehicle;

  ReservationStatus? _status;
  ReservationStatus? get status => _$this._status;
  set status(ReservationStatus? status) => _$this._status = status;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _expiresAt;
  DateTime? get expiresAt => _$this._expiresAt;
  set expiresAt(DateTime? expiresAt) => _$this._expiresAt = expiresAt;

  ReservationBuilder() {
    Reservation._defaults(this);
  }

  ReservationBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _vehicleId = $v.vehicleId;
      _vehicle = $v.vehicle?.toBuilder();
      _status = $v.status;
      _createdAt = $v.createdAt;
      _expiresAt = $v.expiresAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Reservation other) {
    _$v = other as _$Reservation;
  }

  @override
  void update(void Function(ReservationBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Reservation build() => _build();

  _$Reservation _build() {
    _$Reservation _$result;
    try {
      _$result = _$v ??
          _$Reservation._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Reservation', 'id'),
            vehicleId: BuiltValueNullFieldError.checkNotNull(
                vehicleId, r'Reservation', 'vehicleId'),
            vehicle: _vehicle?.build(),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'Reservation', 'status'),
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'Reservation', 'createdAt'),
            expiresAt: BuiltValueNullFieldError.checkNotNull(
                expiresAt, r'Reservation', 'expiresAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'vehicle';
        _vehicle?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Reservation', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
