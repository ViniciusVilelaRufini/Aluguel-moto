// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_quote.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CounterQuote extends CounterQuote {
  @override
  final CounterPlanCode planCode;
  @override
  final int quantity;
  @override
  final InsuranceCoverage coverage;
  @override
  final int planUnitCents;
  @override
  final int planCents;
  @override
  final int insuranceCents;
  @override
  final int totalCents;
  @override
  final int excessDayCents;
  @override
  final int periodDays;

  factory _$CounterQuote([void Function(CounterQuoteBuilder)? updates]) =>
      (CounterQuoteBuilder()..update(updates))._build();

  _$CounterQuote._(
      {required this.planCode,
      required this.quantity,
      required this.coverage,
      required this.planUnitCents,
      required this.planCents,
      required this.insuranceCents,
      required this.totalCents,
      required this.excessDayCents,
      required this.periodDays})
      : super._();
  @override
  CounterQuote rebuild(void Function(CounterQuoteBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CounterQuoteBuilder toBuilder() => CounterQuoteBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CounterQuote &&
        planCode == other.planCode &&
        quantity == other.quantity &&
        coverage == other.coverage &&
        planUnitCents == other.planUnitCents &&
        planCents == other.planCents &&
        insuranceCents == other.insuranceCents &&
        totalCents == other.totalCents &&
        excessDayCents == other.excessDayCents &&
        periodDays == other.periodDays;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, quantity.hashCode);
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, planUnitCents.hashCode);
    _$hash = $jc(_$hash, planCents.hashCode);
    _$hash = $jc(_$hash, insuranceCents.hashCode);
    _$hash = $jc(_$hash, totalCents.hashCode);
    _$hash = $jc(_$hash, excessDayCents.hashCode);
    _$hash = $jc(_$hash, periodDays.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CounterQuote')
          ..add('planCode', planCode)
          ..add('quantity', quantity)
          ..add('coverage', coverage)
          ..add('planUnitCents', planUnitCents)
          ..add('planCents', planCents)
          ..add('insuranceCents', insuranceCents)
          ..add('totalCents', totalCents)
          ..add('excessDayCents', excessDayCents)
          ..add('periodDays', periodDays))
        .toString();
  }
}

class CounterQuoteBuilder
    implements Builder<CounterQuote, CounterQuoteBuilder> {
  _$CounterQuote? _$v;

  CounterPlanCode? _planCode;
  CounterPlanCode? get planCode => _$this._planCode;
  set planCode(CounterPlanCode? planCode) => _$this._planCode = planCode;

  int? _quantity;
  int? get quantity => _$this._quantity;
  set quantity(int? quantity) => _$this._quantity = quantity;

  InsuranceCoverage? _coverage;
  InsuranceCoverage? get coverage => _$this._coverage;
  set coverage(InsuranceCoverage? coverage) => _$this._coverage = coverage;

  int? _planUnitCents;
  int? get planUnitCents => _$this._planUnitCents;
  set planUnitCents(int? planUnitCents) =>
      _$this._planUnitCents = planUnitCents;

  int? _planCents;
  int? get planCents => _$this._planCents;
  set planCents(int? planCents) => _$this._planCents = planCents;

  int? _insuranceCents;
  int? get insuranceCents => _$this._insuranceCents;
  set insuranceCents(int? insuranceCents) =>
      _$this._insuranceCents = insuranceCents;

  int? _totalCents;
  int? get totalCents => _$this._totalCents;
  set totalCents(int? totalCents) => _$this._totalCents = totalCents;

  int? _excessDayCents;
  int? get excessDayCents => _$this._excessDayCents;
  set excessDayCents(int? excessDayCents) =>
      _$this._excessDayCents = excessDayCents;

  int? _periodDays;
  int? get periodDays => _$this._periodDays;
  set periodDays(int? periodDays) => _$this._periodDays = periodDays;

  CounterQuoteBuilder() {
    CounterQuote._defaults(this);
  }

  CounterQuoteBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _planCode = $v.planCode;
      _quantity = $v.quantity;
      _coverage = $v.coverage;
      _planUnitCents = $v.planUnitCents;
      _planCents = $v.planCents;
      _insuranceCents = $v.insuranceCents;
      _totalCents = $v.totalCents;
      _excessDayCents = $v.excessDayCents;
      _periodDays = $v.periodDays;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CounterQuote other) {
    _$v = other as _$CounterQuote;
  }

  @override
  void update(void Function(CounterQuoteBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CounterQuote build() => _build();

  _$CounterQuote _build() {
    final _$result = _$v ??
        _$CounterQuote._(
          planCode: BuiltValueNullFieldError.checkNotNull(
              planCode, r'CounterQuote', 'planCode'),
          quantity: BuiltValueNullFieldError.checkNotNull(
              quantity, r'CounterQuote', 'quantity'),
          coverage: BuiltValueNullFieldError.checkNotNull(
              coverage, r'CounterQuote', 'coverage'),
          planUnitCents: BuiltValueNullFieldError.checkNotNull(
              planUnitCents, r'CounterQuote', 'planUnitCents'),
          planCents: BuiltValueNullFieldError.checkNotNull(
              planCents, r'CounterQuote', 'planCents'),
          insuranceCents: BuiltValueNullFieldError.checkNotNull(
              insuranceCents, r'CounterQuote', 'insuranceCents'),
          totalCents: BuiltValueNullFieldError.checkNotNull(
              totalCents, r'CounterQuote', 'totalCents'),
          excessDayCents: BuiltValueNullFieldError.checkNotNull(
              excessDayCents, r'CounterQuote', 'excessDayCents'),
          periodDays: BuiltValueNullFieldError.checkNotNull(
              periodDays, r'CounterQuote', 'periodDays'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
