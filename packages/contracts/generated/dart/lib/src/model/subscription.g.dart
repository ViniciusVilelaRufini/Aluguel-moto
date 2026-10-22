// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'subscription.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Subscription extends Subscription {
  @override
  final String id;
  @override
  final SubscriptionPlanCode planCode;
  @override
  final SubscriptionStatus status;
  @override
  final String? cardId;
  @override
  final int priceCents;
  @override
  final DateTime currentPeriodStart;
  @override
  final DateTime currentPeriodEnd;
  @override
  final bool? cancelAtPeriodEnd;
  @override
  final DateTime? canceledAt;
  @override
  final DateTime? nextChargeAt;
  @override
  final int? nextChargeCents;
  @override
  final String? cardBrand;
  @override
  final String? cardLast4;
  @override
  final PaymentStatus? lastPaymentStatus;
  @override
  final DateTime? lastPaymentAt;
  @override
  final DateTime? pausedAt;
  @override
  final DateTime? pauseEndsAt;
  @override
  final int? maxPauseDays;
  @override
  final int? pausesRemainingInPeriod;
  @override
  final String? assignedVehicleId;
  @override
  final VehicleSummary? assignedVehicle;
  @override
  final DateTime createdAt;

  factory _$Subscription([void Function(SubscriptionBuilder)? updates]) =>
      (SubscriptionBuilder()..update(updates))._build();

  _$Subscription._(
      {required this.id,
      required this.planCode,
      required this.status,
      this.cardId,
      required this.priceCents,
      required this.currentPeriodStart,
      required this.currentPeriodEnd,
      this.cancelAtPeriodEnd,
      this.canceledAt,
      this.nextChargeAt,
      this.nextChargeCents,
      this.cardBrand,
      this.cardLast4,
      this.lastPaymentStatus,
      this.lastPaymentAt,
      this.pausedAt,
      this.pauseEndsAt,
      this.maxPauseDays,
      this.pausesRemainingInPeriod,
      this.assignedVehicleId,
      this.assignedVehicle,
      required this.createdAt})
      : super._();
  @override
  Subscription rebuild(void Function(SubscriptionBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SubscriptionBuilder toBuilder() => SubscriptionBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Subscription &&
        id == other.id &&
        planCode == other.planCode &&
        status == other.status &&
        cardId == other.cardId &&
        priceCents == other.priceCents &&
        currentPeriodStart == other.currentPeriodStart &&
        currentPeriodEnd == other.currentPeriodEnd &&
        cancelAtPeriodEnd == other.cancelAtPeriodEnd &&
        canceledAt == other.canceledAt &&
        nextChargeAt == other.nextChargeAt &&
        nextChargeCents == other.nextChargeCents &&
        cardBrand == other.cardBrand &&
        cardLast4 == other.cardLast4 &&
        lastPaymentStatus == other.lastPaymentStatus &&
        lastPaymentAt == other.lastPaymentAt &&
        pausedAt == other.pausedAt &&
        pauseEndsAt == other.pauseEndsAt &&
        maxPauseDays == other.maxPauseDays &&
        pausesRemainingInPeriod == other.pausesRemainingInPeriod &&
        assignedVehicleId == other.assignedVehicleId &&
        assignedVehicle == other.assignedVehicle &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, cardId.hashCode);
    _$hash = $jc(_$hash, priceCents.hashCode);
    _$hash = $jc(_$hash, currentPeriodStart.hashCode);
    _$hash = $jc(_$hash, currentPeriodEnd.hashCode);
    _$hash = $jc(_$hash, cancelAtPeriodEnd.hashCode);
    _$hash = $jc(_$hash, canceledAt.hashCode);
    _$hash = $jc(_$hash, nextChargeAt.hashCode);
    _$hash = $jc(_$hash, nextChargeCents.hashCode);
    _$hash = $jc(_$hash, cardBrand.hashCode);
    _$hash = $jc(_$hash, cardLast4.hashCode);
    _$hash = $jc(_$hash, lastPaymentStatus.hashCode);
    _$hash = $jc(_$hash, lastPaymentAt.hashCode);
    _$hash = $jc(_$hash, pausedAt.hashCode);
    _$hash = $jc(_$hash, pauseEndsAt.hashCode);
    _$hash = $jc(_$hash, maxPauseDays.hashCode);
    _$hash = $jc(_$hash, pausesRemainingInPeriod.hashCode);
    _$hash = $jc(_$hash, assignedVehicleId.hashCode);
    _$hash = $jc(_$hash, assignedVehicle.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Subscription')
          ..add('id', id)
          ..add('planCode', planCode)
          ..add('status', status)
          ..add('cardId', cardId)
          ..add('priceCents', priceCents)
          ..add('currentPeriodStart', currentPeriodStart)
          ..add('currentPeriodEnd', currentPeriodEnd)
          ..add('cancelAtPeriodEnd', cancelAtPeriodEnd)
          ..add('canceledAt', canceledAt)
          ..add('nextChargeAt', nextChargeAt)
          ..add('nextChargeCents', nextChargeCents)
          ..add('cardBrand', cardBrand)
          ..add('cardLast4', cardLast4)
          ..add('lastPaymentStatus', lastPaymentStatus)
          ..add('lastPaymentAt', lastPaymentAt)
          ..add('pausedAt', pausedAt)
          ..add('pauseEndsAt', pauseEndsAt)
          ..add('maxPauseDays', maxPauseDays)
          ..add('pausesRemainingInPeriod', pausesRemainingInPeriod)
          ..add('assignedVehicleId', assignedVehicleId)
          ..add('assignedVehicle', assignedVehicle)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class SubscriptionBuilder
    implements Builder<Subscription, SubscriptionBuilder> {
  _$Subscription? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  SubscriptionPlanCode? _planCode;
  SubscriptionPlanCode? get planCode => _$this._planCode;
  set planCode(SubscriptionPlanCode? planCode) => _$this._planCode = planCode;

  SubscriptionStatus? _status;
  SubscriptionStatus? get status => _$this._status;
  set status(SubscriptionStatus? status) => _$this._status = status;

  String? _cardId;
  String? get cardId => _$this._cardId;
  set cardId(String? cardId) => _$this._cardId = cardId;

  int? _priceCents;
  int? get priceCents => _$this._priceCents;
  set priceCents(int? priceCents) => _$this._priceCents = priceCents;

  DateTime? _currentPeriodStart;
  DateTime? get currentPeriodStart => _$this._currentPeriodStart;
  set currentPeriodStart(DateTime? currentPeriodStart) =>
      _$this._currentPeriodStart = currentPeriodStart;

  DateTime? _currentPeriodEnd;
  DateTime? get currentPeriodEnd => _$this._currentPeriodEnd;
  set currentPeriodEnd(DateTime? currentPeriodEnd) =>
      _$this._currentPeriodEnd = currentPeriodEnd;

  bool? _cancelAtPeriodEnd;
  bool? get cancelAtPeriodEnd => _$this._cancelAtPeriodEnd;
  set cancelAtPeriodEnd(bool? cancelAtPeriodEnd) =>
      _$this._cancelAtPeriodEnd = cancelAtPeriodEnd;

  DateTime? _canceledAt;
  DateTime? get canceledAt => _$this._canceledAt;
  set canceledAt(DateTime? canceledAt) => _$this._canceledAt = canceledAt;

  DateTime? _nextChargeAt;
  DateTime? get nextChargeAt => _$this._nextChargeAt;
  set nextChargeAt(DateTime? nextChargeAt) =>
      _$this._nextChargeAt = nextChargeAt;

  int? _nextChargeCents;
  int? get nextChargeCents => _$this._nextChargeCents;
  set nextChargeCents(int? nextChargeCents) =>
      _$this._nextChargeCents = nextChargeCents;

  String? _cardBrand;
  String? get cardBrand => _$this._cardBrand;
  set cardBrand(String? cardBrand) => _$this._cardBrand = cardBrand;

  String? _cardLast4;
  String? get cardLast4 => _$this._cardLast4;
  set cardLast4(String? cardLast4) => _$this._cardLast4 = cardLast4;

  PaymentStatus? _lastPaymentStatus;
  PaymentStatus? get lastPaymentStatus => _$this._lastPaymentStatus;
  set lastPaymentStatus(PaymentStatus? lastPaymentStatus) =>
      _$this._lastPaymentStatus = lastPaymentStatus;

  DateTime? _lastPaymentAt;
  DateTime? get lastPaymentAt => _$this._lastPaymentAt;
  set lastPaymentAt(DateTime? lastPaymentAt) =>
      _$this._lastPaymentAt = lastPaymentAt;

  DateTime? _pausedAt;
  DateTime? get pausedAt => _$this._pausedAt;
  set pausedAt(DateTime? pausedAt) => _$this._pausedAt = pausedAt;

  DateTime? _pauseEndsAt;
  DateTime? get pauseEndsAt => _$this._pauseEndsAt;
  set pauseEndsAt(DateTime? pauseEndsAt) => _$this._pauseEndsAt = pauseEndsAt;

  int? _maxPauseDays;
  int? get maxPauseDays => _$this._maxPauseDays;
  set maxPauseDays(int? maxPauseDays) => _$this._maxPauseDays = maxPauseDays;

  int? _pausesRemainingInPeriod;
  int? get pausesRemainingInPeriod => _$this._pausesRemainingInPeriod;
  set pausesRemainingInPeriod(int? pausesRemainingInPeriod) =>
      _$this._pausesRemainingInPeriod = pausesRemainingInPeriod;

  String? _assignedVehicleId;
  String? get assignedVehicleId => _$this._assignedVehicleId;
  set assignedVehicleId(String? assignedVehicleId) =>
      _$this._assignedVehicleId = assignedVehicleId;

  VehicleSummaryBuilder? _assignedVehicle;
  VehicleSummaryBuilder get assignedVehicle =>
      _$this._assignedVehicle ??= VehicleSummaryBuilder();
  set assignedVehicle(VehicleSummaryBuilder? assignedVehicle) =>
      _$this._assignedVehicle = assignedVehicle;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  SubscriptionBuilder() {
    Subscription._defaults(this);
  }

  SubscriptionBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _planCode = $v.planCode;
      _status = $v.status;
      _cardId = $v.cardId;
      _priceCents = $v.priceCents;
      _currentPeriodStart = $v.currentPeriodStart;
      _currentPeriodEnd = $v.currentPeriodEnd;
      _cancelAtPeriodEnd = $v.cancelAtPeriodEnd;
      _canceledAt = $v.canceledAt;
      _nextChargeAt = $v.nextChargeAt;
      _nextChargeCents = $v.nextChargeCents;
      _cardBrand = $v.cardBrand;
      _cardLast4 = $v.cardLast4;
      _lastPaymentStatus = $v.lastPaymentStatus;
      _lastPaymentAt = $v.lastPaymentAt;
      _pausedAt = $v.pausedAt;
      _pauseEndsAt = $v.pauseEndsAt;
      _maxPauseDays = $v.maxPauseDays;
      _pausesRemainingInPeriod = $v.pausesRemainingInPeriod;
      _assignedVehicleId = $v.assignedVehicleId;
      _assignedVehicle = $v.assignedVehicle?.toBuilder();
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Subscription other) {
    _$v = other as _$Subscription;
  }

  @override
  void update(void Function(SubscriptionBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Subscription build() => _build();

  _$Subscription _build() {
    _$Subscription _$result;
    try {
      _$result = _$v ??
          _$Subscription._(
            id: BuiltValueNullFieldError.checkNotNull(
                id, r'Subscription', 'id'),
            planCode: BuiltValueNullFieldError.checkNotNull(
                planCode, r'Subscription', 'planCode'),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'Subscription', 'status'),
            cardId: cardId,
            priceCents: BuiltValueNullFieldError.checkNotNull(
                priceCents, r'Subscription', 'priceCents'),
            currentPeriodStart: BuiltValueNullFieldError.checkNotNull(
                currentPeriodStart, r'Subscription', 'currentPeriodStart'),
            currentPeriodEnd: BuiltValueNullFieldError.checkNotNull(
                currentPeriodEnd, r'Subscription', 'currentPeriodEnd'),
            cancelAtPeriodEnd: cancelAtPeriodEnd,
            canceledAt: canceledAt,
            nextChargeAt: nextChargeAt,
            nextChargeCents: nextChargeCents,
            cardBrand: cardBrand,
            cardLast4: cardLast4,
            lastPaymentStatus: lastPaymentStatus,
            lastPaymentAt: lastPaymentAt,
            pausedAt: pausedAt,
            pauseEndsAt: pauseEndsAt,
            maxPauseDays: maxPauseDays,
            pausesRemainingInPeriod: pausesRemainingInPeriod,
            assignedVehicleId: assignedVehicleId,
            assignedVehicle: _assignedVehicle?.build(),
            createdAt: BuiltValueNullFieldError.checkNotNull(
                createdAt, r'Subscription', 'createdAt'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'assignedVehicle';
        _assignedVehicle?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'Subscription', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
