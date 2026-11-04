// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_checkout_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CounterCheckoutRequest extends CounterCheckoutRequest {
  @override
  final CounterPlanCode planCode;
  @override
  final int? quantity;
  @override
  final InsuranceCoverage coverage;
  @override
  final BuiltList<String>? contractPhotoKeys;
  @override
  final CounterPaymentInput payment;
  @override
  final CounterDepositInput? deposit;

  factory _$CounterCheckoutRequest(
          [void Function(CounterCheckoutRequestBuilder)? updates]) =>
      (CounterCheckoutRequestBuilder()..update(updates))._build();

  _$CounterCheckoutRequest._(
      {required this.planCode,
      this.quantity,
      required this.coverage,
      this.contractPhotoKeys,
      required this.payment,
      this.deposit})
      : super._();
  @override
  CounterCheckoutRequest rebuild(
          void Function(CounterCheckoutRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CounterCheckoutRequestBuilder toBuilder() =>
      CounterCheckoutRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CounterCheckoutRequest &&
        planCode == other.planCode &&
        quantity == other.quantity &&
        coverage == other.coverage &&
        contractPhotoKeys == other.contractPhotoKeys &&
        payment == other.payment &&
        deposit == other.deposit;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, planCode.hashCode);
    _$hash = $jc(_$hash, quantity.hashCode);
    _$hash = $jc(_$hash, coverage.hashCode);
    _$hash = $jc(_$hash, contractPhotoKeys.hashCode);
    _$hash = $jc(_$hash, payment.hashCode);
    _$hash = $jc(_$hash, deposit.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CounterCheckoutRequest')
          ..add('planCode', planCode)
          ..add('quantity', quantity)
          ..add('coverage', coverage)
          ..add('contractPhotoKeys', contractPhotoKeys)
          ..add('payment', payment)
          ..add('deposit', deposit))
        .toString();
  }
}

class CounterCheckoutRequestBuilder
    implements Builder<CounterCheckoutRequest, CounterCheckoutRequestBuilder> {
  _$CounterCheckoutRequest? _$v;

  CounterPlanCode? _planCode;
  CounterPlanCode? get planCode => _$this._planCode;
  set planCode(CounterPlanCode? planCode) => _$this._planCode = planCode;

  int? _quantity;
  int? get quantity => _$this._quantity;
  set quantity(int? quantity) => _$this._quantity = quantity;

  InsuranceCoverage? _coverage;
  InsuranceCoverage? get coverage => _$this._coverage;
  set coverage(InsuranceCoverage? coverage) => _$this._coverage = coverage;

  ListBuilder<String>? _contractPhotoKeys;
  ListBuilder<String> get contractPhotoKeys =>
      _$this._contractPhotoKeys ??= ListBuilder<String>();
  set contractPhotoKeys(ListBuilder<String>? contractPhotoKeys) =>
      _$this._contractPhotoKeys = contractPhotoKeys;

  CounterPaymentInputBuilder? _payment;
  CounterPaymentInputBuilder get payment =>
      _$this._payment ??= CounterPaymentInputBuilder();
  set payment(CounterPaymentInputBuilder? payment) => _$this._payment = payment;

  CounterDepositInputBuilder? _deposit;
  CounterDepositInputBuilder get deposit =>
      _$this._deposit ??= CounterDepositInputBuilder();
  set deposit(CounterDepositInputBuilder? deposit) => _$this._deposit = deposit;

  CounterCheckoutRequestBuilder() {
    CounterCheckoutRequest._defaults(this);
  }

  CounterCheckoutRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _planCode = $v.planCode;
      _quantity = $v.quantity;
      _coverage = $v.coverage;
      _contractPhotoKeys = $v.contractPhotoKeys?.toBuilder();
      _payment = $v.payment.toBuilder();
      _deposit = $v.deposit?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CounterCheckoutRequest other) {
    _$v = other as _$CounterCheckoutRequest;
  }

  @override
  void update(void Function(CounterCheckoutRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CounterCheckoutRequest build() => _build();

  _$CounterCheckoutRequest _build() {
    _$CounterCheckoutRequest _$result;
    try {
      _$result = _$v ??
          _$CounterCheckoutRequest._(
            planCode: BuiltValueNullFieldError.checkNotNull(
                planCode, r'CounterCheckoutRequest', 'planCode'),
            quantity: quantity,
            coverage: BuiltValueNullFieldError.checkNotNull(
                coverage, r'CounterCheckoutRequest', 'coverage'),
            contractPhotoKeys: _contractPhotoKeys?.build(),
            payment: payment.build(),
            deposit: _deposit?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'contractPhotoKeys';
        _contractPhotoKeys?.build();
        _$failedField = 'payment';
        payment.build();
        _$failedField = 'deposit';
        _deposit?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CounterCheckoutRequest', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
