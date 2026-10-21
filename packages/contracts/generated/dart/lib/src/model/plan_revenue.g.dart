// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'plan_revenue.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PlanRevenue extends PlanRevenue {
  @override
  final PlanCode planCode;
  @override
  final int rentals;
  @override
  final int revenueCents;

  factory _$PlanRevenue([void Function(PlanRevenueBuilder)? updates]) =>
      (PlanRevenueBuilder()..update(updates))._build();

  _$PlanRevenue._(
      {required this.planCode,
      required this.rentals,
      required this.revenueCents})
      : super._();
  @override
  PlanRevenue rebuild(void Function(PlanRevenueBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PlanRevenueBuilder toBuilder() => PlanRevenueBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PlanRevenue &&
        planCode == other.planCode &&
        rentals == other.rentals &&
        revenueCents == other.revenueCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, rentals.hashCode);
    _$hash = $jc(_$hash, revenueCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PlanRevenue')
          ..add('planCode', planCode)
          ..add('rentals', rentals)
          ..add('revenueCents', revenueCents))
        .toString();
  }
}

class PlanRevenueBuilder implements Builder<PlanRevenue, PlanRevenueBuilder> {
  _$PlanRevenue? _$v;

  PlanCode? _planCode;
  PlanCode? get planCode => _$this._planCode;
  set planCode(PlanCode? planCode) => _$this._planCode = planCode;

  int? _rentals;
  int? get rentals => _$this._rentals;
  set rentals(int? rentals) => _$this._rentals = rentals;

  int? _revenueCents;
  int? get revenueCents => _$this._revenueCents;
  set revenueCents(int? revenueCents) => _$this._revenueCents = revenueCents;

  PlanRevenueBuilder() {
    PlanRevenue._defaults(this);
  }

  PlanRevenueBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _planCode = $v.planCode;
      _rentals = $v.rentals;
      _revenueCents = $v.revenueCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PlanRevenue other) {
    _$v = other as _$PlanRevenue;
  }

  @override
  void update(void Function(PlanRevenueBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PlanRevenue build() => _build();

  _$PlanRevenue _build() {
    final _$result = _$v ??
        _$PlanRevenue._(
          planCode: BuiltValueNullFieldError.checkNotNull(
              planCode, r'PlanRevenue', 'planCode'),
          rentals: BuiltValueNullFieldError.checkNotNull(
              rentals, r'PlanRevenue', 'rentals'),
          revenueCents: BuiltValueNullFieldError.checkNotNull(
              revenueCents, r'PlanRevenue', 'revenueCents'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
