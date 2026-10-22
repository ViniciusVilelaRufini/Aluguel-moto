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
  @override
  final String? depotId;
  @override
  final PickupMode? pickupMode;
  @override
  final DateTime? pickupAt;
  @override
  final PlanCode? planCode;
  @override
  final InsuranceCoverage? coverage;
  @override
  final DepositMethod? depositMethod;
  @override
  final Deposit? deposit;
  @override
  final String? pickupCode;
  @override
  final String? handoverId;
  @override
  final String? customerFirstName;

  factory _$Reservation([void Function(ReservationBuilder)? updates]) =>
      (ReservationBuilder()..update(updates))._build();

  _$Reservation._(
      {required this.id,
      required this.vehicleId,
      this.vehicle,
      required this.status,
      required this.createdAt,
      required this.expiresAt,
      this.depotId,
      this.pickupMode,
      this.pickupAt,
      this.planCode,
      this.coverage,
      this.depositMethod,
      this.deposit,
      this.pickupCode,
      this.handoverId,
      this.customerFirstName})
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
        expiresAt == other.expiresAt &&
        depotId == other.depotId &&
        pickupMode == other.pickupMode &&
        pickupAt == other.pickupAt &&
        planCode == other.planCode &&
        coverage == other.coverage &&
        depositMethod == other.depositMethod &&
        deposit == other.deposit &&
        pickupCode == other.pickupCode &&
        handoverId == other.handoverId &&
        customerFirstName == other.customerFirstName;
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
    _$hash = $jc(_$hash, depotId.hashCode);
    _$hash = $jc(_$hash, pickupMode.hashCode);
    _$hash = $jc(_$hash, pickupAt.hashCode);
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, depositMethod.hashCode);
    _$hash = $jc(_$hash, deposit.hashCode);
    _$hash = $jc(_$hash, pickupCode.hashCode);
    _$hash = $jc(_$hash, handoverId.hashCode);
    _$hash = $jc(_$hash, customerFirstName.hashCode);
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
          ..add('expiresAt', expiresAt)
          ..add('depotId', depotId)
          ..add('pickupMode', pickupMode)
          ..add('pickupAt', pickupAt)
          ..add('planCode', planCode)
          ..add('coverage', coverage)
          ..add('depositMethod', depositMethod)
          ..add('deposit', deposit)
          ..add('pickupCode', pickupCode)
          ..add('handoverId', handoverId)
          ..add('customerFirstName', customerFirstName))
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

  String? _depotId;
  String? get depotId => _$this._depotId;
  set depotId(String? depotId) => _$this._depotId = depotId;

  PickupMode? _pickupMode;
  PickupMode? get pickupMode => _$this._pickupMode;
  set pickupMode(PickupMode? pickupMode) => _$this._pickupMode = pickupMode;

  DateTime? _pickupAt;
  DateTime? get pickupAt => _$this._pickupAt;
  set pickupAt(DateTime? pickupAt) => _$this._pickupAt = pickupAt;

  PlanCode? _planCode;
  PlanCode? get planCode => _$this._planCode;
  set planCode(PlanCode? planCode) => _$this._planCode = planCode;

  InsuranceCoverage? _coverage;
  InsuranceCoverage? get coverage => _$this._coverage;
  set coverage(InsuranceCoverage? coverage) => _$this._coverage = coverage;

  DepositMethod? _depositMethod;
  DepositMethod? get depositMethod => _$this._depositMethod;
  set depositMethod(DepositMethod? depositMethod) =>
      _$this._depositMethod = depositMethod;

  DepositBuilder? _deposit;
  DepositBuilder get deposit => _$this._deposit ??= DepositBuilder();
  set deposit(DepositBuilder? deposit) => _$this._deposit = deposit;

  String? _pickupCode;
  String? get pickupCode => _$this._pickupCode;
  set pickupCode(String? pickupCode) => _$this._pickupCode = pickupCode;

  String? _handoverId;
  String? get handoverId => _$this._handoverId;
  set handoverId(String? handoverId) => _$this._handoverId = handoverId;

  String? _customerFirstName;
  String? get customerFirstName => _$this._customerFirstName;
  set customerFirstName(String? customerFirstName) =>
      _$this._customerFirstName = customerFirstName;

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
      _depotId = $v.depotId;
      _pickupMode = $v.pickupMode;
      _pickupAt = $v.pickupAt;
      _planCode = $v.planCode;
      _coverage = $v.coverage;
      _depositMethod = $v.depositMethod;
      _deposit = $v.deposit?.toBuilder();
      _pickupCode = $v.pickupCode;
      _handoverId = $v.handoverId;
      _customerFirstName = $v.customerFirstName;
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
            depotId: depotId,
            pickupMode: pickupMode,
            pickupAt: pickupAt,
            planCode: planCode,
            coverage: coverage,
            depositMethod: depositMethod,
            deposit: _deposit?.build(),
            pickupCode: pickupCode,
            handoverId: handoverId,
            customerFirstName: customerFirstName,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'vehicle';
        _vehicle?.build();

        _$failedField = 'deposit';
        _deposit?.build();
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
