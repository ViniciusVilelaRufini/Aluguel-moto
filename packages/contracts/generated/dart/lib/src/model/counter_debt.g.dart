// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_debt.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CounterDebt extends CounterDebt {
  @override
  final String paymentId;
  @override
  final String? rentalId;
  @override
  final PaymentKind kind;
  @override
  final PaymentStatus status;
  @override
  final PaymentMethod method;
  @override
  final int outstandingCents;
  @override
  final DateTime createdAt;

  factory _$CounterDebt([void Function(CounterDebtBuilder)? updates]) =>
      (CounterDebtBuilder()..update(updates))._build();

  _$CounterDebt._(
      {required this.paymentId,
      this.rentalId,
      required this.kind,
      required this.status,
      required this.method,
      required this.outstandingCents,
      required this.createdAt})
      : super._();
  @override
  CounterDebt rebuild(void Function(CounterDebtBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CounterDebtBuilder toBuilder() => CounterDebtBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CounterDebt &&
        paymentId == other.paymentId &&
        rentalId == other.rentalId &&
        kind == other.kind &&
        status == other.status &&
        method == other.method &&
        outstandingCents == other.outstandingCents &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, paymentId.hashCode);
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, kind.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, method.hashCode);
    _$hash = $jc(_$hash, outstandingCents.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CounterDebt')
          ..add('paymentId', paymentId)
          ..add('rentalId', rentalId)
          ..add('kind', kind)
          ..add('status', status)
          ..add('method', method)
          ..add('outstandingCents', outstandingCents)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class CounterDebtBuilder implements Builder<CounterDebt, CounterDebtBuilder> {
  _$CounterDebt? _$v;

  String? _paymentId;
  String? get paymentId => _$this._paymentId;
  set paymentId(String? paymentId) => _$this._paymentId = paymentId;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  PaymentKind? _kind;
  PaymentKind? get kind => _$this._kind;
  set kind(PaymentKind? kind) => _$this._kind = kind;

  PaymentStatus? _status;
  PaymentStatus? get status => _$this._status;
  set status(PaymentStatus? status) => _$this._status = status;

  PaymentMethod? _method;
  PaymentMethod? get method => _$this._method;
  set method(PaymentMethod? method) => _$this._method = method;

  int? _outstandingCents;
  int? get outstandingCents => _$this._outstandingCents;
  set outstandingCents(int? outstandingCents) =>
      _$this._outstandingCents = outstandingCents;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  CounterDebtBuilder() {
    CounterDebt._defaults(this);
  }

  CounterDebtBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _paymentId = $v.paymentId;
      _rentalId = $v.rentalId;
      _kind = $v.kind;
      _status = $v.status;
      _method = $v.method;
      _outstandingCents = $v.outstandingCents;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CounterDebt other) {
    _$v = other as _$CounterDebt;
  }

  @override
  void update(void Function(CounterDebtBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CounterDebt build() => _build();

  _$CounterDebt _build() {
    final _$result = _$v ??
        _$CounterDebt._(
          paymentId: BuiltValueNullFieldError.checkNotNull(
              paymentId, r'CounterDebt', 'paymentId'),
          rentalId: rentalId,
          kind: BuiltValueNullFieldError.checkNotNull(
              kind, r'CounterDebt', 'kind'),
          status: BuiltValueNullFieldError.checkNotNull(
              status, r'CounterDebt', 'status'),
          method: BuiltValueNullFieldError.checkNotNull(
              method, r'CounterDebt', 'method'),
          outstandingCents: BuiltValueNullFieldError.checkNotNull(
              outstandingCents, r'CounterDebt', 'outstandingCents'),
          createdAt: BuiltValueNullFieldError.checkNotNull(
              createdAt, r'CounterDebt', 'createdAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
