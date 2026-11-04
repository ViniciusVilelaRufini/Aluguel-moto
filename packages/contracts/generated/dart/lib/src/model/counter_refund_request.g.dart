// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_refund_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CounterRefundRequest extends CounterRefundRequest {
  @override
  final int amountCents;
  @override
  final String? reference;

  factory _$CounterRefundRequest(
          [void Function(CounterRefundRequestBuilder)? updates]) =>
      (CounterRefundRequestBuilder()..update(updates))._build();

  _$CounterRefundRequest._({required this.amountCents, this.reference})
      : super._();
  @override
  CounterRefundRequest rebuild(
          void Function(CounterRefundRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CounterRefundRequestBuilder toBuilder() =>
      CounterRefundRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CounterRefundRequest &&
        amountCents == other.amountCents &&
        reference == other.reference;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, reference.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CounterRefundRequest')
          ..add('amountCents', amountCents)
          ..add('reference', reference))
        .toString();
  }
}

class CounterRefundRequestBuilder
    implements Builder<CounterRefundRequest, CounterRefundRequestBuilder> {
  _$CounterRefundRequest? _$v;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  String? _reference;
  String? get reference => _$this._reference;
  set reference(String? reference) => _$this._reference = reference;

  CounterRefundRequestBuilder() {
    CounterRefundRequest._defaults(this);
  }

  CounterRefundRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _amountCents = $v.amountCents;
      _reference = $v.reference;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CounterRefundRequest other) {
    _$v = other as _$CounterRefundRequest;
  }

  @override
  void update(void Function(CounterRefundRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CounterRefundRequest build() => _build();

  _$CounterRefundRequest _build() {
    final _$result = _$v ??
        _$CounterRefundRequest._(
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'CounterRefundRequest', 'amountCents'),
          reference: reference,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
