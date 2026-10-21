// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rental.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Rental extends Rental {
  @override
  final String id;
  @override
  final String customerId;
  @override
  final String vehicleId;
  @override
  final String vehicleCode;
  @override
  final PlanCode planCode;
  @override
  final InsuranceCoverage coverage;
  @override
  final RentalStatus status;
  @override
  final DateTime startedAt;
  @override
  final DateTime? pausedAt;
  @override
  final DateTime? endedAt;
  @override
  final int elapsedSeconds;
  @override
  final int pausedSeconds;
  @override
  final int costCents;
  @override
  final PriceBreakdown? breakdown;
  @override
  final String? couponCode;
  @override
  final String depositId;
  @override
  final String? insurancePolicyId;
  @override
  final String? paymentId;
  @override
  final String? endZoneId;
  @override
  final String? returnPhotoObjectKey;
  @override
  final String? forceEndReason;
  @override
  final String? forcedEndById;
  @override
  final int? rating;
  @override
  final int? speedLimitKmh;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  factory _$Rental([void Function(RentalBuilder)? updates]) =>
      (RentalBuilder()..update(updates))._build();

  _$Rental._(
      {required this.id,
      required this.customerId,
      required this.vehicleId,
      required this.vehicleCode,
      required this.planCode,
      required this.coverage,
      required this.status,
      required this.startedAt,
      this.pausedAt,
      this.endedAt,
      required this.elapsedSeconds,
      required this.pausedSeconds,
      required this.costCents,
      this.breakdown,
      this.couponCode,
      required this.depositId,
      this.insurancePolicyId,
      this.paymentId,
      this.endZoneId,
      this.returnPhotoObjectKey,
      this.forceEndReason,
      this.forcedEndById,
      this.rating,
      this.speedLimitKmh,
      required this.createdAt,
      required this.updatedAt})
      : super._();
  @override
  Rental rebuild(void Function(RentalBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RentalBuilder toBuilder() => RentalBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Rental &&
        id == other.id &&
        customerId == other.customerId &&
        vehicleId == other.vehicleId &&
        vehicleCode == other.vehicleCode &&
        planCode == other.planCode &&
        coverage == other.coverage &&
        status == other.status &&
        startedAt == other.startedAt &&
        pausedAt == other.pausedAt &&
        endedAt == other.endedAt &&
        elapsedSeconds == other.elapsedSeconds &&
        pausedSeconds == other.pausedSeconds &&
        costCents == other.costCents &&
        breakdown == other.breakdown &&
        couponCode == other.couponCode &&
        depositId == other.depositId &&
        insurancePolicyId == other.insurancePolicyId &&
        paymentId == other.paymentId &&
        endZoneId == other.endZoneId &&
        returnPhotoObjectKey == other.returnPhotoObjectKey &&
        forceEndReason == other.forceEndReason &&
        forcedEndById == other.forcedEndById &&
        rating == other.rating &&
        speedLimitKmh == other.speedLimitKmh &&
        createdAt == other.createdAt &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jc(_$hash, vehicleCode.hashCode);
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, startedAt.hashCode);
    _$hash = $jc(_$hash, pausedAt.hashCode);
    _$hash = $jc(_$hash, endedAt.hashCode);
    _$hash = $jc(_$hash, elapsedSeconds.hashCode);
    _$hash = $jc(_$hash, pausedSeconds.hashCode);
    _$hash = $jc(_$hash, costCents.hashCode);
    _$hash = $jc(_$hash, breakdown.hashCode);
    _$hash = $jc(_$hash, couponCode.hashCode);
    _$hash = $jc(_$hash, depositId.hashCode);
    _$hash = $jc(_$hash, insurancePolicyId.hashCode);
    _$hash = $jc(_$hash, paymentId.hashCode);
    _$hash = $jc(_$hash, endZoneId.hashCode);
    _$hash = $jc(_$hash, returnPhotoObjectKey.hashCode);
    _$hash = $jc(_$hash, forceEndReason.hashCode);
    _$hash = $jc(_$hash, forcedEndById.hashCode);
    _$hash = $jc(_$hash, rating.hashCode);
    _$hash = $jc(_$hash, speedLimitKmh.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Rental')
          ..add('id', id)
          ..add('customerId', customerId)
          ..add('vehicleId', vehicleId)
          ..add('vehicleCode', vehicleCode)
          ..add('planCode', planCode)
          ..add('coverage', coverage)
          ..add('status', status)
          ..add('startedAt', startedAt)
          ..add('pausedAt', pausedAt)
          ..add('endedAt', endedAt)
          ..add('elapsedSeconds', elapsedSeconds)
          ..add('pausedSeconds', pausedSeconds)
          ..add('costCents', costCents)
          ..add('breakdown', breakdown)
          ..add('couponCode', couponCode)
          ..add('depositId', depositId)
          ..add('insurancePolicyId', insurancePolicyId)
          ..add('paymentId', paymentId)
          ..add('endZoneId', endZoneId)
          ..add('returnPhotoObjectKey', returnPhotoObjectKey)
          ..add('forceEndReason', forceEndReason)
          ..add('forcedEndById', forcedEndById)
          ..add('rating', rating)
          ..add('speedLimitKmh', speedLimitKmh)
          ..add('createdAt', createdAt)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class RentalBuilder implements Builder<Rental, RentalBuilder> {
  _$Rental? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(String? customerId) => _$this._customerId = customerId;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  String? _vehicleCode;
  String? get vehicleCode => _$this._vehicleCode;
  set vehicleCode(String? vehicleCode) => _$this._vehicleCode = vehicleCode;

  PlanCode? _planCode;
  PlanCode? get planCode => _$this._planCode;
  set planCode(PlanCode? planCode) => _$this._planCode = planCode;

  InsuranceCoverage? _coverage;
  InsuranceCoverage? get coverage => _$this._coverage;
  set coverage(InsuranceCoverage? coverage) => _$this._coverage = coverage;

  RentalStatus? _status;
  RentalStatus? get status => _$this._status;
  set status(RentalStatus? status) => _$this._status = status;

  DateTime? _startedAt;
  DateTime? get startedAt => _$this._startedAt;
  set startedAt(DateTime? startedAt) => _$this._startedAt = startedAt;

  DateTime? _pausedAt;
  DateTime? get pausedAt => _$this._pausedAt;
  set pausedAt(DateTime? pausedAt) => _$this._pausedAt = pausedAt;

  DateTime? _endedAt;
  DateTime? get endedAt => _$this._endedAt;
  set endedAt(DateTime? endedAt) => _$this._endedAt = endedAt;

  int? _elapsedSeconds;
  int? get elapsedSeconds => _$this._elapsedSeconds;
  set elapsedSeconds(int? elapsedSeconds) =>
      _$this._elapsedSeconds = elapsedSeconds;

  int? _pausedSeconds;
  int? get pausedSeconds => _$this._pausedSeconds;
  set pausedSeconds(int? pausedSeconds) =>
      _$this._pausedSeconds = pausedSeconds;

  int? _costCents;
  int? get costCents => _$this._costCents;
  set costCents(int? costCents) => _$this._costCents = costCents;

  PriceBreakdownBuilder? _breakdown;
  PriceBreakdownBuilder get breakdown =>
      _$this._breakdown ??= PriceBreakdownBuilder();
  set breakdown(PriceBreakdownBuilder? breakdown) =>
      _$this._breakdown = breakdown;

  String? _couponCode;
  String? get couponCode => _$this._couponCode;
  set couponCode(String? couponCode) => _$this._couponCode = couponCode;

  String? _depositId;
  String? get depositId => _$this._depositId;
  set depositId(String? depositId) => _$this._depositId = depositId;

  String? _insurancePolicyId;
  String? get insurancePolicyId => _$this._insurancePolicyId;
  set insurancePolicyId(String? insurancePolicyId) =>
      _$this._insurancePolicyId = insurancePolicyId;

  String? _paymentId;
  String? get paymentId => _$this._paymentId;
  set paymentId(String? paymentId) => _$this._paymentId = paymentId;

  String? _endZoneId;
  String? get endZoneId => _$this._endZoneId;
  set endZoneId(String? endZoneId) => _$this._endZoneId = endZoneId;

  String? _returnPhotoObjectKey;
  String? get returnPhotoObjectKey => _$this._returnPhotoObjectKey;
  set returnPhotoObjectKey(String? returnPhotoObjectKey) =>
      _$this._returnPhotoObjectKey = returnPhotoObjectKey;

  String? _forceEndReason;
  String? get forceEndReason => _$this._forceEndReason;
  set forceEndReason(String? forceEndReason) =>
      _$this._forceEndReason = forceEndReason;

  String? _forcedEndById;
  String? get forcedEndById => _$this._forcedEndById;
  set forcedEndById(String? forcedEndById) =>
      _$this._forcedEndById = forcedEndById;

  int? _rating;
  int? get rating => _$this._rating;
  set rating(int? rating) => _$this._rating = rating;

  int? _speedLimitKmh;
  int? get speedLimitKmh => _$this._speedLimitKmh;
  set speedLimitKmh(int? speedLimitKmh) =>
      _$this._speedLimitKmh = speedLimitKmh;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  RentalBuilder() {
    Rental._defaults(this);
  }

  RentalBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _customerId = $v.customerId;
      _vehicleId = $v.vehicleId;
      _vehicleCode = $v.vehicleCode;
      _planCode = $v.planCode;
      _coverage = $v.coverage;
      _status = $v.status;
      _startedAt = $v.startedAt;
      _pausedAt = $v.pausedAt;
      _endedAt = $v.endedAt;
      _elapsedSeconds = $v.elapsedSeconds;
      _pausedSeconds = $v.pausedSeconds;
      _costCents = $v.costCents;
      _breakdown = $v.breakdown?.toBuilder();
      _couponCode = $v.couponCode;
      _depositId = $v.depositId;
      _insurancePolicyId = $v.insurancePolicyId;
      _paymentId = $v.paymentId;
      _endZoneId = $v.endZoneId;
      _returnPhotoObjectKey = $v.returnPhotoObjectKey;
      _forceEndReason = $v.forceEndReason;
      _forcedEndById = $v.forcedEndById;
      _rating = $v.rating;
      _speedLimitKmh = $v.speedLimitKmh;
      _createdAt = $v.createdAt;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Rental other) {
    _$v = other as _$Rental;
  }

  @override
  void update(void Function(RentalBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Rental build() => _build();

  _$Rental _build() {
    _$Rental _$result;
    try {
      _$result = _$v ??
          _$Rental._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'Rental', 'id'),
            customerId: BuiltValueNullFieldError.checkNotNull(
                customerId, r'Rental', 'customerId'),
            vehicleId: BuiltValueNullFieldError.checkNotNull(
                vehicleId, r'Rental', 'vehicleId'),
            vehicleCode: BuiltValueNullFieldError.checkNotNull(
                vehicleCode, r'Rental', 'vehicleCode'),
            planCode: BuiltValueNullFieldError.checkNotNull(
                planCode, r'Rental', 'planCode'),
            coverage: BuiltValueNullFieldError.checkNotNull(
                coverage, r'Rental', 'coverage'),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'Rental', 'status'),
            startedAt: BuiltValueNullFieldError.checkNotNull(
                startedAt, r'Rental', 'startedAt'),
            pausedAt: pausedAt,
            endedAt: endedAt,
            elapsedSeconds: BuiltValueNullFieldError.checkNotNull(
                elapsedSeconds, r'Rental', 'elapsedSeconds'),
            pausedSeconds: BuiltValueNullFieldError.checkNotNull(
                pausedSeconds, r'Rental', 'pausedSeconds'),
            costCents: BuiltValueNullFieldError.checkNotNull(
                costCents, r'Rental', 'costCents'),
            breakdown: _breakdown?.build(),
            couponCode: couponCode,
            depositId: BuiltValueNullFieldError.checkNotNull(
                depositId, r'Rental', 'depositId'),
            insurancePolicyId: insurancePolicyId,
            paymentId: paymentId,
            endZoneId: endZoneId,
            returnPhotoObjectKey: returnPhotoObjectKey,
            forceEndReason: forceEndReason,
            forcedEndById: forcedEndById,
            rating: rating,
            speedLimitKmh: speedLimitKmh,
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'Rental', 'createdAt'),
            updatedAt: BuiltValueNullFieldError.checkNotNull(
                updatedAt, r'Rental', 'updatedAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'breakdown';
        _breakdown?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Rental', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
