// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'subscription_create.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$SubscriptionCreate extends SubscriptionCreate {
  @override
  final SubscriptionPlanCode planCode;
  @override
  final String? cardId;
  @override
  final String? vehicleId;

  factory _$SubscriptionCreate(
          [void Function(SubscriptionCreateBuilder)? updates]) =>
      (SubscriptionCreateBuilder()..update(updates))._build();

  _$SubscriptionCreate._({required this.planCode, this.cardId, this.vehicleId})
      : super._();
  @override
  SubscriptionCreate rebuild(
          void Function(SubscriptionCreateBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  SubscriptionCreateBuilder toBuilder() =>
      SubscriptionCreateBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is SubscriptionCreate &&
        planCode == other.planCode &&
        cardId == other.cardId &&
        vehicleId == other.vehicleId;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, cardId.hashCode);
    _$hash = $jc(_$hash, vehicleId.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'SubscriptionCreate')
          ..add('planCode', planCode)
          ..add('cardId', cardId)
          ..add('vehicleId', vehicleId))
        .toString();
  }
}

class SubscriptionCreateBuilder
    implements Builder<SubscriptionCreate, SubscriptionCreateBuilder> {
  _$SubscriptionCreate? _$v;

  SubscriptionPlanCode? _planCode;
  SubscriptionPlanCode? get planCode => _$this._planCode;
  set planCode(SubscriptionPlanCode? planCode) => _$this._planCode = planCode;

  String? _cardId;
  String? get cardId => _$this._cardId;
  set cardId(String? cardId) => _$this._cardId = cardId;

  String? _vehicleId;
  String? get vehicleId => _$this._vehicleId;
  set vehicleId(String? vehicleId) => _$this._vehicleId = vehicleId;

  SubscriptionCreateBuilder() {
    SubscriptionCreate._defaults(this);
  }

  SubscriptionCreateBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _planCode = $v.planCode;
      _cardId = $v.cardId;
      _vehicleId = $v.vehicleId;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(SubscriptionCreate other) {
    _$v = other as _$SubscriptionCreate;
  }

  @override
  void update(void Function(SubscriptionCreateBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  SubscriptionCreate build() => _build();

  _$SubscriptionCreate _build() {
    final _$result = _$v ??
        _$SubscriptionCreate._(
          planCode: BuiltValueNullFieldError.checkNotNull(
              planCode, r'SubscriptionCreate', 'planCode'),
          cardId: cardId,
          vehicleId: vehicleId,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
