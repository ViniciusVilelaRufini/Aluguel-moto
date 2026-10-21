// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rental_start_result.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$RentalStartResult extends RentalStartResult {
  @override
  final RentalStartOutcome outcome;
  @override
  final Rental? rental;
  @override
  final Deposit deposit;

  factory _$RentalStartResult(
          [void Function(RentalStartResultBuilder)? updates]) =>
      (RentalStartResultBuilder()..update(updates))._build();

  _$RentalStartResult._(
      {required this.outcome, this.rental, required this.deposit})
      : super._();
  @override
  RentalStartResult rebuild(void Function(RentalStartResultBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  RentalStartResultBuilder toBuilder() =>
      RentalStartResultBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is RentalStartResult &&
        outcome == other.outcome &&
        rental == other.rental &&
        deposit == other.deposit;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, outcome.hashCode);
    _$hash = $jc(_$hash, rental.hashCode);
    _$hash = $jc(_$hash, deposit.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'RentalStartResult')
          ..add('outcome', outcome)
          ..add('rental', rental)
          ..add('deposit', deposit))
        .toString();
  }
}

class RentalStartResultBuilder
    implements Builder<RentalStartResult, RentalStartResultBuilder> {
  _$RentalStartResult? _$v;

  RentalStartOutcome? _outcome;
  RentalStartOutcome? get outcome => _$this._outcome;
  set outcome(RentalStartOutcome? outcome) => _$this._outcome = outcome;

  RentalBuilder? _rental;
  RentalBuilder get rental => _$this._rental ??= RentalBuilder();
  set rental(RentalBuilder? rental) => _$this._rental = rental;

  DepositBuilder? _deposit;
  DepositBuilder get deposit => _$this._deposit ??= DepositBuilder();
  set deposit(DepositBuilder? deposit) => _$this._deposit = deposit;

  RentalStartResultBuilder() {
    RentalStartResult._defaults(this);
  }

  RentalStartResultBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _outcome = $v.outcome;
      _rental = $v.rental?.toBuilder();
      _deposit = $v.deposit.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(RentalStartResult other) {
    _$v = other as _$RentalStartResult;
  }

  @override
  void update(void Function(RentalStartResultBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  RentalStartResult build() => _build();

  _$RentalStartResult _build() {
    _$RentalStartResult _$result;
    try {
      _$result = _$v ??
          _$RentalStartResult._(
            outcome: BuiltValueNullFieldError.checkNotNull(
                outcome, r'RentalStartResult', 'outcome'),
            rental: _rental?.build(),
            deposit: deposit.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'rental';
        _rental?.build();
        _$failedField = 'deposit';
        deposit.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'RentalStartResult', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
