// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_deposit_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CounterDepositInput extends CounterDepositInput {
  @override
  final CounterPaymentMethod method;
  @override
  final int amountCents;
  @override
  final String? reference;

  factory _$CounterDepositInput(
          [void Function(CounterDepositInputBuilder)? updates]) =>
      (CounterDepositInputBuilder()..update(updates))._build();

  _$CounterDepositInput._(
      {required this.method, required this.amountCents, this.reference})
      : super._();
  @override
  CounterDepositInput rebuild(
          void Function(CounterDepositInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CounterDepositInputBuilder toBuilder() =>
      CounterDepositInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CounterDepositInput &&
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
    return (newBuiltValueToStringHelper(r'CounterDepositInput')
          ..add('method', method)
          ..add('amountCents', amountCents)
          ..add('reference', reference))
        .toString();
  }
}

class CounterDepositInputBuilder
    implements Builder<CounterDepositInput, CounterDepositInputBuilder> {
  _$CounterDepositInput? _$v;

  CounterPaymentMethod? _method;
  CounterPaymentMethod? get method => _$this._method;
  set method(CounterPaymentMethod? method) => _$this._method = method;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  String? _reference;
  String? get reference => _$this._reference;
  set reference(String? reference) => _$this._reference = reference;

  CounterDepositInputBuilder() {
    CounterDepositInput._defaults(this);
  }

  CounterDepositInputBuilder get _$this {
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
  void replace(CounterDepositInput other) {
    _$v = other as _$CounterDepositInput;
  }

  @override
  void update(void Function(CounterDepositInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CounterDepositInput build() => _build();

  _$CounterDepositInput _build() {
    final _$result = _$v ??
        _$CounterDepositInput._(
          method: BuiltValueNullFieldError.checkNotNull(
              method, r'CounterDepositInput', 'method'),
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'CounterDepositInput', 'amountCents'),
          reference: reference,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
