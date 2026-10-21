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
    final _$result = _$v ??
        _$Subscription._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'Subscription', 'id'),
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
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'Subscription', 'createdAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
