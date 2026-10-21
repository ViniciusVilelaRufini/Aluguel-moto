// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'wallet.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Wallet extends Wallet {
  @override
  final int balanceCents;
  @override
  final int minutesBalance;
  @override
  final DateTime updatedAt;

  factory _$Wallet([void Function(WalletBuilder)? updates]) =>
      (WalletBuilder()..update(updates))._build();

  _$Wallet._(
      {required this.balanceCents,
      required this.minutesBalance,
      required this.updatedAt})
      : super._();
  @override
  Wallet rebuild(void Function(WalletBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  WalletBuilder toBuilder() => WalletBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Wallet &&
        balanceCents == other.balanceCents &&
        minutesBalance == other.minutesBalance &&
        updatedAt == other.updatedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, balanceCents.hashCode);
    _$hash = $jc(_$hash, minutesBalance.hashCode);
    _$hash = $jc(_$hash, updatedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'Wallet')
          ..add('balanceCents', balanceCents)
          ..add('minutesBalance', minutesBalance)
          ..add('updatedAt', updatedAt))
        .toString();
  }
}

class WalletBuilder implements Builder<Wallet, WalletBuilder> {
  _$Wallet? _$v;

  int? _balanceCents;
  int? get balanceCents => _$this._balanceCents;
  set balanceCents(int? balanceCents) => _$this._balanceCents = balanceCents;

  int? _minutesBalance;
  int? get minutesBalance => _$this._minutesBalance;
  set minutesBalance(int? minutesBalance) =>
      _$this._minutesBalance = minutesBalance;

  DateTime? _updatedAt;
  DateTime? get updatedAt => _$this._updatedAt;
  set updatedAt(DateTime? updatedAt) => _$this._updatedAt = updatedAt;

  WalletBuilder() {
    Wallet._defaults(this);
  }

  WalletBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _balanceCents = $v.balanceCents;
      _minutesBalance = $v.minutesBalance;
      _updatedAt = $v.updatedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(Wallet other) {
    _$v = other as _$Wallet;
  }

  @override
  void update(void Function(WalletBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Wallet build() => _build();

  _$Wallet _build() {
    final _$result = _$v ??
        _$Wallet._(
          balanceCents: BuiltValueNullFieldError.checkNotNull(
              balanceCents, r'Wallet', 'balanceCents'),
          minutesBalance: BuiltValueNullFieldError.checkNotNull(
              minutesBalance, r'Wallet', 'minutesBalance'),
          updatedAt: BuiltValueNullFieldError.checkNotNull(
              updatedAt, r'Wallet', 'updatedAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
