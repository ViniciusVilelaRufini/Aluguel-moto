// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_settle_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CounterSettleRequest extends CounterSettleRequest {
  @override
  final int amountCents;
  @override
  final CounterPaymentMethod? method;
  @override
  final String? fromDepositId;
  @override
  final String? reference;

  factory _$CounterSettleRequest(
          [void Function(CounterSettleRequestBuilder)? updates]) =>
      (CounterSettleRequestBuilder()..update(updates))._build();

  _$CounterSettleRequest._(
      {required this.amountCents,
      this.method,
      this.fromDepositId,
      this.reference})
      : super._();
  @override
  CounterSettleRequest rebuild(
          void Function(CounterSettleRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CounterSettleRequestBuilder toBuilder() =>
      CounterSettleRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CounterSettleRequest &&
        amountCents == other.amountCents &&
        method == other.method &&
        fromDepositId == other.fromDepositId &&
        reference == other.reference;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, method.hashCode);
    _$hash = $jc(_$hash, fromDepositId.hashCode);
    _$hash = $jc(_$hash, reference.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CounterSettleRequest')
          ..add('amountCents', amountCents)
          ..add('method', method)
          ..add('fromDepositId', fromDepositId)
          ..add('reference', reference))
        .toString();
  }
}

class CounterSettleRequestBuilder
    implements Builder<CounterSettleRequest, CounterSettleRequestBuilder> {
  _$CounterSettleRequest? _$v;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  CounterPaymentMethod? _method;
  CounterPaymentMethod? get method => _$this._method;
  set method(CounterPaymentMethod? method) => _$this._method = method;

  String? _fromDepositId;
  String? get fromDepositId => _$this._fromDepositId;
  set fromDepositId(String? fromDepositId) =>
      _$this._fromDepositId = fromDepositId;

  String? _reference;
  String? get reference => _$this._reference;
  set reference(String? reference) => _$this._reference = reference;

  CounterSettleRequestBuilder() {
    CounterSettleRequest._defaults(this);
  }

  CounterSettleRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _amountCents = $v.amountCents;
      _method = $v.method;
      _fromDepositId = $v.fromDepositId;
      _reference = $v.reference;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CounterSettleRequest other) {
    _$v = other as _$CounterSettleRequest;
  }

  @override
  void update(void Function(CounterSettleRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CounterSettleRequest build() => _build();

  _$CounterSettleRequest _build() {
    final _$result = _$v ??
        _$CounterSettleRequest._(
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'CounterSettleRequest', 'amountCents'),
          method: method,
          fromDepositId: fromDepositId,
          reference: reference,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
