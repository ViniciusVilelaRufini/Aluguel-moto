// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reservation_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReservationCreate extends ReservationCreate {
  @override
  final String vehicleId;
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
  final String? cardId;
  @override
  final String? couponCode;

  factory _$ReservationCreate(
          [void Function(ReservationCreateBuilder)? updates]) =>
      (ReservationCreateBuilder()..update(updates))._build();

  _$ReservationCreate._(
      {required this.vehicleId,
      this.depotId,
      this.pickupMode,
      this.pickupAt,
      this.planCode,
      this.coverage,
      this.depositMethod,
      this.cardId,
      this.couponCode})
      : super._();
  @override
  ReservationCreate rebuild(void Function(ReservationCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReservationCreateBuilder toBuilder() =>
      ReservationCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReservationCreate &&
        vehicleId == other.vehicleId &&
        depotId == other.depotId &&
        pickupMode == other.pickupMode &&
        pickupAt == other.pickupAt &&
        planCode == other.planCode &&
        coverage == other.coverage &&
        depositMethod == other.depositMethod &&
        cardId == other.cardId &&
        couponCode == other.couponCode;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, depotId.hashCode);
    _$hash = $jc(_$hash, pickupMode.hashCode);
    _$hash = $jc(_$hash, pickupAt.hashCode);
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, depositMethod.hashCode);
    _$hash = $jc(_$hash, cardId.hashCode);
    _$hash = $jc(_$hash, couponCode.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ReservationCreate')
          ..add('vehicleId', vehicleId)
          ..add('depotId', depotId)
          ..add('pickupMode', pickupMode)
          ..add('pickupAt', pickupAt)
          ..add('planCode', planCode)
          ..add('coverage', coverage)
          ..add('depositMethod', depositMethod)
          ..add('cardId', cardId)
          ..add('couponCode', couponCode))
        .toString();
  }
}

class ReservationCreateBuilder
    implements Builder<ReservationCreate, ReservationCreateBuilder> {
  _$ReservationCreate? _$v;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

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

  String? _cardId;
  String? get cardId => _$this._cardId;
  set cardId(String? cardId) => _$this._cardId = cardId;

  String? _couponCode;
  String? get couponCode => _$this._couponCode;
  set couponCode(String? couponCode) => _$this._couponCode = couponCode;

  ReservationCreateBuilder() {
    ReservationCreate._defaults(this);
  }

  ReservationCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _vehicleId = $v.vehicleId;
      _depotId = $v.depotId;
      _pickupMode = $v.pickupMode;
      _pickupAt = $v.pickupAt;
      _planCode = $v.planCode;
      _coverage = $v.coverage;
      _depositMethod = $v.depositMethod;
      _cardId = $v.cardId;
      _couponCode = $v.couponCode;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReservationCreate other) {
    _$v = other as _$ReservationCreate;
  }

  @override
  void update(void Function(ReservationCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReservationCreate build() => _build();

  _$ReservationCreate _build() {
    final _$result = _$v ??
        _$ReservationCreate._(
          vehicleId: BuiltValueNullFieldError.checkNotNull(
              vehicleId, r'ReservationCreate', 'vehicleId'),
          depotId: depotId,
          pickupMode: pickupMode,
          pickupAt: pickupAt,
          planCode: planCode,
          coverage: coverage,
          depositMethod: depositMethod,
          cardId: cardId,
          couponCode: couponCode,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
