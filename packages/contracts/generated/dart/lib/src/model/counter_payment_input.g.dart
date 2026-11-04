// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_payment_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CounterPaymentInput extends CounterPaymentInput {
  @override
  final CounterPaymentMethod method;
  @override
  final int amountCents;
  @override
  final String? reference;

  factory _$CounterPaymentInput(
          [void Function(CounterPaymentInputBuilder)? updates]) =>
      (CounterPaymentInputBuilder()..update(updates))._build();

  _$CounterPaymentInput._(
      {required this.method, required this.amountCents, this.reference})
      : super._();
  @override
  CounterPaymentInput rebuild(
          void Function(CounterPaymentInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CounterPaymentInputBuilder toBuilder() =>
      CounterPaymentInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CounterPaymentInput &&
        method == other.method &&
        amountCents == other.amountCents &&
        reference == other.reference;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, method.hashCode);
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, reference.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CounterPaymentInput')
          ..add('method', method)
          ..add('amountCents', amountCents)
          ..add('reference', reference))
        .toString();
  }
}

class CounterPaymentInputBuilder
    implements Builder<CounterPaymentInput, CounterPaymentInputBuilder> {
  _$CounterPaymentInput? _$v;

  CounterPaymentMethod? _method;
  CounterPaymentMethod? get method => _$this._method;
  set method(CounterPaymentMethod? method) => _$this._method = method;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  String? _reference;
  String? get reference => _$this._reference;
  set reference(String? reference) => _$this._reference = reference;

  CounterPaymentInputBuilder() {
    CounterPaymentInput._defaults(this);
  }

  CounterPaymentInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _method = $v.method;
      _amountCents = $v.amountCents;
      _reference = $v.reference;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CounterPaymentInput other) {
    _$v = other as _$CounterPaymentInput;
  }

  @override
  void update(void Function(CounterPaymentInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CounterPaymentInput build() => _build();

  _$CounterPaymentInput _build() {
    final _$result = _$v ??
        _$CounterPaymentInput._(
          method: BuiltValueNullFieldError.checkNotNull(
              method, r'CounterPaymentInput', 'method'),
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'CounterPaymentInput', 'amountCents'),
          reference: reference,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
