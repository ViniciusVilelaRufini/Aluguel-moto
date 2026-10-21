// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quote_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$QuoteRequest extends QuoteRequest {
  @override
  final PlanCode planCode;
  @override
  final InsuranceCoverage coverage;
  @override
  final String? couponCode;
  @override
  final int? estimatedMinutes;

  factory _$QuoteRequest([void Function(QuoteRequestBuilder)? updates]) =>
      (QuoteRequestBuilder()..update(updates))._build();

  _$QuoteRequest._(
      {required this.planCode,
      required this.coverage,
      this.couponCode,
      this.estimatedMinutes})
      : super._();
  @override
  QuoteRequest rebuild(void Function(QuoteRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  QuoteRequestBuilder toBuilder() => QuoteRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is QuoteRequest &&
        planCode == other.planCode &&
        coverage == other.coverage &&
        couponCode == other.couponCode &&
        estimatedMinutes == other.estimatedMinutes;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, couponCode.hashCode);
    _$hash = $jc(_$hash, estimatedMinutes.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'QuoteRequest')
          ..add('planCode', planCode)
          ..add('coverage', coverage)
          ..add('couponCode', couponCode)
          ..add('estimatedMinutes', estimatedMinutes))
        .toString();
  }
}

class QuoteRequestBuilder
    implements Builder<QuoteRequest, QuoteRequestBuilder> {
  _$QuoteRequest? _$v;

  PlanCode? _planCode;
  PlanCode? get planCode => _$this._planCode;
  set planCode(PlanCode? planCode) => _$this._planCode = planCode;

  InsuranceCoverage? _coverage;
  InsuranceCoverage? get coverage => _$this._coverage;
  set coverage(InsuranceCoverage? coverage) => _$this._coverage = coverage;

  String? _couponCode;
  String? get couponCode => _$this._couponCode;
  set couponCode(String? couponCode) => _$this._couponCode = couponCode;

  int? _estimatedMinutes;
  int? get estimatedMinutes => _$this._estimatedMinutes;
  set estimatedMinutes(int? estimatedMinutes) =>
      _$this._estimatedMinutes = estimatedMinutes;

  QuoteRequestBuilder() {
    QuoteRequest._defaults(this);
  }

  QuoteRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _planCode = $v.planCode;
      _coverage = $v.coverage;
      _couponCode = $v.couponCode;
      _estimatedMinutes = $v.estimatedMinutes;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(QuoteRequest other) {
    _$v = other as _$QuoteRequest;
  }

  @override
  void update(void Function(QuoteRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  QuoteRequest build() => _build();

  _$QuoteRequest _build() {
    final _$result = _$v ??
        _$QuoteRequest._(
          planCode: BuiltValueNullFieldError.checkNotNull(
              planCode, r'QuoteRequest', 'planCode'),
          coverage: BuiltValueNullFieldError.checkNotNull(
              coverage, r'QuoteRequest', 'coverage'),
          couponCode: couponCode,
          estimatedMinutes: estimatedMinutes,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
