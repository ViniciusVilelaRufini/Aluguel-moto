// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quote.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Quote extends Quote {
  @override
  final PlanCode planCode;
  @override
  final InsuranceCoverage coverage;
  @override
  final PriceBreakdown breakdown;
  @override
  final int depositCents;
  @override
  final bool couponApplied;
  @override
  final String? couponMessage;

  factory _$Quote([void Function(QuoteBuilder)? updates]) =>
      (QuoteBuilder()..update(updates))._build();

  _$Quote._(
      {required this.planCode,
      required this.coverage,
      required this.breakdown,
      required this.depositCents,
      required this.couponApplied,
      this.couponMessage})
      : super._();
  @override
  Quote rebuild(void Function(QuoteBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  QuoteBuilder toBuilder() => QuoteBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Quote &&
        planCode == other.planCode &&
        coverage == other.coverage &&
        breakdown == other.breakdown &&
        depositCents == other.depositCents &&
        couponApplied == other.couponApplied &&
        couponMessage == other.couponMessage;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, breakdown.hashCode);
    _$hash = $jc(_$hash, depositCents.hashCode);
    _$hash = $jc(_$hash, couponApplied.hashCode);
    _$hash = $jc(_$hash, couponMessage.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Quote')
          ..add('planCode', planCode)
          ..add('coverage', coverage)
          ..add('breakdown', breakdown)
          ..add('depositCents', depositCents)
          ..add('couponApplied', couponApplied)
          ..add('couponMessage', couponMessage))
        .toString();
  }
}

class QuoteBuilder implements Builder<Quote, QuoteBuilder> {
  _$Quote? _$v;

  PlanCode? _planCode;
  PlanCode? get planCode => _$this._planCode;
  set planCode(PlanCode? planCode) => _$this._planCode = planCode;

  InsuranceCoverage? _coverage;
  InsuranceCoverage? get coverage => _$this._coverage;
  set coverage(InsuranceCoverage? coverage) => _$this._coverage = coverage;

  PriceBreakdownBuilder? _breakdown;
  PriceBreakdownBuilder get breakdown =>
      _$this._breakdown ??= PriceBreakdownBuilder();
  set breakdown(PriceBreakdownBuilder? breakdown) =>
      _$this._breakdown = breakdown;

  int? _depositCents;
  int? get depositCents => _$this._depositCents;
  set depositCents(int? depositCents) => _$this._depositCents = depositCents;

  bool? _couponApplied;
  bool? get couponApplied => _$this._couponApplied;
  set couponApplied(bool? couponApplied) =>
      _$this._couponApplied = couponApplied;

  String? _couponMessage;
  String? get couponMessage => _$this._couponMessage;
  set couponMessage(String? couponMessage) =>
      _$this._couponMessage = couponMessage;

  QuoteBuilder() {
    Quote._defaults(this);
  }

  QuoteBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _planCode = $v.planCode;
      _coverage = $v.coverage;
      _breakdown = $v.breakdown.toBuilder();
      _depositCents = $v.depositCents;
      _couponApplied = $v.couponApplied;
      _couponMessage = $v.couponMessage;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Quote other) {
    _$v = other as _$Quote;
  }

  @override
  void update(void Function(QuoteBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Quote build() => _build();

  _$Quote _build() {
    _$Quote _$result;
    try {
      _$result = _$v ??
          _$Quote._(
            planCode: BuiltValueNullFieldError.checkNotNull(
                planCode, r'Quote', 'planCode'),
            coverage: BuiltValueNullFieldError.checkNotNull(
                coverage, r'Quote', 'coverage'),
            breakdown: breakdown.build(),
            depositCents: BuiltValueNullFieldError.checkNotNull(
                depositCents, r'Quote', 'depositCents'),
            couponApplied: BuiltValueNullFieldError.checkNotNull(
                couponApplied, r'Quote', 'couponApplied'),
            couponMessage: couponMessage,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'breakdown';
        breakdown.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'Quote', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
