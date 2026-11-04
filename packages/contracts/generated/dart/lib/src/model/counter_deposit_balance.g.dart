// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_deposit_balance.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CounterDepositBalance extends CounterDepositBalance {
  @override
  final String depositId;
  @override
  final String? rentalId;
  @override
  final DepositMethod method;
  @override
  final DepositStatus status;
  @override
  final int amountCents;
  @override
  final int capturedCents;
  @override
  final int refundedCents;
  @override
  final int availableCents;

  factory _$CounterDepositBalance(
          [void Function(CounterDepositBalanceBuilder)? updates]) =>
      (CounterDepositBalanceBuilder()..update(updates))._build();

  _$CounterDepositBalance._(
      {required this.depositId,
      this.rentalId,
      required this.method,
      required this.status,
      required this.amountCents,
      required this.capturedCents,
      required this.refundedCents,
      required this.availableCents})
      : super._();
  @override
  CounterDepositBalance rebuild(
          void Function(CounterDepositBalanceBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CounterDepositBalanceBuilder toBuilder() =>
      CounterDepositBalanceBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CounterDepositBalance &&
        depositId == other.depositId &&
        rentalId == other.rentalId &&
        method == other.method &&
        status == other.status &&
        amountCents == other.amountCents &&
        capturedCents == other.capturedCents &&
        refundedCents == other.refundedCents &&
        availableCents == other.availableCents;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, depositId.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, method.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, amountCents.hashCode);
    _$hash = $jc(_$hash, capturedCents.hashCode);
    _$hash = $jc(_$hash, refundedCents.hashCode);
    _$hash = $jc(_$hash, availableCents.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CounterDepositBalance')
          ..add('depositId', depositId)
          ..add('rentalId', rentalId)
          ..add('method', method)
          ..add('status', status)
          ..add('amountCents', amountCents)
          ..add('capturedCents', capturedCents)
          ..add('refundedCents', refundedCents)
          ..add('availableCents', availableCents))
        .toString();
  }
}

class CounterDepositBalanceBuilder
    implements Builder<CounterDepositBalance, CounterDepositBalanceBuilder> {
  _$CounterDepositBalance? _$v;

  String? _depositId;
  String? get depositId => _$this._depositId;
  set depositId(String? depositId) => _$this._depositId = depositId;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  DepositMethod? _method;
  DepositMethod? get method => _$this._method;
  set method(DepositMethod? method) => _$this._method = method;

  DepositStatus? _status;
  DepositStatus? get status => _$this._status;
  set status(DepositStatus? status) => _$this._status = status;

  int? _amountCents;
  int? get amountCents => _$this._amountCents;
  set amountCents(int? amountCents) => _$this._amountCents = amountCents;

  int? _capturedCents;
  int? get capturedCents => _$this._capturedCents;
  set capturedCents(int? capturedCents) =>
      _$this._capturedCents = capturedCents;

  int? _refundedCents;
  int? get refundedCents => _$this._refundedCents;
  set refundedCents(int? refundedCents) =>
      _$this._refundedCents = refundedCents;

  int? _availableCents;
  int? get availableCents => _$this._availableCents;
  set availableCents(int? availableCents) =>
      _$this._availableCents = availableCents;

  CounterDepositBalanceBuilder() {
    CounterDepositBalance._defaults(this);
  }

  CounterDepositBalanceBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _depositId = $v.depositId;
      _rentalId = $v.rentalId;
      _method = $v.method;
      _status = $v.status;
      _amountCents = $v.amountCents;
      _capturedCents = $v.capturedCents;
      _refundedCents = $v.refundedCents;
      _availableCents = $v.availableCents;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CounterDepositBalance other) {
    _$v = other as _$CounterDepositBalance;
  }

  @override
  void update(void Function(CounterDepositBalanceBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CounterDepositBalance build() => _build();

  _$CounterDepositBalance _build() {
    final _$result = _$v ??
        _$CounterDepositBalance._(
          depositId: BuiltValueNullFieldError.checkNotNull(
              depositId, r'CounterDepositBalance', 'depositId'),
          rentalId: rentalId,
          method: BuiltValueNullFieldError.checkNotNull(
              method, r'CounterDepositBalance', 'method'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'CounterDepositBalance', 'status'),
          amountCents: BuiltValueNullFieldError.checkNotNull(
              amountCents, r'CounterDepositBalance', 'amountCents'),
          capturedCents: BuiltValueNullFieldError.checkNotNull(
              capturedCents, r'CounterDepositBalance', 'capturedCents'),
          refundedCents: BuiltValueNullFieldError.checkNotNull(
              refundedCents, r'CounterDepositBalance', 'refundedCents'),
          availableCents: BuiltValueNullFieldError.checkNotNull(
              availableCents, r'CounterDepositBalance', 'availableCents'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
