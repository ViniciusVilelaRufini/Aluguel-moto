// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'revenue_row.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RevenueRow extends RevenueRow {
  @override
  final DateTime periodStart;
  @override
  final PlanCode? planCode;
  @override
  final int rentals;
  @override
  final int grossCents;
  @override
  final int discountCents;
  @override
  final int insuranceCents;
  @override
  final int feesCents;
  @override
  final int? refundsCents;
  @override
  final int netCents;

  factory _$RevenueRow([void Function(RevenueRowBuilder)? updates]) =>
      (RevenueRowBuilder()..update(updates))._build();

  _$RevenueRow._(
      {required this.periodStart,
      this.planCode,
      required this.rentals,
      required this.grossCents,
      required this.discountCents,
      required this.insuranceCents,
      required this.feesCents,
      this.refundsCents,
      required this.netCents})
      : super._();
  @override
  RevenueRow rebuild(void Function(RevenueRowBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RevenueRowBuilder toBuilder() => RevenueRowBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RevenueRow &&
        periodStart == other.periodStart &&
        planCode == other.planCode &&
        rentals == other.rentals &&
        grossCents == other.grossCents &&
        discountCents == other.discountCents &&
        insuranceCents == other.insuranceCents &&
        feesCents == other.feesCents &&
        refundsCents == other.refundsCents &&
        netCents == other.netCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, periodStart.hashCode);
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, rentals.hashCode);
    _$hash = $jc(_$hash, grossCents.hashCode);
    _$hash = $jc(_$hash, discountCents.hashCode);
    _$hash = $jc(_$hash, insuranceCents.hashCode);
    _$hash = $jc(_$hash, feesCents.hashCode);
    _$hash = $jc(_$hash, refundsCents.hashCode);
    _$hash = $jc(_$hash, netCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RevenueRow')
          ..add('periodStart', periodStart)
          ..add('planCode', planCode)
          ..add('rentals', rentals)
          ..add('grossCents', grossCents)
          ..add('discountCents', discountCents)
          ..add('insuranceCents', insuranceCents)
          ..add('feesCents', feesCents)
          ..add('refundsCents', refundsCents)
          ..add('netCents', netCents))
        .toString();
  }
}

class RevenueRowBuilder implements Builder<RevenueRow, RevenueRowBuilder> {
  _$RevenueRow? _$v;

  DateTime? _periodStart;
  DateTime? get periodStart => _$this._periodStart;
  set periodStart(DateTime? periodStart) => _$this._periodStart = periodStart;

  PlanCode? _planCode;
  PlanCode? get planCode => _$this._planCode;
  set planCode(PlanCode? planCode) => _$this._planCode = planCode;

  int? _rentals;
  int? get rentals => _$this._rentals;
  set rentals(int? rentals) => _$this._rentals = rentals;

  int? _grossCents;
  int? get grossCents => _$this._grossCents;
  set grossCents(int? grossCents) => _$this._grossCents = grossCents;

  int? _discountCents;
  int? get discountCents => _$this._discountCents;
  set discountCents(int? discountCents) =>
      _$this._discountCents = discountCents;

  int? _insuranceCents;
  int? get insuranceCents => _$this._insuranceCents;
  set insuranceCents(int? insuranceCents) =>
      _$this._insuranceCents = insuranceCents;

  int? _feesCents;
  int? get feesCents => _$this._feesCents;
  set feesCents(int? feesCents) => _$this._feesCents = feesCents;

  int? _refundsCents;
  int? get refundsCents => _$this._refundsCents;
  set refundsCents(int? refundsCents) => _$this._refundsCents = refundsCents;

  int? _netCents;
  int? get netCents => _$this._netCents;
  set netCents(int? netCents) => _$this._netCents = netCents;

  RevenueRowBuilder() {
    RevenueRow._defaults(this);
  }

  RevenueRowBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _periodStart = $v.periodStart;
      _planCode = $v.planCode;
      _rentals = $v.rentals;
      _grossCents = $v.grossCents;
      _discountCents = $v.discountCents;
      _insuranceCents = $v.insuranceCents;
      _feesCents = $v.feesCents;
      _refundsCents = $v.refundsCents;
      _netCents = $v.netCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RevenueRow other) {
    _$v = other as _$RevenueRow;
  }

  @override
  void update(void Function(RevenueRowBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RevenueRow build() => _build();

  _$RevenueRow _build() {
    final _$result = _$v ??
        _$RevenueRow._(
          periodStart: BuiltValueNullFieldError.checkNotNull(
              periodStart, r'RevenueRow', 'periodStart'),
          planCode: planCode,
          rentals: BuiltValueNullFieldError.checkNotNull(
              rentals, r'RevenueRow', 'rentals'),
          grossCents: BuiltValueNullFieldError.checkNotNull(
              grossCents, r'RevenueRow', 'grossCents'),
          discountCents: BuiltValueNullFieldError.checkNotNull(
              discountCents, r'RevenueRow', 'discountCents'),
          insuranceCents: BuiltValueNullFieldError.checkNotNull(
              insuranceCents, r'RevenueRow', 'insuranceCents'),
          feesCents: BuiltValueNullFieldError.checkNotNull(
              feesCents, r'RevenueRow', 'feesCents'),
          refundsCents: refundsCents,
          netCents: BuiltValueNullFieldError.checkNotNull(
              netCents, r'RevenueRow', 'netCents'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
