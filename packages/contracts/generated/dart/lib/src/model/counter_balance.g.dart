// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'counter_balance.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CounterBalance extends CounterBalance {
  @override
  final String rentalId;
  @override
  final String customerId;
  @override
  final String? customerFirstName;
  @override
  final RentalStatus rentalStatus;
  @override
  final int debtTotalCents;
  @override
  final BuiltList<CounterDebt> debts;
  @override
  final BuiltList<CounterDepositBalance> deposits;

  factory _$CounterBalance([void Function(CounterBalanceBuilder)? updates]) =>
      (CounterBalanceBuilder()..update(updates))._build();

  _$CounterBalance._(
      {required this.rentalId,
      required this.customerId,
      this.customerFirstName,
      required this.rentalStatus,
      required this.debtTotalCents,
      required this.debts,
      required this.deposits})
      : super._();
  @override
  CounterBalance rebuild(void Function(CounterBalanceBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CounterBalanceBuilder toBuilder() => CounterBalanceBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CounterBalance &&
        rentalId == other.rentalId &&
        customerId == other.customerId &&
        customerFirstName == other.customerFirstName &&
        rentalStatus == other.rentalStatus &&
        debtTotalCents == other.debtTotalCents &&
        debts == other.debts &&
        deposits == other.deposits;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, rentalId.hashCode);
    _$hash = $jc(_$hash, customerId.hashCode);
    _$hash = $jc(_$hash, customerFirstName.hashCode);
    _$hash = $jc(_$hash, rentalStatus.hashCode);
    _$hash = $jc(_$hash, debtTotalCents.hashCode);
    _$hash = $jc(_$hash, debts.hashCode);
    _$hash = $jc(_$hash, deposits.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CounterBalance')
          ..add('rentalId', rentalId)
          ..add('customerId', customerId)
          ..add('customerFirstName', customerFirstName)
          ..add('rentalStatus', rentalStatus)
          ..add('debtTotalCents', debtTotalCents)
          ..add('debts', debts)
          ..add('deposits', deposits))
        .toString();
  }
}

class CounterBalanceBuilder
    implements Builder<CounterBalance, CounterBalanceBuilder> {
  _$CounterBalance? _$v;

  String? _rentalId;
  String? get rentalId => _$this._rentalId;
  set rentalId(String? rentalId) => _$this._rentalId = rentalId;

  String? _customerId;
  String? get customerId => _$this._customerId;
  set customerId(String? customerId) => _$this._customerId = customerId;

  String? _customerFirstName;
  String? get customerFirstName => _$this._customerFirstName;
  set customerFirstName(String? customerFirstName) =>
      _$this._customerFirstName = customerFirstName;

  RentalStatus? _rentalStatus;
  RentalStatus? get rentalStatus => _$this._rentalStatus;
  set rentalStatus(RentalStatus? rentalStatus) =>
      _$this._rentalStatus = rentalStatus;

  int? _debtTotalCents;
  int? get debtTotalCents => _$this._debtTotalCents;
  set debtTotalCents(int? debtTotalCents) =>
      _$this._debtTotalCents = debtTotalCents;

  ListBuilder<CounterDebt>? _debts;
  ListBuilder<CounterDebt> get debts =>
      _$this._debts ??= ListBuilder<CounterDebt>();
  set debts(ListBuilder<CounterDebt>? debts) => _$this._debts = debts;

  ListBuilder<CounterDepositBalance>? _deposits;
  ListBuilder<CounterDepositBalance> get deposits =>
      _$this._deposits ??= ListBuilder<CounterDepositBalance>();
  set deposits(ListBuilder<CounterDepositBalance>? deposits) =>
      _$this._deposits = deposits;

  CounterBalanceBuilder() {
    CounterBalance._defaults(this);
  }

  CounterBalanceBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _rentalId = $v.rentalId;
      _customerId = $v.customerId;
      _customerFirstName = $v.customerFirstName;
      _rentalStatus = $v.rentalStatus;
      _debtTotalCents = $v.debtTotalCents;
      _debts = $v.debts.toBuilder();
      _deposits = $v.deposits.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CounterBalance other) {
    _$v = other as _$CounterBalance;
  }

  @override
  void update(void Function(CounterBalanceBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CounterBalance build() => _build();

  _$CounterBalance _build() {
    _$CounterBalance _$result;
    try {
      _$result = _$v ??
          _$CounterBalance._(
            rentalId: BuiltValueNullFieldError.checkNotNull(
                rentalId, r'CounterBalance', 'rentalId'),
            customerId: BuiltValueNullFieldError.checkNotNull(
                customerId, r'CounterBalance', 'customerId'),
            customerFirstName: customerFirstName,
            rentalStatus: BuiltValueNullFieldError.checkNotNull(
                rentalStatus, r'CounterBalance', 'rentalStatus'),
            debtTotalCents: BuiltValueNullFieldError.checkNotNull(
                debtTotalCents, r'CounterBalance', 'debtTotalCents'),
            debts: debts.build(),
            deposits: deposits.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'debts';
        debts.build();
        _$failedField = 'deposits';
        deposits.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'CounterBalance', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
